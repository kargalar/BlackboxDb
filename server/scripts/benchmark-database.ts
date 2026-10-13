import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { writeFile } from "node:fs/promises";

const connection = new URL(process.env.DATABASE_URL!);
if (process.argv[3]) connection.pathname = `/${process.argv[3]}`;
const client = new PrismaClient({ datasourceUrl: connection.toString() });

async function main() {
  await client.$executeRawUnsafe("ANALYZE person");
  await client.$executeRawUnsafe("ANALYZE content_person");
  const queries = {
    personSubstring: `SELECT id, name FROM person WHERE name ILIKE '%smith%' AND is_pending = false ORDER BY name LIMIT 20`,
    personPage: `SELECT id, name FROM person WHERE is_pending = false ORDER BY name, id LIMIT 20`,
    legacyPeopleCounts: `SELECT cp.*, pr.label FROM content_person cp LEFT JOIN person_role pr ON pr.id = cp.person_role_id JOIN content c ON c.id = cp.content_id WHERE c.is_deleted = false AND c.content_type_id = 1`,
    aggregatedPeopleCounts: `SELECT cp.person_id, cp.person_role_id, count(*) FROM content_person cp JOIN person_role pr ON pr.id = cp.person_role_id JOIN content c ON c.id = cp.content_id WHERE c.is_deleted = false AND c.content_type_id = 1 AND lower(pr.label) IN ('actor','voice','voice_actor','director') GROUP BY cp.person_id, cp.person_role_id`,
  };
  const results: Record<string, unknown> = {};
  for (const [name, query] of Object.entries(queries)) {
    const plans: Array<Record<string, any>> = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await client.$queryRawUnsafe<
        Array<{ "QUERY PLAN": Array<Record<string, any>> }>
      >(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      plans.push(rows[0]["QUERY PLAN"][0]);
    }
    const timings = plans
      .map((plan) => Number(plan["Execution Time"]))
      .sort((a, b) => a - b);
    results[name] = {
      medianExecutionMs: timings[2],
      returnedRows: plans[0].Plan["Actual Rows"],
      plan: plans[0],
    };
  }
  await writeFile(
    process.argv[2] ?? "inspect-benchmark.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(results).map(([name, value]) => [
          name,
          {
            medianExecutionMs: (value as any).medianExecutionMs,
            returnedRows: (value as any).returnedRows,
          },
        ]),
      ),
    ),
  );
}

main()
  .finally(() => client.$disconnect())
  .catch(() => {
    console.error("Benchmark failed");
    process.exitCode = 1;
  });
