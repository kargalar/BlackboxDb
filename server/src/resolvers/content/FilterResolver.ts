import {
  Resolver,
  Query,
  Arg,
  Ctx,
  Int,
  ObjectType,
  Field,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import { GraphQLJSONObject } from "graphql-scalars";
import { logger } from "../../lib/logger";
import { getPeopleFilterCounts } from "../../lib/peopleFilterCounts";

@ObjectType()
export class FilterCountsResult {
  @Field(() => GraphQLJSONObject)
  genres: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  themes: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  moods: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  ageRatings: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  languages: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  publicationLanguages: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  platforms: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  actors: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  directors: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  companies: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  gameModes: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  perspectives: Record<string, number>;
}

@Resolver()
export class FilterResolver {
  @Query(() => FilterCountsResult)
  async getFilterCounts(
    @Arg("contentTypeId", () => Int, { nullable: true })
    contentTypeId: number | undefined,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<FilterCountsResult> {
    try {
      logger.info(
        `Calculating filter counts for contentTypeId: ${contentTypeId || "all"}`,
      );

      // Basic where clause for content type
      const contentWhere = {
        isDeleted: false,
        ...(contentTypeId ? { contentTypeId } : {}),
      };
      const OTHER_FILTER_ID = "__other__";

      const counts: FilterCountsResult = {
        genres: {},
        themes: {},
        moods: {},
        ageRatings: {},
        languages: {},
        publicationLanguages: {},
        platforms: {},
        actors: {},
        directors: {},
        companies: {},
        gameModes: {},
        perspectives: {},
      };

      // 1. Genres
      const genreCounts = await prisma.contentGenre.groupBy({
        by: ["genreId"],
        where: { content: contentWhere },
        _count: { genreId: true },
      });
      const genres = await prisma.genre.findMany({
        where: { id: { in: genreCounts.map((g) => g.genreId) } },
        select: { id: true, name: true },
      });
      const genreNameMap = new Map(genres.map((g) => [g.id, g.name]));

      let totalItemsWithGenre = 0;
      for (const gc of genreCounts) {
        const name = genreNameMap.get(gc.genreId);
        if (name) {
          counts.genres[name] = gc._count.genreId;
          totalItemsWithGenre += gc._count.genreId;
        }
      }

      // 2. Themes
      const themeCounts = await prisma.contentTheme.groupBy({
        by: ["themeId"],
        where: { content: contentWhere },
        _count: { themeId: true },
      });
      const themes = await prisma.theme.findMany({
        where: { id: { in: themeCounts.map((t) => t.themeId) } },
        select: { id: true, name: true },
      });
      const themeNameMap = new Map(themes.map((t) => [t.id, t.name]));

      let totalItemsWithTheme = 0;
      for (const tc of themeCounts) {
        const name = themeNameMap.get(tc.themeId);
        if (name) {
          counts.themes[name] = tc._count.themeId;
          totalItemsWithTheme += tc._count.themeId;
        }
      }

      // 3. Moods
      const moodCounts = await prisma.contentMood.groupBy({
        by: ["moodId"],
        where: { content: contentWhere },
        _count: { moodId: true },
      });
      const moods = await prisma.mood.findMany({
        where: { id: { in: moodCounts.map((m) => m.moodId) } },
        select: { id: true, name: true },
      });
      const moodNameMap = new Map(moods.map((m) => [m.id, m.name]));

      let totalItemsWithMood = 0;
      for (const mc of moodCounts) {
        const name = moodNameMap.get(mc.moodId);
        if (name) {
          counts.moods[name] = mc._count.moodId;
          totalItemsWithMood += mc._count.moodId;
        }
      }

      // 4. Age Ratings (Directly on Content logic)
      const ageRatingCounts = await prisma.content.groupBy({
        by: ["ageRatingId"],
        where: contentWhere,
        _count: { ageRatingId: true },
      });
      const ageRatings = await prisma.ageRating.findMany({
        where: {
          id: {
            in: ageRatingCounts
              .map((a) => a.ageRatingId)
              .filter(Boolean) as number[],
          },
        },
        select: { id: true, name: true },
      });
      const ageRatingNameMap = new Map(ageRatings.map((a) => [a.id, a.name]));

      for (const ac of ageRatingCounts) {
        if (ac.ageRatingId) {
          const name = ageRatingNameMap.get(ac.ageRatingId);
          if (name) counts.ageRatings[name] = ac._count.ageRatingId;
        } else {
          counts.ageRatings[OTHER_FILTER_ID] = ac._count.ageRatingId;
        }
      }

      // 5. Platforms
      const platformCounts = await prisma.contentPlatform.groupBy({
        by: ["platformId"],
        where: { content: contentWhere },
        _count: { platformId: true },
      });
      for (const pc of platformCounts) {
        counts.platforms[pc.platformId.toString()] = pc._count.platformId;
      }

      // 6. Languages (A bit tricky as it is string[] on content, let's group by iterating or returning total other)
      // Since it's a string[] array, prisma doesnt have native array element grouping
      // We'll leave language empty in grouping for now, or just do raw query
      const allContentWithLang = await prisma.content.findMany({
        where: contentWhere,
        select: { languages: true },
      });
      for (const c of allContentWithLang) {
        if (c.languages && c.languages.length > 0) {
          for (const lang of c.languages) {
            counts.languages[lang] = (counts.languages[lang] || 0) + 1;
          }
        } else {
          counts.languages[OTHER_FILTER_ID] =
            (counts.languages[OTHER_FILTER_ID] || 0) + 1;
        }
      }

      if (contentTypeId === 4) {
        const publicationLanguages = await prisma.bookPublication.findMany({
          where: { content: contentWhere },
          select: { contentId: true, language: true },
        });
        const contentIdsByLanguage = new Map<string, Set<string>>();
        const contentsWithoutPublicationLanguage = new Set<string>();

        for (const publication of publicationLanguages) {
          if (publication.language) {
            const set =
              contentIdsByLanguage.get(publication.language) ||
              new Set<string>();
            set.add(publication.contentId);
            contentIdsByLanguage.set(publication.language, set);
          } else {
            contentsWithoutPublicationLanguage.add(publication.contentId);
          }
        }

        for (const [language, contentIds] of contentIdsByLanguage.entries()) {
          counts.publicationLanguages[language] = contentIds.size;
          for (const contentId of contentIds) {
            contentsWithoutPublicationLanguage.delete(contentId);
          }
        }

        const contentsWithAnyPublicationLanguage = new Set(
          Array.from(contentIdsByLanguage.values()).flatMap((set) =>
            Array.from(set),
          ),
        );
        const bookContentCount = await prisma.content.count({
          where: contentWhere,
        });
        counts.publicationLanguages[OTHER_FILTER_ID] =
          bookContentCount - contentsWithAnyPublicationLanguage.size;
      }

      // 7. Companies
      const companyCounts = await prisma.contentCompany.groupBy({
        by: ["companyId"],
        where: { content: contentWhere },
        _count: { companyId: true },
      });
      for (const cc of companyCounts) {
        counts.companies[cc.companyId.toString()] = cc._count.companyId;
      }

      // 8. People (Actors and Directors)
      const peopleCounts = await getPeopleFilterCounts(prisma, contentTypeId);
      counts.actors = peopleCounts.actors;
      counts.directors = peopleCounts.directors;

      // Finally compute OTHER items which have 0 of that thing
      const totalContentCount = await prisma.content.count({
        where: contentWhere,
      });

      const contentsWithGenreCount = await prisma.content.count({
        where: { ...contentWhere, genres: { some: {} } },
      });
      counts.genres[OTHER_FILTER_ID] =
        totalContentCount - contentsWithGenreCount;

      const contentsWithThemeCount = await prisma.content.count({
        where: { ...contentWhere, contentThemes: { some: {} } },
      });
      counts.themes[OTHER_FILTER_ID] =
        totalContentCount - contentsWithThemeCount;

      const contentsWithMoodCount = await prisma.content.count({
        where: { ...contentWhere, contentMoods: { some: {} } },
      });
      counts.moods[OTHER_FILTER_ID] = totalContentCount - contentsWithMoodCount;

      const contentsWithPlatformCount = await prisma.content.count({
        where: { ...contentWhere, contentPlatforms: { some: {} } },
      });
      counts.platforms[OTHER_FILTER_ID] =
        totalContentCount - contentsWithPlatformCount;

      const contentsWithCompanyCount = await prisma.content.count({
        where: { ...contentWhere, companies: { some: {} } },
      });
      counts.companies[OTHER_FILTER_ID] =
        totalContentCount - contentsWithCompanyCount;

      const contentsWithActorCount = await prisma.content.count({
        where: {
          ...contentWhere,
          people: {
            some: {
              personRole: {
                label: {
                  in: ["actor", "voice", "voice_actor"],
                  mode: "insensitive",
                },
              },
            },
          },
        },
      });
      const contentsWithDirectorCount = await prisma.content.count({
        where: {
          ...contentWhere,
          people: {
            some: {
              personRole: {
                label: { equals: "director", mode: "insensitive" },
              },
            },
          },
        },
      });
      counts.actors[OTHER_FILTER_ID] =
        totalContentCount - contentsWithActorCount;
      counts.directors[OTHER_FILTER_ID] =
        totalContentCount - contentsWithDirectorCount;

      // 9. Game Modes
      const gameModeCounts = await prisma.contentGameMode.groupBy({
        by: ["gameModeId"],
        where: { content: contentWhere },
        _count: { gameModeId: true },
      });
      const gameModes = await prisma.gameMode.findMany({
        where: { id: { in: gameModeCounts.map((gm) => gm.gameModeId) } },
        select: { id: true, name: true },
      });
      const gameModeNameMap = new Map(gameModes.map((gm) => [gm.id, gm.name]));
      for (const gmc of gameModeCounts) {
        const name = gameModeNameMap.get(gmc.gameModeId);
        if (name) counts.gameModes[name] = gmc._count.gameModeId;
      }
      const contentsWithGameModeCount = await prisma.content.count({
        where: { ...contentWhere, contentGameModes: { some: {} } },
      });
      counts.gameModes[OTHER_FILTER_ID] =
        totalContentCount - contentsWithGameModeCount;

      // 10. Perspectives
      const perspectiveCounts = await prisma.contentPerspective.groupBy({
        by: ["perspectiveId"],
        where: { content: contentWhere },
        _count: { perspectiveId: true },
      });
      const perspectives = await prisma.perspective.findMany({
        where: { id: { in: perspectiveCounts.map((p) => p.perspectiveId) } },
        select: { id: true, name: true },
      });
      const perspectiveNameMap = new Map(
        perspectives.map((p) => [p.id, p.name]),
      );
      for (const pc of perspectiveCounts) {
        const name = perspectiveNameMap.get(pc.perspectiveId);
        if (name) counts.perspectives[name] = pc._count.perspectiveId;
      }
      const contentsWithPerspectiveCount = await prisma.content.count({
        where: { ...contentWhere, contentPerspectives: { some: {} } },
      });
      counts.perspectives[OTHER_FILTER_ID] =
        totalContentCount - contentsWithPerspectiveCount;

      logger.success(`Successfully calculated all filter counts`);
      return counts;
    } catch (error) {
      logger.error(`Error calculating filter counts:`, error);
      throw new Error("Failed to calculate filter counts");
    }
  }
}
