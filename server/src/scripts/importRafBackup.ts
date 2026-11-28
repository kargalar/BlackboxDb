import "dotenv/config";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { Prisma, PrismaClient } from "@prisma/client";
import { bookReleaseDates } from "../lib/contentReleases";
import { saveLocalContentImage } from "../lib/localContentImage";
import { detectImageMimeType } from "../lib/localScreenshot";
import { slugify } from "../lib/slugUtils";

type RafBook = {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  cover?: string;
  cover_remote?: string;
  genre?: string;
  pages_total?: number;
  description?: string;
  publisher?: string;
  published_date?: string;
  status?: string;
  rating?: number;
  favorite?: number;
  notes?: string;
  started?: string;
  finished?: string;
  source_id?: string;
};

type RafNote = {
  book_id: number;
  kind: string;
  body: string;
  page?: string | number;
  created_at: string;
  quote_note?: string;
  file_name?: string;
};

type RafBackup = {
  format: string;
  version: number;
  createdAt: string;
  checksums: Record<string, string>;
  tables: {
    books: RafBook[];
    book_notes: RafNote[];
    book_files: Array<{ book_id: number; uri: string }>;
    booklibrary_documents?: Array<{ path: string; data: string }>;
  };
};

function text(value?: string) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function date(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(+parsed) ? parsed : undefined;
}

