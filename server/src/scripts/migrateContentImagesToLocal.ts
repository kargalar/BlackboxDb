import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  localizeContentImage,
  type ContentImageKind,
} from "../lib/localContentImage";

const prisma = new PrismaClient();
const APPLY_CHANGES = process.argv.includes("--apply");
const CONCURRENCY = 5;
const IMAGE_TYPES: ContentImageKind[] = ["poster", "backdrop"];

type ImageTask = {
  table: "contentImage" | "bookPublication";
  id: number;
  contentId: string;
  type: ContentImageKind;
  filePath: string;
};

function hostFromUrl(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "invalid-url";
  }
}

async function main(): Promise<void> {
  const [contentImages, bookCovers] = await Promise.all([
    prisma.contentImage.findMany({
      where: {
        type: { in: IMAGE_TYPES },
        filePath: { startsWith: "http" },
      },
      select: { id: true, contentId: true, type: true, filePath: true },
      orderBy: { id: "asc" },
    }),
    prisma.bookPublication.findMany({
      where: { coverUrl: { startsWith: "http" } },
      select: { id: true, contentId: true, coverUrl: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const contentImageTasks: ImageTask[] = contentImages.map((row) => ({
    ...row,
    table: "contentImage",
    type: row.type as ContentImageKind,
  }));
  const bookCoverTasks: ImageTask[] = bookCovers.map((row) => ({
    ...row,
    table: "bookPublication",
    type: "poster",
    filePath: row.coverUrl,
  }));
  const tasks = [...contentImageTasks, ...bookCoverTasks];

  const hostCounts = tasks.reduce<Record<string, number>>((counts, task) => {
    const host = hostFromUrl(task.filePath);
    counts[host] = (counts[host] || 0) + 1;
    return counts;
  }, {});

  console.log(
    `Found ${tasks.length} remote poster/backdrop/book cover images.`,
  );
  console.log("Remote image hosts:");
  for (const [host, count] of Object.entries(hostCounts).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.log(`  ${host}: ${count}`);
  }

  if (!APPLY_CHANGES) {
    console.log(
      "Dry run only. Re-run with --apply to download files and update database paths.",
    );
    return;
  }

  const stats = { migrated: 0, skipped: 0, failed: 0 };
  const errors: Array<{ id: number; url: string; error: string }> = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= tasks.length) return;

      const task = tasks[index];
      try {
        const localUrl = await localizeContentImage(
          task.filePath,
          task.contentId,
          task.type,
        );
        const update =
          task.table === "contentImage"
            ? await prisma.contentImage.updateMany({
                where: { id: task.id, filePath: task.filePath },
                data: { filePath: localUrl },
              })
            : await prisma.bookPublication.updateMany({
                where: { id: task.id, coverUrl: task.filePath },
                data: { coverUrl: localUrl },
              });
        if (update.count === 1) stats.migrated++;
        else stats.skipped++;
      } catch (error) {
        stats.failed++;
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ id: task.id, url: task.filePath, error: message });
        console.error(`[Failed] Image ${task.id}: ${message}`);
      }

      const complete = stats.migrated + stats.skipped + stats.failed;
      if (complete % 100 === 0 || complete === tasks.length) {
        console.log(`Progress: ${complete}/${tasks.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`Migrated: ${stats.migrated}`);
  console.log(`Skipped after concurrent update: ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);

  if (errors.length > 0) {
    console.log("Migration errors:");
    for (const error of errors) {
      console.log(`  ID ${error.id} (${error.url}): ${error.error}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("Content image migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
