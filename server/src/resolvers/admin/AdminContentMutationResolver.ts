import { Resolver, Mutation, Arg, Ctx, Authorized, Int } from "type-graphql";
import { GraphQLContext } from "../../context";
import { requireAdmin, requireAdminOrModerator } from "../../lib/authGuard";
import { deleteBunnyFile, isBunnyUrl } from "../../lib/bunny";
import { logger } from "../../lib/logger";
import {
  didContentBecomeReleased,
  notifyUsersOfReleasedContent,
} from "../../lib/releaseNotificationHelper";
import { inferNormalizedContentStatus } from "../../lib/contentStatus";
import { generateContentSlug } from "../../lib/slugUtils";
import { reconcileSimilarityNodeForFranchiseUpgrade } from "../../lib/similarContentHelper";
import { AdminContent, CreateContentInput, UpdateContentInput } from "../../types/admin";
import { prepareContentMedia } from "./prepareContentMedia";
import {
  linkGenres,
  linkLookups,
  linkPlatforms,
  linkThemes,
  linkCompanies,
  processCast,
  processCrew,
  processSeasons,
  processSimilarContents,
  processContentCitations,
  saveImages,
  saveScreenshots,
  saveExpansions,
  normalizeCastJsonForSave,
  normalizeCrewJsonForSave,
  parseAuthors,
  syncDefaultBookPublication,
  fetchAdminContent,
  findOrCreateFranchise,
  ACTOR_ROLES,
  ensureLanguagesExist,
} from "./AdminContentHelpers";

const CONTENT_MUTATION_TRANSACTION_TIMEOUT_MS = 300_000;

const contentAuditSelect = {
  id: true,
  title: true,
  tmdbId: true,
  igdbId: true,
  originalTitle: true,
  alternativeTitles: true,
  contentTypeId: true,
  description: true,
  releaseDate: true,
  runtime: true,
  status: true,
  isContinuing: true,
  budget: true,
  revenue: true,
  franchiseId: true,
  averageDuration: true,
  numberOfEpisodes: true,
  numberOfSeasons: true,
  tvType: true,
  inProduction: true,
  firstAirDate: true,
  lastAirDate: true,
  isbn: true,
  pageCount: true,
  previewLink: true,
  infoLink: true,
  authors: true,
  languages: true,
  ageRatingId: true,
  cast: true,
  crew: true,
  seasonsData: true,
  trailerUrl: true,
  reviewVideoUrl: true,
  gameplayVideoUrl: true,
  spotifyPlaylistUrl: true,
  awards: true,
  lockedFields: true,
  autoSelectHighestVotedMedia: true,
  isEnabledForQuiz: true,
  spotifyUrl: true,
  musicReleaseType: true,
  explicit: true,
  label: true,
  totalTracks: true,
  additionalRatingCategories: true,
  isDeleted: true,
  deletedAt: true,
  consumeCount: true,
  favoriteCount: true,
  discussionCount: true,
  totalRatingScore: true,
  totalRatingVotes: true,
  totalPlaytimeMinutes: true,
  totalPlaytimeLogs: true,
  ratingDistribution: true,
} as const;

function normalizeAuditValue(value: any): any {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeAuditValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeAuditValue(item)]),
    );
  }
  return value ?? null;
}

function pickChangedValues(
  record: any,
  fields: string[],
  overrides: Record<string, any> = {},
): Record<string, any> {
  const values: Record<string, any> = {};
  for (const field of fields) {
    values[field] = Object.prototype.hasOwnProperty.call(overrides, field)
      ? normalizeAuditValue(overrides[field])
      : normalizeAuditValue(record?.[field]);
  }
  return values;
}

function getChangedScalarFields(before: any, after: any): string[] {
  return Object.keys(contentAuditSelect).filter((field) => {
    if (field === "id") return false;
    return (
      JSON.stringify(normalizeAuditValue(before?.[field])) !==
      JSON.stringify(normalizeAuditValue(after?.[field]))
    );
  });
}

function hasField(input: any, field: string): boolean {
  return input[field] !== undefined;
}

function setNullableString(data: any, input: any, field: string) {
  if (hasField(input, field)) {
    data[field] = input[field] ? input[field] : null;
  }
}

function setNullableNumber(data: any, input: any, field: string) {
  if (hasField(input, field)) {
    data[field] = input[field] ?? null;
  }
}

async function resolveMusicReleaseType(prisma: any, contentTypeId: number, value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (!["ALBUM", "SINGLE", "TRACK"].includes(normalized)) {
    throw new Error("Music release type must be ALBUM, SINGLE, or TRACK");
  }
  const contentType = await prisma.contentTypeLookup.findUnique({
    where: { id: contentTypeId },
    select: { slug: true },
  });
  if (contentType?.slug !== "music") {
    throw new Error("Music release type can only be assigned to music content");
  }
  return normalized as "ALBUM" | "SINGLE" | "TRACK";
}

function comparableAuditValue(field: string, value: any): string {
  if (field === "images" && value?.rows) {
    const rows = value.rows as Array<{ id: number; filePath: string; type: string; version?: string }>;
    return JSON.stringify({
      posterUrl: rows.find((row) => row.id === value.posterImageId)?.filePath ?? null,
      backdropUrl: rows.find((row) => row.id === value.backdropImageId)?.filePath ?? null,
      rows: rows.map(({ filePath, type, version }) => ({ filePath, type, version }))
        .sort((a, b) => `${a.type}:${a.filePath}`.localeCompare(`${b.type}:${b.filePath}`)),
    });
  }
  if (["screenshots", "expansions", "bookPublications"].includes(field) && Array.isArray(value)) {
    return JSON.stringify(value.map(({ id, ...row }) => row));
  }
  return JSON.stringify(normalizeAuditValue(value));
}

async function assertExternalIdIsUnique(
  prisma: GraphQLContext["prisma"],
  input: { contentTypeId?: number; tmdbId?: number | null; igdbId?: number | null },
  currentId?: string,
) {
  const externalWhere =
    input.tmdbId !== undefined && input.tmdbId !== null
      ? { tmdbId: input.tmdbId }
      : input.igdbId !== undefined && input.igdbId !== null
        ? { igdbId: input.igdbId }
        : null;

  if (!externalWhere || input.contentTypeId === undefined) return;

  const duplicate = await prisma.content.findFirst({
    where: {
      ...externalWhere,
      contentTypeId: input.contentTypeId,
      isDeleted: false,
      ...(currentId ? { id: { not: currentId } } : {}),
    },
    select: { id: true, title: true },
  });

  if (duplicate) {
    const source = "tmdbId" in externalWhere ? "TMDB" : "IGDB";
    throw new Error(
      `${source} ID already belongs to content "${duplicate.title}" (${duplicate.id}).`,
    );
  }
}

