import fs from "node:fs";
import path from "node:path";
import "reflect-metadata";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { BookSearchItem, searchOpenLibrary } from "../lib/openLibraryFetcher";
import { saveExternalContent } from "../services/ExternalContentSaveService";
import {
  calculateContentRatingStats,
  recalculateBookPublicationAggregates,
} from "../services/UserContentService";
import { UserContentMutationResolver } from "../resolvers/userContent/UserContentMutationResolver";

const BOOK_TYPE_ID = 4;
const USERNAME = process.env.BOOK_IMPORT_USER || "kargalar";
const APPLY = process.argv.includes("--apply");
const CSV_PATH = path.resolve(
  __dirname,
  "../../../books 72886834fe074457b80a14614d0cf6b2_all.csv",
);
const SECOND_CSV_PATH = path.resolve(
  __dirname,
  "../../../books 72886834fe074457b80a14614d0cf6b2.csv",
);

type SourceRow = {
  name: string;
  author: string;
  status: string;
  rating: number | null;
  length: number | null;
  date: string;
  reaction: string;
  recommender: string;
  type: string;
  order: number;
};

type ImportItem = {
  key: string;
  rows: SourceRow[];
  statusRow: SourceRow;
  ratingRow: SourceRow | null;
  tags: string[];
  date?: string;
  pageCount?: number;
};

type Match = {
  item: ImportItem;
  contentId?: string;
  candidate?: BookSearchItem;
  score?: number;
  local?: boolean;
};

const prisma = new PrismaClient();
const userContentResolver = new UserContentMutationResolver();

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

function meaningful(value?: string): string | undefined {
  const result = value?.trim();
  return result && result.toLowerCase() !== "none" ? result : undefined;
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
      author: meaningful(row.outhor || row.author) || "",
      status: (row.status || "").trim().toLowerCase(),
      rating: row.point?.trim() ? Number(row.point) : null,
      length: row["page/duration"]?.trim() ? Number(row["page/duration"]) : null,
      date: (row.date || "").trim(),
      reaction: (row.reaction || "").trim(),
      recommender: (row.recommender || "").trim(),
      type: (row.type || "").trim(),
      order,
    }))
    .filter((row) => row.name && row.name.toLowerCase() !== "puanlar");
}

function rowKey(row: SourceRow): string {
  return [
    normalize(row.name),
    normalize(row.author),
    row.status,
    row.rating ?? "",
    row.length ?? "",
    row.date,
    row.reaction,
    row.recommender,
    row.type,
  ].join("\u001f");
}

function assertSameRows(leftRows: SourceRow[], rightRows: SourceRow[]): void {
  const countRows = (rows: SourceRow[]) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = rowKey(row);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  };

  const left = countRows(leftRows);
  const right = countRows(rightRows);
  if (left.size !== right.size || [...left].some(([key, count]) => right.get(key) !== count)) {
    throw new Error("The two book CSV files do not contain the same records.");
  }
}

