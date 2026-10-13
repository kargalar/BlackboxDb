import assert from "node:assert/strict";
import test from "node:test";
import { parse, type GraphQLResolveInfo, type FieldNode, Kind } from "graphql";
import { RequestBatchLoader } from "./requestBatchLoader";
import { contentSelection, requestedContentFields } from "./contentSelection";
import { addActiveFilter } from "./softDeleteMiddleware";
import { addTranslations } from "./translationMiddleware";
import { createRequestLoaders, userContentKey } from "./requestLoaders";
import type { PrismaClient } from "@prisma/client";
import type { Request } from "express";
import { resolveRequestLanguage } from "./requestLanguage";
import { normalizePageSize, normalizePageOffset } from "./pagination";

test("authentication cookies do not hide language headers and locale cookies take precedence", () => {
  const request = (headers: Request["headers"]) => ({ headers }) as Request;
  assert.equal(
    resolveRequestLanguage(
      request({ cookie: "session=value", "accept-language": "tr-TR,tr;q=0.9" }),
    ),
    "tr",
  );
  assert.equal(
    resolveRequestLanguage(
      request({ cookie: "NEXT_LOCALE=en", "accept-language": "tr" }),
    ),
    "en",
  );
  assert.equal(
    resolveRequestLanguage(
      request({ cookie: "NEXT_LOCALE=tr", "accept-language": "en" }),
    ),
    "tr",
  );
});

test("pagination accepts only bounded, positive page sizes and nonnegative offsets", () => {
  assert.equal(normalizePageSize(-1), 20);
  assert.equal(normalizePageSize(0.5), 1);
  assert.equal(normalizePageSize(10_000), 100);
  assert.equal(normalizePageSize(undefined, 50), 50);
  assert.equal(normalizePageOffset(-1), 0);
  assert.equal(normalizePageOffset(Infinity), 0);
});

test("batches, caches, aligns missing values and bounds query sizes", async () => {
  const batches: number[][] = [];
  const loader = new RequestBatchLoader<number, number>(
    async (keys) => {
      batches.push([...keys]);
      return new Map(
        keys.filter((key) => key !== 3).map((key) => [key, key * 2]),
      );
    },
    () => 0,
    2,
  );
  assert.deepEqual(
    await Promise.all([
      loader.load(1),
      loader.load(2),
      loader.load(1),
      loader.load(3),
    ]),
    [2, 4, 2, 0],
  );
  assert.deepEqual(batches, [[1, 2], [3]]);
  assert.equal(await loader.load(1), 2);
  assert.equal(batches.length, 2);
});

test("failed reads are retryable and cache instances are isolated", async () => {
  let attempts = 0;
  const loader = new RequestBatchLoader<string, number>(
    async (keys) => {
      if (++attempts === 1) throw new Error("temporary failure");
      return new Map(keys.map((key) => [key, 7]));
    },
    () => 0,
  );
  await assert.rejects(loader.load("one"), /temporary failure/);
  assert.equal(await loader.load("one"), 7);
  const other = new RequestBatchLoader<string, number>(
    async () => new Map([["one", 9]]),
    () => 0,
  );
  assert.equal(await other.load("one"), 9);
});

function queryInfo(source: string): GraphQLResolveInfo {
  const document = parse(source);
  const operation = document.definitions.find(
    (node) => node.kind === Kind.OPERATION_DEFINITION,
  )!;
  if (operation.kind !== Kind.OPERATION_DEFINITION)
    throw new Error("Missing operation");
  return {
    fieldNodes: operation.selectionSet.selections as FieldNode[],
    fragments: Object.fromEntries(
      document.definitions
        .filter((node) => node.kind === Kind.FRAGMENT_DEFINITION)
        .map((node) => [node.name.value, node]),
    ),
  } as unknown as GraphQLResolveInfo;
}

test("minimal content queries omit expensive metadata and understand fragments and aliases", () => {
  const result = contentSelection(
    queryInfo(
      `query { searchContent { items { alias: title ...ImageFields } total } } fragment ImageFields on Content { posterUrl genres { id name } }`,
    ),
  ).select;
  assert.equal(result.title, true);
  assert.ok(result.images);
  assert.ok(result.genres);
  assert.equal(result.people, undefined);
  assert.equal(result.cast, undefined);
  assert.equal(result.crew, undefined);
  assert.equal(result.screenshots, undefined);
  assert.equal(result.id, true);
  assert.ok(
    contentSelection(
      queryInfo(`{ content { people { id } screenshots { id } cast } }`),
    ).select.people,
  );
});

test("soft deletion is filtered before select and does not mutate caller filters", () => {
  const input = { where: { id: "content" }, select: { title: true } };
  assert.deepEqual(addActiveFilter(input).where, {
    id: "content",
    isDeleted: false,
  });
  assert.deepEqual(input.where, { id: "content" });
  assert.equal(
    addActiveFilter({ where: { id: "content", isDeleted: true } }).where
      .isDeleted,
    true,
  );
});

test("skipped fields and fragments do not trigger expensive reads", () => {
  const baseInfo = queryInfo(`query($screenshots: Boolean!, $people: Boolean!) {
    searchContent { items { id screenshots @include(if: $screenshots) { id }
      ...People @skip(if: $people) ... on Content @skip(if: true) { cast }
      alias: screenshotCount @skip(if: true) enabledScreenshotCount
    } }
  } fragment People on Content { people { id } }`);
  const info = {
    ...baseInfo,
    variableValues: { screenshots: false, people: true },
  };
  const fields = requestedContentFields(info)!;
  assert.deepEqual([...fields].sort(), ["enabledScreenshotCount", "id"]);
  const selected = contentSelection(info).select;
  assert.equal(selected.screenshots, undefined);
  assert.equal(selected.people, undefined);
  assert.equal(selected.cast, undefined);
  const includedInfo = {
    ...baseInfo,
    variableValues: { screenshots: true, people: false },
  };
  assert.ok(contentSelection(includedInfo).select.screenshots);
  assert.ok(contentSelection(includedInfo).select.people);
});

test("identifier and aggregate selections do not fetch translations", () => {
  assert.equal(
    addTranslations({ select: { id: true } }, "Content").select.translations,
    undefined,
  );
  assert.equal(
    addTranslations({ select: { totalRatingVotes: true } }, "Content").select
      .translations,
    undefined,
  );
  assert.equal(
    addTranslations({ select: { title: true } }, "Content").select.translations,
    true,
  );
});

test("review reads share two queries and retain per-author privacy filters", async () => {
  let logReads = 0;
  let reviewReads = 0;
  const prisma = {
    userContentLog: {
      findMany: async (): Promise<never[]> => {
        logReads++;
        return [];
      },
    },
    discussion: {
      findMany: async (args: {
        where: { OR: Array<{ authorId: string; isPublic?: boolean }> };
      }): Promise<never[]> => {
        reviewReads++;
        assert.deepEqual(args.where.OR, [
          { authorId: "viewer", contentId: "first" },
          { authorId: "other", contentId: "second", isPublic: true },
        ]);
        return [];
      },
    },
  } as unknown as PrismaClient;
  const loaders = createRequestLoaders(prisma, {
    id: "viewer",
    email: "",
    username: "",
    isAdmin: false,
    isModerator: false,
  });
  const keys = [
    userContentKey("viewer", "first"),
    userContentKey("other", "second"),
  ];
  await Promise.all([...keys, ...keys].map((key) => loaders.reviews.load(key)));
  assert.equal(logReads, 1);
  assert.equal(reviewReads, 1);
  assert.notEqual(userContentKey("a:b", "c"), userContentKey("a", "b:c"));
});
