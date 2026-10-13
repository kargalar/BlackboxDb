import { Resolver, Query, Arg, Ctx, Int } from "type-graphql";
import { GraphQLContext } from "../../context";
import {
  ContentScreenshot,
  QuizSettings,
  QuizSession,
  QuizSessionV2,
  QuizContentItem,
  QuizQuestion,
  QuizOption,
} from "../../types/Quiz";
import {
  selectRandomQuestions,
  getRandomWrongOptions,
  shuffleArray,
} from "./quizHelpers";

@Resolver()
export class QuizQueryResolver {
  // ======================================
  // Screenshot Queries
  // ======================================

  @Query(() => [ContentScreenshot])
  async getContentScreenshots(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentScreenshot[]> {
    console.log(`🔍 [QuizQuery] getContentScreenshots: contentId=${contentId}`);

    const screenshots = await prisma.contentScreenshot.findMany({
      where: { contentId },
      orderBy: { order: "asc" },
    });

    console.log(
      `✅ [QuizQuery] getContentScreenshots: found ${screenshots.length} screenshots`,
    );
    return screenshots as ContentScreenshot[];
  }

  // ======================================
  // Quiz Settings Queries
  // ======================================

  @Query(() => [QuizSettings])
  async getAllQuizSettings(
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<QuizSettings[]> {
    console.log(
      `🔍 [QuizQuery] getAllQuizSettings: fetching all quiz settings`,
    );

    const settings = await prisma.quizSettings.findMany({
      include: { contentType: true },
    });

    // Eğer ayarlar yoksa, varsayılan ayarları oluştur
    if (settings.length === 0) {
      console.log(
        `⚠️ [QuizQuery] getAllQuizSettings: no settings found, creating defaults`,
      );
      const contentTypes = await prisma.contentTypeLookup.findMany();

      for (const ct of contentTypes) {
        await prisma.quizSettings.create({
          data: {
            contentTypeId: ct.id,
            isActive: true,
            timePerQuestion: 30,
            questionsCount: 10,
            pointsLevel1: 10,
            pointsLevel2: 15,
            pointsLevel3: 25,
            pointsLevel4: 40,
            pointsLevel5: 50,
          },
        });
      }

      const newSettings = await prisma.quizSettings.findMany();
      console.log(
        `✅ [QuizQuery] getAllQuizSettings: created ${newSettings.length} default settings`,
      );
      return newSettings;
    }

    console.log(
      `✅ [QuizQuery] getAllQuizSettings: found ${settings.length} settings`,
    );
    return settings;
  }

  @Query(() => QuizSettings, { nullable: true })
  async getQuizSettings(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<QuizSettings | null> {
    console.log(
      `🔍 [QuizQuery] getQuizSettings: contentTypeId=${contentTypeId}`,
    );

    let settings = await prisma.quizSettings.findUnique({
      where: { contentTypeId },
    });

    // Eğer ayar yoksa varsayılan oluştur
    if (!settings) {
      settings = await prisma.quizSettings.create({
        data: {
          contentTypeId,
          isActive: true,
          timePerQuestion: 30,
          questionsCount: 10,
          pointsLevel1: 10,
          pointsLevel2: 15,
          pointsLevel3: 25,
          pointsLevel4: 40,
          pointsLevel5: 50,
        },
      });
      console.log(
        `⚠️ [QuizQuery] getQuizSettings: created default settings for contentTypeId=${contentTypeId}`,
      );
    }

    return settings;
  }

  // ======================================
  // Quiz Session - Get Questions (V1)
  // ======================================

  @Query(() => QuizSession)
  async startQuiz(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<QuizSession> {
    console.log(`🎮 [QuizQuery] startQuiz: contentTypeId=${contentTypeId}`);

    // Quiz ayarlarını al
    const settings = await prisma.quizSettings.findUnique({
      where: { contentTypeId },
    });

    if (!settings || !settings.isActive) {
      console.error(
        `❌ [QuizQuery] startQuiz: quiz not active for contentTypeId=${contentTypeId}`,
      );
      throw new Error("Bu içerik türü için quiz aktif değil");
    }

    // Content type adını al
    const contentType = await prisma.contentTypeLookup.findUnique({
      where: { id: contentTypeId },
    });

    if (!contentType) {
      console.error(
        `❌ [QuizQuery] startQuiz: content type not found id=${contentTypeId}`,
      );
      throw new Error("İçerik türü bulunamadı");
    }

    // Quiz için aktif ekran görüntülerini al (zorluk sırasına göre)
    // Sadece isEnabledForQuiz: true olan içeriklerin screenshotları
    const screenshots = await prisma.contentScreenshot.findMany({
      where: {
        isEnabledForQuiz: true,
        content: {
          contentTypeId,
          isEnabledForQuiz: true, // İçerik de quiz'e aktif olmalı
        },
      },
      include: {
        content: {
          include: {
            images: {
              where: { type: "poster" },
              select: { filePath: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { difficulty: "asc" },
    });

    if (screenshots.length < 1) {
      console.error(
        `❌ [QuizQuery] startQuiz: no enabled screenshots for contentTypeId=${contentTypeId}`,
      );
      throw new Error(
        `Bu içerik türü için quiz aktif ekran görüntüsü bulunamadı.`,
      );
    }

    // Mevcut ekran görüntüsü sayısı veya questionsCount'tan küçük olanı kullan
    const questionCount = Math.min(screenshots.length, settings.questionsCount);

    // Rastgele seç (zorluk sırasını koru)
    const selectedScreenshots = selectRandomQuestions(
      screenshots,
      questionCount,
    );

    // Yanlış seçenekler için diğer içerikleri al
    const allContents = await prisma.content.findMany({
      where: {
        contentTypeId,
        isEnabledForQuiz: true, // Sadece quiz'e aktif içerikler
        screenshots: { some: { isEnabledForQuiz: true } },
      },
      include: {
        images: {
          where: { type: "poster" },
          select: { filePath: true },
          take: 1,
        },
      },
    });

    // Helper function to get posterUrl from content
    const getPosterUrl = (content: any): string | undefined => {
      return content.images?.[0]?.filePath || undefined;
    };

    // Soruları oluştur
    const questions: QuizQuestion[] = selectedScreenshots.map((ss) => {
      const correctOption: QuizOption = {
        contentId: ss.content.id,
        title: ss.content.title,
        posterUrl: getPosterUrl(ss.content),
      };

      // 3 yanlış seçenek - map allContents to have posterUrl
      const contentsWithPoster = allContents.map((c) => ({
        id: c.id,
        title: c.title,
        posterUrl: getPosterUrl(c),
      }));
      const wrongOptions = getRandomWrongOptions(
        contentsWithPoster,
        ss.content.id,
        3,
      );

      // Tüm seçenekleri karıştır
      const allOptions = shuffleArray([correctOption, ...wrongOptions]);

      return {
        screenshotId: ss.id,
        imageUrl: ss.imageUrl,
        difficulty: ss.difficulty,
        options: allOptions,
        correctContentId: ss.content.id,
      };
    });

    console.log(
      `✅ [QuizQuery] startQuiz: generated ${questions.length} questions for contentType=${contentType.name}`,
    );

    return {
      questions,
      timePerQuestion: settings.timePerQuestion,
      contentTypeId,
      contentTypeName: contentType.name,
    };
  }

  // ======================================
  // Start Quiz V2 - Content-based (New System)
  // ======================================

  @Query(() => QuizSessionV2)
  async startQuizV2(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<QuizSessionV2> {
    console.log(`🎮 [QuizQuery] startQuizV2: contentTypeId=${contentTypeId}`);

    // Quiz ayarlarını al
    const settings = await prisma.quizSettings.findUnique({
      where: { contentTypeId },
    });

    if (!settings || !settings.isActive) {
      console.error(
        `❌ [QuizQuery] startQuizV2: quiz not active for contentTypeId=${contentTypeId}`,
      );
      throw new Error("Bu içerik türü için quiz aktif değil");
    }

    // Content type adını al
    const contentType = await prisma.contentTypeLookup.findUnique({
      where: { id: contentTypeId },
    });

    if (!contentType) {
      console.error(
        `❌ [QuizQuery] startQuizV2: content type not found id=${contentTypeId}`,
      );
      throw new Error("İçerik türü bulunamadı");
    }

    // Quiz'e aktif içerikleri ve screenshot'larını al
    // All 5 difficulty levels must be covered - auto-detect (no manual isEnabledForQuiz on content needed)
    const QUIZ_DIFFICULTIES = [1, 2, 3, 4, 5];

    const contents = await prisma.content.findMany({
      where: {
        contentTypeId,
        screenshots: {
          some: { isEnabledForQuiz: true },
        },
      },
      include: {
        screenshots: {
          where: { isEnabledForQuiz: true },
        },
        images: {
          where: { type: "poster" },
          select: { filePath: true },
          take: 1,
        },
        people: {
          include: { person: true },
          orderBy: { creditOrder: "asc" },
        },
      },
    });

    if (contents.length < 1) {
      console.error(
        `❌ [QuizQuery] startQuizV2: no enabled content for contentTypeId=${contentTypeId}`,
      );
      throw new Error("Bu içerik türü için quiz aktif içerik bulunamadı.");
    }

    // İçerikleri karıştır ve questionsCount kadarını seç
    const shuffledContents = shuffleArray(contents);
    const selectedContents = shuffledContents.slice(
      0,
      settings.questionsCount || 10,
    );

    // Content items oluştur - zordan kolaya, her seviyeden 1 rastgele seç
    const contentItems: QuizContentItem[] = selectedContents.map((content) => {
      // Zorluk seviyelerine göre grupla
      const screenshotsByDiff = new Map<number, typeof content.screenshots>();
      for (const ss of content.screenshots as any[]) {
        const arr = screenshotsByDiff.get(ss.difficulty) || [];
        arr.push(ss);
        screenshotsByDiff.set(ss.difficulty, arr);
      }

      // Zordan kolaya (5→1): her seviyeden 1 rastgele görsel al
      const selectedScreenshots: {
        id: number;
        imageUrl: string;
        difficulty: number;
      }[] = [];
      for (const level of [5, 4, 3, 2, 1]) {
        const pool = screenshotsByDiff.get(level) || [];
        if (pool.length > 0) {
          const randomIdx = Math.floor(Math.random() * pool.length);
          const ss = (pool as any[])[randomIdx];
          selectedScreenshots.push({
            id: ss.id,
            imageUrl: ss.imageUrl,
            difficulty: ss.difficulty,
          });
        }
      }

      return {
        contentId: content.id,
        title: content.title,
        posterUrl: content.images[0]?.filePath || undefined,
        description: content.description || undefined,
        releaseDate: content.releaseDate
          ? content.releaseDate.toISOString().split("T")[0]
          : undefined,
        runtime: content.runtime || undefined,
        authors: content.authors?.length > 0 ? content.authors : undefined,
        persons: content.people.map((cp: any) => ({
          personId: cp.personId,
          name: cp.person.name,
          role: cp.role || undefined,
          job: cp.job || undefined,
          character: cp.character || undefined,
          profileUrl: cp.person.profileUrl || undefined,
        })),
        screenshots: selectedScreenshots,
      };
    });

    console.log(
      `✅ [QuizQuery] startQuizV2: generated ${contentItems.length} content items for contentType=${contentType.name}`,
    );

    return {
      contentItems,
      contentTypeId,
      contentTypeName: contentType.name,
      pointsLevel1: settings.pointsLevel1,
      pointsLevel2: settings.pointsLevel2,
      pointsLevel3: settings.pointsLevel3,
      pointsLevel4: settings.pointsLevel4,
      pointsLevel5: settings.pointsLevel5,
    };
  }
}