function parseDate(value: string): string | undefined {
  if (!value) return undefined;
  const parts = value.split("\u2192").map((part) => part.trim()).filter(Boolean);
  const date = new Date(parts.at(-1) || "");
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function dateValue(row: SourceRow): number {
  const parsed = parseDate(row.date);
  return parsed ? new Date(parsed).getTime() : Number.NEGATIVE_INFINITY;
}

function latest(rows: SourceRow[]): SourceRow {
  return [...rows].sort((left, right) => dateValue(right) - dateValue(left) || right.order - left.order)[0];
}

function list(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function buildTags(rows: SourceRow[]): string[] {
  const tags = new Set<string>();
  for (const row of rows) {
    for (const reaction of list(row.reaction)) tags.add(reaction);
    for (const type of list(row.type)) tags.add(`legacy:type:${type}`);
    if (row.recommender) tags.add(`legacy:recommender:${row.recommender}`);
    if (row.date.includes("\u2192")) tags.add(`legacy:date-range:${row.date}`);
    if (row.status === "listened" && row.length !== null) {
      tags.add(`legacy:audio-duration:${row.length}`);
    }
  }
  return [...tags];
}

function buildItems(rows: SourceRow[]): ImportItem[] {
  const groups = new Map<string, SourceRow[]>();
  for (const row of rows) {
    const key = normalize(row.name);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups].map(([key, group]) => {
    const consumed = group.filter((row) => row.status === "read" || row.status === "listened");
    const unfinished = group.filter((row) => row.status === "unfinished");
    const statusRow = latest(consumed.length ? consumed : unfinished.length ? unfinished : group);
    const rated = group.filter((row) => row.rating !== null && Number.isFinite(row.rating));
    const pageRow = [...group]
      .filter((row) => row.status !== "listened" && row.length !== null && Number.isFinite(row.length))
      .sort((left, right) => (right.length || 0) - (left.length || 0))[0];

    return {
      key,
      rows: group,
      statusRow,
      ratingRow: rated.length ? latest(rated) : null,
      tags: buildTags(group),
      date: parseDate(statusRow.date),
      pageCount: pageRow?.length || undefined,
    };
  });
}

function tokenSimilarity(left: string, right: string): number {
  const a = new Set(normalize(left).split(" ").filter(Boolean));
  const b = new Set(normalize(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  return [...a].filter((token) => b.has(token)).length / Math.max(a.size, b.size);
}

function titleScore(wanted: string, candidate: string): number {
  if (candidate === wanted) return 100;
  if (wanted.includes(" ") && candidate.startsWith(`${wanted} `)) return 95;
  if (wanted.startsWith(`${candidate} `) && candidate.split(" ").length > 1) return 92;
  return 0;
}

function score(item: ImportItem, candidate: BookSearchItem): number {
  const wantedTitle = normalize(item.statusRow.name);
  const candidateTitle = normalize(candidate.title);
  let result = titleScore(wantedTitle, candidateTitle);
  if (!result) return 0;

  const wantedAuthor = meaningful(item.statusRow.author);
  if (wantedAuthor && candidate.authors?.length) {
    result += Math.max(
      ...candidate.authors.map((author) =>
        normalize(author) === normalize(wantedAuthor) ? 25 : tokenSimilarity(author, wantedAuthor) * 20,
      ),
    );
  }
  return Math.min(125, Math.round(result));
}

async function findMatch(item: ImportItem): Promise<Match> {
  const query = [item.statusRow.name, meaningful(item.statusRow.author)].filter(Boolean).join(" ");
  let candidates = await searchOpenLibrary(query, 0, 20);
  let best = candidates
    .map((candidate) => ({ candidate, score: score(item, candidate) }))
    .sort((left, right) => right.score - left.score)[0];

  if (!best || best.score < 90) {
    candidates = await searchOpenLibrary(item.statusRow.name, 0, 20);
    best = candidates
      .map((candidate) => ({ candidate, score: score(item, candidate) }))
      .sort((left, right) => right.score - left.score)[0];
  }

  if (best && best.score >= 90) return { item, candidate: best.candidate, score: best.score };

  return {
    item,
    local: true,
    candidate: {
      sourceId: `local-${item.key}`,
      title: item.statusRow.name,
      mediaType: "book",
      authors: meaningful(item.statusRow.author) ? [item.statusRow.author] : [],
    },
  };
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

async function saveBook(item: ImportItem, match: Match): Promise<string> {
  if (match.contentId) return match.contentId;
  if (!match.candidate) throw new Error(`No match for: ${item.statusRow.name}`);

  const authors = match.candidate.authors?.length
    ? match.candidate.authors
    : meaningful(item.statusRow.author)
      ? [item.statusRow.author]
      : [];
  const content = await saveExternalContent(prisma, {
    id: match.candidate.sourceId,
    title: item.statusRow.name,
    contentTypeId: BOOK_TYPE_ID,
    releaseDate: match.candidate.releaseDate,
    description: match.candidate.overview,
    rawData: JSON.stringify({
      title: item.statusRow.name,
      authors,
      thumbnail: match.candidate.posterPath,
      publishedDate: match.candidate.releaseDate,
      pageCount: item.pageCount,
    }),
  });
  return content.id;
}

async function updateUserLog(item: ImportItem, contentId: string, userId: string): Promise<void> {
  await userContentResolver.updateUserContentLog(
    contentId,
    {
      ...flags(item.statusRow.status),
      rating: item.ratingRow?.rating ?? null,
      tags: item.tags,
      date: item.date,
    } as any,
    { user: { id: userId }, prisma } as any,
  );
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
  const secondRows = parseRows(fs.readFileSync(SECOND_CSV_PATH, "utf8"));
  assertSameRows(rows, secondRows);

  const items = buildItems(rows);
  const user = await prisma.appUser.findFirst({
    where: { username: USERNAME, isDeleted: false },
    select: { id: true, username: true },
  });
  if (!user) throw new Error(`User not found: ${USERNAME}`);

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"}: ${rows.length} rows, ${items.length} unique books, user=${user.username}`);

  const existingBooks = await prisma.content.findMany({
    where: { contentTypeId: BOOK_TYPE_ID, isDeleted: false },
    select: { id: true, title: true },
  });
  const existingByTitle = new Map(existingBooks.map((book) => [normalize(book.title), book.id]));
  const matches: Match[] = [];

  for (const [index, item] of items.entries()) {
    const existingId = existingByTitle.get(item.key);
    const match = existingId ? { item, contentId: existingId } : await findMatch(item);
    matches.push(match);
    const result = match.contentId
      ? "existing"
      : match.candidate
        ? `${match.local ? "local" : match.candidate.title} ${match.score ? `[${match.score}]` : ""}`.trim()
        : "UNMATCHED";
    console.log(`[${index + 1}/${items.length}] ${item.statusRow.name} -> ${result}`);
  }

  if (!APPLY) return;

  const touchedContentIds: string[] = [];
  for (const [index, match] of matches.entries()) {
    const contentId = await saveBook(match.item, match);
    await updateUserLog(match.item, contentId, user.id);
    touchedContentIds.push(contentId);
    console.log(`  done [${index + 1}/${matches.length}] ${match.item.statusRow.name}`);
  }

  await recalculate(touchedContentIds);
  const importedLogs = await prisma.userContentLog.count({
    where: { userId: user.id, contentId: { in: [...new Set(touchedContentIds)] } },
  });
  if (importedLogs < items.length) {
    throw new Error(`Verification failed: ${importedLogs}/${items.length} user logs found.`);
  }
  console.log(`Completed: ${items.length} books and ${importedLogs} user logs verified.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
