import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { searchTmdb, fetchTmdbTvDetails } from "../lib/tmdbFetcher";
import {
  linkGenres,
  processCast,
  processCrew,
  linkThemes,
  saveImages,
  processSeasons,
} from "../resolvers/admin/AdminContentHelpers";
import { generateContentSlug } from "../lib/slugUtils";
import { inferNormalizedContentStatus } from "../lib/contentStatus";

const prisma = new PrismaClient();

async function main() {
    const csvPath = path.resolve(__dirname, "../../../dizi.csv");
    
    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at: ${csvPath}`);
        return;
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
    }) as Array<Record<string, string>>;

    console.log(`Found ${records.length} series in CSV.`);

    for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rawTitle = row["Dizi Adı"];
        
        if (!rawTitle) continue;

        // Clean title
        let cleanTitle = rawTitle
            .replace(/^[\s,.\/"']+|[\s,.\/"']+$/g, "")
            .replace(/^\d+\s+/, "")
            .replace(/\(\s*\)$/, "")
            .trim();
        
        if (cleanTitle.startsWith('"') && cleanTitle.endsWith('"')) {
            cleanTitle = cleanTitle.replace(/^"+|"+$/g, "");
        }

        console.log(`\n[${i + 1}/${records.length}] Processing: ${cleanTitle} (Original: ${rawTitle})`);

        try {
            // 1. Search TMDB
            const searchResults = await searchTmdb(cleanTitle, "tv");
            if (searchResults.length === 0) {
                console.warn(`  ⚠️ No TMDB results found for: ${cleanTitle}`);
                continue;
            }

            const bestMatch = searchResults[0];
            const tmdbId = bestMatch.tmdbId;

            // Check if already exists by TMDB ID
            const existing = await prisma.content.findFirst({
                where: { tmdbId: tmdbId, contentTypeId: 2 }
            });

            if (existing) {
                console.log(`  ⏭️ Already exists in DB: ${existing.title} (ID: ${existing.id})`);
                continue;
            }

            // 3. Fetch full details
            const details = await fetchTmdbTvDetails(tmdbId);
            
            // 4. Generate Slug if new
            let slug = existing?.id;
            if (!slug) {
                slug = await generateContentSlug(prisma, details.title, details.releaseDate);
            }

            // Find first YouTube trailer
            const trailer = details.videos?.find(v => v.type === "Trailer" && v.site === "YouTube") 
                         || details.videos?.find(v => v.site === "YouTube");
            const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
            const normalizedStatus = inferNormalizedContentStatus({
                contentTypeId: 2,
                firstAirDate: details.releaseDate,
                lastAirDate: details.lastAirDate,
                inProduction: details.inProduction,
            });

            // 5. Create or Update Content
            const series = await prisma.content.upsert({
                where: { id: slug },
                update: {
                    title: details.title,
                    originalTitle: details.originalTitle || details.title,
                    description: details.overview || null,
                    firstAirDate: details.releaseDate ? new Date(details.releaseDate) : null,
                    lastAirDate: details.lastAirDate ? new Date(details.lastAirDate) : null,
                    averageDuration: details.runtime || null,
                    status: normalizedStatus,
                    tmdbId: tmdbId,
                    languages: details.spokenLanguages?.map(l => l.englishName).filter(Boolean) || [],
                    trailerUrl: trailerUrl,
                    numberOfSeasons: details.numberOfSeasons || null,
                    numberOfEpisodes: details.numberOfEpisodes || null,
                },
                create: {
                    id: slug,
                    contentTypeId: 2,
                    title: details.title,
                    originalTitle: details.originalTitle || details.title,
                    description: details.overview || null,
                    firstAirDate: details.releaseDate ? new Date(details.releaseDate) : null,
                    lastAirDate: details.lastAirDate ? new Date(details.lastAirDate) : null,
                    averageDuration: details.runtime || null,
                    status: normalizedStatus,
                    tmdbId: tmdbId,
                    languages: details.spokenLanguages?.map(l => l.englishName).filter(Boolean) || [],
                    trailerUrl: trailerUrl,
                    numberOfSeasons: details.numberOfSeasons || null,
                    numberOfEpisodes: details.numberOfEpisodes || null,
                }
            });

            // 6. Link Relations
            if (details.genres && details.genres.length > 0) {
                await linkGenres(prisma, series.id, details.genres.map(g => ({ name: g.name })), 2);
            }
            if (details.keywords && details.keywords.length > 0) {
                await linkThemes(prisma, series.id, details.keywords.map(k => ({ name: k.name })));
            }
            if (details.cast && details.cast.length > 0) {
                await processCast(prisma, series.id, JSON.stringify(details.cast));
            }
            if (details.crew && details.crew.length > 0) {
                await processCrew(prisma, series.id, JSON.stringify(details.crew));
            }
            
            // 7. Seasons & Episodes
            if (details.seasons && details.seasons.length > 0) {
                await processSeasons(prisma, series.id, JSON.stringify(details.seasons));
            }

            // 8. Images
            if (details.posterPath) {
                await saveImages(prisma, series.id, details.posterPath, undefined, false);
            }
            if (details.backdropPath) {
                await saveImages(prisma, series.id, undefined, details.backdropPath, true);
            }

            console.log(`  ✅ Successfully imported: ${series.title}`);

        } catch (error: any) {
            console.error(`  ❌ Failed to process ${cleanTitle}:`, error?.message || error);
        }

        // Delay to respect rate limits (TV shows take longer due to season/episode fetches)
        await new Promise(res => setTimeout(res, 500));
    }

    console.log("\nCSV Import completed!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
