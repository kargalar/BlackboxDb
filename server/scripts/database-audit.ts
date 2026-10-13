import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";

const connection = new URL(process.env.DATABASE_URL!);
if (process.argv[3] && process.argv[3] !== "--fingerprints")
  connection.pathname = `/${process.argv[3]}`;
const client = new PrismaClient({ datasourceUrl: connection.toString() });
const outputPath = process.argv[2] ?? "inspect-database.json";
const quoteIdentifier = (value: string) => `"${value.replaceAll('"', '""')}"`;

async function main() {
  const report = await client.$transaction(
    async (database) => {
      await database.$executeRaw`SET TRANSACTION READ ONLY`;
      const tables = await database.$queryRaw<
        Array<{ name: string; bytes: bigint; estimatedRows: bigint }>
      >`
      SELECT relname AS name, pg_total_relation_size(relid) AS bytes,
             n_live_tup AS "estimatedRows"
      FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY relname
    `;
      const counts: Record<string, number> = {};
      const fingerprints: Record<string, string> = {};
      for (const table of tables) {
        const [result] = await database.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`SELECT count(*) AS count FROM ${Prisma.raw(`public.${quoteIdentifier(table.name)}`)}`,
        );
        counts[table.name] = Number(result.count);
        if (
          process.argv.includes("--fingerprints") &&
          table.name !== "_prisma_migrations"
        ) {
          const [fingerprint] = await database.$queryRaw<
            Array<{ hash: string }>
          >(
            Prisma.sql`SELECT md5(coalesce(string_agg(row_hash, '' ORDER BY row_hash), '')) AS hash
            FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM ${Prisma.raw(`public.${quoteIdentifier(table.name)}`)} t) hashed`,
          );
          fingerprints[table.name] = fingerprint.hash;
        }
      }
      const indexes = await database.$queryRaw`
      SELECT tablename, indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' ORDER BY tablename, indexname
    `;
      const constraints = await database.$queryRaw`
      SELECT conrelid::regclass::text AS "table", conname AS name,
             contype::text AS type, convalidated AS validated,
             pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE connamespace = 'public'::regnamespace
      ORDER BY conrelid::regclass::text, conname
    `;
      const migrations = await database.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations" ORDER BY started_at
    `;
      return {
        capturedAt: new Date().toISOString(),
        tables,
        counts,
        fingerprints,
        indexes,
        constraints,
        migrations,
      };
    },
    {
      timeout: 120_000,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
  await writeFile(
    outputPath,
    JSON.stringify(
      report,
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        outputPath,
        tableCount: report.tables.length,
        totalRows: Object.values(report.counts).reduce(
          (total, count) => total + count,
          0,
        ),
        largestTables: [...report.tables]
          .sort((a, b) => Number(b.bytes - a.bytes))
          .slice(0, 12)
          .map((table) => ({
            name: table.name,
            rows: report.counts[table.name],
            bytes: Number(table.bytes),
          })),
      },
      null,
      2,
    ),
  );
}

main()
  .finally(() => client.$disconnect())
  .catch(() => {
    console.error(
      "Database audit failed; check database connectivity and permissions.",
    );
    process.exitCode = 1;
  });
