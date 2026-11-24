import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { QuizMutationResolver } from "./QuizMutationResolver";
import { QuizQueryResolver } from "./QuizQueryResolver";
import type { GraphQLContext } from "../../context";

test("the stored daily quiz is shared by different users", async () => {
  const session = { contentItems: [{ contentId: "same-film" }] };
  const prisma = {
    dailyQuiz: { findUnique: async () => ({ session }) },
    dailyQuizAttempt: { findUnique: async (): Promise<null> => null },
  };
  const resolver = new QuizQueryResolver();
  const context = (id: string) => ({ user: { id }, prisma }) as unknown as GraphQLContext;
  const first = await resolver.dailyQuiz(context("first"));
  const second = await resolver.dailyQuiz(context("second"));
  assert.deepEqual(first.contentItems, second.contentItems);
  assert.equal(first.dailyDate, second.dailyDate);
});

test("only a complete daily quiz can update the daily scoreboard", async () => {
  const session = {
    pointsLevel1: 10, pointsLevel2: 15, pointsLevel3: 25, pointsLevel4: 40, pointsLevel5: 50,
    contentItems: Array.from({ length: 10 }, (_, i) => ({
      contentId: String(i), title: `Film ${i}`, screenshots: [{ id: i + 1, difficulty: 1 }],
    })),
  };
  let writes = 0;
  const tx = {
    dailyQuizAttempt: { create: async () => { writes++; } },
    dailyQuizLeaderboard: { findUnique: async (): Promise<null> => null, upsert: async () => { writes++; } },
    quizResult: { create: async () => { writes++; } },
  };
  const context = {
    user: { id: "user" },
    prisma: {
      dailyQuiz: { findUnique: async () => ({ session }) },
      $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx),
      dailyQuizLeaderboard: { count: async () => 0, findUniqueOrThrow: async () => ({ totalScore: 100 }) },
    },
  } as unknown as GraphQLContext;
  const resolver = new QuizMutationResolver();
  const answers = session.contentItems.map((item, i) => ({ screenshotId: i + 1, selectedContentId: item.contentId, timeTaken: 0 }));
  await assert.rejects(() => resolver.submitQuiz({ contentTypeId: 1, answers, totalTimeTaken: 1 }, context));
  await assert.rejects(() => resolver.submitQuiz({ contentTypeId: 1, dailyDate: "2026-11-17", answers: [...answers.slice(0, 9), answers[0]], totalTimeTaken: 1 }, context));
  assert.equal(writes, 0);
  const result = await resolver.submitQuiz({ contentTypeId: 1, dailyDate: "2026-11-17", answers, totalTimeTaken: 1 }, context);
  assert.equal(result.score, 100);
  assert.equal(writes, 3);
});