async function resolveAgeRatingId(
  prisma: any,
  input: { ageRatingId?: number | null; ageRatingName?: string | null },
): Promise<number | null | undefined> {
  if (input.ageRatingId !== undefined) {
    return input.ageRatingId ?? null;
  }

  if (input.ageRatingName === undefined) {
    return undefined;
  }

  const normalizedName = input.ageRatingName?.trim();
  if (!normalizedName) {
    return null;
  }

  const existing = await prisma.ageRating.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.ageRating.create({
    data: { name: normalizedName },
    select: { id: true },
  });

  return created.id;
}

function getRelationChangedFields(input: UpdateContentInput, contentTypeId: number): string[] {
  return [
    input.posterUrl !== undefined ? "posterUrl" : null,
    input.backdropUrl !== undefined ? "backdropUrl" : null,
    input.genres !== undefined ? "genres" : null,
    input.themes !== undefined ? "themes" : null,
    input.moods !== undefined ? "moods" : null,
    input.gameModes !== undefined ? "gameModes" : null,
    input.gameEngines !== undefined ? "gameEngines" : null,
    input.perspectives !== undefined ? "perspectives" : null,
    input.platforms !== undefined ? "platforms" : null,
    input.companies !== undefined ? "companies" : null,
    input.screenshots !== undefined ? "screenshots" : null,
    input.expansions !== undefined ? "expansions" : null,
    contentTypeId === 4 && (input.bookPublications !== undefined || input.isbn !== undefined ||
      input.pageCount !== undefined || input.publishedDate !== undefined ||
      input.translators !== undefined)
      ? "bookPublications" : null,
    input.similarContentIds !== undefined ? "similarContentIds" : null,
    input.images !== undefined || input.posterUrl !== undefined || input.backdropUrl !== undefined ? "images" : null,
    input.citationsReceived !== undefined ? "citationsReceived" : null,
    input.citationsMade !== undefined ? "citationsMade" : null,
  ].filter(Boolean) as string[];
}

async function getContentRelationAuditSnapshot(
  prisma: any,
  contentId: string,
  fields: string[],
): Promise<Record<string, any>> {
  const fieldSet = new Set(fields);
  const snapshot: Record<string, any> = {};

  if (fieldSet.has("posterUrl") || fieldSet.has("backdropUrl")) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { posterImageId: true, backdropImageId: true },
    });
    const images = await prisma.contentImage.findMany({
      where: { contentId, type: { in: ["poster", "backdrop"] } },
      select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
      orderBy: { id: "desc" },
    });
    if (fieldSet.has("posterUrl")) {
      snapshot.posterUrl =
        images.find((image: any) => image.id === content?.posterImageId)?.filePath || null;
    }
    if (fieldSet.has("backdropUrl")) {
      snapshot.backdropUrl =
        images.find((image: any) => image.id === content?.backdropImageId)?.filePath || null;
    }
  }

  if (fieldSet.has("genres")) {
    const rows = await prisma.contentGenre.findMany({
      where: { contentId },
      include: { genre: { select: { id: true, name: true } } },
      orderBy: { genreId: "asc" },
    });
    snapshot.genres = rows.map((row: any) => row.genre);
  }

  if (fieldSet.has("themes")) {
    const rows = await prisma.contentTheme.findMany({
      where: { contentId },
      include: { theme: { select: { id: true, name: true } } },
      orderBy: { themeId: "asc" },
    });
    snapshot.themes = rows.map((row: any) => row.theme);
  }

  if (fieldSet.has("moods")) {
    const rows = await prisma.contentMood.findMany({
      where: { contentId },
      include: { mood: { select: { id: true, name: true } } },
      orderBy: { moodId: "asc" },
    });
    snapshot.moods = rows.map((row: any) => row.mood);
  }

  if (fieldSet.has("gameModes")) {
    const rows = await prisma.contentGameMode.findMany({
      where: { contentId },
      include: { gameMode: { select: { id: true, name: true } } },
      orderBy: { gameModeId: "asc" },
    });
    snapshot.gameModes = rows.map((row: any) => row.gameMode);
  }

  if (fieldSet.has("gameEngines")) {
    const rows = await prisma.contentGameEngine.findMany({
      where: { contentId },
      include: { gameEngine: { select: { id: true, name: true } } },
      orderBy: { gameEngineId: "asc" },
    });
    snapshot.gameEngines = rows.map((row: any) => row.gameEngine);
  }

  if (fieldSet.has("perspectives")) {
    const rows = await prisma.contentPerspective.findMany({
      where: { contentId },
      include: { perspective: { select: { id: true, name: true } } },
      orderBy: { perspectiveId: "asc" },
    });
    snapshot.perspectives = rows.map((row: any) => row.perspective);
  }

  if (fieldSet.has("platforms")) {
    const rows = await prisma.contentPlatform.findMany({
      where: { contentId },
      include: { platform: { select: { id: true, name: true } } },
      orderBy: { platformId: "asc" },
    });
    snapshot.platforms = rows.map((row: any) => ({
      id: row.platform.id,
      name: row.platform.name,
      releaseDate: row.releaseDate,
      link: row.link,
    }));
  }

  if (fieldSet.has("companies")) {
    const rows = await prisma.contentCompany.findMany({
      where: { contentId },
      include: {
        company: { select: { id: true, name: true } },
        companyRole: { select: { id: true, name: true } },
      },
      orderBy: [{ companyRoleId: "asc" }, { companyId: "asc" }],
    });
    snapshot.companies = rows.map((row: any) => ({
      id: row.company.id,
      name: row.company.name,
      companyRoleId: row.companyRoleId,
      companyRoleName: row.companyRole?.name || null,
    }));
  }

  if (fieldSet.has("screenshots")) {
    snapshot.screenshots = await prisma.contentScreenshot.findMany({
      where: { contentId },
      select: {
        id: true,
        imageUrl: true,
        difficulty: true,
        order: true,
        seasonNumber: true,
        isEnabledForQuiz: true,
        isSpoiler: true,
        isSensitive: true,
      },
      orderBy: [{ order: "asc" }, { id: "asc" }],
    });
  }

  if (fieldSet.has("expansions")) {
    snapshot.expansions = await prisma.expansion.findMany({
      where: { contentId },
      select: {
        id: true,
        name: true,
        description: true,
        posterUrl: true,
        releaseDate: true,
        type: true,
      },
      orderBy: { id: "asc" },
    });
  }

  if (fieldSet.has("bookPublications")) {
    const rows = await prisma.bookPublication.findMany({
      where: { contentId },
      include: { publisher: { select: { id: true, name: true } } },
      orderBy: [{ isOriginal: "desc" }, { id: "asc" }],
    });
    snapshot.bookPublications = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      isbn: row.isbn,
      publisher: row.publisher,
      translators: row.translators,
      language: row.language,
      pageCount: row.pageCount,
      coverUrl: row.coverUrl,
      publishedDate: row.publishedDate,
      editionType: row.editionType,
      format: row.format,
      isOriginal: row.isOriginal,
      isAbridged: row.isAbridged,
    }));
  }

  if (fieldSet.has("similarContentIds")) {
    const rows = await prisma.contentSimilarity.findMany({
      where: {
        OR: [{ content1Id: contentId }, { content2Id: contentId }],
      },
      select: { content1Id: true, content2Id: true },
    });
    snapshot.similarContentIds = rows
      .map((row: any) =>
        row.content1Id === contentId ? row.content2Id : row.content1Id,
      )
      .sort();
  }

  if (fieldSet.has("images")) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { posterImageId: true, backdropImageId: true },
    });
    snapshot.images = await prisma.contentImage.findMany({
      where: { contentId },
      select: { id: true, filePath: true, type: true, version: true },
      orderBy: { id: "asc" },
    });
    snapshot.images = {
      posterImageId: content?.posterImageId ?? null,
      backdropImageId: content?.backdropImageId ?? null,
      rows: snapshot.images,
    };
  }

  if (fieldSet.has("citationsReceived")) {
    snapshot.citationsReceived = await prisma.contentCitation.findMany({
      where: { citedContentId: contentId },
      select: { citingContentId: true, note: true, imageUrl: true },
      orderBy: { citingContentId: "asc" },
    });
  }
  if (fieldSet.has("citationsMade")) {
    const rows = await prisma.contentCitation.findMany({
      where: { citingContentId: contentId },
      select: { citedContentId: true, note: true, imageUrl: true },
      orderBy: { citedContentId: "asc" },
    });
    snapshot.citationsMade = rows.map((row: any) => ({
      citingContentId: row.citedContentId,
      note: row.note,
      imageUrl: row.imageUrl,
    }));
  }

  return normalizeAuditValue(snapshot);
}

