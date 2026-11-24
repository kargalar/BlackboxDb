import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { QuizQueryResolver } from "./QuizQueryResolver";
import type { GraphQLContext } from "../../context";

test("quiz filters consumed content by the current user and limits questions", async () => {
  let where: any;
  const contents = Array.from({ length: 55 }, (_, i) => ({
    id: String(i), title: `Title ${i}`, screenshots: [{ id: i, imageUrl: "image", difficulty: 1 }],
    images: [] as never[], people: [] as never[], authors: [] as never[],
  }));
  const context = {
    user: { id: "current-user" },
    prisma: {
      quizSettings: { findUnique: async () => ({ isActive: true, questionsCount: 10 }) },
      contentTypeLookup: { findUnique: async () => ({ name: "Film" }) },
      content: { findMany: async (args: any) => { where = args.where; return contents; } },
    },
  } as unknown as GraphQLContext;
  const resolver = new QuizQueryResolver();
  const result = await resolver.startQuizV2(1, 50, true, context);
  assert.equal(result.contentItems.length, 50);
  assert.deepEqual(where.userContentLogs, { some: { userId: "current-user", isConsumed: true } });
  await assert.rejects(() => resolver.startQuizV2(1, 101, false, context));
  await assert.rejects(() => resolver.startQuizV2(1, 10, true, { ...context, user: null }));
});
