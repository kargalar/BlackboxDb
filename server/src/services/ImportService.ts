import { logger } from "../lib/logger";
import { inferNormalizedContentStatus } from "../lib/contentStatus";
import {
  searchTmdb,
  fetchTmdbTvDetails,
  fetchTmdbPersonDetails,
  TmdbDetailData,
} from "../lib/tmdbFetcher";
import {
  searchIgdbGames,
  fetchIgdbGameDetails,
} from "../lib/igdbFetcher";
import {
  linkGenres,
  linkLookups,
  linkThemes,
  linkCompanies,
  processCast,
  processCrew,
  processSeasons,
  saveImages,
  saveScreenshots,
  saveExpansions,
  findOrCreateFranchise,
  sortCreditPeopleForSaving,
} from "../resolvers/admin/AdminContentHelpers";
import { generatePersonSlug } from "../lib/slugUtils";
import { ensureMovieContentFromTmdb } from "../lib/tmdbMovieImportHelper";

export async function searchTmdbWithYear(
  title: string,
  year: number | null,
): Promise<{ tmdbId: number; title: string } | null> {
  try {
    const results = await searchTmdb(title, "movie", year || undefined);

    if (!results || results.length === 0) {
      if (year) {
        const retryResults = await searchTmdb(title, "movie");
        if (!retryResults || retryResults.length === 0) return null;
        return { tmdbId: retryResults[0].tmdbId, title: retryResults[0].title };
      }
      return null;
    }

    if (year) {
      const exactMatch = results.find((r) => {
        const releaseYear = r.releaseDate
          ? new Date(r.releaseDate).getFullYear()
          : null;
        return (
          releaseYear === year && r.title.toLowerCase() === title.toLowerCase()
        );
      });
      if (exactMatch)
        return { tmdbId: exactMatch.tmdbId, title: exactMatch.title };

      const yearMatch = results.find((r) => {
        const releaseYear = r.releaseDate
          ? new Date(r.releaseDate).getFullYear()
          : null;
        return releaseYear === year;
      });
      if (yearMatch)
        return { tmdbId: yearMatch.tmdbId, title: yearMatch.title };
    }

    return { tmdbId: results[0].tmdbId, title: results[0].title };
  } catch (error) {
    logger.error(
      `[ImportResolver] TMDB search failed for "${title}" (${year}):`,
      error,
    );
    return null;
  }
}

export async function findOrCreatePersonFromTmdb(
  prisma: any,
  tmdbPersonId: number,
  name: string,
  fallbackProfilePath?: string,
  fallbackGender?: number,
) {
  let person = await prisma.person.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (!person) {
    try {
      const details = await fetchTmdbPersonDetails(tmdbPersonId);
      const personSlug = await generatePersonSlug(prisma, details.name || name);
      person = await prisma.person.create({
        data: {
          id: personSlug,
          name: details.name || name,
          profileUrl: details.profilePath || null,
          gender:
            details.gender === 1
              ? "female"
              : details.gender === 2
                ? "male"
                : "unknown",
          biography: details.biography || null,
          birthDate: details.birthday ? new Date(details.birthday) : null,
          deathDate: details.deathday ? new Date(details.deathday) : null,
          placeOfBirth: details.placeOfBirth || null,
        },
      });
      await new Promise((res) => setTimeout(res, 50));
    } catch (error) {
      const personSlug = await generatePersonSlug(prisma, name);
      person = await prisma.person.create({
        data: {
          id: personSlug,
          name,
          profileUrl: fallbackProfilePath || null,
          gender:
            fallbackGender === 1
              ? "female"
              : fallbackGender === 2
                ? "male"
                : "unknown",
        },
      });
    }
  } else if (!person.profileUrl && fallbackProfilePath) {
    await prisma.person.update({
      where: { id: person.id },
      data: { profileUrl: fallbackProfilePath },
    });
  }

  return person;
}