async function recordContentEditHistory(
  prisma: any,
  params: {
    contentId: string;
    actorUserId?: string | null;
    action: "CREATE" | "UPDATE" | "ROLLBACK" | "DELETE";
    before?: any;
    after?: any;
    changedFields?: string[];
    beforeOverrides?: Record<string, any>;
    afterOverrides?: Record<string, any>;
    summary?: string;
  },
) {
  const changedFields =
    params.changedFields ?? getChangedScalarFields(params.before, params.after);

  await prisma.contentEditHistory.create({
    data: {
      contentId: params.contentId,
      actorUserId: params.actorUserId || null,
      action: params.action,
      summary: params.summary,
      changedFields,
      before:
        params.before || params.beforeOverrides
          ? pickChangedValues(params.before, changedFields, params.beforeOverrides)
          : null,
      after:
        params.after || params.afterOverrides
          ? pickChangedValues(params.after, changedFields, params.afterOverrides)
          : null,
    },
  });
}

@Resolver()
export class AdminContentMutationResolver {
  // ------------------------------------------
  // CREATE CONTENT
  // ------------------------------------------
  @Authorized()
  @Mutation(() => AdminContent)
  async createContent(
    @Arg("input", () => CreateContentInput) input: CreateContentInput,
    @Ctx() context: GraphQLContext,
  ): Promise<AdminContent> {
    requireAdminOrModerator(context.user);
    await assertExternalIdIsUnique(context.prisma, input);
    const id = await generateContentSlug(context.prisma, input.title, input.releaseDate);
    const preparedInput = await prepareContentMedia(context.prisma, id, input, false);
    return context.prisma.$transaction(
      async (tx) => this.createContentInTransaction(id, preparedInput, { ...context, prisma: tx as any }),
      { timeout: CONTENT_MUTATION_TRANSACTION_TIMEOUT_MS },
    );
  }

