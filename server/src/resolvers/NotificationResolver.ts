import { Resolver, Query, Mutation, Arg, Ctx, Int } from "type-graphql";
import { Notification } from "../types/Notification";
import { GraphQLContext } from "../context";
import { ensureReleasedContentNotificationsForUser } from "../lib/releaseNotificationHelper";
import { normalizePageSize } from "../lib/pagination";

@Resolver(Notification)
export class NotificationResolver {
  private assertCanAccess(userId: string, ctx: GraphQLContext) {
    const currentUser = ctx.user;
    if (!currentUser) throw new Error("Not authenticated");
    if (currentUser.id !== userId && !currentUser.isAdmin) {
      throw new Error("Not authorized");
    }
  }

  /**
   * Get notifications for a user
   */
  @Query(() => [Notification])
  async notifications(
    @Arg("userId", () => String) userId: string,
    @Arg("limit", () => Int, { defaultValue: 20 }) limit: number,
    @Ctx() ctx: GraphQLContext,
  ): Promise<Notification[]> {
    this.assertCanAccess(userId, ctx);
    await ensureReleasedContentNotificationsForUser(ctx.prisma, userId);
    const safeLimit = normalizePageSize(limit);

    const notifications = await ctx.prisma.notification.findMany({
      where: {
        recipientUserId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: safeLimit,
      include: {
        actor: {
          select: {
            username: true,
            picturePath: true,
          },
        },
        content: {
          select: {
            id: true,
            title: true,
            contentTypeId: true,
            posterImageId: true,
            images: {
              where: { type: "poster" },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
              take: 5,
            },
          },
        },
      },
    });

    const commentIds = notifications
      .filter((n) => n.discussionCommentId)
      .map((n) => n.discussionCommentId as number);

    let commentTextMap: Record<number, string> = {};
    if (commentIds.length > 0) {
      const comments = await ctx.prisma.discussionComment.findMany({
        where: { id: { in: commentIds } },
        select: { id: true, text: true },
      });
      commentTextMap = comments.reduce(
        (acc, c) => {
          acc[c.id] = c.text;
          return acc;
        },
        {} as Record<number, string>,
      );
    }

    // Map to GraphQL type
    return notifications.map((n) => ({
      id: n.id.toString(),
      recipientUserId: n.recipientUserId,
      actorUserId: n.actorUserId ?? null,
      typeId: n.typeId,
      message: (n as any).message ?? null,
      contentId: n.contentId ?? null,
      replyId: n.replyId,
      discussionCommentId: n.discussionCommentId ?? null,
      commentText: n.discussionCommentId
        ? commentTextMap[n.discussionCommentId]
        : null,
      createdAt: n.createdAt,
      readAt: n.readAt,
      actor: n.actor
        ? {
            username: n.actor.username,
            picturePath: n.actor.picturePath,
          }
        : undefined,
      content: n.content
        ? (() => {
            const c = n.content as any;
            let posterUrl: string | null = null;
            if (c.images && Array.isArray(c.images)) {
              if (c.posterImageId) {
                const img = c.images.find((i: any) => i.id === c.posterImageId);
                if (img) posterUrl = img.filePath;
              }
              if (!posterUrl && c.images.length > 0) {
                posterUrl = c.images[0].filePath;
              }
            }
            return {
              id: c.id,
              title: c.title,
              contentTypeId: c.contentTypeId,
              posterUrl,
            };
          })()
        : undefined,
    }));
  }

  /**
   * Get unread notification count for a user
   */
  @Query(() => Int)
  async unreadNotificationCount(
    @Arg("userId", () => String) userId: string,
    @Ctx() ctx: GraphQLContext,
  ): Promise<number> {
    this.assertCanAccess(userId, ctx);
    await ensureReleasedContentNotificationsForUser(ctx.prisma, userId);

    const count = await ctx.prisma.notification.count({
      where: {
        recipientUserId: userId,
        readAt: null,
      },
    });

    return count;
  }

  /**
   * Mark a single notification as read
   */
  @Mutation(() => Boolean)
  async markNotificationRead(
    @Arg("notificationId", () => Int) notificationId: number,
    @Arg("userId", () => String) userId: string,
    @Ctx() ctx: GraphQLContext,
  ): Promise<boolean> {
    this.assertCanAccess(userId, ctx);

    const updateResult = await ctx.prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientUserId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    if (updateResult.count > 0) return true;

    const existingNotification = await ctx.prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
      select: { id: true },
    });
    return existingNotification !== null;
  }

  /**
   * Mark all notifications as read for a user
   */
  @Mutation(() => Boolean)
  async markNotificationsRead(
    @Arg("userId", () => String) userId: string,
    @Ctx() ctx: GraphQLContext,
  ): Promise<boolean> {
    this.assertCanAccess(userId, ctx);

    await ctx.prisma.notification.updateMany({
      where: {
        recipientUserId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Alias: explicit name for mark-all
   */
  @Mutation(() => Boolean)
  async markAllNotificationsRead(
    @Arg("userId", () => String) userId: string,
    @Ctx() ctx: GraphQLContext,
  ): Promise<boolean> {
    return this.markNotificationsRead(userId, ctx);
  }
}
