/**
 * Migration Script: Convert existing content IDs to slug format.
 *
 * This script:
 * 1. Reads all content records
 * 2. Generates a slug for each based on title + releaseDate
 * 3. Updates the content.id and ALL related foreign key references
 *
 * Usage:
 *   npx ts-node scripts/migrate_content_ids.ts [--dry-run]
 *
 * --dry-run : Only prints the proposed ID changes without modifying the database.
 */

import { PrismaClient } from "@prisma/client";

// Inline slugify to avoid import issues when running standalone
function slugify(title: string): string {
  const trMap: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };

  let slug = title.toLowerCase();
  for (const [from, to] of Object.entries(trMap)) {
    slug = slug.replace(new RegExp(from, "g"), to);
  }
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  slug = slug.replace(/[^a-z0-9]+/g, "-");
  slug = slug.replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
  if (slug.length > 100) {
    slug = slug.substring(0, 100).replace(/-+$/, "");
  }
  return slug || "content";
}

// Tables that reference content.id as a foreign key
const RELATED_TABLES = [
  { table: "content_recommendation", column: "content_id" },
  { table: "content_genre", column: "content_id" },
  { table: "content_person", column: "content_id" },
  { table: "content_company", column: "content_id" },
  { table: "content_image", column: "content_id" },
  { table: "content_screenshot", column: "content_id" },
  { table: "content_theme", column: "content_id" },
  { table: "content_mood", column: "content_id" },
  { table: "content_game_mode", column: "content_id" },
  { table: "content_perspective", column: "content_id" },
  { table: "content_platform", column: "content_id" },
  { table: "tv_season", column: "tv_show_id" },
  { table: "tv_episode", column: "tv_show_id" },
  { table: "user_content_log", column: "content_id" },
  { table: "notification", column: "content_id" },
  { table: "expansion", column: "content_id" },
  { table: "user_list_item", column: "content_id" },
  { table: "user_featured_content", column: "content_id" },
  { table: "discussion", column: "content_id" },
];

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    console.log(`\n🔄 Content ID Migration ${isDryRun ? "(DRY RUN)" : ""}\n`);

    // 1. Fetch all content records
    const allContent = await prisma.content.findMany({
      select: {
        id: true,
        title: true,
        releaseDate: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`📊 Found ${allContent.length} content records.\n`);

    // 2. Generate slug mapping (oldId → newSlug), ensuring no duplicates
    const slugMap = new Map<string, string>(); // oldId → newSlug
    const usedSlugs = new Set<string>();

    for (const content of allContent) {
      const baseSlug = slugify(content.title);

      let finalSlug = baseSlug;

      // Check if base slug is already used
      if (usedSlugs.has(finalSlug)) {
        // Try with year
        if (content.releaseDate) {
          const year = new Date(content.releaseDate).getFullYear();
          if (!isNaN(year)) {
            finalSlug = `${baseSlug}-${year}`;
          }
        }

        // If still duplicate, append random suffix
        if (usedSlugs.has(finalSlug)) {
          let attempts = 0;
          do {
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            finalSlug = `${baseSlug}-${randomSuffix}`;
            attempts++;
          } while (usedSlugs.has(finalSlug) && attempts < 100);
        }
      }

      usedSlugs.add(finalSlug);
      slugMap.set(content.id, finalSlug);
    }

    // 3. Print proposed changes
    let changeCount = 0;
    let skipCount = 0;
    for (const [oldId, newSlug] of slugMap) {
      if (oldId === newSlug) {
        skipCount++;
        continue;
      }
      changeCount++;
      if (changeCount <= 30 || isDryRun) {
        console.log(`  ${oldId}  →  ${newSlug}`);
      }
    }
    if (!isDryRun && changeCount > 30) {
      console.log(`  ... and ${changeCount - 30} more`);
    }
    console.log(`\n📝 Changes: ${changeCount}, Skipped (already slug): ${skipCount}\n`);

    if (isDryRun) {
      console.log("✅ Dry run complete. No changes were made.\n");
      return;
    }

    // 4. Apply all changes in a single transaction with FK checks disabled
    console.log("🚀 Starting migration...\n");

    await prisma.$transaction(async (tx) => {
      // Disable FK constraint checks for this session
      await tx.$executeRawUnsafe(`SET session_replication_role = 'replica'`);

      let processed = 0;
      const total = changeCount;

      for (const [oldId, newSlug] of slugMap) {
        if (oldId === newSlug) continue;

        // Update the content ID itself first (since FK checks are disabled)
        await tx.$executeRawUnsafe(
          `UPDATE "content" SET "id" = $1 WHERE "id" = $2`,
          newSlug,
          oldId,
        );

        // Update all related tables
        for (const { table, column } of RELATED_TABLES) {
          await tx.$executeRawUnsafe(
            `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
            newSlug,
            oldId,
          );
        }

        processed++;
        if (processed % 100 === 0 || processed === total) {
          console.log(`  Progress: ${processed}/${total}`);
        }
      }

      // Re-enable FK constraint checks
      await tx.$executeRawUnsafe(`SET session_replication_role = 'origin'`);
    }, { timeout: 600000 }); // 10 minute timeout for large datasets

    console.log(`\n✅ Migration complete! ${changeCount} content IDs updated.\n`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