  private async createContentInTransaction(
    id: string,
    input: CreateContentInput,
    { user, prisma }: GraphQLContext,
  ): Promise<AdminContent> {
    requireAdminOrModerator(user);
    await assertExternalIdIsUnique(prisma, input);
    logger.info(`[Admin] Creating content: ${input.title} (id=${id})`);

    try {
      const shouldNormalizeCredits =
        input.contentTypeId === 1 || input.contentTypeId === 2;
      const normalizedCast = shouldNormalizeCredits
        ? await normalizeCastJsonForSave(prisma, input.cast)
        : (input.cast || null);
      const normalizedCrew = shouldNormalizeCredits
        ? await normalizeCrewJsonForSave(prisma, input.crew)
        : (input.crew || null);
      const normalizedStatus = inferNormalizedContentStatus({
        contentTypeId: input.contentTypeId,
        releaseDate: input.releaseDate,
        firstAirDate: input.firstAirDate,
        lastAirDate: input.lastAirDate,
        inProduction: input.inProduction,
      });

      // Ensure languages exist in the lookup table
      if (input.languages && input.languages.length > 0) {
        await ensureLanguagesExist(prisma, input.languages);
      }
      const resolvedAgeRatingId = await resolveAgeRatingId(prisma, input);
      const musicReleaseType = await resolveMusicReleaseType(
        prisma,
        input.contentTypeId,
        input.musicReleaseType,
      );

      // 1. Create main content record
      await prisma.content.create({
        data: {
          id,
          title: input.title,
          tmdbId: input.tmdbId || null,
          igdbId: input.igdbId || null,
          originalTitle: input.originalTitle || null,
          alternativeTitles: Array.from(new Set((input.alternativeTitles || []).map((item) => item.trim()).filter(Boolean))),
          contentTypeId: input.contentTypeId,
          description: input.description || null,
          releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
          runtime: input.runtime || null,
          status: normalizedStatus,
          isContinuing: input.isContinuing ?? false,
          budget: input.budget ? BigInt(input.budget) : null,
          revenue: input.revenue ? BigInt(input.revenue) : null,
          franchiseId: input.franchiseName ? (await findOrCreateFranchise(prisma, input.franchiseName)).id : (input.franchiseId || null),
          averageDuration: input.averageDuration || null,
          numberOfEpisodes: input.numberOfEpisodes || null,
          numberOfSeasons: input.numberOfSeasons || null,
          tvType: input.tvType || null,
          inProduction: input.inProduction ?? null,
          firstAirDate: input.firstAirDate

            ? new Date(input.firstAirDate)
            : null,
          lastAirDate: input.lastAirDate ? new Date(input.lastAirDate) : null,
          isbn: input.isbn || null,
          pageCount: input.pageCount || null,
          previewLink: input.previewLink || null,
          infoLink: input.infoLink || null,
          spotifyUrl: input.spotifyUrl || null,
          explicit: input.explicit ?? null,
          label: input.label || null,
          totalTracks: input.totalTracks ?? null,
          musicReleaseType,
          additionalRatingCategories: input.additionalRatingCategories || [],

          authors: parseAuthors(input.authors),
          languages: input.languages?.map((l) => l.name) || [],
          ageRatingId: resolvedAgeRatingId ?? null,
          cast: normalizedCast,
          crew: normalizedCrew,
          seasonsData: input.seasons || null,
          trailerUrl: input.trailerUrl || null,
          reviewVideoUrl: input.reviewVideoUrl || null,
          gameplayVideoUrl: input.gameplayVideoUrl || null,
          spotifyPlaylistUrl: input.spotifyPlaylistUrl || null,
          awards: Array.from(new Set((input.awards || []).map((item) => item.trim()).filter(Boolean))),
          lockedFields: input.lockedFields || [],
          autoSelectHighestVotedMedia: input.autoSelectHighestVotedMedia ?? true,
        },
      });

      // 2. Many-to-many relations
      if (input.genres && input.genres.length > 0) {
        await linkGenres(prisma, id, input.genres, input.contentTypeId);
      }
      if (input.themes && input.themes.length > 0) {
        await linkThemes(prisma, id, input.themes);
      }
      if (input.moods && input.moods.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.moods,
          "mood",
          "contentMood",
          "moodId",
        );
      }
      if (input.gameModes && input.gameModes.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.gameModes,
          "gameMode",
          "contentGameMode",
          "gameModeId",
        );
      }
      if (input.gameEngines && input.gameEngines.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.gameEngines,
          "gameEngine",
          "contentGameEngine",
          "gameEngineId",
        );
      }
      if (input.perspectives && input.perspectives.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.perspectives,
          "perspective",
          "contentPerspective",
          "perspectiveId",
        );
      }
      if (input.platforms && input.platforms.length > 0) {
          await linkPlatforms(prisma, id, input.platforms);
        }
      if (input.companies && input.companies.length > 0) {
        await linkCompanies(prisma, id, input.companies);
      }

      // 3. Poster ve Backdrop
      await saveImages(prisma, id, input.posterUrl, input.backdropUrl, false, input.images, true);
      await syncDefaultBookPublication(prisma, id, input);

      // 4. Screenshots
      if (input.screenshots && input.screenshots.length > 0) {
        await saveScreenshots(prisma, id, input.screenshots, false, true);
      }

      // 5. Expansions
      if (input.expansions && input.expansions.length > 0) {
        await saveExpansions(prisma, id, input.expansions, false, true);
      }

      // 6. Cast & Crew
      if (normalizedCast) {
        await processCast(prisma, id, normalizedCast);
      }
      if (normalizedCrew) {
        await processCrew(prisma, id, normalizedCrew);
      }

      // 7. Seasons
      if (input.seasons) {
        await processSeasons(prisma, id, input.seasons);
      }

      // 8. Similar Content (Bidirectional)
      if (input.similarContentIds) {
        await processSimilarContents(prisma, id, input.similarContentIds);
      }

      // 9. Citations
      if (input.citationsReceived || input.citationsMade) {
        await processContentCitations(prisma, id, input.citationsReceived, input.citationsMade);
      }


      const createdContent = await prisma.content.findUnique({
        where: { id },
        select: contentAuditSelect,
      });
      const createdRelationFields = getRelationChangedFields(
        input as UpdateContentInput,
        input.contentTypeId,
      );
      const createdRelations = createdRelationFields.length > 0
        ? await getContentRelationAuditSnapshot(prisma, id, createdRelationFields)
        : {};
      await recordContentEditHistory(prisma, {
        contentId: id,
        actorUserId: user?.id,
        action: "CREATE",
        after: createdContent,
        changedFields: [
          ...(createdContent
            ? Object.keys(contentAuditSelect).filter((field) => field !== "id")
            : []),
          ...createdRelationFields,
        ],
        afterOverrides: createdRelations,
        summary: `Content created: ${input.title}`,
      });

      logger.success(`[Admin] Content created: ${input.title} (id=${id})`);
      return fetchAdminContent(prisma, id) as Promise<AdminContent>;
    } catch (error) {
      logger.error(`[Admin] Error creating content:`, error);
      throw error;
    }
  }

  // ------------------------------------------
  // UPDATE CONTENT
  // ------------------------------------------
  @Authorized(["admin", "moderator"])
  @Mutation(() => AdminContent)
  async updateContent(
    @Arg("id", () => String) id: string,
    @Arg("input", () => UpdateContentInput) input: UpdateContentInput,
    @Ctx() context: GraphQLContext,
  ): Promise<AdminContent> {
    requireAdminOrModerator(context.user);
    const content = await context.prisma.content.findUnique({
      where: { id },
      select: { lockedFields: true },
    });
    if (!content) throw new Error("Content not found");
    const effectiveInput = { ...input };
    if (!hasField(input, "lockedFields")) {
      for (const field of content.lockedFields) {
        delete (effectiveInput as Record<string, unknown>)[field];
      }
    }
    const preparedInput = await prepareContentMedia(context.prisma, id, effectiveInput, true);
    return context.prisma.$transaction(
      async (tx) => this.updateContentInTransaction(id, preparedInput, { ...context, prisma: tx as any }),
      { timeout: CONTENT_MUTATION_TRANSACTION_TIMEOUT_MS },
    );
  }

  private async updateContentInTransaction(
    id: string,
    input: UpdateContentInput,
    { user, prisma }: GraphQLContext,
    rollbackHistoryId?: number,
    directRestore?: Record<string, any>,
    relationRestore?: Record<string, any>,
    imageRestore?: { rows: Array<{ id: number; filePath: string; type: string; version?: string }> },
  ): Promise<AdminContent> {
    requireAdminOrModerator(user);
    logger.info(`[Admin] Updating content: ${id} - ${input.title}`);

    try {
      await prisma.$queryRaw`SELECT id FROM content WHERE id = ${id} FOR UPDATE`;
      const existingContent = await prisma.content.findUnique({
        where: { id },
        select: contentAuditSelect,
      });
      if (!existingContent) throw new Error("Content not found");

      const currentLockedFields = existingContent?.lockedFields || [];
      const isManualLockUpdate = hasField(input, "lockedFields");
      if (!isManualLockUpdate && currentLockedFields.length > 0) {
        for (const field of currentLockedFields) {
          delete (input as any)[field];
        }
      }

      const effectiveContentTypeId =
        input.contentTypeId ?? existingContent?.contentTypeId ?? 1;
      const relationChangedFields = getRelationChangedFields(input, effectiveContentTypeId);
      const relationBefore = relationChangedFields.length > 0
        ? await getContentRelationAuditSnapshot(prisma, id, relationChangedFields)
        : {};
      if (imageRestore) {
        for (const image of imageRestore.rows) {
          const existingImage = await prisma.contentImage.findUnique({ where: { id: image.id } });
          if (!existingImage) {
            await prisma.contentImage.create({
              data: {
                id: image.id,
                contentId: id,
                filePath: image.filePath,
                type: image.type,
                version: image.version ?? "original",
              },
            });
          } else if (existingImage.contentId !== id || existingImage.filePath !== image.filePath) {
            throw new Error(`Image ${image.id} no longer belongs to this content`);
          }
        }
      }
      await assertExternalIdIsUnique(
        prisma,
        { ...input, contentTypeId: effectiveContentTypeId },
        id,
      );
      let nextFranchiseId = existingContent?.franchiseId || null;
      if (hasField(input, "franchiseName")) {
        nextFranchiseId = input.franchiseName
          ? (await findOrCreateFranchise(prisma, input.franchiseName)).id
          : null;
      } else if (hasField(input, "franchiseId")) {
        nextFranchiseId = input.franchiseId || null;
      }
      const shouldNormalizeCredits =
        effectiveContentTypeId === 1 || effectiveContentTypeId === 2;
      const normalizedCast = hasField(input, "cast") && shouldNormalizeCredits
        ? await normalizeCastJsonForSave(prisma, input.cast)
        : (hasField(input, "cast") ? (input.cast || null) : undefined);
      const normalizedCrew = hasField(input, "crew") && shouldNormalizeCredits
        ? await normalizeCrewJsonForSave(prisma, input.crew)
        : (hasField(input, "crew") ? (input.crew || null) : undefined);
      const shouldRecalculateStatus =
        hasField(input, "contentTypeId") ||
        hasField(input, "releaseDate") ||
        hasField(input, "firstAirDate") ||
        hasField(input, "lastAirDate") ||
        hasField(input, "inProduction");
      const normalizedStatus = inferNormalizedContentStatus({
        contentTypeId: effectiveContentTypeId,
        releaseDate: hasField(input, "releaseDate")
          ? input.releaseDate
          : existingContent?.releaseDate,
        firstAirDate: hasField(input, "firstAirDate")
          ? input.firstAirDate
          : existingContent?.firstAirDate,
        lastAirDate: hasField(input, "lastAirDate")
          ? input.lastAirDate
          : existingContent?.lastAirDate,
        inProduction: hasField(input, "inProduction")
          ? input.inProduction
          : existingContent?.inProduction,
      });
      const castChanged =
        hasField(input, "cast") && normalizedCast !== (existingContent?.cast || null);
      const crewChanged =
        hasField(input, "crew") && normalizedCrew !== (existingContent?.crew || null);
      const seasonsChanged =
        hasField(input, "seasons") && input.seasons !== (existingContent?.seasonsData || null);

      // Ensure languages exist in the lookup table
      if (input.languages && input.languages.length > 0) {
        await ensureLanguagesExist(prisma, input.languages);
      }
      const resolvedAgeRatingId = await resolveAgeRatingId(prisma, input);

      console.log("UPDATE CONTENT INPUT RECEIVED:", JSON.stringify(input, null, 2));

      // 1. Update main content record
      const contentData: any = {};
      if (hasField(input, "title")) contentData.title = input.title;
      if (hasField(input, "tmdbId")) contentData.tmdbId = input.tmdbId ?? null;
      if (hasField(input, "igdbId")) contentData.igdbId = input.igdbId ?? null;
      if (hasField(input, "contentTypeId")) contentData.contentTypeId = input.contentTypeId;
      if (hasField(input, "additionalRatingCategories")) {
        contentData.additionalRatingCategories = input.additionalRatingCategories || [];
      }
      if (hasField(input, "releaseDate")) {
        contentData.releaseDate = input.releaseDate ? new Date(input.releaseDate) : null;
      }
      if (hasField(input, "firstAirDate")) {
        contentData.firstAirDate = input.firstAirDate ? new Date(input.firstAirDate) : null;
      }
      if (hasField(input, "lastAirDate")) {
        contentData.lastAirDate = input.lastAirDate ? new Date(input.lastAirDate) : null;
      }
      if (shouldRecalculateStatus) contentData.status = normalizedStatus;
      if (hasField(input, "isContinuing")) contentData.isContinuing = input.isContinuing ?? false;
      if (hasField(input, "inProduction")) contentData.inProduction = input.inProduction ?? null;
      if (hasField(input, "budget")) contentData.budget = input.budget ? BigInt(input.budget) : null;
      if (hasField(input, "revenue")) contentData.revenue = input.revenue ? BigInt(input.revenue) : null;
      if (hasField(input, "franchiseName") || hasField(input, "franchiseId")) {
        contentData.franchiseId = nextFranchiseId;
      }
      setNullableString(contentData, input, "originalTitle");
      if (hasField(input, "alternativeTitles")) {
        contentData.alternativeTitles = Array.from(
          new Set((input.alternativeTitles || []).map((item) => item.trim()).filter(Boolean)),
        );
      }
      setNullableString(contentData, input, "description");
      setNullableString(contentData, input, "tvType");
      setNullableString(contentData, input, "isbn");
      setNullableString(contentData, input, "previewLink");
      setNullableString(contentData, input, "infoLink");
      setNullableString(contentData, input, "trailerUrl");
      setNullableString(contentData, input, "reviewVideoUrl");
      setNullableString(contentData, input, "gameplayVideoUrl");
      setNullableString(contentData, input, "spotifyPlaylistUrl");
      setNullableString(contentData, input, "spotifyUrl");
      setNullableString(contentData, input, "label");
      if (hasField(input, "musicReleaseType")) {
        contentData.musicReleaseType = await resolveMusicReleaseType(
          prisma,
          effectiveContentTypeId,
          input.musicReleaseType,
        );
      }

      if (hasField(input, "explicit")) contentData.explicit = input.explicit ?? null;

      setNullableNumber(contentData, input, "runtime");
      setNullableNumber(contentData, input, "averageDuration");
      setNullableNumber(contentData, input, "numberOfEpisodes");
      setNullableNumber(contentData, input, "numberOfSeasons");
      setNullableNumber(contentData, input, "pageCount");
      setNullableNumber(contentData, input, "totalTracks");
      if (hasField(input, "authors")) contentData.authors = parseAuthors(input.authors);
      if (hasField(input, "languages")) {
        contentData.languages = input.languages?.map((l) => l.name) || [];
      }
      if (resolvedAgeRatingId !== undefined) contentData.ageRatingId = resolvedAgeRatingId;
      if (hasField(input, "awards")) {
        contentData.awards = Array.from(
          new Set((input.awards || []).map((item) => item.trim()).filter(Boolean)),
        );
      }
      if (hasField(input, "cast")) contentData.cast = normalizedCast ?? null;
      if (hasField(input, "crew")) contentData.crew = normalizedCrew ?? null;
      if (hasField(input, "seasons")) contentData.seasonsData = input.seasons || null;
      if (hasField(input, "lockedFields")) {
        contentData.lockedFields = Array.from(new Set(input.lockedFields || []));
      }
      if (hasField(input, "autoSelectHighestVotedMedia")) {
        contentData.autoSelectHighestVotedMedia = input.autoSelectHighestVotedMedia ?? true;
      }

      const updatedContent =
        Object.keys(contentData).length > 0
          ? await prisma.content.update({
              where: { id },
              data: contentData,
              select: contentAuditSelect,
            })
          : existingContent;

      // 2. Delete old relations before re-creating
      if (castChanged) {
        await prisma.contentPerson.deleteMany({
          where: {
            contentId: id,
            role: { in: ACTOR_ROLES },
          },
        });
      }
      if (crewChanged) {
        await prisma.contentPerson.deleteMany({
          where: {
            contentId: id,
            role: {
              notIn: ACTOR_ROLES,
            },
          },
        });
      }
      // Removed the mass deletion of tvSeason and tvEpisode to prevent wiping out associated UserEpisodeLog data.
      // processSeasons now handles surgical cleanup of removed seasons and episodes.
      if (input.genres !== undefined) {
        await prisma.contentGenre.deleteMany({ where: { contentId: id } });
      }
      if (input.themes !== undefined) {
        await prisma.contentTheme.deleteMany({ where: { contentId: id } });
      }
      if (input.moods !== undefined) {
        await prisma.contentMood.deleteMany({ where: { contentId: id } });
      }
      if (input.gameModes !== undefined) {
        await prisma.contentGameMode.deleteMany({ where: { contentId: id } });
      }
      if (input.gameEngines !== undefined) {
        await prisma.contentGameEngine.deleteMany({ where: { contentId: id } });
      }
      if (input.perspectives !== undefined) {
        await prisma.contentPerspective.deleteMany({
          where: { contentId: id },
        });
      }
      if (input.platforms !== undefined) {
        await prisma.contentPlatform.deleteMany({ where: { contentId: id } });
      }
      if (input.companies !== undefined) {
        await prisma.contentCompany.deleteMany({ where: { contentId: id } });
      }

      // 3. Re-create many-to-many relations
      if (input.genres && input.genres.length > 0) {
        await linkGenres(prisma, id, input.genres, effectiveContentTypeId);
      }
      if (input.themes && input.themes.length > 0) {
        await linkThemes(prisma, id, input.themes);
      }
      if (input.moods && input.moods.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.moods,
          "mood",
          "contentMood",
          "moodId",
        );
      }
      if (input.gameModes && input.gameModes.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.gameModes,
          "gameMode",
          "contentGameMode",
          "gameModeId",
        );
      }
      if (input.gameEngines && input.gameEngines.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.gameEngines,
          "gameEngine",
          "contentGameEngine",
          "gameEngineId",
        );
      }
      if (input.perspectives && input.perspectives.length > 0) {
        await linkLookups(
          prisma,
          id,
          input.perspectives,
          "perspective",
          "contentPerspective",
          "perspectiveId",
        );
      }
      if (input.platforms && input.platforms.length > 0) {
          await linkPlatforms(prisma, id, input.platforms);
        }
      if (input.companies && input.companies.length > 0) {
        await linkCompanies(prisma, id, input.companies);
      }

      if (hasField(input, "franchiseName") || hasField(input, "franchiseId")) {
        await reconcileSimilarityNodeForFranchiseUpgrade(prisma, {
          contentId: id,
          previousFranchiseId: existingContent?.franchiseId || null,
          nextFranchiseId,
        });
      }

      // Similar Content (Bidirectional)
      if (input.similarContentIds !== undefined) {
        await processSimilarContents(prisma, id, input.similarContentIds);
      }

      // Citations
      if (input.citationsReceived !== undefined || input.citationsMade !== undefined) {
        await processContentCitations(prisma, id, input.citationsReceived, input.citationsMade);
      }


      // 4. Images (update mode) - null means explicitly removed, undefined means not changed
      // 4. Poster ve Backdrop
      if (
        input.posterUrl !== undefined ||
        input.backdropUrl !== undefined ||
        input.images !== undefined
      ) {
        await saveImages(prisma, id, input.posterUrl, input.backdropUrl, true, input.images, true);
      }
      if (
        input.bookPublications !== undefined ||
        input.isbn !== undefined ||
        input.pageCount !== undefined ||
        input.publishedDate !== undefined ||
        input.translators !== undefined
      ) {
        await syncDefaultBookPublication(prisma, id, {
          ...input,
          contentTypeId: effectiveContentTypeId,
        } as CreateContentInput);
      }

      // 5. Screenshots
      if (input.screenshots !== undefined) {
        await saveScreenshots(prisma, id, input.screenshots || [], true, true);
      }

      // 6. Expansions
      if (input.expansions !== undefined) {
        await saveExpansions(prisma, id, input.expansions || [], true, true);
      }

      // 7. Cast & Crew
      if (castChanged && normalizedCast) {
        await processCast(prisma, id, normalizedCast);
      }
      if (crewChanged && normalizedCrew) {
        await processCrew(prisma, id, normalizedCrew);
      }

      // 8. Seasons
      if (seasonsChanged) {
        await processSeasons(prisma, id, input.seasons || "[]");
      }

      if (didContentBecomeReleased(existingContent, updatedContent)) {
        await notifyUsersOfReleasedContent(prisma, id);
      }

      if (directRestore && Object.keys(directRestore).length > 0) {
        await prisma.content.update({ where: { id }, data: directRestore });
      }
      if (Array.isArray(relationRestore?.platforms)) {
        for (const platform of relationRestore.platforms) {
          await prisma.contentPlatform.update({
            where: { contentId_platformId: { contentId: id, platformId: platform.id } },
            data: {
              releaseDate: platform.releaseDate ? new Date(platform.releaseDate) : null,
              link: platform.link ?? null,
            },
          });
        }
      }
      if (Array.isArray(relationRestore?.bookPublications) && relationRestore.bookPublications.length === 0) {
        const linkedLogs = await prisma.userContentLog.count({
          where: { bookPublication: { contentId: id } },
        });
        if (linkedLogs > 0) {
          throw new Error("Book publications with user logs cannot be removed");
        }
        await prisma.bookPublication.deleteMany({ where: { contentId: id } });
      }
      const finalContent = await prisma.content.findUnique({
        where: { id },
        select: contentAuditSelect,
      });
      const relationAfter =
        relationChangedFields.length > 0
          ? await getContentRelationAuditSnapshot(prisma, id, relationChangedFields)
          : {};
      const changedRelationFields = relationChangedFields.filter((field) =>
        comparableAuditValue(field, relationBefore[field]) !==
        comparableAuditValue(field, relationAfter[field]),
      );
      const changedFields = [
        ...new Set([
          ...getChangedScalarFields(existingContent, finalContent),
          ...changedRelationFields,
        ]),
      ];
      if (changedFields.length > 0) {
        await recordContentEditHistory(prisma, {
          contentId: id,
          actorUserId: user?.id,
          action: rollbackHistoryId === undefined ? "UPDATE" : "ROLLBACK",
          before: existingContent,
          after: finalContent,
          changedFields,
          beforeOverrides: relationBefore,
          afterOverrides: relationAfter,
          summary: rollbackHistoryId === undefined
            ? `Content updated: ${input.title || finalContent?.title || id}`
            : `Reverted edit #${rollbackHistoryId}`,
        });
      }

      logger.success(`[Admin] Content updated: ${id}`);
      return fetchAdminContent(prisma, id) as Promise<AdminContent>;
    } catch (error) {
      logger.error(`[Admin] Error updating content:`, error);
      throw error;
    }
  }

  @Authorized(["admin", "moderator"])
  @Mutation(() => AdminContent)
  async rollbackContentEditHistory(
    @Arg("historyId", () => Int) historyId: number,
    @Ctx() context: GraphQLContext,
  ): Promise<AdminContent> {
    const { user, prisma } = context;
    requireAdminOrModerator(user);

    return prisma.$transaction(async (tx) => {
      const history = await tx.contentEditHistory.findUnique({ where: { id: historyId } });
      if (!history?.contentId) throw new Error("Edit history record not found");
      if (!["UPDATE", "ROLLBACK"].includes(history.action) || !history.before || !history.after) {
        throw new Error("This history record has no reversible snapshots");
      }

      const contentId = history.contentId;
      await tx.$queryRaw`SELECT id FROM content WHERE id = ${contentId} FOR UPDATE`;
      const before = history.before as Record<string, any>;
      const after = history.after as Record<string, any>;
      const currentContent = await tx.content.findUnique({
        where: { id: contentId },
        select: contentAuditSelect,
      });
      if (!currentContent) throw new Error("Content not found");
      const relationFields = history.changedFields.filter((field) =>
        !Object.prototype.hasOwnProperty.call(contentAuditSelect, field),
      );
      const currentRelations = await getContentRelationAuditSnapshot(tx, contentId, relationFields);
      const current = { ...normalizeAuditValue(currentContent), ...currentRelations };
      const conflicts = history.changedFields.filter((field) =>
        !Object.prototype.hasOwnProperty.call(before, field) ||
        !Object.prototype.hasOwnProperty.call(after, field) ||
        !Object.prototype.hasOwnProperty.call(current, field) ||
        JSON.stringify(current[field]) !== JSON.stringify(after[field]),
      );
      if (conflicts.length > 0) {
        throw new Error(`Cannot revert: these fields changed after this edit: ${conflicts.join(", ")}`);
      }

      const input: Record<string, any> = {};
      const directFields = new Set(["status", "isEnabledForQuiz", "runtime", "averageDuration"]);
      for (const field of history.changedFields) {
        if (directFields.has(field) || field === "images") continue;
        const value = before[field];
        if (field === "seasonsData") input.seasons = value;
        else if (field === "languages") input.languages = value.map((name: string) => ({ name }));
        else if (field === "authors") input.authors = JSON.stringify(value);
        else if (field === "budget" || field === "revenue") input[field] = value === null ? null : String(value);
        else if (field === "genres" || field === "themes" || field === "moods" ||
          field === "gameModes" || field === "gameEngines" || field === "perspectives" ||
          field === "platforms" || field === "companies") input[field] = value;
        else if (field === "screenshots") input.screenshots = value;
        else if (field === "expansions") input.expansions = value;
        else if (field === "bookPublications") input.bookPublications = value;
        else if (field === "similarContentIds") input.similarContentIds = value;
        else if (field === "citationsReceived") input.citationsReceived = value;
        else if (field === "citationsMade") input.citationsMade = value;
        else if (field === "posterUrl" || field === "backdropUrl") input[field] = value;
        else if (Object.prototype.hasOwnProperty.call(contentAuditSelect, field)) input[field] = value;
        else throw new Error(`Unsupported history field: ${field}`);
      }
      if (history.changedFields.includes("images")) {
        const imageSnapshot = before.images;
        if (!imageSnapshot || !Array.isArray(imageSnapshot.rows)) {
          throw new Error("Image history snapshot is incomplete");
        }
        input.images = imageSnapshot.rows;
        const primaryPoster = imageSnapshot.rows.find((row: any) => row.id === imageSnapshot.posterImageId);
        const primaryBackdrop = imageSnapshot.rows.find((row: any) => row.id === imageSnapshot.backdropImageId);
        input.posterUrl = primaryPoster?.filePath ?? null;
        input.backdropUrl = primaryBackdrop?.filePath ?? null;
      }
      // A rollback is an explicit moderator action and must also restore locked fields.
      if (!Object.prototype.hasOwnProperty.call(input, "lockedFields")) {
        input.lockedFields = currentContent.lockedFields;
      }

      const restored = await this.updateContentInTransaction(
        contentId,
        input as UpdateContentInput,
        { ...context, prisma: tx as any },
        historyId,
        Object.fromEntries(
          history.changedFields
            .filter((field) => directFields.has(field))
            .map((field) => [field, before[field]]),
        ),
        before,
        history.changedFields.includes("images") ? before.images : undefined,
      );
      const restoredContent = await tx.content.findUnique({
        where: { id: contentId },
        select: contentAuditSelect,
      });
      const restoredRelations = await getContentRelationAuditSnapshot(tx, contentId, relationFields);
      const restoredValues = { ...normalizeAuditValue(restoredContent), ...restoredRelations };
      const incomplete = history.changedFields.filter((field) =>
        comparableAuditValue(field, restoredValues[field]) !== comparableAuditValue(field, before[field]),
      );
      if (incomplete.length > 0) {
        throw new Error(`Cannot restore these fields exactly: ${incomplete.join(", ")}`);
      }
      return restored;
    }, { timeout: CONTENT_MUTATION_TRANSACTION_TIMEOUT_MS });
  }

  // ------------------------------------------
  // DELETE CONTENT
  // ------------------------------------------
  @Authorized()
  @Mutation(() => Boolean)
  async deleteContent(
    @Arg("id", () => String) id: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    requireAdmin(user);
    logger.info(`[Admin] Deleting content: ${id}`);

    const beforeContent = await prisma.content.findUnique({
      where: { id },
      select: contentAuditSelect,
    });
    if (!beforeContent) throw new Error("Content not found");
    if (beforeContent.isDeleted) return true;

    const mediaAuditFields = ["images", "screenshots", "expansions"];
    const mediaBefore = await getContentRelationAuditSnapshot(prisma, id, mediaAuditFields);

    const contentImages = await prisma.contentImage.findMany({
      where: { contentId: id },
      select: { filePath: true },
    });

    const screenshots = await prisma.contentScreenshot.findMany({
      where: { contentId: id },
      select: { imageUrl: true },
    });

    const expansions = await prisma.expansion.findMany({
      where: { contentId: id },
      select: { posterUrl: true },
    });

    const seasons = await prisma.tvSeason.findMany({
      where: { tvShowId: id },
      select: { posterUrl: true },
    });

    const episodes = await prisma.tvEpisode.findMany({
      where: { tvShowId: id },
      select: { stillUrl: true },
    });

    // Clean up all user-related data before soft delete
    logger.info(`[Admin] Cleaning up user data for content: ${id}`);

    const deletedUserLogs = await prisma.userContentLog.deleteMany({
      where: { contentId: id },
    });
    logger.debug(`[Admin] Deleted ${deletedUserLogs.count} user content logs`);

    const deletedEpisodeLogs = await prisma.userEpisodeLog.deleteMany({
      where: { episode: { tvShowId: id } },
    });
    logger.debug(
      `[Admin] Deleted ${deletedEpisodeLogs.count} user episode logs`,
    );

    const deletedFeatured = await prisma.userFeaturedContent.deleteMany({
      where: { contentId: id },
    });
    logger.debug(
      `[Admin] Deleted ${deletedFeatured.count} featured content entries`,
    );

    const deletedListItems = await prisma.userListItem.deleteMany({
      where: { contentId: id },
    });
    logger.debug(`[Admin] Deleted ${deletedListItems.count} list items`);

    const deletedRecommendations =
      await prisma.contentRecommendation.deleteMany({
        where: { contentId: id },
      });
    logger.debug(
      `[Admin] Deleted ${deletedRecommendations.count} recommendations`,
    );

    const deletedExpansionLogs = await prisma.userExpansionLog.deleteMany({
      where: { expansion: { contentId: id } },
    });
    logger.debug(
      `[Admin] Deleted ${deletedExpansionLogs.count} expansion logs`,
    );

    const deletedNotifications = await prisma.notification.deleteMany({
      where: { contentId: id },
    });
    logger.debug(`[Admin] Deleted ${deletedNotifications.count} notifications`);

    // Delete discussions (comments and votes cascade via Prisma relations)
    const deletedDiscussions = await prisma.discussion.updateMany({
      where: { contentId: id, isDeleted: false },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
    logger.debug(`[Admin] Soft-deleted ${deletedDiscussions.count} discussions`);

    // Soft delete - mark as deleted instead of permanent removal
    await prisma.content.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        // Reset aggregation counters
        consumeCount: 0,
        favoriteCount: 0,
        discussionCount: 0,
        totalRatingScore: null,
        totalRatingVotes: 0,
        totalPlaytimeMinutes: null,
        totalPlaytimeLogs: 0,
        ratingDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    });

    const imageUrlsToDelete = new Set<string>();
    const addBunnyUrl = (url?: string | null) => {
      if (url && isBunnyUrl(url)) imageUrlsToDelete.add(url);
    };

    for (const image of contentImages) addBunnyUrl(image.filePath);
    for (const screenshot of screenshots) addBunnyUrl(screenshot.imageUrl);
    for (const expansion of expansions) addBunnyUrl(expansion.posterUrl);
    for (const season of seasons) addBunnyUrl(season.posterUrl);
    for (const episode of episodes) addBunnyUrl(episode.stillUrl);

    const deletedAssetUrls = new Set<string>();
    for (const imageUrl of imageUrlsToDelete) {
      logger.info(`[Admin] Deleting Bunny Storage image: ${imageUrl}`);
      try {
        await deleteBunnyFile(imageUrl);
        deletedAssetUrls.add(imageUrl);
      } catch (error) {
        logger.warn(`[Admin] Could not delete Bunny Storage image ${imageUrl}: ${error}`);
      }
    }

    const deletedAssetUrl = (url?: string | null) => {
      return !!url && deletedAssetUrls.has(url);
    };
    const mediaAfter = await getContentRelationAuditSnapshot(prisma, id, mediaAuditFields);
    if (mediaAfter.images?.rows) {
      const retainedRows = mediaAfter.images.rows.filter(
        (image: any) => !deletedAssetUrl(image.filePath),
      );
      mediaAfter.images = {
        ...mediaAfter.images,
        posterImageId: retainedRows.some((image: any) => image.id === mediaAfter.images.posterImageId)
          ? mediaAfter.images.posterImageId
          : null,
        backdropImageId: retainedRows.some((image: any) => image.id === mediaAfter.images.backdropImageId)
          ? mediaAfter.images.backdropImageId
          : null,
        rows: retainedRows,
      };
    }
    mediaAfter.screenshots = mediaAfter.screenshots?.filter(
      (screenshot: any) => !deletedAssetUrl(screenshot.imageUrl),
    );
    mediaAfter.expansions = mediaAfter.expansions?.filter(
      (expansion: any) => !deletedAssetUrl(expansion.posterUrl),
    );
    const changedMediaFields = mediaAuditFields.filter((field) =>
      comparableAuditValue(field, mediaBefore[field]) !==
      comparableAuditValue(field, mediaAfter[field]),
    );
    const deletedContent = await prisma.content.findUnique({
      where: { id },
      select: contentAuditSelect,
    });
    const changedFields = [
      ...new Set([
        ...getChangedScalarFields(beforeContent, deletedContent),
        ...changedMediaFields,
      ]),
    ];
    if (changedFields.length > 0) {
      await recordContentEditHistory(prisma, {
        contentId: id,
        actorUserId: user.id,
        action: "DELETE",
        before: beforeContent,
        after: deletedContent,
        changedFields,
        beforeOverrides: mediaBefore,
        afterOverrides: mediaAfter,
        summary: `Content soft-deleted: ${beforeContent.title}`,
      });
    }

    logger.success(
      `Content soft-deleted, ${deletedAssetUrls.size} images removed from Bunny Storage`,
    );
    return true;
  }
}
