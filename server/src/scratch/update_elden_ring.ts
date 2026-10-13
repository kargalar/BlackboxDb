import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchIgdbGameDetails } from "../lib/igdbFetcher";
import {
  linkGenres,
  linkLookups,
  linkThemes,
  linkCompanies,
  findOrCreateFranchise,
  saveImages,
  saveScreenshots,
} from "../resolvers/admin/AdminContentHelpers";

const prisma = new PrismaClient();

async function main() {
    const gameId = '3-1778413595772-cx2x8uvxw';
    const igdbId = 119133;

    console.log(`Updating Elden Ring (ID: ${gameId}, IGDB: ${igdbId})...`);

    try {
        const details = await fetchIgdbGameDetails(igdbId);
        
        // 1. Update basic fields
        await prisma.content.update({
            where: { id: gameId },
            data: {
                title: details.title || 'Elden Ring',
                originalTitle: details.originalTitle || details.title || null,
                description: details.overview || null,
                releaseDate: details.releaseDate ? new Date(details.releaseDate) : null,
                trailerUrl: details.trailerUrl || null,
                franchiseId: details.franchise 
                    ? (await findOrCreateFranchise(prisma, details.franchise.name)).id 
                    : null,
            }
        });

        // 2. Clear and update relations
        await prisma.contentGenre.deleteMany({ where: { contentId: gameId } });
        await prisma.contentTheme.deleteMany({ where: { contentId: gameId } });
        await prisma.contentGameMode.deleteMany({ where: { contentId: gameId } });
        await prisma.contentPerspective.deleteMany({ where: { contentId: gameId } });
        await prisma.contentPlatform.deleteMany({ where: { contentId: gameId } });
        await prisma.contentCompany.deleteMany({ where: { contentId: gameId } });

        if (details.genres && details.genres.length > 0) {
            await linkGenres(prisma, gameId, details.genres.map(g => ({ name: g.name })), 3);
        }
        if (details.tags && details.tags.length > 0) {
            await linkThemes(prisma, gameId, details.tags);
        }
        if (details.gameModes && details.gameModes.length > 0) {
            await linkLookups(prisma, gameId, details.gameModes, "gameMode", "contentGameMode", "gameModeId");
        }
        if (details.gameEngines && details.gameEngines.length > 0) {
            await linkLookups(prisma, gameId, details.gameEngines, "gameEngine", "contentGameEngine", "gameEngineId");
        }
        if (details.playerPerspectives && details.playerPerspectives.length > 0) {
            await linkLookups(prisma, gameId, details.playerPerspectives, "perspective", "contentPerspective", "perspectiveId");
        }
        if (details.platforms && details.platforms.length > 0) {
            await linkLookups(prisma, gameId, details.platforms, "platform", "contentPlatform", "platformId");
        }
        
        const companies: any[] = [];
        if (details.developers) {
            companies.push(...details.developers.map(d => ({ name: d.name, companyRoleId: 5 })));
        }
        if (details.publishers) {
            companies.push(...details.publishers.map(p => ({ name: p.name, companyRoleId: 4 })));
        }
        if (companies.length > 0) {
            await linkCompanies(prisma, gameId, companies);
        }

        // 3. Images
        if (details.backdropPath) {
            await saveImages(prisma, gameId, undefined, details.backdropPath, true);
        }
        if (details.screenshots && details.screenshots.length > 0) {
            await saveScreenshots(prisma, gameId, details.screenshots.map(s => ({ imageUrl: s })), true);
        }

        console.log(`Successfully updated Elden Ring!`);

        // Check the final state
        const updated = await prisma.content.findUnique({
            where: { id: gameId },
            include: {
                genres: { include: { genre: true } },
                companies: { include: { company: true, companyRole: true } },
                contentThemes: { include: { theme: true } },
                contentPlatforms: { include: { platform: true } },
            }
        });

        console.log('\nFinal DB state for Elden Ring:');
        console.log('Title:', updated?.title);
        console.log('Genres:', updated?.genres.map(g => g.genre.name).join(', '));
        console.log('Themes:', updated?.contentThemes.map(t => t.theme.name).join(', '));
        console.log('Platforms:', updated?.contentPlatforms.map(p => p.platform.name).join(', '));
        console.log('Companies:', updated?.companies.map(c => `${c.company.name} (${c.companyRole.name})`).join(', '));

    } catch (error: any) {
        console.error(`Failed to update Elden Ring:`, error?.message || error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
