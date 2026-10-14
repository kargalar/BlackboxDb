import { generateContentSlug } from "./slugUtils";
import { logger } from "./logger";
import { fetchIgdbGameDetails, IgdbGameDetailData } from "./igdbFetcher";
import {
  findOrCreateFranchise,
  linkCompanies,
  linkGenres,
  linkLookups,
  linkPlatforms,
  linkThemes,
  saveExpansions,
  saveImages,
  saveScreenshots,
} from "../resolvers/admin/AdminContentHelpers";
import { inferNormalizedContentStatus } from "./contentStatus";

type PrismaLike = any;

export interface EnsureGameContentResult {
  contentId: string;
  details: IgdbGameDetailData;
  content: any;
}

function dateOrNull(value?: string | null): Date | null {
  return value ? new Date(value) : null;
}

async function findExistingGameContent(
  prisma: PrismaLike,
  details: IgdbGameDetailData,
) {
  const existingByIgdbId = await prisma.content.findFirst({
    where: {
      contentTypeId: 3,
      igdbId: details.sourceId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (existingByIgdbId) return existingByIgdbId;

  const candidateTitles = Array.from(
    new Set([details.title, details.originalTitle].filter(Boolean)),
  );

  if (candidateTitles.length === 0) return null;

  const existingByTitle = await prisma.content.findMany({
    where: {
      contentTypeId: 3,
      isDeleted: false,
      OR: candidateTitles.flatMap((title) => [
        { title: { equals: title, mode: "insensitive" } },
        { originalTitle: { equals: title, mode: "insensitive" } },
      ]),
    },
    select: { id: true, releaseDate: true },
    take: 10,
  });

  if (!existingByTitle.length) return null;
  if (!details.releaseDate) return existingByTitle[0];

  const targetYear = new Date(details.releaseDate).getFullYear();
  if (Number.isNaN(targetYear)) return existingByTitle[0];

  return (
    existingByTitle.find((content: { releaseDate?: Date | null }) => {
      return content.releaseDate
        ? new Date(content.releaseDate).getFullYear() === targetYear
        : false;
    }) || existingByTitle[0]
  );
}

async function buildGameData(
  prisma: PrismaLike,
  details: IgdbGameDetailData,
) {
  let franchiseId: string | null = null;
  if (details.franchise?.name) {
    const franchise = await findOrCreateFranchise(prisma, details.franchise.name);
    franchiseId = franchise.id;
  }

  return {
    title: details.title,
    originalTitle: details.originalTitle || details.title,
    description: details.overview || null,
    releaseDate: dateOrNull(details.releaseDate),
    status: inferNormalizedContentStatus({
      contentTypeId: 3,
      releaseDate: details.releaseDate,
    }),
    trailerUrl: details.trailerUrl || null,
    fileSize: details.fileSize || null,
    igdbId: details.sourceId,
    franchiseId,
  };
}

export async function ensureGameContentFromIgdb(
  prisma: PrismaLike,
  igdbId: number,
): Promise<EnsureGameContentResult> {
  const details = await fetchIgdbGameDetails(igdbId);
  const existingContent = await findExistingGameContent(prisma, details);
  const contentId =
    existingContent?.id ||
    (await generateContentSlug(prisma, details.title, details.releaseDate));

  const data = await buildGameData(prisma, details);

  const content = await prisma.content.upsert({
    where: { id: contentId },
    update: data,
    create: {
      id: contentId,
      contentTypeId: 3,
      ...data,
    },
  });

  if (details.genres?.length) {
    await linkGenres(
      prisma,
      contentId,
      details.genres.map((genre) => ({ id: genre.id, name: genre.name })),
      3,
    );
  }

  if (details.tags?.length) {
    await linkThemes(
      prisma,
      contentId,
      details.tags.map((tag) => ({ id: tag.id, name: tag.name })),
    );
  }

  if (details.gameModes?.length) {
    await linkLookups(
      prisma,
      contentId,
      details.gameModes,
      "gameMode",
      "contentGameMode",
      "gameModeId",
    );
  }

  if (details.gameEngines?.length) {
    await linkLookups(
      prisma,
      contentId,
      details.gameEngines,
      "gameEngine",
      "contentGameEngine",
      "gameEngineId",
    );
  }

  if (details.playerPerspectives?.length) {
    await linkLookups(
      prisma,
      contentId,
      details.playerPerspectives,
      "perspective",
      "contentPerspective",
      "perspectiveId",
    );
  }

  if (details.platforms?.length) {
    await linkPlatforms(prisma, contentId, details.platforms);
  }

  const companies: Array<{ name: string; companyRoleId: number }> = [];
  if (details.developers) {
    companies.push(
      ...details.developers.map((developer) => ({
        name: developer.name,
        companyRoleId: 5,
      })),
    );
  }
  if (details.publishers) {
    companies.push(
      ...details.publishers.map((publisher) => ({
        name: publisher.name,
        companyRoleId: 4,
      })),
    );
  }
  if (companies.length > 0) {
    await linkCompanies(prisma, contentId, companies);
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

  if (details.screenshots?.length) {
    await saveScreenshots(
      prisma,
      contentId,
      details.screenshots.map((url, index) => ({
        imageUrl: url,
        order: index,
        isEnabledForQuiz: false,
        isSpoiler: false,
      })),
      false,
    );
  }

  if (details.expansions?.length) {
    await saveExpansions(prisma, contentId, details.expansions, false);
  }

  logger.info(
    `[igdbGameImportHelper] Ensured game "${details.title}" (${contentId}) from igdbId=${igdbId}`,
  );

  return { contentId, details, content };
}
