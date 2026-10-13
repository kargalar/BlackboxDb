const { PrismaClient } = require('@prisma/client');

async function fixAuthorsData() {
    const prisma = new PrismaClient();

    try {
        // Get all books (contentTypeId = 4) with authors
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
            console.log(`\n📚 Processing: ${book.title}`);
            console.log('   Original authors:', JSON.stringify(book.authors));

            // Try to clean up the data
            let cleanAuthors = [];

            for (const author of book.authors) {
                // If it looks like escaped JSON, try to parse it
                if (typeof author === 'string') {
                    let cleaned = author;

                    // Try multiple levels of unescaping
                    let attempts = 0;
                    while (attempts < 5 && (cleaned.includes('\\') || cleaned.startsWith('{') || cleaned.startsWith('['))) {
                        try {
                            const parsed = JSON.parse(cleaned);
                            if (typeof parsed === 'string') {
                                cleaned = parsed;
                            } else if (typeof parsed === 'object' && parsed.name) {
                                cleaned = parsed.name;
                                break;
                            } else if (Array.isArray(parsed)) {
                                // It's an array, extract names
                                for (const item of parsed) {
                                    if (typeof item === 'string') {
                                        cleanAuthors.push(item);
                                    } else if (item && item.name) {
                                        cleanAuthors.push(item.name);
                                    }
                                }
                                cleaned = null;
                                break;
                            } else {
                                break;
                            }
                        } catch (e) {
                            break;
                        }
                        attempts++;
                    }

                    if (cleaned && !cleaned.includes('{') && !cleaned.includes('[')) {
                        cleanAuthors.push(cleaned);
                    }
                } else if (typeof author === 'object' && author.name) {
                    cleanAuthors.push(author.name);
                }
            }

            // Remove duplicates and empty strings
            cleanAuthors = [...new Set(cleanAuthors)].filter(a => a && a.trim().length > 0);

            console.log('   Cleaned authors:', cleanAuthors);

            if (cleanAuthors.length > 0 || book.authors.length > 0) {
                // Update the book with cleaned authors
                await prisma.content.update({
                    where: { id: book.id },
                    data: { authors: cleanAuthors }
                });
                console.log('   ✅ Updated!');
            }
        }

        console.log('\n🎉 Done! All authors cleaned.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAuthorsData();
