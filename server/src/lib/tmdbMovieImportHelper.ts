import { generateContentSlug } from "./slugUtils";
import { logger } from "./logger";
import {
  fetchTmdbCollectionDetails,
  fetchTmdbMovieDetails,
  TmdbDetailData,
} from "./tmdbFetcher";
import {
  findOrCreateFranchise,
  linkGenres,
  linkThemes,
  linkCompanies,
  sortCreditPeopleForSaving,
  processCast,
  processCrew,
  saveImages,
} from "../resolvers/admin/AdminContentHelpers";
import { inferNormalizedContentStatus } from "./contentStatus";

type PrismaLike = any;

export interface EnsureMovieContentResult {
  contentId: string;
  details: TmdbDetailData;
  content: any;
}

export interface EnsureMovieContentOptions {
  importCollectionMovies?: boolean;
  processedCollectionIds?: Set<number>;
  skipTmdbIds?: Set<number>;
  delayMs?: number;
}

export interface EnsureCollectionMoviesOptions {
  processedCollectionIds?: Set<number>;
  skipTmdbIds?: Set<number>;
  delayMs?: number;
}

function buildTrailerUrl(details: TmdbDetailData): string | null {
  const trailer =
    details.videos?.find((video) => video.type === "Trailer" && video.site === "YouTube") ||
    details.videos?.find((video) => video.site === "YouTube");

  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function buildMovieUpdateData(details: TmdbDetailData, franchiseId: string | null) {
  return {
    title: details.title,
    originalTitle: details.originalTitle || details.title,
    description: details.overview || null,
    releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
    runtime: details.runtime || null,
    status: inferNormalizedContentStatus({
      contentTypeId: 1,
      releaseDate: details.releaseDate,
    }),
    tmdbId: details.tmdbId,
    franchiseId,
    languages:
      details.spokenLanguages
        ?.map((language) => language.englishName || language.name || "")
        .filter(Boolean) || [],
    trailerUrl: buildTrailerUrl(details),
    budget: details.budget ? BigInt(details.budget) : null,
    revenue: details.revenue ? BigInt(details.revenue) : null,
    cast: details.cast ? JSON.stringify(details.cast) : null,
    crew: details.crew ? JSON.stringify(details.crew) : null,
  };
}

function buildMovieCreateData(
  id: string,
  details: TmdbDetailData,
  franchiseId: string | null,
) {
  return {
    id,
    contentTypeId: 1,
    ...buildMovieUpdateData(details, franchiseId),
  };
}

async function findExistingMovieContent(prisma: PrismaLike, details: TmdbDetailData) {
  const existingByTmdbId = await prisma.content.findFirst({
    where: {
      contentTypeId: 1,
      tmdbId: details.tmdbId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (existingByTmdbId) {
    return existingByTmdbId;
  }

  const candidateTitles = Array.from(
    new Set([details.title, details.originalTitle].filter(Boolean)),
  );
  if (candidateTitles.length === 0) {
    return null;
  }

  const existingByTitle = await prisma.content.findMany({
    where: {
      contentTypeId: 1,
      isDeleted: false,
      OR: candidateTitles.flatMap((title) => [
        { title: { equals: title, mode: "insensitive" } },
        { originalTitle: { equals: title, mode: "insensitive" } },
      ]),
    },
    select: { id: true, releaseDate: true },
    take: 10,
  });

  if (!existingByTitle.length) {
    return null;
  }

  if (!details.releaseDate) {
    return existingByTitle[0];
  }

  const targetYear = new Date(details.releaseDate).getFullYear();
  if (Number.isNaN(targetYear)) {
    return existingByTitle[0];
  }

  return (
    existingByTitle.find((content: { releaseDate?: Date | null }) => {
      if (!content.releaseDate) return false;
      return new Date(content.releaseDate).getFullYear() === targetYear;
    }) || existingByTitle[0]
  );
}

async function delay(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function ensureMovieContentFromTmdb(
  prisma: PrismaLike,
  tmdbId: number,
  options: EnsureMovieContentOptions = {},
): Promise<EnsureMovieContentResult> {
  const details = await fetchTmdbMovieDetails(tmdbId);
  if (details.cast?.length) {
    details.cast = await sortCreditPeopleForSaving(prisma, details.cast);
  }
  if (details.crew?.length) {
    details.crew = await sortCreditPeopleForSaving(prisma, details.crew);
  }

  let franchiseId: string | null = null;
  if (details.franchise?.name) {
    const franchise = await findOrCreateFranchise(prisma, details.franchise.name);
    franchiseId = franchise.id;
  }

  const existingContent = await findExistingMovieContent(prisma, details);
  const contentId =
    existingContent?.id ||
    (await generateContentSlug(prisma, details.title, details.releaseDate));

  const movie = await prisma.content.upsert({
    where: { id: contentId },
    update: buildMovieUpdateData(details, franchiseId),
    create: buildMovieCreateData(contentId, details, franchiseId),
  });

  if (details.genres?.length) {
    await linkGenres(
      prisma,
      contentId,
      details.genres.map((genre) => ({ id: genre.id, name: genre.name })),
      1,
    );
  }

  if (details.keywords?.length) {
    await linkThemes(
      prisma,
      contentId,
      details.keywords.map((keyword) => ({
        id: keyword.id,
        name: keyword.name,
      })),
    );
  }

  if (details.productionCompanies?.length) {
    await linkCompanies(
      prisma,
      contentId,
      details.productionCompanies.map((company) => ({
        name: company.name,
        logoUrl: company.logoPath,
        companyRoleId: 6,
      })),
    );
  }

  if (details.cast?.length) {
    await processCast(prisma, contentId, JSON.stringify(details.cast));
  }

  if (details.crew?.length) {
    await processCrew(prisma, contentId, JSON.stringify(details.crew));
  }

  if (details.posterPath || details.backdropPath) {
    await saveImages(
      prisma,
      contentId,
      details.posterPath || undefined,
      details.backdropPath || undefined,
      true,
    );
  }

  logger.info(
    `[tmdbMovieImportHelper] Ensured movie "${details.title}" (${contentId}) from tmdbId=${tmdbId}`,
  );

  if (options.importCollectionMovies && details.franchise?.tmdbCollectionId) {
    const skipTmdbIds = new Set(options.skipTmdbIds || []);
    skipTmdbIds.add(details.tmdbId);

    await ensureCollectionMoviesImported(
      prisma,
      details.franchise.tmdbCollectionId,
      {
        processedCollectionIds: options.processedCollectionIds,
        skipTmdbIds,
        delayMs: options.delayMs,
      },
    );
  }

  return {
    contentId,
    details,
    content: movie,
  };
}

export async function ensureCollectionMoviesImported(
  prisma: PrismaLike,
  collectionId: number,
  options: EnsureCollectionMoviesOptions = {},
): Promise<void> {
  if (options.processedCollectionIds?.has(collectionId)) {
    return;
  }

  options.processedCollectionIds?.add(collectionId);

  const collection = await fetchTmdbCollectionDetails(collectionId);
  const skipTmdbIds = options.skipTmdbIds || new Set<number>();
  const delayMs = options.delayMs ?? 150;

  for (const part of collection.parts) {
    if (!part.tmdbId || skipTmdbIds.has(part.tmdbId)) {
      continue;
    }

    try {
      await ensureMovieContentFromTmdb(prisma, part.tmdbId, {
        importCollectionMovies: false,
        processedCollectionIds: options.processedCollectionIds,
        skipTmdbIds,
        delayMs,
      });
      await delay(delayMs);
    } catch (error) {
      logger.error(
        `[tmdbMovieImportHelper] Failed to auto-import collection movie tmdbId=${part.tmdbId} for collectionId=${collectionId}`,
        error,
      );
    }
  }

}
