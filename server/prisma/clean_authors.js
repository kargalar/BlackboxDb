const { PrismaClient } = require('@prisma/client');

async function cleanAuthors() {
    const prisma = new PrismaClient();

    try {
        // Reset all book authors to empty array
        const result = await prisma.content.updateMany({
            where: { contentTypeId: 4 },
            data: { authors: [] }
        });

        console.log(`✅ Reset authors for ${result.count} books`);
    } finally {
        await prisma.$disconnect();
    }
}

cleanAuthors();
