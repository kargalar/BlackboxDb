import { Resolver, Query, Arg, Ctx, Authorized, Int, FieldResolver, Root } from "type-graphql";
import { GraphQLContext } from "../../context";
import { requireAdminOrModerator } from "../../lib/authGuard";
import { AdminContent, ContentEditHistory, AdminContentEditHistoryResponse } from "../../types/admin";
import { Content } from "../../types/Content";
import { ContentCitation } from "../../types/ContentCitation";
import { logger } from "../../lib/logger";
import { ACTOR_ROLES } from "./AdminContentHelpers";
import { resolveSimilarContents } from "../../lib/similarContentHelper";
import { convertBookPublicationForGraphQL } from "../content/ContentUtils";

@Resolver(() => AdminContent)
export class AdminContentQueryResolver {


  @Authorized()
  @Query(() => [AdminContent])
  async listContent(
    @Arg("search", () => String, { nullable: true }) search: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 50 })
    limit: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<AdminContent[]> {
    requireAdminOrModerator(user);
    logger.info(`[Admin] Listing content, search: ${search}`);

    const where = search
      ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { isbn: { contains: search, mode: "insensitive" as const } },
          {
            bookPublications: {
              some: { isbn: { contains: search, mode: "insensitive" as const } },
            },
          },
        ],
      }
      : {};

    const content = await prisma.content.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        tmdbId: true,
        igdbId: true,
        originalTitle: true,
        alternativeTitles: true,
        contentTypeId: true,
        contentType: { select: { slug: true } },
        releaseDate: true,
        description: true,
        runtime: true,
        status: true,
        isContinuing: true,
        budget: true,
        revenue: true,
        franchiseId: true,
        franchise: { select: { id: true, name: true } },
        averageDuration: true,
        numberOfEpisodes: true,
        numberOfSeasons: true,
        tvType: true,
        inProduction: true,
        firstAirDate: true,
        lastAirDate: true,
        isbn: true,
        pageCount: true,
        authors: true,
        languages: true,
        trailerUrl: true,
        spotifyPlaylistUrl: true,
        awards: true,
        lockedFields: true,
        posterImageId: true,
        backdropImageId: true,
        createdAt: true,
        people: {
          select: {
            id: true,
            personId: true,
            person: { select: { id: true, name: true, profileUrl: true } },
            role: true,
            character: true,
            department: true,
            job: true,
            creditOrder: true,
          },
        },
        genres: {
          select: {
            id: true,
            genreId: true,
            genre: { select: { id: true, name: true } },
          },
        },
        contentThemes: {
          select: { theme: { select: { id: true, name: true } } },
        },
        contentMoods: {
          select: { mood: { select: { id: true, name: true } } },
        },
        contentGameModes: {
          select: { gameMode: { select: { id: true, name: true } } },
        },
        contentGameEngines: {
          select: { gameEngine: { select: { id: true, name: true } } },
        },
        contentPerspectives: {
          select: { perspective: { select: { id: true, name: true } } },
        },
        contentPlatforms: {
          select: { platform: { select: { id: true, name: true } } },
        },
        ageRating: { select: { id: true, name: true } },
        companies: {
          select: {
            id: true,
            contentId: true,
            companyId: true,
            companyRoleId: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        images: {
          where: { type: { in: ["poster", "backdrop"] } },
          select: { id: true, contentId: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
        },
      },
    });

    return content.map((c) => {
      const posterUrl =
        (c as any).images?.find((img: any) => img.type === "poster")
          ?.filePath || null;
      const backdropUrl =
        (c as any).images?.find((img: any) => img.type === "backdrop")
          ?.filePath || null;

      const genres = (c.genres as any[]).map((cg: any) => ({
        id: cg.genre.id,
        name: cg.genre.name,
      }));

      const cast = (c.people as any[])
        .sort((a: any, b: any) => (a.creditOrder ?? 999999) - (b.creditOrder ?? 999999))
        .filter((cp: any) => ACTOR_ROLES.includes(cp.role))
        .map((cp: any) => ({
          id: cp.person.id,
          name: cp.person.name,
          role: cp.role,
          character: cp.character,
        }));

      const crew = (c.people as any[])
        .sort((a: any, b: any) => (a.creditOrder ?? 999999) - (b.creditOrder ?? 999999))
        .filter((cp: any) => !ACTOR_ROLES.includes(cp.role))
        .map((cp: any) => ({
          id: cp.person.id,
          name: cp.person.name,
          role: cp.role,
          department: cp.department,
          job: cp.job,
        }));

      const themes = ((c as any).contentThemes || []).map((ct: any) => ({
        id: ct.theme.id,
        name: ct.theme.name,
      }));
      const moods = ((c as any).contentMoods || []).map((cm: any) => ({
        id: cm.mood.id,
        name: cm.mood.name,
      }));
      const gameModes = ((c as any).contentGameModes || []).map((cgm: any) => ({
        id: cgm.gameMode.id,
        name: cgm.gameMode.name,
      }));
      const gameEngines = ((c as any).contentGameEngines || []).map((cge: any) => ({
        id: cge.gameEngine.id,
        name: cge.gameEngine.name,
      }));
      const perspectives = ((c as any).contentPerspectives || []).map(
        (cp: any) => ({ id: cp.perspective.id, name: cp.perspective.name }),
      );
      const platforms = ((c as any).contentPlatforms || []).map((cp: any) => ({
        id: cp.platform.id,
        name: cp.platform.name,
      }));

      return {
        ...c,
        contentTypeSlug: (c as any).contentType?.slug,
        people: undefined,
        franchise: undefined,
        contentThemes: undefined,
        contentMoods: undefined,
        contentGameModes: undefined,
        contentGameEngines: undefined,
        contentPerspectives: undefined,
        contentPlatforms: undefined,
        posterUrl,
        backdropUrl,
        releaseDate: c.releaseDate?.toISOString().split("T")[0] || null,
        firstAirDate: c.firstAirDate?.toISOString().split("T")[0] || null,
        lastAirDate: c.lastAirDate?.toISOString().split("T")[0] || null,
        budget: c.budget ? c.budget.toString() : null,
        revenue: c.revenue ? c.revenue.toString() : null,
        franchiseId: (c as any).franchiseId || null,
        franchiseName: (c as any).franchise?.name || null,
        averageDuration: (c as any).averageDuration || null,
        authors: Array.isArray(c.authors)
          ? JSON.stringify(c.authors)
          : c.authors,
        cast: cast.length > 0 ? JSON.stringify(cast) : null,
        crew: crew.length > 0 ? JSON.stringify(crew) : null,
        genres,
        themes,
        moods,
        gameModes,
        gameEngines,
        perspectives,
        platforms,
        ageRating: (c as any).ageRating || null,
        trailerUrl: (c as any).trailerUrl || null,
        reviewVideoUrl: (c as any).reviewVideoUrl || null,
        gameplayVideoUrl: (c as any).gameplayVideoUrl || null,
        spotifyPlaylistUrl: (c as any).spotifyPlaylistUrl || null,
        lockedFields: (c as any).lockedFields || [],
      } as unknown as AdminContent;
    });
  }

  @Authorized()
  @Query(() => AdminContent, { nullable: true })
  async getContentById(
    @Arg("id", () => String) id: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AdminContent | null> {
    logger.info(`[Content] Getting content for edit/view: ${id}`);

    const content = await prisma.content.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        tmdbId: true,
        igdbId: true,
        originalTitle: true,
        alternativeTitles: true,
        contentTypeId: true,
        contentType: { select: { slug: true } },
        releaseDate: true,
        description: true,
        runtime: true,
        posterImageId: true,
        backdropImageId: true,
        status: true,
        isContinuing: true,
        budget: true,
        revenue: true,
        franchiseId: true,
        franchise: { select: { id: true, name: true } },
        averageDuration: true,
        numberOfEpisodes: true,
        numberOfSeasons: true,
        tvType: true,
        inProduction: true,
        firstAirDate: true,
        lastAirDate: true,
        isbn: true,
        pageCount: true,
        authors: true,
        languages: true,
        trailerUrl: true,
        reviewVideoUrl: true,
        gameplayVideoUrl: true,
        spotifyPlaylistUrl: true,
        awards: true,
        lockedFields: true,
        createdAt: true,
        people: {
          select: {
            id: true,
            personId: true,
            person: { select: { id: true, name: true, profileUrl: true } },
            role: true,
            character: true,
            department: true,
            job: true,
            creditOrder: true,
          },
        },
        seasons: {
          select: {
            id: true,
            seasonNumber: true,
            name: true,
            overview: true,
            airDate: true,
            episodeCount: true,
            posterUrl: true,
            episodes: {
              select: {
                id: true,
                seasonNumber: true,
                episodeNumber: true,
                name: true,
                overview: true,
                airDate: true,
                runtime: true,
                stillUrl: true,
              },
              orderBy: { episodeNumber: "asc" as const },
            },
          },
          orderBy: { seasonNumber: "asc" as const },
        },
        genres: {
          select: {
            id: true,
            genreId: true,
            genre: { select: { id: true, name: true } },
          },
        },
        screenshots: {
          select: {
            id: true,
            imageUrl: true,
            difficulty: true,
            order: true,
            seasonNumber: true,
            isEnabledForQuiz: true,
            isSpoiler: true,
            isSensitive: true,
            upvoteCount: true,
            downvoteCount: true,
          },
          orderBy: { order: "asc" as const },
        },
        contentThemes: {
          select: { theme: { select: { id: true, name: true } } },
        },
        contentMoods: {
          select: { mood: { select: { id: true, name: true } } },
        },
        contentGameModes: {
          select: { gameMode: { select: { id: true, name: true } } },
        },
        contentGameEngines: {
          select: { gameEngine: { select: { id: true, name: true } } },
        },
        contentPerspectives: {
          select: { perspective: { select: { id: true, name: true } } },
        },
        contentPlatforms: {
          select: { platform: { select: { id: true, name: true } } },
        },
        ageRating: { select: { id: true, name: true } },
        companies: {
          select: {
            id: true,
            contentId: true,
            companyId: true,
            companyRoleId: true,
            company: {
              select: {
                id: true,
                name: true,
                description: true,
                headquarters: true,
                logoUrl: true,
                website: true,
                foundingYear: true,
              },
            },
          },
        },
        expansions: {
          select: {
            id: true,
            contentId: true,
            name: true,
            description: true,
            posterUrl: true,
            releaseDate: true,
            type: true,
          },
        },
        bookPublications: {
          select: {
            id: true,
            contentId: true,
            title: true,
            subtitle: true,
            isbn: true,
            publisherId: true,
            publisher: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
            translators: true,
            language: true,
            pageCount: true,
            coverUrl: true,
            publishedDate: true,
            editionType: true,
            format: true,
            isOriginal: true,
            isAbridged: true,
            consumeCount: true,
            ratingDistribution: true,
            totalRatingScore: true,
            totalRatingVotes: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "asc" as const },
        },
        images: {
          where: { type: { in: ["poster", "backdrop"] } },
          select: { id: true, contentId: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
        },
      },
    });

    if (!content) return null;

    const posterUrl =
      (content as any).images?.find((img: any) => img.type === "poster")
        ?.filePath || null;
    const backdropUrl =
      (content as any).images?.find((img: any) => img.type === "backdrop")
        ?.filePath || null;
    const screenshots = (content as any).screenshots || [];

    const cast = (content.people as any[])
      .sort((a: any, b: any) => (a.creditOrder ?? 999999) - (b.creditOrder ?? 999999))
      .filter((cp: any) => ACTOR_ROLES.includes(cp.role))
      .map((cp: any) => ({
        id: cp.person.id,
        name: cp.person.name,
        profileUrl: cp.person.profileUrl || null,
        role: cp.role,
        character: cp.character,
      }));

    const crew = (content.people as any[])
      .sort((a: any, b: any) => (a.creditOrder ?? 999999) - (b.creditOrder ?? 999999))
      .filter((cp: any) => !ACTOR_ROLES.includes(cp.role))
      .map((cp: any) => ({
        id: cp.person.id,
        name: cp.person.name,
        profileUrl: cp.person.profileUrl || null,
        role: cp.role,
        department: cp.department,
        job: cp.job,
      }));

    const seasons = (content.seasons as any[]).map((season: any) => ({
      seasonNumber: season.seasonNumber,
      name: season.name,
      overview: season.overview,
      airDate: season.airDate?.toISOString().split("T")[0],
      posterUrl: season.posterUrl || null,
      episodes: (season.episodes as any[]).map((ep: any) => ({
        episodeNumber: ep.episodeNumber,
        name: ep.name,
        overview: ep.overview,
        airDate: ep.airDate?.toISOString().split("T")[0],
        runtime: ep.runtime,
        stillUrl: ep.stillUrl,
      })),
    }));

    const genres = (content.genres as any[]).map((cg: any) => ({
      id: cg.genre.id,
      name: cg.genre.name,
      description: cg.genre.description,
    }));

    const themes = ((content as any).contentThemes || []).map((ct: any) => ({
      id: ct.theme.id,
      name: ct.theme.name,
    }));
    const moods = ((content as any).contentMoods || []).map((cm: any) => ({
      id: cm.mood.id,
      name: cm.mood.name,
    }));
    const gameModes = ((content as any).contentGameModes || []).map(
      (cgm: any) => ({ id: cgm.gameMode.id, name: cgm.gameMode.name }),
    );
    const gameEngines = ((content as any).contentGameEngines || []).map(
      (cge: any) => ({ id: cge.gameEngine.id, name: cge.gameEngine.name }),
    );
    const perspectives = ((content as any).contentPerspectives || []).map(
      (cp: any) => ({ id: cp.perspective.id, name: cp.perspective.name }),
    );
    const platforms = ((content as any).contentPlatforms || []).map(
      (cp: any) => ({ id: cp.platform.id, name: cp.platform.name }),
    );
    const ageRating = (content as any).ageRating || null;

    return {
      ...content,
      contentTypeSlug: (content as any).contentType?.slug,
      people: undefined,
      franchise: undefined,
      contentThemes: undefined,
      contentMoods: undefined,
      contentGameModes: undefined,
      contentGameEngines: undefined,
      contentPerspectives: undefined,
      contentPlatforms: undefined,
      posterUrl,
      backdropUrl,
      releaseDate: content.releaseDate?.toISOString().split("T")[0] || null,
      firstAirDate: content.firstAirDate?.toISOString().split("T")[0] || null,
      lastAirDate: content.lastAirDate?.toISOString().split("T")[0] || null,
      budget: content.budget ? content.budget.toString() : null,
      revenue: content.revenue ? content.revenue.toString() : null,
      franchiseId: (content as any).franchiseId || null,
      franchiseName: (content as any).franchise?.name || null,
      averageDuration: (content as any).averageDuration || null,
      authors: Array.isArray(content.authors)
        ? JSON.stringify(content.authors)
        : content.authors,
      cast: cast.length > 0 ? JSON.stringify(cast) : null,
      crew: crew.length > 0 ? JSON.stringify(crew) : null,
      seasons: seasons.length > 0 ? JSON.stringify(seasons) : null,
      genres: genres.length > 0 ? genres : [],
      screenshots: screenshots,
      themes: themes,
      moods: moods,
      gameModes: gameModes,
      gameEngines: gameEngines,
      perspectives: perspectives,
      platforms: platforms,
      ageRating: ageRating,
      developers: (content as any).developers || [],
      expansions: ((content as any).expansions || []).map((e: any) => ({
        ...e,
        releaseDate: e.releaseDate
          ? e.releaseDate instanceof Date
            ? e.releaseDate.toISOString()
            : new Date(e.releaseDate).toISOString()
          : null,
      })),
      bookPublications: ((content as any).bookPublications || []).map(convertBookPublicationForGraphQL),
      primaryBookPublication: convertBookPublicationForGraphQL(((content as any).bookPublications || []).find((p: any) => p.isOriginal) || ((content as any).bookPublications || [])[0] || null),
      trailerUrl: (content as any).trailerUrl || null,
      reviewVideoUrl: (content as any).reviewVideoUrl || null,
      gameplayVideoUrl: (content as any).gameplayVideoUrl || null,
      spotifyPlaylistUrl: (content as any).spotifyPlaylistUrl || null,
      lockedFields: (content as any).lockedFields || [],
    } as unknown as AdminContent;
  }

  @FieldResolver(() => [Content], { nullable: true })
  async similarContents(
    @Root() adminContent: AdminContent,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      return await resolveSimilarContents(prisma, adminContent, {
        useDisplayTitleAsTitle: true,
      });
    } catch (error) {
      logger.error(`Error resolving similarContents for ${adminContent.id}:`, error);
      return [];
    }
  }

  @FieldResolver(() => [ContentCitation], { nullable: true })
  async citationsReceived(
    @Root() adminContent: AdminContent,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      return await prisma.contentCitation.findMany({
        where: { citedContentId: adminContent.id },
        include: {
          citingContent: true,
        },
      });
    } catch (error) {
      logger.error(`Error resolving citationsReceived for AdminContent ${adminContent.id}:`, error);
      return [];
    }
  }

  @FieldResolver(() => [ContentCitation], { nullable: true })
  async citationsMade(
    @Root() adminContent: AdminContent,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<any[]> {
    try {
      return await prisma.contentCitation.findMany({
        where: { citingContentId: adminContent.id },
        include: {
          citedContent: true,
        },
      });
    } catch (error) {
      logger.error(`Error resolving citationsMade for AdminContent ${adminContent.id}:`, error);
      return [];
    }
  }
}

