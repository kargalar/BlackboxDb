import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { searchTmdb } from "../lib/tmdbFetcher";
import { ensureMovieContentFromTmdb } from "../lib/tmdbMovieImportHelper";

const prisma = new PrismaClient();

function cleanMovieTitle(rawTitle: string): string {
  let cleanTitle = rawTitle
    .replace(/^[\s,.\/"']+|[\s,.\/"']+$/g, "")
    .replace(/^\d+\s+/, "")
    .replace(/\(\s*\)$/, "")
    .trim();

  if (cleanTitle.startsWith('"') && cleanTitle.endsWith('"')) {
    cleanTitle = cleanTitle.replace(/^"+|"+$/g, "");
  }

  return cleanTitle;
}

async function main() {
  const csvPath = path.resolve(__dirname, "../../../film.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at: ${csvPath}`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as Array<Record<string, string>>;

  console.log(`Found ${records.length} movies in CSV.`);

  const processedCollectionIds = new Set<number>();

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rawTitle = row["Film Adı"] || row["Film AdÄ±"];

    if (!rawTitle) continue;

    const cleanTitle = cleanMovieTitle(rawTitle);
    console.log(`\n[${i + 1}/${records.length}] Processing: ${cleanTitle} (Original: ${rawTitle})`);

    try {
      const searchResults = await searchTmdb(cleanTitle, "movie");
      if (searchResults.length === 0) {
        console.warn(`  No TMDB results found for: ${cleanTitle}`);
        continue;
      }

      const bestMatch = searchResults[0];
      
      const existing = await prisma.content.findFirst({
        where: { tmdbId: bestMatch.tmdbId, contentTypeId: 1 }
      });

      if (existing) {
        console.log(`  ⏭️ Already exists in DB: ${existing.title} (ID: ${existing.id})`);
        continue;
      }

      const result = await ensureMovieContentFromTmdb(prisma, bestMatch.tmdbId, {
        importCollectionMovies: true,
        processedCollectionIds,
      });

      console.log(`  Imported: ${result.content.title} (${result.contentId})`);
    } catch (error: any) {
      console.error(`  Failed to process ${cleanTitle}:`, error?.message || error);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log("\nCSV Import completed!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
