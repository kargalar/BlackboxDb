/**
 * Fix Persons TMDB Data Script
 *
 * Backfills person records with TMDB data (biography, birth/death dates, etc.)
 * Resumes from last processed ID using a state file.
 *
 * Usage: npm run script:fix-persons
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { searchTmdbPerson, fetchTmdbPersonDetails } from "../lib/tmdbFetcher";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const STATE_FILE = path.join(__dirname, "../../scripts/last_person_tmdb_id.txt");

async function main() {
    console.log("Starting TMDB backfill for past imported persons...");

    let lastProcessedId = "";
    if (fs.existsSync(STATE_FILE)) {
        const fileContent = fs.readFileSync(STATE_FILE, "utf-8").trim();
        if (fileContent) {
            lastProcessedId = fileContent;
            console.log(`Resuming from last processed ID: ${lastProcessedId}`);
        }
    } else {
        console.log("No saved state found. Starting from the beginning...");
    }

    const personsToUpdate = await prisma.person.findMany({
        where: lastProcessedId !== "" ? { id: { gt: lastProcessedId } } : undefined,
        orderBy: { id: "asc" },
    });

    console.log(`Found ${personsToUpdate.length} persons to process.`);

    const BATCH_SIZE = 50;
    for (let i = 0; i < personsToUpdate.length; i += BATCH_SIZE) {
        const batch = personsToUpdate.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(personsToUpdate.length / BATCH_SIZE);
        console.log(`\n--- Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, personsToUpdate.length)}) ---`);

        let maxProcessedId = lastProcessedId;

        await Promise.allSettled(batch.map(async (person, index) => {
            try {
                const currentNum = i + index + 1;
                console.log(`[${currentNum}/${personsToUpdate.length}] Processing: ${person.name} (ID: ${person.id})`);

                if (person.biography || person.birthDate || person.deathDate || person.placeOfBirth) {
                    console.log(`  -> [${person.id}] Already has data. Skipping.`);
                    return;
                }

                const tmdbId = await searchTmdbPerson(person.name);
                if (!tmdbId) {
                    console.log(`  -> [${person.id}] No TMDB match for "${person.name}".`);
                } else {
                    const details = await fetchTmdbPersonDetails(tmdbId);

                    await prisma.person.update({
                        where: { id: person.id },
                        data: {
                            profileUrl: person.profileUrl || details.profilePath || null,
                            gender: details.gender === 1 ? "female" : details.gender === 2 ? "male" : "unknown",
                            biography: details.biography || person.biography,
                            birthDate: details.birthday ? new Date(details.birthday) : person.birthDate,
                            deathDate: details.deathday ? new Date(details.deathday) : person.deathDate,
                            placeOfBirth: details.placeOfBirth || person.placeOfBirth,
                        },
                    });

                    console.log(`  -> [${person.id}] Updated: ${details.name} (TMDB ID: ${tmdbId})`);
                }
            } catch (err: any) {
                console.error(`  -> [${person.id}] Error processing ${person.name}:`, err?.message || err);
            }
        }));

        // Write state ONCE after the entire batch completes (avoids race condition)
        const lastPersonInBatch = batch[batch.length - 1];
        if (lastPersonInBatch) {
            fs.writeFileSync(STATE_FILE, lastPersonInBatch.id.toString(), "utf-8");
        }

        // Rate-limit between batches
        await new Promise((res) => setTimeout(res, 500));
    }

    console.log("\nTMDB person backfill completed!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
