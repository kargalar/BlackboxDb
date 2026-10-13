/**
 * Migration Script: Convert Person and Company IDs from autoincrement integers to slug format.
 *
 * This script:
 * 1. Alters person.id and company.id columns from Int to VarChar(255)
 * 2. Alters FK columns (content_person.person_id, content_company.company_id) similarly
 * 3. Generates slugs from names and updates all records
 *
 * Usage:
 *   npx ts-node scripts/migrate_person_company_ids.ts [--dry-run]
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
  return slug || "unknown";
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    console.log(`\n🔄 Person & Company ID Migration ${isDryRun ? "(DRY RUN)" : ""}\n`);

    // ==============================
    // 1. PERSON MIGRATION
    // ==============================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👤 PERSON TABLE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const allPersons = await prisma.$queryRawUnsafe<Array<{ id: number; name: string }>>(
      `SELECT id, name FROM "person" ORDER BY id`
    );
    console.log(`📊 Found ${allPersons.length} person records.\n`);

    const personSlugMap = new Map<number, string>();
    const usedPersonSlugs = new Set<string>();

    for (const person of allPersons) {
      const baseSlug = slugify(person.name);
      let finalSlug = baseSlug;

      if (usedPersonSlugs.has(finalSlug)) {
        // Try with original ID suffix
        finalSlug = `${baseSlug}-${person.id}`;
        if (usedPersonSlugs.has(finalSlug)) {
          let attempts = 0;
          do {
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            finalSlug = `${baseSlug}-${randomSuffix}`;
            attempts++;
          } while (usedPersonSlugs.has(finalSlug) && attempts < 100);
        }
      }

      usedPersonSlugs.add(finalSlug);
      personSlugMap.set(person.id, finalSlug);
    }

    // Print proposed person changes
    let personChangeCount = 0;
    for (const [oldId, newSlug] of personSlugMap) {
      personChangeCount++;
      if (personChangeCount <= 30 || isDryRun) {
        console.log(`  ${oldId}  →  ${newSlug}`);
      }
    }
    if (!isDryRun && personChangeCount > 30) {
      console.log(`  ... and ${personChangeCount - 30} more`);
    }
    console.log(`\n📝 Person changes: ${personChangeCount}\n`);

    // ==============================
    // 2. COMPANY MIGRATION
    // ==============================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🏢 COMPANY TABLE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const allCompanies = await prisma.$queryRawUnsafe<Array<{ id: number; name: string }>>(
      `SELECT id, name FROM "company" ORDER BY id`
    );
    console.log(`📊 Found ${allCompanies.length} company records.\n`);

    const companySlugMap = new Map<number, string>();
    const usedCompanySlugs = new Set<string>();

    for (const company of allCompanies) {
      const baseSlug = slugify(company.name);
      let finalSlug = baseSlug;

      if (usedCompanySlugs.has(finalSlug)) {
        finalSlug = `${baseSlug}-${company.id}`;
        if (usedCompanySlugs.has(finalSlug)) {
          let attempts = 0;
          do {
            const randomSuffix = Math.random().toString(36).substring(2, 6);
            finalSlug = `${baseSlug}-${randomSuffix}`;
            attempts++;
          } while (usedCompanySlugs.has(finalSlug) && attempts < 100);
        }
      }

      usedCompanySlugs.add(finalSlug);
      companySlugMap.set(company.id, finalSlug);
    }

    // Print proposed company changes
    let companyChangeCount = 0;
    for (const [oldId, newSlug] of companySlugMap) {
      companyChangeCount++;
      if (companyChangeCount <= 30 || isDryRun) {
        console.log(`  ${oldId}  →  ${newSlug}`);
      }
    }
    if (!isDryRun && companyChangeCount > 30) {
      console.log(`  ... and ${companyChangeCount - 30} more`);
    }
    console.log(`\n📝 Company changes: ${companyChangeCount}\n`);

    if (isDryRun) {
      console.log("✅ Dry run complete. No changes were made.\n");
      return;
    }

    // ==============================
    // 3. APPLY CHANGES
    // ==============================
    console.log("🚀 Starting migration...\n");

    await prisma.$transaction(async (tx) => {
      // Disable FK constraint checks
      await tx.$executeRawUnsafe(`SET session_replication_role = 'replica'`);

      // --- Step 1: Drop FK constraints ---
      console.log("  Step 1: Dropping FK constraints...");
      await tx.$executeRawUnsafe(`ALTER TABLE "content_person" DROP CONSTRAINT IF EXISTS "content_person_person_id_fkey"`);
      await tx.$executeRawUnsafe(`ALTER TABLE "content_company" DROP CONSTRAINT IF EXISTS "content_company_company_id_fkey"`);

      // --- Step 2: Alter column types from Int to VarChar ---
      console.log("  Step 2: Altering column types to VARCHAR...");

      // Person
      await tx.$executeRawUnsafe(`ALTER TABLE "person" ALTER COLUMN "id" DROP DEFAULT`);
      await tx.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS "person_id_seq" CASCADE`);
      await tx.$executeRawUnsafe(`ALTER TABLE "person" ALTER COLUMN "id" TYPE VARCHAR(255) USING "id"::VARCHAR(255)`);
      await tx.$executeRawUnsafe(`ALTER TABLE "content_person" ALTER COLUMN "person_id" TYPE VARCHAR(255) USING "person_id"::VARCHAR(255)`);

      // Company
      await tx.$executeRawUnsafe(`ALTER TABLE "company" ALTER COLUMN "id" DROP DEFAULT`);
      await tx.$executeRawUnsafe(`DROP SEQUENCE IF EXISTS "company_id_seq" CASCADE`);
      await tx.$executeRawUnsafe(`ALTER TABLE "company" ALTER COLUMN "id" TYPE VARCHAR(255) USING "id"::VARCHAR(255)`);
      await tx.$executeRawUnsafe(`ALTER TABLE "content_company" ALTER COLUMN "company_id" TYPE VARCHAR(255) USING "company_id"::VARCHAR(255)`);

      // --- Step 3: Update person IDs to slugs ---
      console.log("  Step 3: Updating person IDs to slugs...");
      let processed = 0;
      for (const [oldId, newSlug] of personSlugMap) {
        await tx.$executeRawUnsafe(
          `UPDATE "content_person" SET "person_id" = $1 WHERE "person_id" = $2`,
          newSlug, String(oldId)
        );
        await tx.$executeRawUnsafe(
          `UPDATE "person" SET "id" = $1 WHERE "id" = $2`,
          newSlug, String(oldId)
        );
        processed++;
        if (processed % 5000 === 0 || processed === personChangeCount) {
          console.log(`    Progress: ${processed}/${personChangeCount}`);
        }
      }

      // --- Step 4: Update company IDs to slugs ---
      console.log("  Step 4: Updating company IDs to slugs...");
      processed = 0;
      for (const [oldId, newSlug] of companySlugMap) {
        await tx.$executeRawUnsafe(
          `UPDATE "content_company" SET "company_id" = $1 WHERE "company_id" = $2`,
          newSlug, String(oldId)
        );
        await tx.$executeRawUnsafe(
          `UPDATE "company" SET "id" = $1 WHERE "id" = $2`,
          newSlug, String(oldId)
        );
        processed++;
        if (processed % 100 === 0 || processed === companyChangeCount) {
          console.log(`    Progress: ${processed}/${companyChangeCount}`);
        }
      }

      // --- Step 5: Recreate FK constraints ---
      console.log("  Step 5: Recreating FK constraints...");
      await tx.$executeRawUnsafe(`
        ALTER TABLE "content_person"
        ADD CONSTRAINT "content_person_person_id_fkey"
        FOREIGN KEY ("person_id") REFERENCES "person"("id") ON DELETE CASCADE
      `);
      await tx.$executeRawUnsafe(`
        ALTER TABLE "content_company"
        ADD CONSTRAINT "content_company_company_id_fkey"
        FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE
      `);

      // Re-enable FK constraint checks
      await tx.$executeRawUnsafe(`SET session_replication_role = 'origin'`);
    }, { timeout: 1800000 }); // 30 minute timeout for 184K+ records

    console.log(`\n✅ Migration complete! ${personChangeCount} person + ${companyChangeCount} company IDs updated.\n`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
