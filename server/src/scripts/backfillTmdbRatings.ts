import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { resolveAndCacheTmdbRating } from "../lib/tmdb/api";

const prisma = new PrismaClient();

const CONCURRENCY = 8;
const BATCH_DELAY_MS = 150;

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const refreshAll = hasFlag("--all");

  const whereClause = {
    isDeleted: false,
    contentTypeId: { in: [1, 2] },
    ...(refreshAll ? {} : { tmdbRating: null }),
  };

  const contents = await prisma.content.findMany({
    where: whereClause,
    select: {
      id: true,
      contentTypeId: true,
      tmdbId: true,
      tmdbRating: true,
      title: true,
      originalTitle: true,
      releaseDate: true,
      firstAirDate: true,
    },
    orderBy: [{ contentTypeId: "asc" }, { createdAt: "desc" }],
  });

  console.log(
    `Found ${contents.length} movie/TV records to process (refreshAll=${refreshAll}, minVotes>20).`,
  );

  let validMovies = 0;
  let validTv = 0;
  let clearedToNull = 0;
  let skippedOrUnderThreshold = 0;

  for (let i = 0; i < contents.length; i += CONCURRENCY) {
    const batch = contents.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (item) => {
        const hadRating = item.tmdbRating !== null && item.tmdbRating !== undefined;
        const rating = await resolveAndCacheTmdbRating(prisma, item, {
          forceRefresh: refreshAll,
        });
        if (rating !== null) {
          if (item.contentTypeId === 1) {
            validMovies++;
          } else {
            validTv++;
          }
        } else {
          skippedOrUnderThreshold++;
          if (hadRating) {
            clearedToNull++;
          }
        }
      }),
    );

    const processed = Math.min(i + CONCURRENCY, contents.length);
    if (processed % 40 === 0 || processed === contents.length) {
      console.log(
        `Progress: ${processed}/${contents.length} (movies >20 votes: ${validMovies}, tv >20 votes: ${validTv}, cleared to null: ${clearedToNull}, total null: ${skippedOrUnderThreshold})`,
      );
    }

    if (i + CONCURRENCY < contents.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  console.log("\n=== Backfill Summary (vote_count > 20) ===");
  console.log(`Total processed          : ${contents.length}`);
  console.log(`Movies with >20 votes    : ${validMovies}`);
  console.log(`TV with >20 votes        : ${validTv}`);
  console.log(`Cleared to null (<=20)   : ${clearedToNull}`);
  console.log(`Total null/under 20 votes: ${skippedOrUnderThreshold}`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
