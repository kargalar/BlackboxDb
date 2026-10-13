import "dotenv/config";
import { PrismaClient, Theme } from "@prisma/client";
import { logger } from "../lib/logger";
import {
  isDecadeThemeName,
  normalizeThemeName,
  shouldNormalizeToDecadeTheme,
} from "../lib/themeNormalizer";

const prisma = new PrismaClient();

function sanitizeThemeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function shouldProcessGroup(normalizedName: string, themes: Theme[]): boolean {
  return (
    isDecadeThemeName(normalizedName) &&
    (themes.length > 1 ||
      themes.some((theme) => shouldNormalizeToDecadeTheme(theme.name)))
  );
}

function pickCanonicalTheme(normalizedName: string, themes: Theme[]): Theme {
  const exactMatch = themes.find(
    (theme) =>
      sanitizeThemeName(theme.name).toLowerCase() ===
      normalizedName.toLowerCase(),
  );

  return exactMatch || themes[0];
}

async function mergeThemeGroup(normalizedName: string, themes: Theme[]) {
  const canonicalTheme = pickCanonicalTheme(normalizedName, themes);
  const duplicateThemes = themes.filter(
    (theme) => theme.id !== canonicalTheme.id,
  );
  const needsRename = canonicalTheme.name !== normalizedName;

  if (needsRename) {
    await prisma.theme.update({
      where: { id: canonicalTheme.id },
      data: { name: normalizedName },
    });
    logger.info(
      `[normalizeThemeDecades] Theme renamed: ${canonicalTheme.name} -> ${normalizedName}`,
    );
  }

  let movedRelations = 0;

  for (const duplicateTheme of duplicateThemes) {
    const relations = await prisma.contentTheme.findMany({
      where: { themeId: duplicateTheme.id },
      select: { contentId: true },
    });

    for (const relation of relations) {
      await prisma.contentTheme.upsert({
        where: {
          contentId_themeId: {
            contentId: relation.contentId,
            themeId: canonicalTheme.id,
          },
        },
        update: {},
        create: {
          contentId: relation.contentId,
          themeId: canonicalTheme.id,
        },
      });
      movedRelations += 1;
    }

    await prisma.contentTheme.deleteMany({
      where: { themeId: duplicateTheme.id },
    });

    await prisma.theme.delete({ where: { id: duplicateTheme.id } });

    logger.info(
      `[normalizeThemeDecades] Theme merged: ${duplicateTheme.name} (#${duplicateTheme.id}) -> ${normalizedName} (#${canonicalTheme.id})`,
    );
  }

  return {
    renamed: needsRename ? 1 : 0,
    merged: duplicateThemes.length,
    movedRelations,
  };
}

async function main() {
  logger.info("[normalizeThemeDecades] Theme decade normalization started");

  const allThemes = await prisma.theme.findMany({
    orderBy: { id: "asc" },
  });

  const groupedThemes = new Map<string, Theme[]>();

  for (const theme of allThemes) {
    const normalizedName = normalizeThemeName(theme.name);
    const key = normalizedName.toLowerCase();
    const existingGroup = groupedThemes.get(key) || [];
    existingGroup.push(theme);
    groupedThemes.set(key, existingGroup);
  }

  let renamedCount = 0;
  let mergedCount = 0;
  let movedRelationCount = 0;

  for (const [normalizedName, themes] of groupedThemes.entries()) {
    if (!shouldProcessGroup(normalizedName, themes)) {
      continue;
    }

    const result = await mergeThemeGroup(normalizedName, themes);
    renamedCount += result.renamed;
    mergedCount += result.merged;
    movedRelationCount += result.movedRelations;
  }

  logger.success(
    `[normalizeThemeDecades] Completed. Renamed=${renamedCount}, merged=${mergedCount}, movedRelations=${movedRelationCount}`,
  );
}

main()
  .catch((error) => {
    logger.error("[normalizeThemeDecades] Failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
