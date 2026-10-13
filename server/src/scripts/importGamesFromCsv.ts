import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { searchIgdbGames, fetchIgdbGameDetails } from "../lib/igdbFetcher";
import {
    linkGenres,
    linkLookups,
    linkPlatforms,
    linkThemes,
    linkCompanies,
    findOrCreateFranchise,
    saveImages,
  saveScreenshots,
} from "../resolvers/admin/AdminContentHelpers";
import { generateContentSlug } from "../lib/slugUtils";
import { inferNormalizedContentStatus } from "../lib/contentStatus";

const prisma = new PrismaClient();

async function main() {
    const csvPath = path.resolve(__dirname, "../../../oyun.csv");
    
    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at: ${csvPath}`);
        return;
    }

    const fileContent = fs.readFileSync(csvPath, "utf-8");
    const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const gamesToProcess: Array<{ rawTitle: string; cleanTitle: string }> = [];

    for (const line of lines) {
        if (line === "Oyun Adı") continue; // Skip header if present

        let rawTitle = line;
        if (line.includes("|")) {
            const parts = line.split("|");
            rawTitle = parts[1].trim();
        }

        // Clean title from torrent suffixes and other extra info
        const cleanTitle = rawTitle
            .replace(/^"|"$/g, "") // Strip surrounding double quotes from CSV line
            .replace(/""/g, '"') // Unescape CSV double quotes
            .replace(/Torrent\s+indir\s*-\s*Torrent\s+Oyun\s+İndir/gi, "")
            .replace(/Torrent\s+indir/gi, "")
            .replace(/Torrent\s+Oyun\s+İndir/gi, "")
            .replace(/Torrent/gi, "")
            .replace(/indir/gi, "")
            .replace(/\b(Tek Link|Full ?dlc|Ful ?dlc|PC1|JK|Yeni|Oyun|Son|K)\b/gi, "")
            .trim();

        if (cleanTitle) {
            gamesToProcess.push({ rawTitle, cleanTitle });
        }
    }

    console.log(`Found ${gamesToProcess.length} games in CSV/List.`);

    for (let i = 0; i < gamesToProcess.length; i++) {
        const { rawTitle, cleanTitle } = gamesToProcess[i];

        console.log(`\n[${i + 1}/${gamesToProcess.length}] Processing: ${cleanTitle} (Original: ${rawTitle})`);

        try {
            // 1. Search IGDB
            const searchResults = await searchIgdbGames(cleanTitle);
            if (searchResults.length === 0) {
                console.warn(`  ⚠️ No IGDB results found for: ${cleanTitle}`);
                continue;
            }

            const bestMatch = searchResults[0];
            const igdbId = bestMatch.sourceId;

            if (!igdbId) {
                console.warn(`  ⚠️ No sourceId found for: ${cleanTitle}`);
                continue;
            }

            // 2. Check if already exists by IGDB ID
            const existing = await prisma.content.findFirst({
                where: { igdbId: igdbId, contentTypeId: 3 }
            });

            if (existing) {
                console.log(`  ⏭️ Already exists in DB: ${existing.title} (ID: ${existing.id})`);
                continue;
            }

            // 3. Fetch full details
            const details = await fetchIgdbGameDetails(igdbId);
            
            // 4. Generate Slug
            const slug = await generateContentSlug(prisma, details.title, details.releaseDate);

            // 5. Create Content
            const game = await prisma.content.create({
                data: {
                    id: slug,
                    contentTypeId: 3,
                    title: details.title,
                    originalTitle: details.originalTitle || details.title,
                    description: details.overview || null,
                    releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
                    status: inferNormalizedContentStatus({
                        contentTypeId: 3,
                        releaseDate: details.releaseDate,
                    }),
                    trailerUrl: details.trailerUrl || null,
                    igdbId: igdbId,
                    franchiseId: details.franchise 
                        ? (await findOrCreateFranchise(prisma, details.franchise.name)).id 
                        : null,
                }
            });

            // 6. Link Relations
            if (details.genres && details.genres.length > 0) {
                await linkGenres(prisma, game.id, details.genres.map(g => ({ name: g.name })), 3);
            }
            if (details.tags && details.tags.length > 0) {
                await linkThemes(prisma, game.id, details.tags);
            }
            if (details.gameModes && details.gameModes.length > 0) {
                await linkLookups(prisma, game.id, details.gameModes, "gameMode", "contentGameMode", "gameModeId");
            }
            if (details.gameEngines && details.gameEngines.length > 0) {
                await linkLookups(prisma, game.id, details.gameEngines, "gameEngine", "contentGameEngine", "gameEngineId");
            }
            if (details.playerPerspectives && details.playerPerspectives.length > 0) {
                await linkLookups(prisma, game.id, details.playerPerspectives, "perspective", "contentPerspective", "perspectiveId");
            }
            if (details.platforms && details.platforms.length > 0) {
                await linkPlatforms(prisma, game.id, details.platforms);
            }
            
            const companies: any[] = [];
            if (details.developers) {
                companies.push(...details.developers.map(d => ({ name: d.name, companyRoleId: 5 })));
            }
            if (details.publishers) {
                companies.push(...details.publishers.map(p => ({ name: p.name, companyRoleId: 4 })));
            }
            if (companies.length > 0) {
                await linkCompanies(prisma, game.id, companies);
            }

            // 7. Images
            if (details.posterPath) {
                await saveImages(prisma, game.id, details.posterPath, undefined, false);
            }
            if (details.backdropPath) {
                await saveImages(prisma, game.id, undefined, details.backdropPath, true);
            }
            if (details.screenshots && details.screenshots.length > 0) {
                await saveScreenshots(prisma, game.id, details.screenshots.map(s => ({ imageUrl: s })), false);
            }

            console.log(`  ✅ Successfully imported: ${game.title}`);

        } catch (error: any) {
            console.error(`  ❌ Failed to process ${cleanTitle}:`, error?.message || error);
        }

        // Delay to respect rate limits
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
