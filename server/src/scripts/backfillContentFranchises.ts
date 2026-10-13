import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchTmdbMovieFranchise } from "../lib/tmdbFetcher";
import { fetchIgdbGameFranchise } from "../lib/igdbFetcher";
import { findOrCreateFranchise } from "../resolvers/admin/AdminContentHelpers";

const prisma = new PrismaClient();

type BackfillTarget = {
  id: string;
  title: string;
  franchiseId: string | null;
  tmdbId: number | null;
  igdbId: number | null;
  contentTypeId: number;
};

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function getNumericArg(prefix: string): number | null {
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) return null;
  const parsed = Number(value.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : null;
}

async function delay(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateMovieFranchises(
  contents: BackfillTarget[],
  options: { dryRun: boolean; preserveExisting: boolean; limit: number | null },
) {
  const targets = options.limit ? contents.slice(0, options.limit) : contents;
  let updated = 0;
  let cleared = 0;
  let skipped = 0;

  console.log(`Found ${targets.length} movies to process for franchise backfill.`);

  for (let i = 0; i < targets.length; i++) {
    const content = targets[i];
    console.log(
      `\n[Movie ${i + 1}/${targets.length}] ${content.title} (id=${content.id}, tmdbId=${content.tmdbId})`,
    );

    try {
      if (!content.tmdbId) {
        skipped++;
        console.log("  Skipped: no tmdbId");
        continue;
      }

      const franchise = await fetchTmdbMovieFranchise(content.tmdbId);
      const nextFranchiseId = franchise?.name
        ? (await findOrCreateFranchise(prisma, franchise.name)).id
        : null;

      if (options.preserveExisting && content.franchiseId) {
        skipped++;
        console.log("  Skipped: preserve-existing enabled and content already has franchise");
        continue;
      }

      if (content.franchiseId === nextFranchiseId) {
        skipped++;
        console.log(
          `  Unchanged: ${franchise?.name ? `already linked to "${franchise.name}"` : "already has no franchise"}`,
        );
        continue;
      }

      if (!options.dryRun) {
        await prisma.content.update({
          where: { id: content.id },
          data: { franchiseId: nextFranchiseId },
        });
      }

      if (nextFranchiseId) {
        updated++;
        console.log(`  Updated franchise -> ${franchise?.name}`);
      } else {
        cleared++;
        console.log("  Cleared franchise");
      }
    } catch (error: any) {
      skipped++;
      console.error(`  Failed: ${error?.message || error}`);
    }

    await delay(120);
  }

  return { updated, cleared, skipped, processed: targets.length };
}

async function updateGameFranchises(
  contents: BackfillTarget[],
  options: { dryRun: boolean; preserveExisting: boolean; limit: number | null },
) {
  const targets = options.limit ? contents.slice(0, options.limit) : contents;
  let updated = 0;
  let cleared = 0;
  let skipped = 0;

  console.log(`Found ${targets.length} games to process for franchise backfill.`);

  for (let i = 0; i < targets.length; i++) {
    const content = targets[i];
    console.log(
      `\n[Game ${i + 1}/${targets.length}] ${content.title} (id=${content.id}, igdbId=${content.igdbId})`,
    );

    try {
      if (!content.igdbId) {
        skipped++;
        console.log("  Skipped: no igdbId");
        continue;
      }

      const franchise = await fetchIgdbGameFranchise(content.igdbId);
      const nextFranchiseId = franchise?.name
        ? (await findOrCreateFranchise(prisma, franchise.name)).id
        : null;

      if (options.preserveExisting && content.franchiseId) {
        skipped++;
        console.log("  Skipped: preserve-existing enabled and content already has franchise");
        continue;
      }

      if (content.franchiseId === nextFranchiseId) {
        skipped++;
        console.log(
          `  Unchanged: ${franchise?.name ? `already linked to "${franchise.name}"` : "already has no franchise"}`,
        );
        continue;
      }

      if (!options.dryRun) {
        await prisma.content.update({
          where: { id: content.id },
          data: { franchiseId: nextFranchiseId },
        });
      }

      if (nextFranchiseId) {
        updated++;
        console.log(`  Updated franchise -> ${franchise?.name}`);
      } else {
        cleared++;
        console.log("  Cleared franchise");
      }
    } catch (error: any) {
      skipped++;
      console.error(`  Failed: ${error?.message || error}`);
    }

    await delay(250);
  }

  return { updated, cleared, skipped, processed: targets.length };
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const preserveExisting = hasFlag("--preserve-existing");
  const moviesOnly = hasFlag("--movies");
  const gamesOnly = hasFlag("--games");
  const limit = getNumericArg("--limit=");

  const includeMovies = moviesOnly || !gamesOnly;
  const includeGames = gamesOnly || !moviesOnly;

  console.log("Starting franchise backfill...");
  console.log(
    `Options: dryRun=${dryRun}, preserveExisting=${preserveExisting}, includeMovies=${includeMovies}, includeGames=${includeGames}, limit=${limit ?? "none"}`,
  );

  const summary = {
    movies: { processed: 0, updated: 0, cleared: 0, skipped: 0 },
    games: { processed: 0, updated: 0, cleared: 0, skipped: 0 },
  };

  if (includeMovies) {
    const movies = (await prisma.content.findMany({
      where: {
        contentTypeId: 1,
        tmdbId: { not: null },
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        franchiseId: true,
        tmdbId: true,
        igdbId: true,
        contentTypeId: true,
      },
      orderBy: { createdAt: "desc" },
    })) as BackfillTarget[];

    summary.movies = await updateMovieFranchises(movies, {
      dryRun,
      preserveExisting,
      limit,
    });
  }

  if (includeGames) {
    const games = (await prisma.content.findMany({
      where: {
        contentTypeId: 3,
        igdbId: { not: null },
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        franchiseId: true,
        tmdbId: true,
        igdbId: true,
        contentTypeId: true,
      },
      orderBy: { createdAt: "desc" },
    })) as BackfillTarget[];

    summary.games = await updateGameFranchises(games, {
      dryRun,
      preserveExisting,
      limit,
    });
  }

  console.log("\nBackfill completed.");
  console.log(
    `Movies -> processed=${summary.movies.processed}, updated=${summary.movies.updated}, cleared=${summary.movies.cleared}, skipped=${summary.movies.skipped}`,
  );
  console.log(
    `Games  -> processed=${summary.games.processed}, updated=${summary.games.updated}, cleared=${summary.games.cleared}, skipped=${summary.games.skipped}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
