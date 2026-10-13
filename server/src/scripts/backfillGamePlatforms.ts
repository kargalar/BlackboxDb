import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchIgdbGameDetails } from "../lib/igdbFetcher";
import {
  linkPlatforms,
  normalizePlatformName,
} from "../resolvers/admin/AdminContentHelpers";

const prisma = new PrismaClient();

function asSortedKey(names: string[]) {
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b)).join(" | ");
}

async function main() {
  console.log("Starting game platform backfill...");

  const games = await prisma.content.findMany({
    where: {
      contentTypeId: 3,
      igdbId: { not: null },
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      igdbId: true,
      contentPlatforms: {
        select: {
          platform: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${games.length} games with IGDB IDs.`);

  let updatedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;

  for (let index = 0; index < games.length; index += 1) {
    const game = games[index];
    console.log(
      `\n[${index + 1}/${games.length}] ${game.title} (ID: ${game.id}, IGDB: ${game.igdbId})`,
    );

    try {
      const details = await fetchIgdbGameDetails(game.igdbId!);
      const currentPlatforms = game.contentPlatforms.map((item) =>
        item.platform.name.trim(),
      );
      const nextPlatforms = (details.platforms || []).map((item) =>
        normalizePlatformName(item.name),
      );

      const currentKey = asSortedKey(currentPlatforms);
      const nextKey = asSortedKey(nextPlatforms);

      if (currentKey === nextKey) {
        unchangedCount += 1;
        console.log(`  unchanged: ${nextKey || "(none)"}`);
      } else {
        await prisma.contentPlatform.deleteMany({
          where: { contentId: game.id },
        });

        if (details.platforms && details.platforms.length > 0) {
          await linkPlatforms(prisma, game.id, details.platforms);
        }

        updatedCount += 1;
        console.log(`  old: ${currentKey || "(none)"}`);
        console.log(`  new: ${nextKey || "(none)"}`);
      }
    } catch (error: any) {
      failedCount += 1;
      console.error(`  failed: ${error?.message || error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log("\nGame platform backfill completed.");
  console.log(
    `Updated: ${updatedCount}, Unchanged: ${unchangedCount}, Failed: ${failedCount}`,
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
