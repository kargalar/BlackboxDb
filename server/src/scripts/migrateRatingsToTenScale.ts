import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateRatingsToTenScale() {
    console.log("Starting rating migration to 10-point scale...");

    await prisma.$executeRaw`
        ALTER TABLE "user_content_log"
        ALTER COLUMN "rating" TYPE DECIMAL(4, 2)
    `;

    await prisma.$executeRaw`
        ALTER TABLE "user_expansion_log"
        ALTER COLUMN "rating" TYPE DECIMAL(4, 2)
    `;

    await prisma.$executeRaw`
        ALTER TABLE "user_episode_log"
        ALTER COLUMN "rating" TYPE DECIMAL(4, 2)
    `;

    const updatedLogs = await prisma.$executeRaw`
        UPDATE "user_content_log"
        SET rating = rating * 2
        WHERE rating IS NOT NULL
    `;

    const updatedExpansionLogs = await prisma.$executeRaw`
        UPDATE "user_expansion_log"
        SET rating = rating * 2
        WHERE rating IS NOT NULL
    `;

    const updatedContents = await prisma.$executeRaw`
        UPDATE "content"
        SET total_rating_score = total_rating_score * 2
        WHERE total_rating_score IS NOT NULL
    `;

    console.log(`Updated content logs: ${updatedLogs}`);
    console.log(`Updated expansion logs: ${updatedExpansionLogs}`);
    console.log(`Updated content aggregates: ${updatedContents}`);
    console.log("Migration finished. Run the recalculate script if you need a full consistency pass.");
}

migrateRatingsToTenScale()
    .catch((error) => {
        console.error("Migration failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
