import { Prisma } from "@prisma/client";
import {
  Kind,
  getDirectiveValues,
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  type GraphQLResolveInfo,
  type SelectionSetNode,
} from "graphql";

const contentScalars = new Set(
  Prisma.dmmf.datamodel.models
    .find((model) => model.name === "Content")!
    .fields.filter((field) => field.kind !== "object")
    .map((field) => field.name),
);

const relationOptions = {
  contentType: true,
  franchise: { select: { id: true, name: true } },
  people: { include: { person: true } },
  genres: { include: { genre: true } },
  contentThemes: { include: { theme: true } },
  contentMoods: { include: { mood: true } },
  contentGameModes: { include: { gameMode: true } },
  contentGameEngines: { include: { gameEngine: true } },
  contentPerspectives: { include: { perspective: true } },
  contentPlatforms: { include: { platform: true } },
  companies: { include: { company: true } },
  expansions: true,
  screenshots: { orderBy: { order: "asc" } },
  ageRating: true,
  images: {
    where: { type: { in: ["poster", "backdrop"] } },
    select: {
      id: true,
      type: true,
      version: true,
      filePath: true,
      upvoteCount: true,
      downvoteCount: true,
    },
  },
} satisfies Prisma.ContentInclude;

const relationFields: Record<string, keyof typeof relationOptions> = {
  contentType: "contentType",
  franchiseName: "franchise",
  people: "people",
  genres: "genres",
  themes: "contentThemes",
  moods: "contentMoods",
  gameModes: "contentGameModes",
  gameEngines: "contentGameEngines",
  perspectives: "contentPerspectives",
  platforms: "contentPlatforms",
  companies: "companies",
  expansions: "expansions",
  screenshots: "screenshots",
  ageRating: "ageRating",
  images: "images",
  posterUrl: "images",
  backdropUrl: "images",
};

/** Uses schema names and runtime directives, including fragments and aliases. */
export function requestedContentFields(
  info?: GraphQLResolveInfo,
): Set<string> | undefined {
  if (!info) return undefined;
  const fields = new Set<string>();
  const visit = (set?: SelectionSetNode, fragments = new Set<string>()) => {
    for (const selection of set?.selections ?? []) {
      if (
        getDirectiveValues(GraphQLSkipDirective, selection, info.variableValues)
          ?.if === true ||
        getDirectiveValues(
          GraphQLIncludeDirective,
          selection,
          info.variableValues,
        )?.if === false
      )
        continue;
      if (selection.kind === Kind.FIELD) {
        if (selection.name.value === "items")
          visit(selection.selectionSet, fragments);
        else fields.add(selection.name.value);
      } else if (selection.kind === Kind.INLINE_FRAGMENT)
        visit(selection.selectionSet, fragments);
      else if (!fragments.has(selection.name.value)) {
        const nextFragments = new Set(fragments).add(selection.name.value);
        visit(
          info.fragments[selection.name.value]?.selectionSet,
          nextFragments,
        );
      }
    }
  };
  for (const node of info.fieldNodes) visit(node.selectionSet);
  return fields;
}

export function contentSelection(info?: GraphQLResolveInfo): {
  select: Prisma.ContentSelect;
} {
  const fields = requestedContentFields(info);
  if (!fields)
    return {
      select: {
        ...Object.fromEntries(
          [...contentScalars].map((field) => [field, true]),
        ),
        ...relationOptions,
      },
    };

  const select: Prisma.ContentSelect = { id: true, contentTypeId: true };
  // The converter and downstream field resolvers need these backing values.
  for (const field of [
    "posterImageId",
    "backdropImageId",
    "franchiseId",
    "totalRatingScore",
    "totalRatingVotes",
  ] as const)
    select[field] = true;
  for (const field of fields) {
    if (contentScalars.has(field))
      (select as Record<string, unknown>)[field] = true;
    const relation = relationFields[field];
    if (relation)
      (select as Record<string, unknown>)[relation] = relationOptions[relation];
  }
  if (fields.has("similarContents")) {
    // Similarity ranking uses this metadata in addition to the requested fields.
    select.title = true;
    select.releaseDate = true;
    select.firstAirDate = true;
    select.images = relationOptions.images;
    select.franchise = relationOptions.franchise;
  }
  return { select };
}
