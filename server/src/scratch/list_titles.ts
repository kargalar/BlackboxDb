import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const games = await prisma.content.findMany({
    where: { contentTypeId: 3 },
    take: 10,
    select: { title: true }
  });

  console.log(games);
}

main();
