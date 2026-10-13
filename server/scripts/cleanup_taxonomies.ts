import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting taxonomy cleanup...');

  // 1. Themes (Delete those with <= 5 uses)
  const themes = await prisma.theme.findMany({
    include: { _count: { select: { contentThemes: true } } }
  });
  const themesToDelete = themes.filter(t => t._count.contentThemes <= 5).map(t => t.id);
  if (themesToDelete.length > 0) {
    console.log(`Deleting ${themesToDelete.length} themes with <= 5 uses...`);
    await prisma.contentTheme.deleteMany({ where: { themeId: { in: themesToDelete } } });
    await prisma.theme.deleteMany({ where: { id: { in: themesToDelete } } });
  }

  // 2. Genres (Delete unused)
  const genres = await prisma.genre.findMany({
    include: { _count: { select: { contentGenres: true } } }
  });
  const genresToDelete = genres.filter(g => g._count.contentGenres === 0).map(g => g.id);
  if (genresToDelete.length > 0) {
    console.log(`Deleting ${genresToDelete.length} unused genres...`);
    await prisma.contentGenre.deleteMany({ where: { genreId: { in: genresToDelete } } });
    await prisma.genre.deleteMany({ where: { id: { in: genresToDelete } } });
  }

  // 3. Moods (Delete unused)
  const moods = await prisma.mood.findMany({
    include: { _count: { select: { contentMoods: true } } }
  });
  const moodsToDelete = moods.filter(m => m._count.contentMoods === 0).map(m => m.id);
  if (moodsToDelete.length > 0) {
    console.log(`Deleting ${moodsToDelete.length} unused moods...`);
    await prisma.contentMood.deleteMany({ where: { moodId: { in: moodsToDelete } } });
    await prisma.mood.deleteMany({ where: { id: { in: moodsToDelete } } });
  }

  console.log('Taxonomy cleanup complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
