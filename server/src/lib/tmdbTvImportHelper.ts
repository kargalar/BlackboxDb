import { generateContentSlug } from "./slugUtils";
import { logger } from "./logger";
import { fetchTmdbTvDetails, TmdbDetailData } from "./tmdbFetcher";
import {
  linkGenres,
  linkThemes,
  linkCompanies,
  processCast,
  processCrew,
  processSeasons,
  saveImages,
  sortCreditPeopleForSaving,
} from "../resolvers/admin/AdminContentHelpers";
import { inferNormalizedContentStatus } from "./contentStatus";

type PrismaLike = any;

export interface EnsureTvContentResult {
  contentId: string;
  details: TmdbDetailData;
  content: any;
}

function dateOrNull(value?: string | null): Date | null {
  return value ? new Date(value) : null;
}

function buildTrailerUrl(details: TmdbDetailData): string | null {
  const trailer =
    details.videos?.find((video) => video.type === "Trailer" && video.site === "YouTube") ||
    details.videos?.find((video) => video.site === "YouTube");

  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function buildTvUpdateData(details: TmdbDetailData) {
  const firstAirDate = details.firstAirDate || details.releaseDate;

  return {
    title: details.title,
    originalTitle: details.originalTitle || details.title,
    description: details.overview || null,
    releaseDate: dateOrNull(details.releaseDate),
    firstAirDate: dateOrNull(firstAirDate),
    lastAirDate: dateOrNull(details.lastAirDate),
    runtime: details.runtime || null,
    averageDuration: details.runtime || null,
    status: inferNormalizedContentStatus({
      contentTypeId: 2,
      releaseDate: details.releaseDate,
      firstAirDate,
      lastAirDate: details.lastAirDate,
      inProduction: details.inProduction,
    }),
    tmdbId: details.tmdbId,
    languages:
      details.spokenLanguages
        ?.map((language) => language.englishName || language.name || "")
        .filter(Boolean) || [],
    trailerUrl: buildTrailerUrl(details),
    numberOfSeasons: details.numberOfSeasons || null,
    numberOfEpisodes: details.numberOfEpisodes || null,
    inProduction: details.inProduction ?? null,
    seasonsData: details.seasons ? JSON.stringify(details.seasons) : null,
    cast: details.cast ? JSON.stringify(details.cast) : null,
    crew: details.crew ? JSON.stringify(details.crew) : null,
  };
}

function buildTvCreateData(id: string, details: TmdbDetailData) {
  return {
    id,
    contentTypeId: 2,
    ...buildTvUpdateData(details),
  };
}

async function findExistingTvContent(prisma: PrismaLike, details: TmdbDetailData) {
  const existingByTmdbId = await prisma.content.findFirst({
    where: {
      contentTypeId: 2,
      tmdbId: details.tmdbId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (existingByTmdbId) return existingByTmdbId;

  const candidateTitles = Array.from(
    new Set([details.title, details.originalTitle].filter(Boolean)),
  );

  if (candidateTitles.length === 0) return null;

  const existingByTitle = await prisma.content.findMany({
    where: {
      contentTypeId: 2,
      isDeleted: false,
      OR: candidateTitles.flatMap((title) => [
        { title: { equals: title, mode: "insensitive" } },
        { originalTitle: { equals: title, mode: "insensitive" } },
      ]),
    },
    select: { id: true, firstAirDate: true, releaseDate: true },
    take: 10,
  });

  if (!existingByTitle.length) return null;

  const releaseYear = details.firstAirDate || details.releaseDate;
  if (!releaseYear) return existingByTitle[0];

  const targetYear = new Date(releaseYear).getFullYear();
  if (Number.isNaN(targetYear)) return existingByTitle[0];

  return (
    existingByTitle.find((content: { firstAirDate?: Date | null; releaseDate?: Date | null }) => {
      const date = content.firstAirDate || content.releaseDate;
      return date ? new Date(date).getFullYear() === targetYear : false;
    }) || existingByTitle[0]
  );
}

export async function ensureTvContentFromTmdb(
  prisma: PrismaLike,
  tmdbId: number,
): Promise<EnsureTvContentResult> {
  const details = await fetchTmdbTvDetails(tmdbId);

  if (details.cast?.length) {
    details.cast = await sortCreditPeopleForSaving(prisma, details.cast);
  }
  if (details.crew?.length) {
    details.crew = await sortCreditPeopleForSaving(prisma, details.crew);
  }

  const existingContent = await findExistingTvContent(prisma, details);
  const contentId =
    existingContent?.id ||
    (await generateContentSlug(
      prisma,
      details.title,
      details.firstAirDate || details.releaseDate,
    ));

  const content = await prisma.content.upsert({
    where: { id: contentId },
    update: buildTvUpdateData(details),
    create: buildTvCreateData(contentId, details),
  });

  if (details.genres?.length) {
    await linkGenres(
      prisma,
      contentId,
      details.genres.map((genre) => ({ id: genre.id, name: genre.name })),
      2,
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

  if (details.seasons?.length) {
    await processSeasons(prisma, contentId, JSON.stringify(details.seasons));
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
    `[tmdbTvImportHelper] Ensured TV "${details.title}" (${contentId}) from tmdbId=${tmdbId}`,
  );

  return { contentId, details, content };
}
