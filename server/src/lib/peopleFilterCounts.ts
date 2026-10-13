import { Prisma, type PrismaClient } from "@prisma/client";

type RoleBucket = "actors" | "directors";

export async function getPeopleFilterCounts(
  prisma: PrismaClient,
  contentTypeId?: number,
) {
  const typeCondition = contentTypeId
    ? Prisma.sql`AND c.content_type_id = ${contentTypeId}`
    : Prisma.empty;
  const rows = await prisma.$queryRaw<
    Array<{ bucket: RoleBucket; counts: Record<string, number> }>
  >`
    SELECT bucket, jsonb_object_agg(person_id, credit_count) AS counts
    FROM (
      SELECT cp.person_id,
        CASE WHEN lower(pr.label) = 'director' THEN 'directors' ELSE 'actors' END AS bucket,
        count(*) AS credit_count
      FROM content_person cp
      JOIN person_role pr ON pr.id = cp.person_role_id
      JOIN content c ON c.id = cp.content_id
      WHERE c.is_deleted = false ${typeCondition}
        AND lower(pr.label) IN ('actor', 'voice', 'voice_actor', 'director')
      GROUP BY cp.person_id, bucket
    ) grouped
    GROUP BY bucket
  `;
  const counts: Record<RoleBucket, Record<string, number>> = {
    actors: {},
    directors: {},
  };
  for (const row of rows) counts[row.bucket] = row.counts;
  return counts;
}
