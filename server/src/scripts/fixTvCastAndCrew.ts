import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchTmdbTvDetails } from "../lib/tmdbFetcher";
import {
    processCast,
    processCrew,
} from "../resolvers/admin/AdminContentHelpers";
import { findOrCreatePersonRole } from "../resolvers/admin/AdminContentHelpers";

const prisma = new PrismaClient();

async function fixTvCastAndCrew() {
    console.log("=== Starting TV Series Cast & Crew Fix Script ===");

    try {
        // 1. Fetch all TV series from the database
        // contentTypeId: 2 is for TV shows
        const tvShows = await prisma.content.findMany({
            where: {
                contentTypeId: 2,
                isDeleted: false,
            },
            select: {
                id: true,
                title: true,
            },
        });

        console.log(`Found ${tvShows.length} TV series to process.`);

        if (tvShows.length === 0) {
            console.log("No TV series found. Exiting.");
            return;
        }

        // Prepare actor role early
        await findOrCreatePersonRole(prisma, "actor");

        let successCount = 0;
        let errorCount = 0;

        for (const show of tvShows) {
            console.log(`\nProcessing: ${show.title} (ID: ${show.id})`);

            try {
                console.log(`-> Searching TMDB for "${show.title}" to get TMDB ID...`);
                const { searchTmdb } = await import("../lib/tmdbFetcher");
                const searchResults = await searchTmdb(show.title, "tv");

                if (!searchResults || searchResults.length === 0) {
                    console.warn(`-> No TMDB results found for "${show.title}". Skipping.`);
                    errorCount++;
                    continue;
                }

                const tmdbId = searchResults[0].tmdbId;
                console.log(`-> Found TMDB ID: ${tmdbId}. Fetching full details...`);

                // Fetch the full details (this now uses aggregate_credits inside)
                const details = await fetchTmdbTvDetails(tmdbId);

                // First, delete existing cast and crew for this content to prevent duplicates/stale data
                // ContentPerson contains both cast and crew
                console.log(`-> Deleting existing cast/crew for ${show.id}...`);
                await prisma.contentPerson.deleteMany({
                    where: {
                        contentId: show.id
                    }
                });

                // Update the JSON blobs on the content
                await prisma.content.update({
                    where: { id: show.id },
                    data: {
                        cast: details.cast ? JSON.stringify(details.cast) : null,
                        crew: details.crew ? JSON.stringify(details.crew) : null,
                    }
                });

                // Re-process cast and crew using the imported helpers
                if (details.cast && details.cast.length > 0) {
                    console.log(`-> Processing ${details.cast.length} cast members...`);
                    await processCast(prisma, show.id, JSON.stringify(details.cast));
                }

                if (details.crew && details.crew.length > 0) {
                    console.log(`-> Processing ${details.crew.length} crew members...`);
                    await processCrew(prisma, show.id, JSON.stringify(details.crew));
                }

                console.log(`-> Successfully updated "${show.title}".`);
                successCount++;

                // Add a small delay to avoid hitting TMDB rate limits (40 req/sec)
                await new Promise(resolve => setTimeout(resolve, 250));

            } catch (err: any) {
                console.error(`-> Failed to process "${show.title}":`, err.message);
                errorCount++;
            }
        }

        console.log(`\n=== Finished ===`);
        console.log(`Total processed: ${tvShows.length}`);
        console.log(`Successful:     ${successCount}`);
        console.log(`Failed/Skipped: ${errorCount}`);

    } catch (error) {
        console.error("Critical error during script execution:", error);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

fixTvCastAndCrew();
