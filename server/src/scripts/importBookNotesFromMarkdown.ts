import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const USERNAME = process.env.BOOK_IMPORT_USER || "kargalar";
const NOTES_DIR = path.resolve(__dirname, "../../../export detailed books");
const LEGACY_NOTE_TITLE = "Legacy import notes";
const METADATA_KEYS = new Set([
  "status",
  "page/duration",
  "point",
  "reaction",
  "recommender",
  "type",
  "outhor",
  "author",
  "date",
]);

type NoteEntry = {
  title: string;
  body: string;
  date?: Date;
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

function attachmentLine(line: string): boolean {
  const value = line.trim();
  return /^!\[[^\]]*\]\([^)]*\)$/.test(value) || /^\[[^\]]+\]\([^)]*\)$/.test(value);
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value.split("\u2192").at(-1)?.trim() || "");
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseEntry(filePath: string): NoteEntry | null {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const heading = lines[0]?.match(/^#\s+(.+)$/);
  const title = heading?.[1]?.trim();
  if (!title || title === "Untitled" || title === "Puanlar") return null;

  const metadata: Record<string, string> = {};
  let bodyStart = 1;
  for (; bodyStart < lines.length; bodyStart++) {
    const line = lines[bodyStart].trim();
    if (!line) continue;
    const field = line.match(/^([^:]+):\s*(.*)$/);
    if (!field || !METADATA_KEYS.has(field[1].trim().toLowerCase())) break;
    metadata[field[1].trim().toLowerCase()] = field[2].trim();
  }

  const body = lines
    .slice(bodyStart)
    .filter((line) => !attachmentLine(line))
    .join("\n")
    .trim();
  return body ? { title, body, date: parseDate(metadata.date) } : null;
}

function buildDescription(entries: NoteEntry[]): string {
  const sorted = [...entries].sort(
    (left, right) => (left.date?.getTime() || 0) - (right.date?.getTime() || 0),
  );
  if (sorted.length === 1) return sorted[0].body;
  return sorted
    .map((entry) => {
      const date = entry.date ? ` — ${entry.date.toISOString().slice(0, 10)}` : "";
      return `## ${entry.title}${date}\n\n${entry.body}`;
    })
    .join("\n\n---\n\n");
}

function findBook(title: string, books: Array<{ id: string; title: string }>) {
  const key = normalize(title);
  const exact = books.find((book) => normalize(book.title) === key);
  if (exact) return exact;

  const candidates = books.filter((book) => {
    const bookKey = normalize(book.title);
    return bookKey.startsWith(`${key} `) || key.startsWith(`${bookKey} `);
  });
  return candidates.sort((left, right) => normalize(right.title).length - normalize(left.title).length)[0];
}

async function main(): Promise<void> {
  const entries = fs
    .readdirSync(NOTES_DIR)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .map((file) => parseEntry(path.join(NOTES_DIR, file)))
    .filter((entry): entry is NoteEntry => Boolean(entry));
  const grouped = new Map<string, NoteEntry[]>();
  for (const entry of entries) {
    const key = normalize(entry.title);
    grouped.set(key, [...(grouped.get(key) || []), entry]);
  }

  const user = await prisma.appUser.findFirst({
    where: { username: USERNAME, isDeleted: false },
    select: { id: true, username: true },
  });
  if (!user) throw new Error(`User not found: ${USERNAME}`);

  const books = await prisma.content.findMany({
    where: { contentTypeId: 4, isDeleted: false },
    select: { id: true, title: true },
  });
  const matches = [...grouped.values()].map((noteEntries) => ({
    entries: noteEntries,
    book: findBook(noteEntries[0].title, books),
  }));
  const unmatched = matches.filter((match) => !match.book);
  if (unmatched.length) {
    throw new Error(`Unmatched note books: ${unmatched.map((match) => match.entries[0].title).join(", ")}`);
  }

  console.log(`${APPLY ? "APPLY" : "DRY-RUN"}: ${entries.length} note pages, ${matches.length} books, user=${user.username}`);
  if (!APPLY) return;

  let imported = 0;
  for (const match of matches) {
    const contentId = match.book!.id;
    const description = buildDescription(match.entries);
    const createdAt = match.entries
      .map((entry) => entry.date)
      .filter((date): date is Date => Boolean(date))
      .sort((left, right) => right.getTime() - left.getTime())[0] || new Date();
    const existing = await prisma.discussion.findFirst({
      where: {
        contentId,
        authorId: user.id,
        type: "comment",
        title: LEGACY_NOTE_TITLE,
      },
      orderBy: { id: "desc" },
    });

    if (existing) {
      await prisma.discussion.update({
        where: { id: existing.id },
        data: {
          description,
          createdAt,
          isPublic: false,
          isDeleted: false,
          deletedAt: null,
        },
      });
    } else {
      await prisma.discussion.create({
        data: {
          contentId,
          authorId: user.id,
          type: "comment",
          title: LEGACY_NOTE_TITLE,
          description,
          isPublic: false,
          createdAt,
        },
      });
      await prisma.content.update({
        where: { id: contentId },
        data: { discussionCount: { increment: 1 } },
      });
    }
    imported++;
  }

  const verified = await prisma.discussion.count({
    where: {
      authorId: user.id,
      type: "comment",
      title: LEGACY_NOTE_TITLE,
      isDeleted: false,
      content: { contentTypeId: 4 },
    },
  });
  if (verified < matches.length) throw new Error(`Verification failed: ${verified}/${matches.length} notes found.`);
  console.log(`Completed: ${imported} book note groups and ${verified} discussions verified.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