export async function findOrCreateContentFromTmdb(
  prisma: any,
  title: string,
  year: number | null,
  contentCache: Map<string, string>,
  processedCollectionIds?: Set<number>,
): Promise<string | null> {
  const cacheKey = `${title.toLowerCase().trim()}|${year || ""}`;
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey)!;
  }

  const existingByTitle = await prisma.content.findMany({
    where: {
      isDeleted: false,
      OR: [
        { title: { equals: title, mode: "insensitive" } },
        { originalTitle: { equals: title, mode: "insensitive" } },
      ],
    },
    select: { id: true, releaseDate: true, contentTypeId: true },
  });

  if (existingByTitle.length > 0) {
    let matchedContent = null;
    if (year) {
      matchedContent = existingByTitle.find(
        (c: any) => c.releaseDate && new Date(c.releaseDate).getFullYear() === year
      );
    }
    if (!matchedContent && existingByTitle.length === 1) {
      matchedContent = existingByTitle[0];
    }

    if (matchedContent) {
      contentCache.set(cacheKey, matchedContent.id);
      return matchedContent.id;
    }
  }

  let tmdbResult = await searchTmdbWithYear(title, year);
  let isTv = false;

  if (!tmdbResult) {
    try {
      let tvResults = await searchTmdb(title, "tv", year || undefined);
      
      if ((!tvResults || tvResults.length === 0) && year) {
        tvResults = await searchTmdb(title, "tv");
      }

      if (tvResults && tvResults.length > 0) {
        tmdbResult = { tmdbId: tvResults[0].tmdbId, title: tvResults[0].title };
        isTv = true;
        logger.info(`[ImportResolver] Found TV match for "${title}", importing as TV content`);
      }
    } catch {
      /* ignore */
    }
  }

  if (!tmdbResult) {
    logger.warn(`[ImportResolver] No TMDB match for "${title}" (${year})`);
    return null;
  }

  const contentTypeId = isTv ? 2 : 1;

  const existingByTmdbId = await prisma.content.findFirst({
    where: {
      contentTypeId,
      tmdbId: tmdbResult.tmdbId,
      isDeleted: false,
    },
    select: { id: true },
  });
  
  if (existingByTmdbId) {
    contentCache.set(cacheKey, existingByTmdbId.id);
    return existingByTmdbId.id;
  }

  if (!isTv) {
    try {
      const movie = await ensureMovieContentFromTmdb(prisma, tmdbResult.tmdbId, {
        importCollectionMovies: true,
        processedCollectionIds,
      });
      contentCache.set(cacheKey, movie.contentId);
      return movie.contentId;
    } catch (error) {
      logger.error(
        `[ImportResolver] Movie import failed for tmdbId=${tmdbResult.tmdbId}:`,
        error,
      );
      return null;
    }
  }

  let tmdbDetails: TmdbDetailData;
  try {
    tmdbDetails = await fetchTmdbTvDetails(tmdbResult.tmdbId);
  } catch (error) {
    logger.error(
      `[ImportResolver] TMDB details fetch failed for tmdbId=${tmdbResult.tmdbId}:`,
      error,
    );
    return null;
  }

  if (tmdbDetails.cast?.length) {
    tmdbDetails.cast = await sortCreditPeopleForSaving(prisma, tmdbDetails.cast);
  }
  if (tmdbDetails.crew?.length) {
    tmdbDetails.crew = await sortCreditPeopleForSaving(prisma, tmdbDetails.crew);
  }

  const contentId = `${contentTypeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    await prisma.content.create({
      data: {
        id: contentId,
        title: tmdbDetails.title,
        tmdbId: tmdbResult.tmdbId,
        originalTitle: tmdbDetails.originalTitle || null,
        contentTypeId,
        description: tmdbDetails.overview || null,
        releaseDate: tmdbDetails.releaseDate
          ? new Date(tmdbDetails.releaseDate)
          : null,
        runtime: tmdbDetails.runtime || null,
        status: inferNormalizedContentStatus({
          contentTypeId,
          releaseDate: tmdbDetails.releaseDate,
          firstAirDate: tmdbDetails.firstAirDate,
          lastAirDate: tmdbDetails.lastAirDate,
          inProduction: tmdbDetails.inProduction,
        }),
        budget: tmdbDetails.budget ? BigInt(tmdbDetails.budget) : null,
        revenue: tmdbDetails.revenue ? BigInt(tmdbDetails.revenue) : null,
        firstAirDate: tmdbDetails.firstAirDate
          ? new Date(tmdbDetails.firstAirDate)
          : null,
        lastAirDate: tmdbDetails.lastAirDate
          ? new Date(tmdbDetails.lastAirDate)
          : null,
        inProduction: tmdbDetails.inProduction || false,
        numberOfSeasons: tmdbDetails.numberOfSeasons || 0,
        numberOfEpisodes: tmdbDetails.numberOfEpisodes || 0,
        languages:
          tmdbDetails.spokenLanguages
            ?.map((l) => l.englishName || l.name || "")
            .filter(Boolean) || [],
        cast: tmdbDetails.cast ? JSON.stringify(tmdbDetails.cast) : null,
        crew: tmdbDetails.crew ? JSON.stringify(tmdbDetails.crew) : null,
        trailerUrl: (() => {
          const trailer = tmdbDetails.videos?.find(
            (v) => v.type === "Trailer" && v.site === "YouTube",
          );
          return trailer
            ? `https://www.youtube.com/watch?v=${trailer.key}`
            : null;
        })(),
      },
    });

    if (tmdbDetails.posterPath) {
      const posterImage = await prisma.contentImage.create({
        data: {
          contentId,
          type: "poster",
          version: "original",
          filePath: tmdbDetails.posterPath,
        },
      });
      await prisma.content.update({
        where: { id: contentId },
        data: { posterImageId: posterImage.id },
      });
    }

    if (tmdbDetails.backdropPath) {
      const backdropImage = await prisma.contentImage.create({
        data: {
          contentId,
          type: "backdrop",
          version: "original",
          filePath: tmdbDetails.backdropPath,
        },
      });
      await prisma.content.update({
        where: { id: contentId },
        data: { backdropImageId: backdropImage.id },
      });
    }

    if (tmdbDetails.genres && tmdbDetails.genres.length > 0) {
      await linkGenres(
        prisma,
        contentId,
        tmdbDetails.genres.map((genre) => ({
          id: genre.id,
          name: genre.name,
        })),
        contentTypeId,
      );
    }

    if (tmdbDetails.keywords && tmdbDetails.keywords.length > 0) {
      try {
        await linkThemes(
          prisma,
          contentId,
          tmdbDetails.keywords.map((keyword) => ({
            id: keyword.id,
            name: keyword.name,
          })),
        );
      } catch {
        // Skip themes on error
      }
    }

    if (tmdbDetails.productionCompanies && tmdbDetails.productionCompanies.length > 0) {
      try {
        await linkCompanies(
          prisma,
          contentId,
          tmdbDetails.productionCompanies.map((company) => ({
            name: company.name,
            logoUrl: company.logoPath,
            companyRoleId: 6,
          })),
        );
      } catch (error) {
        logger.error(`[ImportResolver] Failed to process companies for ${contentId}`, error);
      }
    }

    if (tmdbDetails.cast && tmdbDetails.cast.length > 0) {
      await processCast(prisma, contentId, JSON.stringify(tmdbDetails.cast));
    }

    if (tmdbDetails.crew && tmdbDetails.crew.length > 0) {
      await processCrew(prisma, contentId, JSON.stringify(tmdbDetails.crew));
    }
    if (isTv && tmdbDetails.seasons && tmdbDetails.seasons.length > 0) {
      try {
        await processSeasons(prisma, contentId, JSON.stringify(tmdbDetails.seasons));
      } catch (error) {
        logger.error(`[ImportResolver] Failed to process seasons for TV show ${contentId}`, error);
      }
    }

    logger.success(
      `[ImportResolver] Created content: "${tmdbDetails.title}" (${contentId})`,
    );
    contentCache.set(cacheKey, contentId);
    return contentId;
  } catch (error) {
    logger.error(
      `[ImportResolver] Content creation failed for "${title}":`,
      error,
    );
    return null;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function findOrCreateGameContent(
  prisma: any,
  name: string,
  cache: Map<string, string>,
): Promise<string | null> {
  const cacheKey = name.toLowerCase().trim();
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const results = await searchIgdbGames(name);
    if (!results || results.length === 0) {
      logger.warn(`[ImportResolver] No IGDB match for "${name}"`);
      return null;
    }

    const sourceId = results[0].sourceId;
    const details = await fetchIgdbGameDetails(sourceId);

    const existingByIgdbId = await prisma.content.findFirst({
      where: {
        contentTypeId: 3,
        igdbId: sourceId,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (existingByIgdbId) {
      cache.set(cacheKey, existingByIgdbId.id);
      return existingByIgdbId.id;
    }

    const existingByApiTitle = await prisma.content.findFirst({
      where: {
        contentTypeId: 3,
        isDeleted: false,
        OR: [
          { title: { equals: details.title, mode: "insensitive" } },
          { originalTitle: { equals: details.title, mode: "insensitive" } },
          ...(details.originalTitle
            ? [
                {
                  title: { equals: details.originalTitle, mode: "insensitive" },
                },
                {
                  originalTitle: {
                    equals: details.originalTitle,
                    mode: "insensitive",
                  },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    });
    if (existingByApiTitle) {
      cache.set(cacheKey, existingByApiTitle.id);
      return existingByApiTitle.id;
    }

    const contentId = `3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let franchiseId: string | undefined = undefined;
    if (details.franchise && details.franchise.name) {
      const franchiseInfo = await findOrCreateFranchise(prisma, details.franchise.name);
      franchiseId = franchiseInfo.id;
    }

    await prisma.content.create({
      data: {
        id: contentId,
        title: details.title,
        igdbId: sourceId,
        originalTitle: details.originalTitle || null,
        contentTypeId: 3,
        description: details.overview || null,
        releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
        trailerUrl: details.trailerUrl || null,
        franchiseId: franchiseId || null,
      },
    });

    await saveImages(
      prisma,
      contentId,
      details.posterPath || null,
      details.backdropPath || null,
      false,
    );

    if (details.genres && details.genres.length > 0) {
      await linkGenres(
        prisma,
        contentId,
        details.genres.map((g) => ({ name: g.name })),
        3,
      );
    }

    if (details.tags && details.tags.length > 0) {
      await linkThemes(
        prisma,
        contentId,
        details.tags.map((t: { id: number; name: string }) => ({
          id: t.id,
          name: t.name,
        })),
      );
    }

    if (details.gameModes && details.gameModes.length > 0) {
      await linkLookups(
        prisma,
        contentId,
        details.gameModes.map((m) => ({ name: m.name })),
        "gameMode",
        "contentGameMode",
        "gameModeId",
      );
    }

    if (details.gameEngines && details.gameEngines.length > 0) {
      await linkLookups(
        prisma,
        contentId,
        details.gameEngines.map((engine) => ({ name: engine.name })),
        "gameEngine",
        "contentGameEngine",
        "gameEngineId",
      );
    }

    if (details.playerPerspectives && details.playerPerspectives.length > 0) {
      await linkLookups(
        prisma,
        contentId,
        details.playerPerspectives.map((p: { id: number; name: string }) => ({
          name: p.name,
        })),
        "perspective",
        "contentPerspective",
        "perspectiveId",
      );
    }

    if (details.platforms && details.platforms.length > 0) {
      await linkLookups(
        prisma,
        contentId,
        details.platforms.map((p) => ({ name: p.name })),
        "platform",
        "contentPlatform",
        "platformId",
      );
    }

    const companies: Array<{
      name: string;
      companyRoleId: number;
    }> = [];
    if (details.developers) {
      for (const dev of details.developers) {
        companies.push({ name: dev.name, companyRoleId: 5 });
      }
    }
    if (details.publishers) {
      for (const pub of details.publishers) {
        companies.push({ name: pub.name, companyRoleId: 4 });
      }
    }
    if (companies.length > 0) {
      await linkCompanies(prisma, contentId, companies);
    }

    if (details.screenshots && details.screenshots.length > 0) {
      await saveScreenshots(
        prisma,
        contentId,
        details.screenshots.map((url, i) => ({
          imageUrl: url,
          order: i,
          isEnabledForQuiz: false,
          isSpoiler: false,
        })),
        false,
      );
    }

    if (details.expansions && details.expansions.length > 0) {
      await saveExpansions(prisma, contentId, details.expansions, false);
    }

    logger.success(
      `[ImportResolver] Created game content: "${details.title}" (${contentId})`,
    );
    cache.set(cacheKey, contentId);
    return contentId;
  } catch (error) {
    logger.error(
      `[ImportResolver] Failed to create game content for "${name}":`,
      error,
    );
    return null;
  }
}

export async function findOrCreateSeriesContent(
  prisma: any,
  name: string,
  cache: Map<string, string>,
): Promise<string | null> {
  const cacheKey = name.toLowerCase().trim();
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const results = await searchTmdb(name, "tv");
    if (!results || results.length === 0) {
      logger.warn(`[ImportResolver] No TMDB match for series "${name}"`);
      return null;
    }

    const tmdbId = results[0].tmdbId;
    const details = await fetchTmdbTvDetails(tmdbId);
    if (details.cast?.length) {
      details.cast = await sortCreditPeopleForSaving(prisma, details.cast);
    }
    if (details.crew?.length) {
      details.crew = await sortCreditPeopleForSaving(prisma, details.crew);
    }

    const existingByApiTitle = await prisma.content.findFirst({
      where: {
        contentTypeId: 2,
        tmdbId,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (existingByApiTitle) {
      cache.set(cacheKey, existingByApiTitle.id);
      return existingByApiTitle.id;
    }

    const existingByTitle = await prisma.content.findFirst({
      where: {
        contentTypeId: 2,
        isDeleted: false,
        OR: [
          { title: { equals: details.title, mode: "insensitive" } },
          { originalTitle: { equals: details.title, mode: "insensitive" } },
          ...(details.originalTitle
            ? [
                {
                  title: { equals: details.originalTitle, mode: "insensitive" },
                },
                {
                  originalTitle: {
                    equals: details.originalTitle,
                    mode: "insensitive",
                  },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    });
    if (existingByTitle) {
      cache.set(cacheKey, existingByTitle.id);
      return existingByTitle.id;
    }

    const contentId = `2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const trailerUrl = (() => {
      const trailer = details.videos?.find(
        (v) => v.type === "Trailer" && v.site === "YouTube",
      );
      return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
    })();

    await prisma.content.create({
      data: {
        id: contentId,
        title: details.title,
        tmdbId,
        originalTitle: details.originalTitle || null,
        contentTypeId: 2,
        description: details.overview || null,
        releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
        runtime: details.runtime || null,
        status: inferNormalizedContentStatus({
          contentTypeId: 2,
          releaseDate: details.releaseDate,
          firstAirDate: details.firstAirDate,
          lastAirDate: details.lastAirDate,
          inProduction: details.inProduction,
        }),
        languages:
          details.spokenLanguages
            ?.map((l) => l.englishName || l.name || "")
            .filter(Boolean) || [],
        cast: details.cast ? JSON.stringify(details.cast) : null,
        crew: details.crew ? JSON.stringify(details.crew) : null,
        trailerUrl,
        firstAirDate: details.firstAirDate
          ? new Date(details.firstAirDate)
          : null,
        lastAirDate: details.lastAirDate ? new Date(details.lastAirDate) : null,
        inProduction: details.inProduction ?? null,
        numberOfSeasons: details.numberOfSeasons || null,
        numberOfEpisodes: details.numberOfEpisodes || null,
        seasonsData: details.seasons ? JSON.stringify(details.seasons) : null,
      },
    });

    await saveImages(
      prisma,
      contentId,
      details.posterPath || null,
      details.backdropPath || null,
      false,
    );

    if (details.genres && details.genres.length > 0) {
      await linkGenres(
        prisma,
        contentId,
        details.genres.map((g) => ({ id: g.id, name: g.name })),
        2,
      );
    }

    if (details.keywords && details.keywords.length > 0) {
      await linkThemes(
        prisma,
        contentId,
        details.keywords.map((k) => ({ id: k.id, name: k.name })),
      );
    }

    if (details.cast && details.cast.length > 0) {
      await processCast(prisma, contentId, JSON.stringify(details.cast));
    }

    if (details.crew && details.crew.length > 0) {
      await processCrew(prisma, contentId, JSON.stringify(details.crew));
    }

    if (details.seasons) {
      await processSeasons(prisma, contentId, JSON.stringify(details.seasons));
    }

    logger.success(
      `[ImportResolver] Created series content: "${details.title}" (${contentId})`,
    );
    cache.set(cacheKey, contentId);
    return contentId;
  } catch (error) {
    logger.error(
      `[ImportResolver] Failed to create series content for "${name}":`,
      error,
    );
    return null;
  }
}
