import {
  Arg,
  Authorized,
  Ctx,
  Int,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
import type { GraphQLContext } from "../context";
import { ContentRecommendation } from "../types/Recommendation";
import { createNotification } from "../lib/notifications";
import { NOTIFICATION_TYPE_ID } from "../lib/notificationTypes";

@Resolver(ContentRecommendation)
export class RecommendationResolver {
  @Authorized()
  @Mutation(() => Int)
  async recommendContent(
    @Arg("contentId", () => String) contentId: string,
    @Arg("recipientUserIds", () => [String]) recipientUserIds: string[],
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<number> {
    if (!user) throw new Error("Not authenticated");

    const uniqueRecipients = Array.from(
      new Set((recipientUserIds || []).map((x) => x.trim()).filter(Boolean)),
    );
    if (uniqueRecipients.length === 0)
      throw new Error("No recipients selected");

    if (uniqueRecipients.some((id) => id === user.id)) {
      throw new Error("Cannot recommend to yourself");
    }

    // Enforce: can only recommend to users you follow
    const followCount = await prisma.userFollow.count({
      where: {
        userId: user.id,
        followingUserId: { in: uniqueRecipients },
      },
    });

    if (followCount !== uniqueRecipients.length) {
      throw new Error("You can only recommend to users you follow");
    }

    const createOps = uniqueRecipients.map((recipientUserId) =>
      prisma.contentRecommendation.upsert({
        where: {
          contentId_recipientUserId_recommenderUserId: {
            contentId,
            recipientUserId,
            recommenderUserId: user.id,
          },
        },
        update: {
          // do not overwrite thankedAt; recommendation can stay thanked
        },
        create: {
          contentId,
          recipientUserId,
          recommenderUserId: user.id,
        },
      }),
    );

    await prisma.$transaction(createOps);

    console.log("✅ [Recommendation] Content recommended:", {
      contentId,
      recommenderUserId: user.id,
      recipients: uniqueRecipients.length,
    });

    return uniqueRecipients.length;
  }

  @Authorized()
  @Query(() => [ContentRecommendation])
  async myRecommendations(
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<ContentRecommendation[]> {
    if (!user) throw new Error("Not authenticated");

    const rows = await prisma.contentRecommendation.findMany({
      where: {
        recipientUserId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(Math.max(limit, 1), 200),
      include: {
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
        recommender: true,
      },
    });

    return rows.map((r) => {
      const content = r.content as any;
      let posterUrl: string | null = content.posterUrl || null;
      if (!posterUrl && content.images && Array.isArray(content.images)) {
        if (content.posterImageId) {
          const img = content.images.find(
            (i: any) => i.id === content.posterImageId,
          );
          if (img) posterUrl = img.filePath;
        }
        if (!posterUrl) {
          const img = content.images.find((i: any) => i.type === "poster");
          if (img) posterUrl = img.filePath;
        }
      }
      return {
        id: String(r.id),
        contentId: r.contentId,
        recipientUserId: r.recipientUserId,
        recommenderUserId: r.recommenderUserId,
        createdAt: r.createdAt,
        thankedAt: r.thankedAt,
        content: { ...content, posterUrl },
        recommender: r.recommender as any,
      };
    });
  }

  @Authorized()
  @Query(() => Int)
  async myUnthankedRecommendationsCount(
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<number> {
    if (!user) throw new Error("Not authenticated");

    return prisma.contentRecommendation.count({
      where: {
        recipientUserId: user.id,
        thankedAt: null,
      },
    });
  }

  @Authorized()
  @Query(() => [ContentRecommendation])
  async mySentRecommendations(
    @Arg("limit", () => Int, { defaultValue: 50 }) limit: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<ContentRecommendation[]> {
    if (!user) throw new Error("Not authenticated");

    const rows = await prisma.contentRecommendation.findMany({
      where: {
        recommenderUserId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(Math.max(limit, 1), 200),
      include: {
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
        recipient: true,
      },
    });

    return rows.map((r) => {
      const content = r.content as any;
      let posterUrl: string | null = content.posterUrl || null;
      if (!posterUrl && content.images && Array.isArray(content.images)) {
        if (content.posterImageId) {
          const img = content.images.find(
            (i: any) => i.id === content.posterImageId,
          );
          if (img) posterUrl = img.filePath;
        }
        if (!posterUrl) {
          const img = content.images.find((i: any) => i.type === "poster");
          if (img) posterUrl = img.filePath;
        }
      }
      return {
        id: String(r.id),
        contentId: r.contentId,
        recipientUserId: r.recipientUserId,
        recommenderUserId: r.recommenderUserId,
        createdAt: r.createdAt,
        thankedAt: r.thankedAt,
        content: { ...content, posterUrl },
        recommender: null as any,
        recipient: r.recipient as any,
      };
    });
  }

  @Authorized()
  @Mutation(() => Boolean)
  async thankRecommendation(
    @Arg("recommendationId", () => Int) recommendationId: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const rec = await prisma.contentRecommendation.findUnique({
      where: { id: recommendationId },
      select: {
        id: true,
        recipientUserId: true,
        recommenderUserId: true,
        thankedAt: true,
      },
    });

    if (!rec) throw new Error("Recommendation not found");
    if (rec.recipientUserId !== user.id) throw new Error("Not authorized");

    if (!rec.thankedAt) {
      await prisma.contentRecommendation.update({
        where: { id: recommendationId },
        data: { thankedAt: new Date() },
      });

      await createNotification(prisma, {
        recipientUserId: rec.recommenderUserId,
        actorUserId: user.id,
        typeId: NOTIFICATION_TYPE_ID.RECOMMENDATION_THANKED,
      });

      console.log("🙏 [Recommendation] Thanked recommendation:", {
        recommendationId,
        actorUserId: user.id,
        recipientUserId: rec.recommenderUserId,
      });
    }

    return true;
  }
}