function splitNames(value?: string) {
  return [...new Set((text(value) ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}

const languageAliases: Record<string, string> = {
  "Türkçe": "tr", Turkish: "tr", tur: "tr", "İngilizce": "en", eng: "en",
  "Rusça": "ru", rus: "ru", Almanca: "de", ger: "de", deu: "de",
};

function bookLog(book: RafBook, backupDate: Date) {
  const status = text(book.status);
  if (status && !["Okundu", "Okunuyor", "Okunacak", "Yarım bıraktım"].includes(status)) {
    throw new Error(`Unsupported reading status for Raf book ${book.id}`);
  }
  const stars = book.rating ?? 0;
  if (!Number.isFinite(stars) || stars < 0 || stars > 5) {
    throw new Error(`Invalid rating for Raf book ${book.id}`);
  }
  const rating = stars > 0 ? stars * 2 : null;
  const isFavorite = book.favorite === 1;
  const recordedDate = date(book.finished) ?? date(book.started);
  if (!status && !rating && !isFavorite && !recordedDate) return null;
  return {
    rating,
    isFavorite,
    isConsumed: status === "Okundu",
    isContinuing: status === "Okunuyor",
    isConsumeLater: status === "Okunacak",
    isAbandoned: status === "Yarım bıraktım",
    date: recordedDate ?? backupDate,
  };
}

async function hashFile(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function httpCover(value?: string) {
  const raw = text(value);
  if (!raw) return null;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Invalid remote cover URL in Raf backup");
  }
  if (url.hostname === "images.isbndb.com") {
    const payload = url.searchParams.get("key")?.split(".")[1];
    if (payload) {
      try {
        const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (typeof exp === "number" && exp * 1_000 <= Date.now()) return null;
      } catch {
        // Leave URLs with an unrecognized signature format for the image loader.
      }
    }
  }
  return url.toString();
}

async function loadBackup(file: string) {
  const raw = await readFile(file);
  const backup = JSON.parse(raw.toString("utf8")) as RafBackup;
  const backupDate = date(backup.createdAt);
  if (backup.format !== "raf-backup" || backup.version !== 1 || !backupDate ||
      !Array.isArray(backup.tables?.books) || backup.tables.books.length === 0 ||
      !Array.isArray(backup.tables.book_notes) || !Array.isArray(backup.tables.book_files) ||
      !backup.checksums || typeof backup.checksums !== "object" || Array.isArray(backup.checksums)) {
    throw new Error("Expected a nonempty Raf v1 backup with asset checksums");
  }

  const { books, book_notes: notes, book_files: files } = backup.tables;
  const ids = new Set(books.map((book) => book.id));
  if (ids.size !== books.length || books.some((book) => !Number.isSafeInteger(book.id) ||
      book.id < 1 || !text(book.title) || [...book.title.trim()].length > 255 || text(book.isbn)?.length > 20)) {
    throw new Error("Invalid book ID, title, or ISBN in Raf backup");
  }
  if (files.some((file) => !ids.has(file.book_id) || !file.uri) ||
      notes.some((note) => !ids.has(note.book_id) || !text(note.body) || !date(note.created_at))) {
    throw new Error("Invalid file or note in Raf backup");
  }
  const assets = new Set([...books.map((book) => book.cover).filter(Boolean), ...files.map((file) => file.uri)]);
  if (assets.size !== Object.keys(backup.checksums).length) throw new Error("Raf asset inventory does not match checksums");
  const directory = path.dirname(file);
  for (const asset of assets) {
    if (!/^assets\/\d{8}$/.test(asset) || !/^[a-f0-9]{64}$/i.test(backup.checksums[asset] ?? "") ||
        (await hashFile(path.join(directory, asset))) !== backup.checksums[asset].toLowerCase()) {
      throw new Error(`Invalid checksum for Raf asset ${asset}`);
    }
  }

  const notesByBook = new Map<number, RafNote[]>();
  for (const note of notes) {
    const group = notesByBook.get(note.book_id) ?? [];
    group.push(note);
    notesByBook.set(note.book_id, group);
  }
  const languages = new Map<string, string>();
  for (const document of backup.tables.booklibrary_documents ?? []) {
    const match = /^books\/([^/]+)$/.exec(document.path);
    if (!match) continue;
    const { language, languageCode } = JSON.parse(document.data);
    const value = text(language) ?? text(languageCode);
    const code = languageAliases[value] ?? value;
    // A legacy work can list languages across several editions.
    if (code && /^[a-z]{2,3}$/.test(code) && !["und", "mul"].includes(code)) languages.set(match[1], code);
  }
  const importKey = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  const plannedBooks = [];
  for (const book of books) {
    const id = `raf-${importKey}-${book.id}-${slugify(book.title)}`;
    const coverFile = book.cover ? path.join(directory, book.cover) : null;
    if (coverFile) {
      const bytes = await readFile(coverFile);
      if (bytes.length > 15 * 1024 * 1024) throw new Error(`Cover too large for Raf book ${book.id}`);
      detectImageMimeType(bytes);
    }
    const discussions = (notesByBook.get(book.id) ?? []).map((note) => {
      const position = [text(String(note.page ?? "")) && `Sayfa ${note.page}`, text(note.file_name)].filter(Boolean).join(" · ");
      const description = [note.body, text(note.quote_note) && `Not: ${note.quote_note}`, position].filter(Boolean).join("\n\n");
      return { description, title: note.kind === "Alıntı" ? "Raf alıntısı" : "Raf notu", createdAt: date(note.created_at) };
    });
    if (text(book.notes)) discussions.unshift({ description: book.notes, title: "Raf kitap notu", createdAt: date(book.finished) ?? date(book.started) ?? backupDate });
    plannedBooks.push({
      id,
      book,
      coverFile,
      coverRemote: coverFile ? null : httpCover(book.cover_remote),
      language: languages.get(book.source_id),
      discussions,
      log: bookLog(book, backupDate),
    });
  }
  return { backupDate, books: plannedBooks, attachments: files.length };
}

type ImportBook = Awaited<ReturnType<typeof loadBackup>>["books"][number];

async function saveBooks(
  tx: Prisma.TransactionClient,
  books: ImportBook[],
  typeId: number,
  userId: string,
  createdCoverFiles: string[],
) {
  const authorRole = await tx.personRole.findFirstOrThrow({
    where: { label: { equals: "author", mode: "insensitive" }, OR: [{ contentTypeId: typeId }, { contentTypeId: null }] },
    orderBy: { contentTypeId: { sort: "asc", nulls: "last" } },
  });
  const publisherRole = await tx.companyRole.findUniqueOrThrow({ where: { name: "bookpublisher" } });
  const people = new Map((await tx.person.findMany({
    where: { contentRoles: { some: { personRoleId: authorRole.id } } },
    select: { id: true, name: true }, orderBy: { id: "asc" },
  })).map((person) => [person.name.toLocaleLowerCase("tr"), person.id]));
  const genres = new Map((await tx.genre.findMany({ where: { contentTypeId: typeId }, orderBy: { id: "asc" } }))
    .map((genre) => [genre.name.toLowerCase(), genre.id]));
  const publishers = new Map((await tx.company.findMany({ select: { id: true, name: true }, orderBy: { id: "asc" } }))
    .map((company) => [company.name.toLocaleLowerCase("tr"), company.id]));

  for (const { id, book, coverFile, coverRemote, language, discussions, log } of books) {
    const title = book.title.trim();
    const isbn = text(book.isbn);
    const pageCount = Number.isSafeInteger(book.pages_total) && book.pages_total > 0 ? book.pages_total : null;
    const publishedDate = text(book.published_date);
    const releases = bookReleaseDates([publishedDate]);
    const release = releases[0]?.date;
    const releaseDate = release && !release.includes("Q") ? date(release) : null;
    let coverUrl = coverRemote;
    if (coverFile) {
      const image = await saveLocalContentImage(await readFile(coverFile), id, "poster");
      createdCoverFiles.push(image.filePath);
      coverUrl = image.url;
    }
    const authors = splitNames(book.author);
    const authorIds = new Set<string>();
    for (const name of authors) {
      const key = name.toLocaleLowerCase("tr");
      let personId = people.get(key);
      if (!personId) {
        const digest = createHash("sha256").update(key).digest("hex").slice(0, 16);
        const authorId = `raf-author-${slugify(name)}-${digest}`;
        const person = await tx.person.upsert({ where: { id: authorId }, update: {}, create: { id: authorId, name } });
        personId = person.id;
        people.set(key, personId);
      }
      authorIds.add(personId);
    }
    const publisher = text(book.publisher);
    const publisherKey = publisher?.toLocaleLowerCase("tr");
    let publisherId = publishers.get(publisherKey);
    if (publisher && !publisherId) {
      const digest = createHash("sha256").update(publisherKey).digest("hex").slice(0, 16);
      const company = await tx.company.upsert({ where: { id: `raf-publisher-${digest}` }, update: {}, create: { id: `raf-publisher-${digest}`, name: publisher } });
      publisherId = company.id;
      publishers.set(publisherKey, publisherId);
    }
    const genreIds: number[] = [];
    for (const genre of splitNames(book.genre)) {
      const name = genre.replaceAll("_", " ");
      const key = name.toLowerCase();
      let genreId = genres.get(key);
      if (!genreId) {
        const created = await tx.genre.create({ data: { name: name[0].toUpperCase() + name.slice(1), contentTypeId: typeId } });
        genreId = created.id;
        genres.set(key, genreId);
      }
      if (!genreIds.includes(genreId)) genreIds.push(genreId);
    }

    const ratingStats = {
      consumeCount: Number(log?.isConsumed ?? false),
      totalRatingVotes: Number(Boolean(log?.rating)),
      totalRatingScore: log?.rating ?? null,
      ratingDistribution: Array.from({ length: 10 }, (_, index) => Number(Math.round(log?.rating ?? 0) === index + 1)),
    };
    const content = await tx.content.create({
      data: {
        id, title, contentTypeId: typeId, isbn, pageCount, releaseDate,
        releases: releases.length ? releases : undefined,
        description: text(book.description), authors, languages: language ? [language] : [],
        status: releaseDate && releaseDate > new Date() ? "upcoming" : "finished",
        ...ratingStats,
        favoriteCount: Number(log?.isFavorite ?? false),
        discussionCount: discussions.length,
        people: { create: [...authorIds].map((personId, creditOrder) => ({ personId, creditOrder, role: "author", personRoleId: authorRole.id })) },
        companies: publisherId ? { create: { companyId: publisherId, companyRoleId: publisherRole.id } } : undefined,
        genres: { create: genreIds.map((genreId) => ({ genreId })) },
        bookPublications: { create: { title, isbn, pageCount, publishedDate, coverUrl, publisherId, language, isOriginal: true, ...ratingStats } },
        discussions: { create: discussions.map((note) => ({ ...note, authorId: userId, type: "comment", isPublic: false })) },
      },
      select: { bookPublications: { select: { id: true } } },
    });
    if (coverUrl) {
      const image = await tx.contentImage.create({ data: { contentId: id, filePath: coverUrl, type: "poster" } });
      await tx.content.update({ where: { id }, data: { posterImageId: image.id } });
    }
    if (log) await tx.userContentLog.create({ data: { ...log, userId, contentId: id, bookPublicationId: content.bookPublications[0].id } });
  }
}

async function main() {
  const { values } = parseArgs({ options: { manifest: { type: "string" }, user: { type: "string" }, apply: { type: "boolean" } } });
  if (!values.manifest || !values.user) throw new Error("Use --manifest <Raf manifest.json> --user <username> [--apply]");
  const source = await loadBackup(path.resolve(values.manifest));
  const prisma = new PrismaClient();
  try {
    const type = await prisma.contentTypeLookup.findUniqueOrThrow({ where: { slug: "book" } });
    const user = await prisma.appUser.findUniqueOrThrow({ where: { username: values.user, isDeleted: false } });
    const ids = source.books.map((book) => book.id);
    const active = { contentTypeId: type.id, isDeleted: false };
    const archived = { ...active, id: { notIn: ids } };
    const report = {
      sourceDate: source.backupDate.toISOString(), username: user.username,
      books: ids.length, booksToArchive: await prisma.content.count({ where: archived }),
      covers: source.books.filter((book) => book.coverFile || book.coverRemote).length,
      logs: source.books.filter((book) => book.log).length,
      ratings: source.books.filter((book) => book.log?.rating).length,
      privateNotes: source.books.reduce((count, book) => count + book.discussions.length, 0),
      attachmentsKeptInBackup: source.attachments,
    };
    console.log(JSON.stringify(report, null, 2));
    if (!values.apply) return;

    const createdCoverFiles: string[] = [];
    try {
      const imported = await prisma.$transaction(async (tx) => {
        const existing = await tx.content.count({ where: { id: { in: ids } } });
        if (existing) {
          const activeCount = await tx.content.count({ where: { ...active, id: { in: ids } } });
          if (activeCount !== ids.length || report.booksToArchive !== 0) {
            throw new Error("The catalog changed since this backup was imported. Review before importing it again.");
          }
        } else {
          await saveBooks(tx, source.books, type.id, user.id, createdCoverFiles);
          const deletedAt = new Date();
          const change = { isDeleted: true, deletedAt };
          await tx.discussion.updateMany({ where: { isDeleted: false, content: archived }, data: change });
          const result = await tx.content.updateMany({ where: archived, data: change });
          if (result.count !== report.booksToArchive) throw new Error("The old catalog changed during import. Run the preview again.");
        }

        const activeBooks = await tx.content.count({ where: active });
        const logWhere = { contentId: { in: ids }, userId: user.id };
        const logs = await tx.userContentLog.count({ where: logWhere });
        const ratings = await tx.userContentLog.count({ where: { ...logWhere, rating: { not: null } } });
        const notes = await tx.discussion.count({
          where: { contentId: { in: ids }, authorId: user.id, isPublic: false, isDeleted: false },
        });
        if (activeBooks !== report.books || logs !== report.logs || ratings !== report.ratings || notes !== report.privateNotes) {
          throw new Error("Catalog or account totals do not match the Raf backup");
        }
        return !existing;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 180_000 });
      console.log(imported ? "Raf catalog import verified and applied." : "This Raf catalog and its account data are already imported.");
    } catch (error) {
      // Keep files if the database is unreachable or the transaction might have committed.
      const remaining = createdCoverFiles.length
        ? await prisma.content.count({ where: { id: { in: ids } } }).catch((): undefined => undefined)
        : undefined;
      if (remaining === 0) {
        const cleanup = await Promise.allSettled(createdCoverFiles.map((file) => unlink(file)));
        if (cleanup.some((result) => result.status === "rejected")) console.error("Some staged cover files could not be removed.");
      }
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
