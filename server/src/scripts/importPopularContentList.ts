import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { searchTmdb } from "../lib/tmdbFetcher";
import { searchIgdbGames } from "../lib/igdbFetcher";
import { ensureMovieContentFromTmdb } from "../lib/tmdbMovieImportHelper";
import { ensureTvContentFromTmdb } from "../lib/tmdbTvImportHelper";
import { ensureGameContentFromIgdb } from "../lib/igdbGameImportHelper";
import {
  PopularContentListItem,
  PopularContentMediaType,
  PopularContentSource,
  dedupePopularListItems,
  getDefaultPopularListDir,
  popularListFileName,
  readPopularList,
} from "../lib/popularContentList";

const prisma = new PrismaClient();
const DEFAULT_SOURCE_ORDER: PopularContentSource[] = [
  "letterboxd",
  "tmdb",
  "imdb",
  "igdb",
];

interface ImportOptions {
  dryRun: boolean;
  refreshExisting: boolean;
  importCollections: boolean;
  delayMs: number;
  limit: number | null;
}

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  unmatched: number;
  failed: number;
}

function getArg(name: string): string | null {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function getNumberArg(name: string, fallback: number | null): number | null {
  const value = getArg(name);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseSources(value: string | null): PopularContentSource[] | null {
  if (!value) return null;

  const allowed = new Set<PopularContentSource>([
    "letterboxd",
    "tmdb",
    "imdb",
    "igdb",
  ]);

  const sources = value
    .split(",")
    .map((source) => source.trim().toLowerCase())
    .filter((source): source is PopularContentSource =>
      allowed.has(source as PopularContentSource),
    );

  return sources.length > 0 ? sources : null;
}

function resolveInputDir(value: string | null): string {
  if (!value) return getDefaultPopularListDir();
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function contentTypeIdForMedia(mediaType: PopularContentMediaType): number {
  if (mediaType === "movie") return 1;
  if (mediaType === "tv") return 2;
  return 3;
}

function parseInteger(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function listInputFiles(
  explicitFile: string | null,
  inputDir: string,
  sources: PopularContentSource[] | null,
): string[] {
  if (explicitFile) {
    const resolved = path.isAbsolute(explicitFile)
      ? explicitFile
      : path.resolve(process.cwd(), explicitFile);
    return [resolved];
  }

  const selectedSources =
    sources || (["letterboxd", "tmdb", "imdb", "igdb"] as PopularContentSource[]);

  return selectedSources
    .map((source) => path.join(inputDir, popularListFileName(source)))
    .filter((filePath) => fs.existsSync(filePath));
}

async function findExistingContent(item: PopularContentListItem) {
  const contentTypeId = contentTypeIdForMedia(item.mediaType);
  const sourceId = parseInteger(item.sourceId);

  if (item.source === "tmdb" && sourceId && item.mediaType !== "game") {
    return prisma.content.findFirst({
      where: {
        contentTypeId,
        tmdbId: sourceId,
        isDeleted: false,
      },
      select: { id: true, title: true },
    });
  }

  if (item.source === "igdb" && sourceId && item.mediaType === "game") {
    return prisma.content.findFirst({
      where: {
        contentTypeId,
        igdbId: sourceId,
        isDeleted: false,
      },
      select: { id: true, title: true },
    });
  }

  const existing = await prisma.content.findMany({
    where: {
      contentTypeId,
      isDeleted: false,
      OR: [
        { title: { equals: item.title, mode: "insensitive" } },
        { originalTitle: { equals: item.title, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      firstAirDate: true,
    },
    take: 10,
  });

  if (!existing.length) return null;
  if (!item.year) return existing[0];

  return (
    existing.find((content) => {
      const date =
        item.mediaType === "tv"
          ? content.firstAirDate || content.releaseDate
          : content.releaseDate;
      return date ? new Date(date).getFullYear() === item.year : false;
    }) || null
  );
}

async function searchTmdbIdForItem(
  item: PopularContentListItem,
): Promise<number | null> {
  const tmdbType = item.mediaType === "tv" ? "tv" : "movie";
  const results = await searchTmdb(item.title, tmdbType, item.year || undefined);

  if (!results.length && item.year) {
    const retryResults = await searchTmdb(item.title, tmdbType);
    return retryResults[0]?.tmdbId || null;
  }

  if (!results.length) return null;

  if (item.year) {
    const yearMatch = results.find((result) => {
      return result.releaseDate
        ? new Date(result.releaseDate).getFullYear() === item.year
        : false;
    });
    if (yearMatch) return yearMatch.tmdbId;
  }

  return results[0].tmdbId;
}

async function searchIgdbIdForItem(
  item: PopularContentListItem,
): Promise<number | null> {
  const results = await searchIgdbGames(item.title, 10);
  if (!results.length) return null;

  if (item.year) {
    const yearMatch = results.find((result) => {
      return result.releaseDate
        ? new Date(result.releaseDate).getFullYear() === item.year
        : false;
    });
    if (yearMatch) return yearMatch.sourceId;
  }

  return results[0].sourceId;
}

async function importItem(
  item: PopularContentListItem,
  options: ImportOptions,
  processedCollectionIds: Set<number>,
): Promise<"imported" | "skipped" | "unmatched"> {
  const existing = await findExistingContent(item);
  if (existing && !options.refreshExisting) {
    console.log(`  Skipped existing: ${existing.title} (${existing.id})`);
    return "skipped";
  }

  if (options.dryRun) {
    console.log(
      `  Dry run: would import ${item.mediaType} "${item.title}" from ${item.source}`,
    );
    return "imported";
  }

  if (item.mediaType === "movie") {
    const tmdbId =
      item.source === "tmdb" ? parseInteger(item.sourceId) : await searchTmdbIdForItem(item);
    if (!tmdbId) return "unmatched";

    await ensureMovieContentFromTmdb(prisma, tmdbId, {
      importCollectionMovies: options.importCollections,
      processedCollectionIds,
      delayMs: options.delayMs,
    });
    return "imported";
  }

  if (item.mediaType === "tv") {
    const tmdbId =
      item.source === "tmdb" ? parseInteger(item.sourceId) : await searchTmdbIdForItem(item);
    if (!tmdbId) return "unmatched";

    await ensureTvContentFromTmdb(prisma, tmdbId);
    return "imported";
  }

  const igdbId =
    item.source === "igdb" ? parseInteger(item.sourceId) : await searchIgdbIdForItem(item);
  if (!igdbId) return "unmatched";

  await ensureGameContentFromIgdb(prisma, igdbId);
  return "imported";
}

function loadItems(files: string[], sources: PopularContentSource[] | null) {
  const sourceSet = sources ? new Set(sources) : null;
  const sourceOrder = sources || DEFAULT_SOURCE_ORDER;
  const sourceRank = new Map(sourceOrder.map((source, index) => [source, index]));
  const items: PopularContentListItem[] = [];

  for (const file of files) {
    console.log(`Reading ${file}`);
    items.push(
      ...readPopularList(file).filter((item) =>
        sourceSet ? sourceSet.has(item.source) : true,
      ),
    );
  }

  return dedupePopularListItems(items).sort((a, b) => {
    if (a.source !== b.source) {
      return (
        (sourceRank.get(a.source) ?? Number.MAX_SAFE_INTEGER) -
        (sourceRank.get(b.source) ?? Number.MAX_SAFE_INTEGER)
      );
    }
    return a.rank - b.rank;
  });
}

async function main() {
  const inputDir = resolveInputDir(getArg("--input-dir"));
  const sources = parseSources(getArg("--sources"));
  const files = listInputFiles(getArg("--file"), inputDir, sources);
  const options: ImportOptions = {
    dryRun: hasFlag("--dry-run"),
    refreshExisting: hasFlag("--refresh-existing"),
    importCollections: hasFlag("--import-collections"),
    delayMs: getNumberArg("--delay-ms", 500) || 500,
    limit: getNumberArg("--limit", null),
  };

  if (files.length === 0) {
    throw new Error(`No popular list files found in ${inputDir}.`);
  }

  const allItems = loadItems(files, sources);
  const items = options.limit ? allItems.slice(0, options.limit) : allItems;
  const stats: ImportStats = {
    total: items.length,
    imported: 0,
    skipped: 0,
    unmatched: 0,
    failed: 0,
  };
  const processedCollectionIds = new Set<number>();

  console.log(`Found ${items.length} items to import.`);
  console.log(
    `Options: dryRun=${options.dryRun}, refreshExisting=${options.refreshExisting}, importCollections=${options.importCollections}`,
  );

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(
      `\n[${i + 1}/${items.length}] ${item.source} #${item.rank}: ${item.title} (${item.year || "n/a"}, ${item.mediaType})`,
    );

    try {
      const result = await importItem(item, options, processedCollectionIds);
      stats[result]++;
      if (result === "unmatched") {
        console.warn(`  No API match for "${item.title}"`);
      }
    } catch (error: any) {
      stats.failed++;
      console.error(`  Failed: ${error?.message || error}`);
    }

    await delay(options.delayMs);
  }

  console.log("\nImport finished.");
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