@Resolver(() => ContentEditHistory)
export class AdminContentEditHistoryResolver {
  @Authorized()
  @Query(() => AdminContentEditHistoryResponse)
  async adminContentActivityLogs(
    @Arg("page", () => Int, { nullable: true, defaultValue: 1 }) page: number,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 20 }) limit: number,
    @Arg("search", () => String, { nullable: true }) search: string,
    @Arg("action", () => String, { nullable: true }) action: string,
    @Arg("actorUserId", () => String, { nullable: true }) actorUserId: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<AdminContentEditHistoryResponse> {
    requireAdminOrModerator(user);
    logger.info(`[Admin] Fetching content activity logs, page: ${page}`);

    const offset = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { content: { title: { contains: search, mode: "insensitive" } } },
        { content: { originalTitle: { contains: search, mode: "insensitive" } } },
        { contentId: { contains: search, mode: "insensitive" } },
      ];
    }
    if (action) {
      where.action = action;
    }
    if (actorUserId) {
      where.actorUserId = actorUserId;
    }

    const total = await prisma.contentEditHistory.count({ where });
    const items = await prisma.contentEditHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { actor: true },
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items as any,
      total,
      page,
      totalPages,
    };
  }

  @FieldResolver(() => AdminContent, { nullable: true })
  async content(
    @Root() history: ContentEditHistory,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<AdminContent | null> {
    if (!history.contentId) return null;
    
    // Instead of querying all the nested fields, we just return basic fields.
    // Usually AdminContent expects a lot, but for activity list we only need title, poster, etc.
    const c = await prisma.content.findUnique({
      where: { id: history.contentId },
      select: {
        id: true,
        title: true,
        originalTitle: true,
        contentTypeId: true,
        isDeleted: true,
        images: {
          where: { type: { in: ["poster"] } },
          select: { filePath: true, type: true },
        },
      },
    });

    if (!c) return null;

    const posterUrl = c.isDeleted
      ? null
      : (c as any).images?.find((img: any) => img.type === "poster")?.filePath || null;

    return {
      ...c,
      posterUrl,
    } as unknown as AdminContent;
  }
}
