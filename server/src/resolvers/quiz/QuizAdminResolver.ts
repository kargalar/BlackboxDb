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
  ContentScreenshot,
  QuizSettings,
  AddScreenshotInput,
  UpdateScreenshotInput,
  UpdateQuizSettingsInput,
} from "../../types/Quiz";

@Resolver()
export class QuizAdminResolver {
  // ======================================
  // Admin Mutations - Screenshots
  // ======================================

  @Authorized("ADMIN")
  @Mutation(() => ContentScreenshot)
  async addScreenshot(
    @Arg("input", () => AddScreenshotInput) input: AddScreenshotInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentScreenshot> {
    console.log(
      `🛠️ [QuizAdmin] addScreenshot: contentId=${input.contentId}, imageUrl=${input.imageUrl}`,
    );

    // Mevcut en yüksek order'ı bul
    const maxOrder = await prisma.contentScreenshot.aggregate({
      where: { contentId: input.contentId },
      _max: { order: true },
    });

    const screenshot = await prisma.contentScreenshot.create({
      data: {
        contentId: input.contentId,
        imageUrl: input.imageUrl,
        difficulty: input.difficulty || 1,
        order: input.order ?? (maxOrder._max.order || 0) + 1,
        seasonNumber: input.seasonNumber ?? null,
        isEnabledForQuiz: input.isEnabledForQuiz || false,
      },
    });

    console.log(`✅ [QuizAdmin] addScreenshot: created id=${screenshot.id}`);
    return screenshot;
  }

  @Authorized("ADMIN")
  @Mutation(() => ContentScreenshot)
  async updateScreenshot(
    @Arg("input", () => UpdateScreenshotInput) input: UpdateScreenshotInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentScreenshot> {
    console.log(`🛠️ [QuizAdmin] updateScreenshot: id=${input.id}`);

    const screenshot = await prisma.contentScreenshot.update({
      where: { id: input.id },
      data: {
        ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.seasonNumber !== undefined && {
          seasonNumber: input.seasonNumber,
        }),
        ...(input.isEnabledForQuiz !== undefined && {
          isEnabledForQuiz: input.isEnabledForQuiz,
        }),
      },
    });

    console.log(`✅ [QuizAdmin] updateScreenshot: updated id=${screenshot.id}`);
    return screenshot;
  }

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async deleteScreenshot(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    console.log(`🛠️ [QuizAdmin] deleteScreenshot: id=${id}`);

    // Silmeden önce contentId'yi al
    const screenshot = await prisma.contentScreenshot.findUnique({
      where: { id },
      select: { contentId: true, isEnabledForQuiz: true },
    });

    await prisma.contentScreenshot.delete({
      where: { id },
    });



    console.log(`✅ [QuizAdmin] deleteScreenshot: deleted id=${id}`);
    return true;
  }

  @Authorized("ADMIN")
  @Mutation(() => [ContentScreenshot])
  async reorderScreenshots(
    @Arg("contentId", () => String) contentId: string,
    @Arg("screenshotIds", () => [Int]) screenshotIds: number[],
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<ContentScreenshot[]> {
    console.log(
      `🛠️ [QuizAdmin] reorderScreenshots: contentId=${contentId}, count=${screenshotIds.length}`,
    );

    // Her screenshot için order güncelle
    const updates = screenshotIds.map((id, index) =>
      prisma.contentScreenshot.update({
        where: { id },
        data: { order: index + 1 },
      }),
    );

    await Promise.all(updates);

    const screenshots = await prisma.contentScreenshot.findMany({
      where: { contentId },
      orderBy: { order: "asc" },
    });

    console.log(
      `✅ [QuizAdmin] reorderScreenshots: reordered ${screenshots.length} screenshots`,
    );
    return screenshots;
  }

  // ======================================
  // Admin Mutations - Quiz Settings
  // ======================================

  @Authorized("ADMIN")
  @Mutation(() => QuizSettings)
  async updateQuizSettings(
    @Arg("input", () => UpdateQuizSettingsInput) input: UpdateQuizSettingsInput,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<QuizSettings> {
    console.log(
      `🛠️ [QuizAdmin] updateQuizSettings: contentTypeId=${input.contentTypeId}`,
    );

    const settings = await prisma.quizSettings.upsert({
      where: { contentTypeId: input.contentTypeId },
      update: {
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.timePerQuestion !== undefined && {
          timePerQuestion: input.timePerQuestion,
        }),
        ...(input.questionsCount !== undefined && {
          questionsCount: input.questionsCount,
        }),
        ...(input.pointsLevel1 !== undefined && {
          pointsLevel1: input.pointsLevel1,
        }),
        ...(input.pointsLevel2 !== undefined && {
          pointsLevel2: input.pointsLevel2,
        }),
        ...(input.pointsLevel3 !== undefined && {
          pointsLevel3: input.pointsLevel3,
        }),
        ...(input.pointsLevel4 !== undefined && {
          pointsLevel4: input.pointsLevel4,
        }),
        ...(input.pointsLevel5 !== undefined && {
          pointsLevel5: input.pointsLevel5,
        }),
      },
      create: {
        contentTypeId: input.contentTypeId,
        isActive: input.isActive ?? true,
        timePerQuestion: input.timePerQuestion ?? 30,
        questionsCount: input.questionsCount ?? 10,
        pointsLevel1: input.pointsLevel1 ?? 10,
        pointsLevel2: input.pointsLevel2 ?? 15,
        pointsLevel3: input.pointsLevel3 ?? 25,
        pointsLevel4: input.pointsLevel4 ?? 40,
        pointsLevel5: input.pointsLevel5 ?? 50,
      },
    });

    console.log(
      `✅ [QuizAdmin] updateQuizSettings: updated for contentTypeId=${input.contentTypeId}`,
    );
    return settings;
  }

  // ======================================
  // Admin Mutations - Screenshot Quiz Toggle
  // ======================================

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async toggleScreenshotQuizStatus(
    @Arg("id", () => Int) id: number,
    @Arg("enabled", () => Boolean) enabled: boolean,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    console.log(
      `🛠️ [QuizAdmin] toggleScreenshotQuizStatus: id=${id}, enabled=${enabled}`,
    );

    await prisma.contentScreenshot.update({
      where: { id },
      data: { isEnabledForQuiz: enabled },
    });



    return true;
  }

  @Authorized("ADMIN")
  @Mutation(() => Int)
  async bulkEnableScreenshotsForQuiz(
    @Arg("contentId", () => String) contentId: string,
    @Arg("enabled", () => Boolean) enabled: boolean,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number> {
    console.log(
      `🛠️ [QuizAdmin] bulkEnableScreenshotsForQuiz: contentId=${contentId}, enabled=${enabled}`,
    );

    const result = await prisma.contentScreenshot.updateMany({
      where: { contentId },
      data: { isEnabledForQuiz: enabled },
    });

    console.log(
      `✅ [QuizAdmin] bulkEnableScreenshotsForQuiz: updated ${result.count} screenshots`,
    );
    return result.count;
  }

  // ======================================
  // Admin Queries - Quiz Statistics
  // ======================================

  @Authorized("ADMIN")
  @Query(() => Int)
  async getQuizEnabledScreenshotCount(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number> {
    console.log(
      `📊 [QuizAdmin] getQuizEnabledScreenshotCount: contentTypeId=${contentTypeId}`,
    );
    return prisma.contentScreenshot.count({
      where: {
        isEnabledForQuiz: true,
        content: { contentTypeId },
      },
    });
  }

  @Authorized("ADMIN")
  @Query(() => Int)
  async getQuizEnabledContentCount(
    @Arg("contentTypeId", () => Int) contentTypeId: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number> {
    console.log(
      `📊 [QuizAdmin] getQuizEnabledContentCount: contentTypeId=${contentTypeId}`,
    );
    return prisma.content.count({
      where: {
        contentTypeId,
        isEnabledForQuiz: true,
      },
    });
  }

  // ======================================
  // Admin Mutations - Content Quiz Status
  // ======================================

  @Authorized("ADMIN")
  @Mutation(() => Boolean)
  async toggleContentQuizStatus(
    @Arg("contentId", () => String) contentId: string,
    @Arg("enabled", () => Boolean) enabled: boolean,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<boolean> {
    console.log(
      `🛠️ [QuizAdmin] toggleContentQuizStatus: contentId=${contentId}, enabled=${enabled}`,
    );



    await prisma.content.update({
      where: { id: contentId },
      data: { isEnabledForQuiz: enabled },
    });

    return true;
  }

  @Authorized("ADMIN")
  @Mutation(() => Int)
  async bulkToggleContentsForQuiz(
    @Arg("contentIds", () => [String]) contentIds: string[],
    @Arg("enabled", () => Boolean) enabled: boolean,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number> {
    console.log(
      `🛠️ [QuizAdmin] bulkToggleContentsForQuiz: count=${contentIds.length}, enabled=${enabled}`,
    );

    const result = await prisma.content.updateMany({
      where: { id: { in: contentIds } },
      data: { isEnabledForQuiz: enabled },
    });

    console.log(
      `✅ [QuizAdmin] bulkToggleContentsForQuiz: updated ${result.count} contents`,
    );
    return result.count;
  }
}
