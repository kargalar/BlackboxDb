const { PrismaClient } = require('@prisma/client');

async function resetAuthorsData() {
    const prisma = new PrismaClient();

    try {
        // Get all books (contentTypeId = 4) with corrupted authors
        const books = await prisma.content.findMany({
            where: {
                contentTypeId: 4,
                authors: { isEmpty: false }
            },
            select: {
                id: true,
                title: true,
                authors: true
            }
        });

        console.log(`Found ${books.length} books with authors`);

        for (const book of books) {
            console.log(`\n📚 Resetting authors for: ${book.title}`);

            // Reset authors to empty array - user will need to re-add them
            await prisma.content.update({
                where: { id: book.id },
                data: { authors: [] }
            });
            console.log('   ✅ Authors reset to empty');
        }

        console.log('\n🎉 Done! All authors have been reset. Please re-add them via the UI.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetAuthorsData();
