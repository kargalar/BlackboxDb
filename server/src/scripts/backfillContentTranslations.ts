import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { setTimeout as delay } from "node:timers/promises";
import { fillContentTranslations, type LocalizedContentText } from "../lib/contentTranslations";
import { fetchTmdbTranslations } from "../lib/tmdb/translations";
import { fetchIgdbGameTranslations } from "../lib/igdbFetcher";
import { bookTitleTranslations } from "../lib/bookTranslations";
import { fetchOpenLibraryDetails } from "../lib/openLibraryFetcher";

const prisma = new PrismaClient();

async function retry<T>(task: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt === 2 || /API error: (401|403|404)/.test(String(error))) throw error;
      await delay(500 * 2 ** attempt);
    }
  }
}

async function main() {
  if (process.argv.includes("--books")) {
    const books = await prisma.content.findMany({
      where: { isDeleted: false, contentTypeId: 4 },
      select: {
        id: true,
        bookPublications: {
          select: { title: true, language: true },
          orderBy: [{ isOriginal: "desc" }, { id: "asc" }],
        },
      },
    });
    let updated = 0;
    let providerFailures = 0;
    for (const book of books) {
      updated += await fillContentTranslations(prisma, book.id, bookTitleTranslations(book.bookPublications));
      const workKey = /^book-(ol\d+w)$/i.exec(book.id)?.[1];
      if (!workKey || !process.argv.includes("--open-library")) continue;
      try {
        const details = await fetchOpenLibraryDetails(workKey.toUpperCase());
        updated += await fillContentTranslations(prisma, book.id, details.translations);
      } catch (error) {
        providerFailures++;
        console.warn(`Open Library ${workKey}: ${String(error)}`);
      }
      await delay(350);
    }
    console.log(JSON.stringify({ provider: "book editions", processed: books.length, updated, providerFailures }));
    return;
  }
  if (process.argv.includes("--igdb")) {
    const games = await prisma.content.findMany({
      where: { isDeleted: false, contentTypeId: 3, igdbId: { not: null } },
      select: { id: true, igdbId: true },
      orderBy: { igdbId: "asc" },
    });
    let updated = 0;
    for (let offset = 0; offset < games.length; offset += 75) {
      const batch = games.slice(offset, offset + 75);
      const ids = [...new Set(batch.map((game) => game.igdbId!))];
      const translations = await retry(() => fetchIgdbGameTranslations(ids));
      for (const game of batch) {
        updated += await fillContentTranslations(prisma, game.id, translations.get(game.igdbId!));
      }
      if (offset + batch.length < games.length) await delay(300);
    }
    console.log(JSON.stringify({ provider: "igdb", processed: games.length, updated }));
    return;
  }
  if (!process.env.TMDB_API_KEY) throw new Error("TMDB_API_KEY is required");
  const limitFlag = process.argv.indexOf("--limit");
  const limit = limitFlag === -1 ? undefined : Number(process.argv[limitFlag + 1]);
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1))
    throw new Error("--limit requires a positive integer");

  const contents = await prisma.content.findMany({
    where: { isDeleted: false, contentTypeId: { in: [1, 2] }, tmdbId: { not: null } },
    select: { id: true, tmdbId: true, contentTypeId: true },
    orderBy: { id: "asc" },
    take: limit,
  });
  let processed = 0;
  let updated = 0;
  let missingOnProvider = 0;
  let failed = 0;
  let next = 0;
  const requests = new Map<string, Promise<LocalizedContentText[]>>();

  await Promise.all(Array.from({ length: 8 }, async () => {
    for (let content; (content = contents[next++]); ) {
      const media = content.contentTypeId === 1 ? "movie" : "tv";
      const source = `${media}:${content.tmdbId}`;
      try {
        let request = requests.get(source);
        if (!request) {
          request = retry(() => fetchTmdbTranslations(content.tmdbId!, media));
          requests.set(source, request);
        }
        const writes = await fillContentTranslations(prisma, content.id, await request);
        updated += writes;
      } catch (error) {
        if (/API error: 404/.test(String(error))) missingOnProvider++;
        else {
          failed++;
          console.error(`${source} (${content.id}): ${String(error)}`);
          if (/API error: (401|403)/.test(String(error))) throw error;
        }
      }
      if (++processed % 250 === 0) console.log(`TMDB ${processed}/${contents.length}, ${updated} translation rows added or filled`);
    }
  }));
  console.log(JSON.stringify({ processed, updated, missingOnProvider, failed }));
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
