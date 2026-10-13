import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { searchTmdb, fetchTmdbCollectionDetails } from "../lib/tmdbFetcher";
import { ensureMovieContentFromTmdb } from "../lib/tmdbMovieImportHelper";

const prisma = new PrismaClient();

async function main() {
  const query = process.argv.slice(2).join(" ").trim();

  if (!query) {
    console.error('Usage: npm run script:verify-movie-franchise -- "Movie Title"');
    process.exit(1);
  }

  const searchResults = await searchTmdb(query, "movie");
  if (!searchResults.length) {
    console.error(`No TMDB movie result found for "${query}"`);
    process.exit(1);
  }

  const bestMatch = searchResults[0];
  console.log(`Using TMDB match: ${bestMatch.title} (tmdbId=${bestMatch.tmdbId})`);

  const result = await ensureMovieContentFromTmdb(prisma, bestMatch.tmdbId, {
    importCollectionMovies: true,
    processedCollectionIds: new Set<number>(),
  });

  console.log(`Seed content: ${result.content.title} (${result.contentId})`);
  console.log(`Franchise: ${result.details.franchise?.name || "none"}`);

  if (!result.details.franchise?.tmdbCollectionId) {
    console.log("Movie has no TMDB collection. Verification complete.");
    return;
  }

  const collection = await fetchTmdbCollectionDetails(
    result.details.franchise.tmdbCollectionId,
  );

  console.log(
    `Collection: ${collection.name} (${collection.parts.length} parts)`,
  );

  const tmdbIds = collection.parts.map((part) => part.tmdbId);
  const contents = await prisma.content.findMany({
    where: {
      contentTypeId: 1,
      tmdbId: { in: tmdbIds },
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      tmdbId: true,
      franchiseId: true,
    },
    orderBy: { title: "asc" },
  });

  const contentByTmdbId = new Map(contents.map((content) => [content.tmdbId, content]));

  for (const part of collection.parts) {
    const content = contentByTmdbId.get(part.tmdbId);
    console.log(
      `${part.title} | tmdbId=${part.tmdbId} | inDb=${content ? "yes" : "no"} | franchiseLinked=${content?.franchiseId ? "yes" : "no"}`,
    );
  }

  const missing = collection.parts.filter((part) => !contentByTmdbId.has(part.tmdbId));
  console.log(`Imported ${contents.length}/${collection.parts.length} collection movies.`);

  if (missing.length > 0) {
    console.log("Missing movies:");
    for (const part of missing) {
      console.log(`- ${part.title} (tmdbId=${part.tmdbId})`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
