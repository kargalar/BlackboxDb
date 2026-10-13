import "dotenv/config";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  getContentSearchPage,
  standardContentSearchOrder,
} from "../src/lib/contentSearchPage";
import { getContentScreenshotCounts } from "../src/lib/contentScreenshotCounts";

const client = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
let queries = 0;
client.$on("query", () => queries++);

async function main() {
  const report = await client.$transaction(
    async (transaction) => {
      // Verification cannot create, update or delete application data.
      await transaction.$executeRaw`SET TRANSACTION READ ONLY`;
      const prisma = transaction as unknown as PrismaClient;
      const where: Prisma.ContentWhereInput = {
        isDeleted: false,
        contentTypeId: 1,
      };
      const candidates = await transaction.content.findMany({
        where,
        select: {
          id: true,
          totalRatingScore: true,
          totalRatingVotes: true,
          createdAt: true,
        },
      });
      const average = (content: (typeof candidates)[number]) =>
        content.totalRatingVotes > 0
          ? Number(content.totalRatingScore) / content.totalRatingVotes
          : 0;
      let cases = 0;
      const measurements: Record<string, unknown>[] = [];
      for (const sortOrder of ["asc", "desc"]) {
        for (const [ratingMin, ratingMax] of [
          [undefined, undefined],
          [0, 0],
          [6, 9],
          [11, undefined],
        ] as const) {
          const expected = candidates
            .filter(
              (content) =>
                (ratingMin === undefined || average(content) >= ratingMin) &&
                (ratingMax === undefined || average(content) <= ratingMax),
            )
            .sort(
              (a, b) =>
                (sortOrder === "asc" ? 1 : -1) *
                  (average(a) - average(b) ||
                    a.totalRatingVotes - b.totalRatingVotes) ||
                b.createdAt.getTime() - a.createdAt.getTime() ||
                a.id.localeCompare(b.id),
            );
          for (const offset of [0, 20, 100_000]) {
            queries = 0;
            const started = performance.now();
            const result = await getContentSearchPage(prisma, {
              where,
              sortBy: "rating",
              sortOrder,
              ratingMin,
              ratingMax,
              limit: 20,
              offset,
            });
            assert.equal(result.total, expected.length);
            assert.deepEqual(
              result.ids,
              expected.slice(offset, offset + 20).map((content) => content.id),
            );
            assert.equal(queries, 1);
            if (offset === 0 && ratingMin === undefined)
              measurements.push({
                sortOrder,
                sqlReads: queries,
                legacyRows: candidates.length,
                returnedIds: result.ids.length,
                legacyBytes: Buffer.byteLength(JSON.stringify(candidates)),
                returnedBytes: Buffer.byteLength(JSON.stringify(result)),
                durationMs: performance.now() - started,
              });
            cases++;
          }
        }
      }

      const relationWhere: Prisma.ContentWhereInput = {
        ...where,
        genres: { some: {} },
      };
      const relationCandidates = new Set(
        (
          await transaction.content.findMany({
            where: relationWhere,
            select: { id: true },
          })
        ).map((content) => content.id),
      );
      const expectedRelations = candidates
        .filter((content) => relationCandidates.has(content.id))
        .sort(
          (a, b) =>
            average(b) - average(a) ||
            b.totalRatingVotes - a.totalRatingVotes ||
            b.createdAt.getTime() - a.createdAt.getTime() ||
            a.id.localeCompare(b.id),
        );
      const relationResult = await getContentSearchPage(prisma, {
        where: relationWhere,
        sortBy: "rating",
        limit: 20,
        offset: 0,
      });
      assert.deepEqual(
        relationResult.ids,
        expectedRelations.slice(0, 20).map((content) => content.id),
      );
      assert.equal(relationResult.total, expectedRelations.length);
      cases++;

      for (const contentTypeId of [1, 3, 4]) {
        for (const sortBy of [
          "title",
          "releaseDate",
          "popularity",
          "duration",
          undefined,
          "unknown",
        ]) {
          for (const sortOrder of ["asc", "desc"]) {
            const options = {
              where: { isDeleted: false, contentTypeId },
              contentTypeId,
              sortBy,
              sortOrder,
              ratingMin: 0,
              limit: 20,
              offset: 20,
            };
            const expected = await transaction.content.findMany({
              where: options.where,
              select: { id: true },
              orderBy: standardContentSearchOrder(options),
              take: 20,
              skip: 20,
            });
            const result = await getContentSearchPage(prisma, options);
            assert.deepEqual(
              result.ids,
              expected.map((content) => content.id),
            );
            assert.equal(
              result.total,
              await transaction.content.count({ where: options.where }),
            );
            cases++;
          }
        }
      }

      const searchQuery = "Fleabag";
      const relevance = await transaction.$queryRaw<
        Array<{ id: string }>
      >(Prisma.sql`
      SELECT c.id FROM content c WHERE c.is_deleted = false AND
      (SIMILARITY(c.title, ${searchQuery}) > 0.1 OR SIMILARITY(c.description, ${searchQuery}) > 0.05
        OR c.title ILIKE ${`%${searchQuery}%`} OR c.original_title ILIKE ${`%${searchQuery}%`}
        OR c.isbn ILIKE ${`%${searchQuery}%`} OR EXISTS (SELECT 1 FROM book_publication bp WHERE bp.content_id = c.id AND bp.isbn ILIKE ${`%${searchQuery}%`}))
      ORDER BY GREATEST(SIMILARITY(c.title, ${searchQuery}), SIMILARITY(c.original_title, ${searchQuery}) * 0.9, SIMILARITY(c.description, ${searchQuery}) * 0.5) DESC, c.id ASC
    `);
      const searchResult = await getContentSearchPage(prisma, {
        where: { isDeleted: false },
        searchQuery,
        limit: 20,
        offset: 0,
      });
      assert.equal(searchResult.total, relevance.length);
      assert.deepEqual(
        searchResult.ids,
        relevance.slice(0, 20).map((content) => content.id),
      );
      cases++;

      const activeUser = await transaction.userContentLog.groupBy({
        by: ["userId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 1,
      });
      if (activeUser.length) {
        const userId = activeUser[0].userId;
        const logs = await transaction.userContentLog.findMany({
          where: { userId },
          select: { contentId: true, date: true, updatedAt: true },
          orderBy: [{ date: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
        });
        const latest = new Map<string, number>();
        for (const log of logs)
          if (!latest.has(log.contentId))
            latest.set(log.contentId, (log.date ?? log.updatedAt).getTime());
        for (const sortOrder of ["asc", "desc"]) {
          for (const ratingMin of [undefined, 6]) {
            const expected = candidates
              .filter(
                (content) =>
                  ratingMin === undefined || average(content) >= ratingMin,
              )
              .sort(
                (a, b) =>
                  (sortOrder === "asc" ? 1 : -1) *
                    ((latest.get(a.id) ?? 0) - (latest.get(b.id) ?? 0) ||
                      a.createdAt.getTime() - b.createdAt.getTime()) ||
                  a.id.localeCompare(b.id),
              );
            const result = await getContentSearchPage(prisma, {
              where,
              userId,
              sortBy: "userDate",
              sortOrder,
              ratingMin,
              limit: 20,
              offset: 20,
            });
            assert.equal(result.total, expected.length);
            assert.deepEqual(
              result.ids,
              expected.slice(20, 40).map((content) => content.id),
            );
            cases++;
          }
        }
      }
      const mediaGroups = await transaction.contentScreenshot.groupBy({
        by: ["contentId"],
        _count: { id: true },
        orderBy: { contentId: "asc" },
        take: 20,
      });
      const mediaIds = mediaGroups.map((group) => group.contentId);
      const enabledGroups = await transaction.contentScreenshot.groupBy({
        by: ["contentId"],
        where: { contentId: { in: mediaIds }, isEnabledForQuiz: true },
        _count: { id: true },
      });
      const enabledCounts = new Map(
        enabledGroups.map((group) => [group.contentId, group._count.id]),
      );
      for (const fields of [
        [],
        ["screenshotCount"],
        ["enabledScreenshotCount"],
        ["screenshotCount", "enabledScreenshotCount"],
      ]) {
        queries = 0;
        const result = await getContentScreenshotCounts(
          prisma,
          mediaIds,
          new Set(fields),
        );
        assert.equal(queries, fields.length && mediaIds.length ? 1 : 0);
        for (const group of mediaGroups) {
          if (fields.includes("screenshotCount"))
            assert.equal(result.total.get(group.contentId), group._count.id);
          if (fields.includes("enabledScreenshotCount"))
            assert.equal(
              result.enabled.get(group.contentId) ?? 0,
              enabledCounts.get(group.contentId) ?? 0,
            );
        }
        cases++;
      }
      // Parameter binding must preserve an untrusted search string without executing it.
      const injection = await getContentSearchPage(prisma, {
        where,
        searchQuery: "'; SELECT pg_sleep(10); --",
        ratingMin: 11,
        limit: 20,
        offset: 0,
      });
      assert.deepEqual(injection, { total: 0, ids: [] });
      cases++;
      return { readOnly: true, passedCases: cases, measurements };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 120_000,
    },
  );
  await writeFile(
    "inspect-content-search.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.$disconnect());
