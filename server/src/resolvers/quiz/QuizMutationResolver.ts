import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Int,
  Authorized,
} from "type-graphql";
import { GraphQLContext } from "../../context";
import {
  QuizResult,
  LeaderboardEntry,
  QuizSubmitResult,
  QuizAnswerResult,
  SubmitQuizInput,
} from "../../types/Quiz";

@Resolver()
export class QuizMutationResolver {
  // ======================================
  // Submit Quiz Results
  // ======================================

  @Authorized()
  @Mutation(() => QuizSubmitResult)
  async submitQuiz(
    @Arg("input", () => SubmitQuizInput) input: SubmitQuizInput,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<QuizSubmitResult> {
    if (!user) {
      throw new Error("Giriş yapmanız gerekiyor");
    }

    if (!input.dailyDate || input.contentTypeId !== 1) {
      throw new Error("Yalnızca günün quizi skor tablosuna kaydedilir.");
    }
    const daily = await prisma.dailyQuiz.findUnique({ where: { date: input.dailyDate } });
    if (!daily) throw new Error("Günün quizi bulunamadı.");
    const session = daily.session as unknown as import("../../types/Quiz").QuizSessionV2;
    if (input.answers.length !== 10 || session.contentItems.length !== 10) {
      throw new Error("Günün quizindeki tüm sorular cevaplanmalıdır.");
    }
    const used = new Set<string>();
    let score = 0;
    let correctAnswers = 0;
    const answerResults: QuizAnswerResult[] = [];
    for (const answer of input.answers) {
      const item = session.contentItems.find((c) => c.screenshots.some((s) => s.id === answer.screenshotId));
      if (!item || used.has(item.contentId)) throw new Error("Geçersiz quiz cevabı.");
      used.add(item.contentId);
      const screenshot = item.screenshots.find((s) => s.id === answer.screenshotId)!;
      const isCorrect = answer.selectedContentId === item.contentId;
      const points = [0, session.pointsLevel1, session.pointsLevel2, session.pointsLevel3, session.pointsLevel4, session.pointsLevel5][screenshot.difficulty] || 0;
      const pointsEarned = isCorrect ? points : 0;
      score += pointsEarned;
      if (isCorrect) correctAnswers++;
      answerResults.push({ screenshotId: answer.screenshotId, isCorrect, correctContentId: item.contentId, correctTitle: item.title, pointsEarned });
    }
    const userId = user.id;
    let isNewBestScore = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.dailyQuizAttempt.create({ data: { date: input.dailyDate!, userId } });
        const existing = await tx.dailyQuizLeaderboard.findUnique({ where: { userId } });
        isNewBestScore = !existing || score > existing.bestScore;
        await tx.dailyQuizLeaderboard.upsert({
          where: { userId },
          create: { userId, totalScore: score, totalQuizzes: 1, correctAnswers, totalQuestions: 10, bestScore: score },
          update: { totalScore: { increment: score }, totalQuizzes: { increment: 1 }, correctAnswers: { increment: correctAnswers }, totalQuestions: { increment: 10 }, ...(isNewBestScore ? { bestScore: score } : {}) },
        });
        await tx.quizResult.create({ data: { userId, contentTypeId: 1, score, correctAnswers, totalQuestions: 10, timeTaken: input.totalTimeTaken } });
      });
    } catch (error: any) {
      if (error?.code === "P2002") throw new Error("Günün quizini zaten tamamladınız.");
      throw error;
    }
    const higherScores = await prisma.dailyQuizLeaderboard.count({ where: { totalScore: { gt: (await prisma.dailyQuizLeaderboard.findUniqueOrThrow({ where: { userId } })).totalScore } } });
    return { score, correctAnswers, totalQuestions: 10, timeTaken: input.totalTimeTaken, answerResults, newRank: higherScores + 1, isNewBestScore };
  }

  // ======================================
  // Leaderboard Queries
  // ======================================

  @Query(() => [LeaderboardEntry])
  async getLeaderboard(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 50,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<LeaderboardEntry[]> {
    console.log(
      `🏆 [QuizMutation] getLeaderboard: contentTypeId=${contentTypeId}, limit=${limit}`,
    );

    if (contentTypeId !== 1) return [];
    const entries = await prisma.dailyQuizLeaderboard.findMany({
      orderBy: { totalScore: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            picturePath: true,
          },
        },
      },
    });

    console.log(
      `✅ [QuizMutation] getLeaderboard: found ${entries.length} entries`,
    );

    return entries.map((entry, index) => ({
      id: entry.id,
      userId: entry.userId,
      username: entry.user.username,
      picturePath: entry.user.picturePath || undefined,
      contentTypeId: 1,
      totalScore: entry.totalScore,
      totalQuizzes: entry.totalQuizzes,
      correctAnswers: entry.correctAnswers,
      totalQuestions: entry.totalQuestions,
      bestScore: entry.bestScore,
      rank: index + 1,
    }));
  }

  @Authorized()
  @Query(() => LeaderboardEntry, { nullable: true })
  async getMyLeaderboardEntry(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<LeaderboardEntry | null> {
    if (!user) return null;

    console.log(
      `🏆 [QuizMutation] getMyLeaderboardEntry: userId=${user.id}, contentTypeId=${contentTypeId}`,
    );

    if (contentTypeId !== 1) return null;
    const entry = await prisma.dailyQuizLeaderboard.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            picturePath: true,
          },
        },
      },
    });

    if (!entry) {
      console.log(`⚠️ [QuizMutation] getMyLeaderboardEntry: no entry found`);
      return null;
    }

    // Sıralama hesapla
    const higherScores = await prisma.dailyQuizLeaderboard.count({
      where: {
        totalScore: { gt: entry.totalScore },
      },
    });

    console.log(
      `✅ [QuizMutation] getMyLeaderboardEntry: rank=${higherScores + 1}`,
    );

    return {
      id: entry.id,
      userId: entry.userId,
      username: entry.user.username,
      picturePath: entry.user.picturePath || undefined,
      contentTypeId: 1,
      totalScore: entry.totalScore,
      totalQuizzes: entry.totalQuizzes,
      correctAnswers: entry.correctAnswers,
      totalQuestions: entry.totalQuestions,
      bestScore: entry.bestScore,
      rank: higherScores + 1,
    };
  }

  @Authorized()
  @Query(() => [QuizResult])
  async getMyQuizHistory(
    @Arg("contentTypeId", () => Int, { nullable: true }) contentTypeId: number,
    @Arg("limit", () => Int, { nullable: true }) limit: number = 20,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<QuizResult[]> {
    if (!user) return [];

    console.log(
      `📊 [QuizMutation] getMyQuizHistory: userId=${user.id}, contentTypeId=${contentTypeId || "all"}, limit=${limit}`,
    );

    const results = await prisma.quizResult.findMany({
      where: {
        userId: user.id,
        ...(contentTypeId && { contentTypeId }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    console.log(
      `✅ [QuizMutation] getMyQuizHistory: found ${results.length} results`,
    );
    return results;
  }
}
