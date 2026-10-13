/**
 * Cleanup Orphaned Records Script
 *
 * Deletes orphaned rows from junction/child tables where the parent
 * record (content, person, company) no longer exists.
 *
 * Usage: npm run script:cleanup-orphans
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface OrphanRule {
    table: string;
    foreignKey: string;
    parentTable: string;
}

const ORPHAN_RULES: OrphanRule[] = [
    // content_id -> content
    { table: "content_genre", foreignKey: "content_id", parentTable: "content" },
    { table: "content_person", foreignKey: "content_id", parentTable: "content" },
    { table: "content_company", foreignKey: "content_id", parentTable: "content" },
    { table: "content_image", foreignKey: "content_id", parentTable: "content" },
    { table: "content_screenshot", foreignKey: "content_id", parentTable: "content" },
    { table: "content_theme", foreignKey: "content_id", parentTable: "content" },
    { table: "content_mood", foreignKey: "content_id", parentTable: "content" },
    { table: "content_game_mode", foreignKey: "content_id", parentTable: "content" },
    { table: "content_perspective", foreignKey: "content_id", parentTable: "content" },
    { table: "content_platform", foreignKey: "content_id", parentTable: "content" },
    { table: "expansion", foreignKey: "content_id", parentTable: "content" },
    { table: "user_content_log", foreignKey: "content_id", parentTable: "content" },
    { table: "content_recommendation", foreignKey: "content_id", parentTable: "content" },
    // person_id -> person
    { table: "content_person", foreignKey: "person_id", parentTable: "person" },
    // company_id -> company
    { table: "content_company", foreignKey: "company_id", parentTable: "company" },
];

async function cleanupOrphans() {
    console.log("Starting database cleanup of orphaned records...\n");

    let totalDeleted = 0;

    for (const rule of ORPHAN_RULES) {
        console.log(`Checking ${rule.table}.${rule.foreignKey} -> ${rule.parentTable}...`);
        try {
            const result = await prisma.$executeRawUnsafe(
                `DELETE FROM ${rule.table} WHERE ${rule.foreignKey} NOT IN (SELECT id FROM ${rule.parentTable})`,
            );
            console.log(`  ✅ Deleted ${result} orphaned rows.`);
            totalDeleted += result;
        } catch (e) {
            console.warn(`  ⚠️ Skipped (error occurred).`);
        }
    }

    console.log(`\n🎉 Database cleanup complete! Total deleted: ${totalDeleted}`);
}

cleanupOrphans()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
