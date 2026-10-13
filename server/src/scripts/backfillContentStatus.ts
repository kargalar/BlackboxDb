import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { inferNormalizedContentStatus } from "../lib/contentStatus";

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

async function main() {
  const dryRun = hasFlag("--dry-run");
  const limit = getNumericArg("--limit=");

  console.log("Starting content status backfill...");
  console.log(`Options: dryRun=${dryRun}, limit=${limit ?? "none"}`);

  const contents = await prisma.content.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      contentTypeId: true,
      status: true,
      releaseDate: true,
      firstAirDate: true,
      lastAirDate: true,
      inProduction: true,
    },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });

  console.log(`Found ${contents.length} content records to evaluate.`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (let i = 0; i < contents.length; i += 1) {
    const content = contents[i];
    const nextStatus = inferNormalizedContentStatus({
      contentTypeId: content.contentTypeId,
      releaseDate: content.releaseDate,
      firstAirDate: content.firstAirDate,
      lastAirDate: content.lastAirDate,
      inProduction: content.inProduction,
    });

    console.log(
      `\n[${i + 1}/${contents.length}] ${content.title} (id=${content.id}, type=${content.contentTypeId})`,
    );

    if (content.status === nextStatus) {
      unchanged += 1;
      console.log(`  unchanged: ${content.status ?? "(null)"}`);
      continue;
    }

    console.log(`  old status: ${content.status ?? "(null)"}`);
    console.log(`  new status: ${nextStatus}`);

    try {
      if (!dryRun) {
        await prisma.content.update({
          where: { id: content.id },
          data: { status: nextStatus },
        });
      }

      updated += 1;
    } catch (error: any) {
      failed += 1;
      console.error(`  failed: ${error?.message || error}`);
    }
  }

  console.log("\nContent status backfill completed.");
  console.log(`Updated: ${updated}, Unchanged: ${unchanged}, Failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
