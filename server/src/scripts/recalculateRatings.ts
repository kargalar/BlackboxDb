/**
 * Recalculate Content Rating Stats Script
 *
 * This script recalculates totalRatingScore, totalRatingVotes, and ratingDistribution
 * for all Content records based on actual UserContentLog data.
 *
 * Usage: npx ts-node src/scripts/recalculateRatings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function recalculateRatings() {
    console.log("🔄 Starting rating recalculation...");

    // Get all content IDs
    const contents = await prisma.content.findMany({
        where: { isDeleted: false },
        select: { id: true, title: true },
    });

    console.log(`📊 Found ${contents.length} content records to process`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const content of contents) {
        // Get the latest log per user for this content (to avoid counting rewatches)
        // We need the most recent log per user that has a rating
        const ratedLogs = await prisma.$queryRaw<
            Array<{ rating: number }>
        >`
      SELECT DISTINCT ON (user_id) rating
      FROM user_content_log
      WHERE content_id = ${content.id}
        AND rating IS NOT NULL
      ORDER BY user_id, date DESC
    `;

        if (ratedLogs.length === 0) {
            // Reset to defaults if no ratings
            await prisma.content.update({
                where: { id: content.id },
                data: {
                    ratingDistribution: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    totalRatingScore: 0,
                    totalRatingVotes: 0,
                },
            });
            skippedCount++;
            continue;
        }

        // Calculate rating distribution and totals
        const dist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        let totalScore = 0;
        let totalVotes = 0;

        for (const log of ratedLogs) {
            const rating = Number(log.rating);
            if (rating > 0 && rating <= 10) {
                const idx = Math.round(rating) - 1;
                if (idx >= 0 && idx < 10) {
                    dist[idx] += 1;
                }
                totalScore += rating;
                totalVotes += 1;
            }
        }

        await prisma.content.update({
            where: { id: content.id },
            data: {
                ratingDistribution: dist,
                totalRatingScore: totalScore,
                totalRatingVotes: totalVotes,
            },
        });

        updatedCount++;

        if (updatedCount % 100 === 0) {
            console.log(`  ✅ Processed ${updatedCount}/${contents.length}...`);
        }
    }

    console.log(`\n✅ Recalculation complete!`);
    console.log(`  Updated: ${updatedCount}`);
    console.log(`  No ratings (reset): ${skippedCount}`);
    console.log(`  Total: ${contents.length}`);
}

recalculateRatings()
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
