import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type GenreRow = Prisma.GenreGetPayload<{
  include: { _count: { select: { contentGenres: true } } };
}>;

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function groupMovieAndTvGenres(genres: GenreRow[]): GenreRow[][] {
  const groups = new Map<string, GenreRow[]>();

  for (const genre of genres) {
    const key = normalizeName(genre.name).toLocaleLowerCase("en-US");
    groups.set(key, [...(groups.get(key) ?? []), genre]);
  }

  return [...groups.values()];
}

async function simplifyMovieAndTvGenres(apply: boolean) {
  const genres = await prisma.genre.findMany({
    where: { contentTypeId: { in: [1, 2] } },
    include: { _count: { select: { contentGenres: true } } },
    orderBy: { id: "asc" },
  });
  const groups = groupMovieAndTvGenres(genres);
  const duplicateGroups = groups.filter((group) => group.length > 1);

  console.log(
    `[simplifyLookupCatalogs] Movie/TV genres: ${genres.length}; duplicate groups: ${duplicateGroups.length}; apply: ${apply}`,
  );

  for (const group of duplicateGroups) {
    const names = group
      .map((genre) => `${genre.name} (#${genre.id})`)
      .join(", ");
    console.log(`[simplifyLookupCatalogs] Merge: ${names}`);
  }

  if (!apply) return;

  await prisma.$transaction(async (tx) => {
    for (const group of duplicateGroups) {
      const canonical = [...group].sort(
        (a, b) =>
          b._count.contentGenres - a._count.contentGenres || a.id - b.id,
      )[0];
      const canonicalName = normalizeName(canonical.name);
      const isSharedByMoviesAndTv =
        group.some((genre) => genre.contentTypeId === 1) &&
        group.some((genre) => genre.contentTypeId === 2);

      await tx.genre.update({
        where: { id: canonical.id },
        data: {
          name: canonicalName,
          contentTypeId: isSharedByMoviesAndTv ? null : canonical.contentTypeId,
        },
      });

      for (const duplicate of group) {
        if (duplicate.id === canonical.id) continue;

        const relations = await tx.contentGenre.findMany({
          where: { genreId: duplicate.id },
          select: { contentId: true },
        });

        if (relations.length > 0) {
          await tx.contentGenre.createMany({
            data: relations.map((relation) => ({
              contentId: relation.contentId,
              genreId: canonical.id,
            })),
            skipDuplicates: true,
          });
        }

        await tx.contentGenre.deleteMany({ where: { genreId: duplicate.id } });
        await tx.genre.delete({ where: { id: duplicate.id } });
      }
    }
  });

  console.log("[simplifyLookupCatalogs] Movie/TV genre catalog updated.");
}

async function main() {
  await simplifyMovieAndTvGenres(process.argv.includes("--apply"));
}

main()
  .catch((error) => {
    console.error("[simplifyLookupCatalogs] Failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
