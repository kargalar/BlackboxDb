import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import "reflect-metadata";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { calculateContentRatingStats, recalculateBookPublicationAggregates, resolveBookPublicationIdForLog } from "../services/UserContentService";

const APPLY = process.argv.includes("--apply");
const USERNAME = process.env.BOOK_IMPORT_USER || "kargalar";
const BOOK_TYPE_ID = 4;
const CSV_PATH = path.resolve(__dirname, "../../../books 72886834fe074457b80a14614d0cf6b2_all.csv");

type SourceRow = {
  name: string;
  status: string;
  rating: number | null;
  date: string;
  reaction: string;
  recommender: string;
  type: string;
  author: string;
  length: number | null;
  order: number;
};

const prisma = new PrismaClient();

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u015f/g, "s")
    .replace(/\u011f/g, "g")
    .replace(/\u00fc/g, "u")
    .replace(/\u00f6/g, "o")
    .replace(/\u00e7/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRows(csv: string): SourceRow[] {
  const records = parse(csv.replace(/^\uFEFF/, ""), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as Record<string, string>[];
  return records
    .map((row, order) => ({
      name: (row.name || "").trim(),
      status: (row.status || "").trim().toLowerCase(),
      rating: row.point?.trim() ? Number(row.point) : null,
      date: (row.date || "").trim(),
      reaction: (row.reaction || "").trim(),
      recommender: (row.recommender || "").trim(),
      type: (row.type || "").trim(),
      author: (row.outhor || row.author || "").trim(),
      length: row["page/duration"]?.trim() ? Number(row["page/duration"]) : null,
      order,
    }))
    .filter((row) => row.name && row.name.toLowerCase() !== "puanlar");
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value.split("\u2192").at(-1)?.trim() || "");
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function rowDate(row: SourceRow): number {
  return parseDate(row.date)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

function flags(status: string) {
  switch (status) {
    case "read":
    case "listened":
      return { isConsumed: true, isConsumeLater: false, isContinuing: false, isAbandoned: false };
    case "to be read":
      return { isConsumed: false, isConsumeLater: true, isContinuing: false, isAbandoned: false };
    case "unfinished":
      return { isConsumed: false, isConsumeLater: false, isContinuing: true, isAbandoned: false };
    default:
      throw new Error(`Unknown book status: ${status}`);
  }
}

function tags(row: SourceRow, marker: string): string[] {
  const result = new Set<string>([marker]);
  for (const value of row.reaction.split(",").map((part) => part.trim()).filter(Boolean)) result.add(value);
  for (const value of row.type.split(",").map((part) => part.trim()).filter(Boolean)) result.add(`legacy:type:${value}`);
  if (row.recommender) result.add(`legacy:recommender:${row.recommender}`);
  if (row.date.includes("\u2192")) result.add(`legacy:date-range:${row.date}`);
  if (row.status === "listened" && row.length !== null) result.add(`legacy:audio-duration:${row.length}`);
  return [...result];
}

async function recalculate(contentIds: string[]): Promise<void> {
  const ids = [...new Set(contentIds)];
  const publicationIds: number[] = [];
  for (const contentId of ids) {
    const stats = await calculateContentRatingStats(prisma, contentId);
    const consumeCount = await prisma.userContentLog.count({ where: { contentId, isConsumed: true } });
    const favoriteCount = await prisma.userContentLog.count({ where: { contentId, isFavorite: true } });
    await prisma.content.update({
      where: { id: contentId },
      data: {
        consumeCount,
        favoriteCount,
        ratingDistribution: stats.ratingDistribution,
        totalRatingScore: stats.ratingCount ? stats.totalRatingScore : null,
        totalRatingVotes: stats.ratingCount,
      },
    });
    const publications = await prisma.bookPublication.findMany({ where: { contentId }, select: { id: true } });
    publicationIds.push(...publications.map((publication) => publication.id));
  }
  await recalculateBookPublicationAggregates(prisma, publicationIds);
}

async function main(): Promise<void> {
  const rows = parseRows(fs.readFileSync(CSV_PATH, "utf8"));
  const groups = new Map<string, SourceRow[]>();
  for (const row of rows) groups.set(normalize(row.name), [...(groups.get(normalize(row.name)) || []), row]);

  const historyRows: SourceRow[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const consumed = group.filter((row) => row.status === "read" || row.status === "listened");
    const unfinished = group.filter((row) => row.status === "unfinished");
    const candidates = consumed.length ? consumed : unfinished.length ? unfinished : group;
    const canonical = [...candidates].sort((left, right) => rowDate(right) - rowDate(left) || right.order - left.order)[0];
    historyRows.push(...group.filter((row) => row.order !== canonical.order));
  }

  const user = await prisma.appUser.findFirst({
    where: { username: USERNAME, isDeleted: false },
    select: { id: true, username: true },
  });
  if (!user) throw new Error(`User not found: ${USERNAME}`);

  const books = await prisma.content.findMany({
    where: { contentTypeId: BOOK_TYPE_ID, isDeleted: false },
    select: { id: true, title: true },
  });
  const contentByTitle = new Map(books.map((book) => [normalize(book.title), book.id]));
  const contentIds = historyRows.map((row) => contentByTitle.get(normalize(row.name)));
  if (contentIds.some((contentId) => !contentId)) {
    throw new Error("A duplicate history row has no imported book content.");
  }

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"}: ${historyRows.length} historical duplicate rows, user=${user.username}`);
  if (!APPLY) return;

  const touched: string[] = [];
  let imported = 0;
  for (const row of historyRows) {
    const contentId = contentByTitle.get(normalize(row.name))!;
    const marker = `legacy:history:${row.order}`;
    const existing = await prisma.userContentLog.findFirst({ where: { userId: user.id, contentId, tags: { has: marker } } });
    if (existing) continue;

    const latestLog = await prisma.userContentLog.findFirst({
      where: { userId: user.id, contentId },
      orderBy: { id: "desc" },
      select: { id: true, date: true, tags: true, rating: true, isConsumed: true, isConsumeLater: true, isContinuing: true, isAbandoned: true },
    });
    const canonicalLog = await prisma.userContentLog.findFirst({
      where: { userId: user.id, contentId },
      orderBy: { id: "asc" },
      select: { date: true },
    });
    const expectedFlags = flags(row.status);
    const date = parseDate(row.date) || (canonicalLog ? new Date(canonicalLog.date.getTime() - 1) : new Date());
    const canRepairExisting = latestLog &&
      latestLog.isConsumed === expectedFlags.isConsumed &&
      latestLog.isConsumeLater === expectedFlags.isConsumeLater &&
      latestLog.isContinuing === expectedFlags.isContinuing &&
      latestLog.isAbandoned === expectedFlags.isAbandoned &&
      Number(latestLog.rating ?? 0) === Number(row.rating ?? 0) &&
      (!row.date || latestLog.date.getTime() === parseDate(row.date)?.getTime());

    if (canRepairExisting) {
      await prisma.userContentLog.update({
        where: { id: latestLog.id },
        data: { tags: [...new Set([...latestLog.tags, ...tags(row, marker)])], date },
      });
    } else {
      const bookPublicationId = await resolveBookPublicationIdForLog(prisma, contentId);
      await prisma.userContentLog.create({
        data: {
          userId: user.id,
          contentId,
          bookPublicationId,
          ...expectedFlags,
          rating: row.rating,
          tags: tags(row, marker),
          date,
        },
      });
    }
    touched.push(contentId);
    imported++;
  }

  await recalculate(touched);
  const verified = await prisma.userContentLog.count({
    where: { userId: user.id, tags: { hasSome: historyRows.map((row) => `legacy:history:${row.order}`) } },
  });
  if (verified < historyRows.length) throw new Error(`Verification failed: ${verified}/${historyRows.length} history logs found.`);
  console.log(`Completed: ${imported} historical logs and ${verified} history logs verified.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
