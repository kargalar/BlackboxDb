import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const game = await prisma.content.findFirst({
    where: { title: 'Counter-Strike 2' },
    include: {
      genres: { include: { genre: true } },
      companies: { include: { company: true, companyRole: true } },
      contentThemes: { include: { theme: true } },
      contentPlatforms: { include: { platform: true } },
    }
  });

  console.log(JSON.stringify(game, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main();
