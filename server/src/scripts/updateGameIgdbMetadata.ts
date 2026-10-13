import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchIgdbGameDetails } from "../lib/igdbFetcher";
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
import { logger } from "../lib/logger";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting IGDB metadata update for all games...");

    const gamesToUpdate = await prisma.content.findMany({
        where: {
            contentTypeId: 3,
            igdbId: { not: null },
            isDeleted: false
        },
        orderBy: { createdAt: "desc" }
    });

    console.log(`Found ${gamesToUpdate.length} games to process.`);

    for (let i = 0; i < gamesToUpdate.length; i++) {
        const game = gamesToUpdate[i];
        console.log(`\n[${i + 1}/${gamesToUpdate.length}] Processing: ${game.title} (ID: ${game.id}, IGDB: ${game.igdbId})`);

        try {
            const details = await fetchIgdbGameDetails(game.igdbId!);
            
            // 1. Update basic fields
            await prisma.content.update({
                where: { id: game.id },
                data: {
                    title: details.title || game.title,
                    originalTitle: details.originalTitle || details.title || null,
                    description: details.overview || game.description,
                    releaseDate: details.releaseDate ? new Date(details.releaseDate) : (game.releaseDate || null),
                    trailerUrl: details.trailerUrl || game.trailerUrl || null,
                    franchiseId: details.franchise 
                        ? (await findOrCreateFranchise(prisma, details.franchise.name)).id 
                        : (game.franchiseId || null),
                }
            });

            // 2. Clear and update relations
            // We use surgical cleanup to avoid wiping out manual edits if needed, 
            // but the user wants to "güncelleyelim" all, so we replace them to ensure consistency.
            
            // Clean up old relations
            await prisma.contentGenre.deleteMany({ where: { contentId: game.id } });
            await prisma.contentTheme.deleteMany({ where: { contentId: game.id } });
            await prisma.contentGameMode.deleteMany({ where: { contentId: game.id } });
            await prisma.contentGameEngine.deleteMany({ where: { contentId: game.id } });
            await prisma.contentPerspective.deleteMany({ where: { contentId: game.id } });
            await prisma.contentPlatform.deleteMany({ where: { contentId: game.id } });
            await prisma.contentCompany.deleteMany({ where: { contentId: game.id } });

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
            
            // Companies (Developers & Publishers)
            // We omit the 'id' because IGDB IDs are numbers, while our DB uses string slugs.
            // linkCompanies will handle searching by name or creating new records with slugs.
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

            // 3. Images & Screenshots
            // Update backdrop if missing
            if (!game.backdropImageId && details.backdropPath) {
                await saveImages(prisma, game.id, undefined, details.backdropPath, true);
            }

            // Update screenshots if missing
            const existingScreenshots = await prisma.contentScreenshot.count({ where: { contentId: game.id } });
            if (existingScreenshots === 0 && details.screenshots && details.screenshots.length > 0) {
                await saveScreenshots(prisma, game.id, details.screenshots.map(s => ({ imageUrl: s })), false);
            }

            console.log(`  ✅ Successfully updated ${game.title}`);
        } catch (error: any) {
            console.error(`  ❌ Failed to update ${game.title}:`, error?.message || error);
        }
        
        // Wait a bit to avoid IGDB rate limits (approx 4 requests per second allowed on free tier)
        await new Promise(res => setTimeout(res, 300));
    }

    console.log("\nIGDB metadata update completed!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
