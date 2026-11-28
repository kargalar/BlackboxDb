import type { PrismaClient } from "@prisma/client";

export async function catalogNameSearch(
  prisma: PrismaClient,
  catalog: string,
  search: string,
  field: "name" | "label" = "name",
) {
  const translations = await prisma.catalogTranslation.findMany({
    where: { catalog, name: { contains: search, mode: "insensitive" } },
    select: { entryId: true },
    distinct: ["entryId"],
  });
  return {
    OR: [
      { [field]: { contains: search, mode: "insensitive" } },
      { id: { in: translations.map(({ entryId }) => entryId) } },
    ],
  };
}

export async function matchesLocalizedCatalogName(
  prisma: PrismaClient,
  catalog: string,
  id: number | undefined,
  name: string,
) {
  if (!id) return false;
  const row = await prisma.catalogTranslation.findFirst({
    where: { catalog, entryId: id, name: { equals: name, mode: "insensitive" } },
    select: { entryId: true },
  });
  return row !== null;
}
