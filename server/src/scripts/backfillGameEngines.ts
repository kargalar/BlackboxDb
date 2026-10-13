import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchIgdbGameEngines } from "../lib/igdbFetcher";
import { linkLookups } from "../resolvers/admin/AdminContentHelpers";

/**
 * Veritabanındaki tüm oyunlar için IGDB'den game engine bilgilerini çeker
 * ve ContentGameEngine tablosuna kaydeder.
 *
 * Kullanım:
 *   npx tsx src/scripts/backfillGameEngines.ts
 *   npx tsx src/scripts/backfillGameEngines.ts --dry-run
 *   npx tsx src/scripts/backfillGameEngines.ts --limit=50
 *   npx tsx src/scripts/backfillGameEngines.ts --preserve-existing
 */

const prisma = new PrismaClient();

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

function asSortedKey(names: string[]) {
  return Array.from(new Set(names))
    .sort((a, b) => a.localeCompare(b))
    .join(" | ");
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const preserveExisting = hasFlag("--preserve-existing");
  const limit = getNumericArg("--limit=");

  console.log("Starting game engine backfill...");
  console.log(
    `Options: dryRun=${dryRun}, preserveExisting=${preserveExisting}, limit=${limit ?? "none"}`,
  );

  const allGames = await prisma.content.findMany({
    where: {
      contentTypeId: 3,
      igdbId: { not: null },
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      igdbId: true,
      contentGameEngines: {
        select: {
          gameEngine: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const games = limit ? allGames.slice(0, limit) : allGames;
  console.log(`Found ${games.length} games to process for game engine backfill.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    console.log(
      `\n[Game ${i + 1}/${games.length}] ${game.title} (id=${game.id}, igdbId=${game.igdbId})`,
    );

    try {
      if (!game.igdbId) {
        skipped++;
        console.log("  Skipped: no igdbId");
        continue;
      }

      const currentEngines = game.contentGameEngines.map(
        (cge) => cge.gameEngine.name.trim(),
      );

      if (preserveExisting && currentEngines.length > 0) {
        skipped++;
        console.log(
          `  Skipped: preserve-existing enabled and already has engines: ${currentEngines.join(", ")}`,
        );
        continue;
      }

      const engines = await fetchIgdbGameEngines(game.igdbId);

      if (!engines || engines.length === 0) {
        // API'den engine gelmedi, mevcut engine'leri silmeyelim (veri kaybını önle)
        skipped++;
        console.log("  Skipped: no game engines found on IGDB");
        continue;
      }

      const nextEngines = engines.map((e) => e.name.trim());
      const currentKey = asSortedKey(currentEngines);
      const nextKey = asSortedKey(nextEngines);

      if (currentKey === nextKey) {
        unchanged++;
        console.log(`  Unchanged: ${nextKey || "(none)"}`);
        continue;
      }

      if (!dryRun) {
        // Mevcut engine ilişkilerini temizle
        await prisma.contentGameEngine.deleteMany({
          where: { contentId: game.id },
        });

        // Yeni engine'leri bağla
        await linkLookups(
          prisma,
          game.id,
          engines.map((e) => ({ name: e.name })),
          "gameEngine",
          "contentGameEngine",
          "gameEngineId",
        );
      }

      updated++;
      console.log(`  old: ${currentKey || "(none)"}`);
      console.log(`  new: ${nextKey}`);
    } catch (error: any) {
      failed++;
      console.error(`  Failed: ${error?.message || error}`);
    }

    // IGDB rate limit: ~4 req/sec on free tier
    await delay(300);
  }

  console.log("\n========================================");
  console.log("Game engine backfill completed.");
  console.log(
    `Processed: ${games.length}, Updated: ${updated}, Unchanged: ${unchanged}, Skipped: ${skipped}, Failed: ${failed}`,
  );
  console.log("========================================");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
