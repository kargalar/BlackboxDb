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

    console.log(
      `📝 [QuizMutation] submitQuiz: userId=${user.id}, contentTypeId=${input.contentTypeId}, answers=${input.answers.length}`,
    );

    const settings = await prisma.quizSettings.findUnique({
      where: { contentTypeId: input.contentTypeId },
    });

    if (!settings) {
      console.error(
        `❌ [QuizMutation] submitQuiz: settings not found for contentTypeId=${input.contentTypeId}`,
      );
      throw new Error("Quiz ayarları bulunamadı");
    }

    // Sonuçları hesapla
    let score = 0;
    let correctAnswers = 0;
    const answerResults: QuizAnswerResult[] = [];

    for (const answer of input.answers) {
      const screenshot = await prisma.contentScreenshot.findUnique({
        where: { id: answer.screenshotId },
        include: {
          content: {
            select: { id: true, title: true },
          },
        },
      });

      if (!screenshot) continue;

      const isCorrect = answer.selectedContentId === screenshot.content.id;
      let pointsEarned = 0;

      if (isCorrect) {
        correctAnswers++;
        // Zorluk seviyesine göre direkt puan
        const pointsMap: Record<number, number> = {
          1: settings.pointsLevel1,
          2: settings.pointsLevel2,
          3: settings.pointsLevel3,
          4: settings.pointsLevel4,
          5: settings.pointsLevel5,
        };
        pointsEarned = pointsMap[screenshot.difficulty] || settings.pointsLevel1;
        score += pointsEarned;
      }

      answerResults.push({
        screenshotId: answer.screenshotId,
        isCorrect,
        correctContentId: screenshot.content.id,
        correctTitle: screenshot.content.title,
        pointsEarned,
      });
    }

    // Sonucu kaydet
    await prisma.quizResult.create({
      data: {
        userId: user.id,
        contentTypeId: input.contentTypeId,
        score,
        correctAnswers,
        totalQuestions: input.answers.length,
        timeTaken: input.totalTimeTaken,
      },
    });

    // Leaderboard'u güncelle
    const existingEntry = await prisma.quizLeaderboard.findUnique({
      where: {
        userId_contentTypeId: {
          userId: user.id,
          contentTypeId: input.contentTypeId,
        },
      },
    });

    let isNewBestScore = false;

    if (existingEntry) {
      isNewBestScore = score > existingEntry.bestScore;

      await prisma.quizLeaderboard.update({
        where: {
          userId_contentTypeId: {
            userId: user.id,
            contentTypeId: input.contentTypeId,
          },
        },
        data: {
          totalScore: existingEntry.totalScore + score,
          totalQuizzes: existingEntry.totalQuizzes + 1,
          correctAnswers: existingEntry.correctAnswers + correctAnswers,
          totalQuestions: existingEntry.totalQuestions + input.answers.length,
          bestScore: isNewBestScore ? score : existingEntry.bestScore,
        },
      });
    } else {
      isNewBestScore = true;
      await prisma.quizLeaderboard.create({
        data: {
          userId: user.id,
          contentTypeId: input.contentTypeId,
          totalScore: score,
          totalQuizzes: 1,
          correctAnswers,
          totalQuestions: input.answers.length,
          bestScore: score,
        },
      });
    }

    // Yeni sıralamayı hesapla
    const allLeaderboard = await prisma.quizLeaderboard.findMany({
      where: { contentTypeId: input.contentTypeId },
      orderBy: { totalScore: "desc" },
    });

    const newRank = allLeaderboard.findIndex((e) => e.userId === user.id) + 1;

    console.log(
      `✅ [QuizMutation] submitQuiz: score=${score}, correct=${correctAnswers}/${input.answers.length}, rank=${newRank}, newBest=${isNewBestScore}`,
    );

    return {
      score,
      correctAnswers,
      totalQuestions: input.answers.length,
      timeTaken: input.totalTimeTaken,
      answerResults,
      newRank,
      isNewBestScore,
    };
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

    const entries = await prisma.quizLeaderboard.findMany({
      where: { contentTypeId },
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
      contentTypeId: entry.contentTypeId,
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

    const entry = await prisma.quizLeaderboard.findUnique({
      where: {
        userId_contentTypeId: {
          userId: user.id,
          contentTypeId,
        },
      },
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
    const higherScores = await prisma.quizLeaderboard.count({
      where: {
        contentTypeId,
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
      contentTypeId: entry.contentTypeId,
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
