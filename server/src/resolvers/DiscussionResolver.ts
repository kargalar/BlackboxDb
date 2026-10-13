import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
} from "type-graphql";
import {
  Discussion,
  DiscussionComment,
  CreateDiscussionInput,
  CreateDiscussionCommentInput,
  CreateCommentInput,
  UpdateDiscussionInput,
  UpdateDiscussionCommentInput,
  Report,
  DiscussionVoter,
} from "../types/Discussion";
import { GraphQLContext } from "../context";
import { normalizePageOffset, normalizePageSize } from "../lib/pagination";
import {
  processVote,
  addDiscussionVoteExtras,
  addSingleDiscussionVoteExtras,
} from "../lib/discussionHelpers";
import {
  assertDiscussionAccess,
  buildUserCommentsWhere,
  buildVisibleCommentsWhere,
  canAccessDiscussion,
} from "../lib/discussionVisibility";
import { createNotification } from "../lib/notifications";
import { NOTIFICATION_TYPE_ID } from "../lib/notificationTypes";
import { convertContentForGraphQL } from "./content/ContentUtils";
import { findLogForReview } from "../lib/userContentReviewMatching";

function uniqueUserIds(userIds: string[] | undefined, excludeUserId?: string): string[] {
  if (!userIds?.length) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const userId of userIds) {
    if (!userId || userId === excludeUserId || seen.has(userId)) continue;
    seen.add(userId);
    normalized.push(userId);
  }
  return normalized;
}

@Resolver(Discussion)
export class DiscussionResolver {
  // ==========================================
  // QUERIES
  // ==========================================

  @Query(() => [Discussion])
  async discussionsByContent(
    @Arg("contentId", () => String) contentId: string,
    @Arg("sortBy", () => String, { nullable: true, defaultValue: "newest" })
    sortBy: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<Discussion[]> {
    const orderBy =
      sortBy === "top"
        ? [{ upvoteCount: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

    const discussions = await prisma.discussion.findMany({
      where: { contentId, type: "discussion", isDeleted: false },
      orderBy,
      include: {
        author: true,
      },
    });

    const discussionsWithExtras = await addDiscussionVoteExtras(
      prisma,
      discussions,
      user?.id,
    );
    return discussionsWithExtras as any;
  }

  @Query(() => [Discussion])
  async commentsByContent(
    @Arg("contentId", () => String) contentId: string,
    @Arg("sortBy", () => String, { nullable: true, defaultValue: "newest" })
    sortBy: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<Discussion[]> {
    let orderBy: any = [{ createdAt: "desc" }];
    if (sortBy === "oldest") {
      orderBy = [{ createdAt: "asc" }];
    } else if (sortBy === "top") {
      orderBy = [{ upvoteCount: "desc" }, { createdAt: "desc" }];
    } else if (sortBy === "bottom") {
      orderBy = [{ upvoteCount: "asc" }, { createdAt: "desc" }];
    }

    const comments = await prisma.discussion.findMany({
      where: {
        contentId,
        type: "comment",
        isDeleted: false,
        ...buildVisibleCommentsWhere(user),
      },
      orderBy,
      include: {
        author: true,
      },
    });

    const commentsWithExtras = await addDiscussionVoteExtras(
      prisma,
      comments,
      user?.id,
    );

    // Fetch playtime and rating for each unique author on this content
    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const logEntries = await prisma.userContentLog.findMany({
      where: {
        contentId,
        userId: { in: authorIds },
        OR: [{ playtimeMinutes: { not: null } }, { rating: { not: null } }, { isFavorite: true }, { isAbandoned: true }],
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        contentId: true,
        date: true,
        playtimeMinutes: true,
        rating: true,
        isFavorite: true,
        isAbandoned: true,
      },
    });

    // Attach the author's log state from the time the review was written.
    for (const comment of commentsWithExtras as any[]) {
      const userLog = findLogForReview(comment, logEntries);
      comment.authorPlaytimeMinutes = userLog?.playtimeMinutes ?? null;
      comment.authorRating =
        userLog?.rating != null ? Number(userLog.rating) : null;
      comment.authorIsFavorite = userLog?.isFavorite ?? false;
      comment.authorIsAbandoned = userLog?.isAbandoned ?? false;
    }

    let finalComments = commentsWithExtras as any[];

    // In-memory sorting for highest_rated and lowest_rated
    if (sortBy === "highest_rated") {
      finalComments.sort((a, b) => {
        const ratingA = a.authorRating ?? -1;
        const ratingB = b.authorRating ?? -1;
        return ratingB - ratingA;
      });
    } else if (sortBy === "lowest_rated") {
      finalComments.sort((a, b) => {
        const ratingA = a.authorRating ?? Infinity;
        const ratingB = b.authorRating ?? Infinity;
        return ratingA - ratingB;
      });
    }

    return finalComments;
  }

  @Query(() => Int)
  async commentsCountByContent(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<number> {
    const count = await prisma.discussion.count({
      where: {
        contentId,
        type: "comment",
        isDeleted: false,
        ...buildVisibleCommentsWhere(user),
      },
    });
    return count;
  }

  @Query(() => Int)
  async discussionsCountByContent(
    @Arg("contentId", () => String) contentId: string,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<number> {
    const count = await prisma.discussion.count({
      where: { contentId, type: "discussion" },
    });
    return count;
  }

  @Query(() => Discussion, { nullable: true })
  async discussion(
    @Arg("id", () => Int) id: number,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<Discussion | null> {
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: {
        author: true,
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
      },
    });

    if (!discussion) return null;
    if (!canAccessDiscussion(discussion, user)) {
      return null;
    }

    const withExtras = await addSingleDiscussionVoteExtras(
      prisma,
      discussion,
      user?.id,
    );

    // Fetch author's playtime, rating, and favorite status for this content
    let authorPlaytimeMinutes: number | null = null;
    let authorRating: number | null = null;
    let authorIsFavorite: boolean = false;
    let authorIsAbandoned: boolean = false;
    if (discussion.contentId) {
      const userLogs = await prisma.userContentLog.findMany({
        where: {
          userId: discussion.authorId,
          contentId: discussion.contentId,
          OR: [{ playtimeMinutes: { not: null } }, { rating: { not: null } }, { isFavorite: true }, { isAbandoned: true }],
        },
        orderBy: [{ date: "asc" }, { id: "asc" }],
        select: {
          id: true,
          userId: true,
          contentId: true,
          date: true,
          playtimeMinutes: true,
          rating: true,
          isFavorite: true,
          isAbandoned: true,
        },
      });
      const userLog = findLogForReview(discussion, userLogs);
      if (userLog) {
        authorPlaytimeMinutes = userLog.playtimeMinutes != null ? Number(userLog.playtimeMinutes) : null;
        authorRating = userLog.rating != null ? Number(userLog.rating) : null;
        authorIsFavorite = userLog.isFavorite;
        authorIsAbandoned = userLog.isAbandoned;
      }
    }

    return {
      ...withExtras,
      content: withExtras.content
        ? convertContentForGraphQL(withExtras.content)
        : null,
      authorPlaytimeMinutes,
      authorRating,
      authorIsFavorite,
      authorIsAbandoned,
    } as any;
  }

  @Query(() => [DiscussionVoter])
  async discussionVoters(
    @Arg("discussionId", () => Int) discussionId: number,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<DiscussionVoter[]> {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { authorId: true, type: true, isPublic: true },
    });

    if (!discussion) {
      throw new Error("Discussion not found");
    }

    assertDiscussionAccess(discussion, user);

    const votes = await prisma.discussionVote.findMany({
      where: { discussionId },
      include: {
        user: true,
      },
    });

    return votes.map((v) => ({
      id: v.user.id,
      username: v.user.username,
      picturePath: v.user.picturePath,
      voteType: v.voteType,
    }));
  }

  @Query(() => [DiscussionVoter])
  async discussionCommentVoters(
    @Arg("commentId", () => Int) commentId: number,
    @Ctx() { prisma }: GraphQLContext,
  ): Promise<DiscussionVoter[]> {
    const votes = await prisma.discussionCommentVote.findMany({
      where: { commentId },
      include: {
        user: true,
      },
    });

    return votes.map((v) => ({
      id: v.user.id,
      username: v.user.username,
      picturePath: v.user.picturePath,
      voteType: v.voteType,
    }));
  }

  @Query(() => [Discussion])
  async userDiscussions(
    @Arg("userId", () => String) userId: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg("offset", () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<Discussion[]> {
    const safeLimit = normalizePageSize(limit);
    const safeOffset = normalizePageOffset(offset);
    const discussions = await prisma.discussion.findMany({
      where: { authorId: userId, type: "discussion", isDeleted: false },
      take: safeLimit,
      skip: safeOffset,
      orderBy: [{ createdAt: "desc" as const }],
      include: {
        author: true,
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
      },
    });

    const discussionsWithExtras = await addDiscussionVoteExtras(
      prisma,
      discussions,
      user?.id,
    );
    return discussionsWithExtras.map((d) => ({
      ...d,
      content: d.content ? convertContentForGraphQL(d.content) : null,
    })) as any;
  }

  @Query(() => [Discussion])
  async userComments(
    @Arg("userId", () => String) userId: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg("offset", () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<Discussion[]> {
    const safeLimit = normalizePageSize(limit);
    const safeOffset = normalizePageOffset(offset);
    const comments = await prisma.discussion.findMany({
      where: {
        authorId: userId,
        type: "comment",
        isDeleted: false,
        content: { isDeleted: false },
        ...buildUserCommentsWhere(userId, user),
      },
      take: safeLimit,
      skip: safeOffset,
      orderBy: [{ createdAt: "desc" as const }],
      include: {
        author: true,
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
      },
    });

    const commentsWithExtras = await addDiscussionVoteExtras(
      prisma,
      comments,
      user?.id,
    );

    // Fetch playtime and rating for the user on these contents
    const contentIds = [...new Set(comments.map((c) => c.contentId).filter(Boolean))];
    const logEntries = await prisma.userContentLog.findMany({
      where: {
        userId,
        contentId: { in: contentIds as string[] },
        OR: [{ playtimeMinutes: { not: null } }, { rating: { not: null } }, { isFavorite: true }, { isAbandoned: true }],
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        contentId: true,
        date: true,
        playtimeMinutes: true,
        rating: true,
        isFavorite: true,
        isAbandoned: true,
      },
    });

    return commentsWithExtras.map((c: any) => {
      const userLog = c.contentId ? findLogForReview(c, logEntries) : null;
      return {
        ...c,
        content: c.content ? convertContentForGraphQL(c.content) : null,
        authorPlaytimeMinutes:
          userLog?.playtimeMinutes != null ? Number(userLog.playtimeMinutes) : null,
        authorRating: userLog?.rating != null ? Number(userLog.rating) : null,
        authorIsFavorite: userLog?.isFavorite ?? false,
        authorIsAbandoned: userLog?.isAbandoned ?? false,
      };
    }) as any;
  }

  @Query(() => [Discussion])
  async allDiscussions(
    @Arg("sortBy", () => String, { nullable: true, defaultValue: "newest" })
    sortBy: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg("offset", () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg("contentType", () => String, { nullable: true, defaultValue: "all" })
    contentType: string,
    @Arg("timeRange", () => String, { nullable: true, defaultValue: "all" })
    timeRange: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<Discussion[]> {
    const safeLimit = normalizePageSize(limit);
    const safeOffset = normalizePageOffset(offset);
    const orderBy =
      sortBy === "top"
        ? [{ upvoteCount: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

    // Build where clause based on contentType filter
    const contentTypeIdMap: Record<string, number> = {
      movie: 1,
      tv: 2,
      game: 3,
      book: 4,
      music: 5,
    };
    let where: any = { type: "discussion", isDeleted: false };
    if (contentType === "general") {
      where.contentId = null;
    } else if (contentTypeIdMap[contentType]) {
      where.content = { contentTypeId: contentTypeIdMap[contentType] };
    }
    // 'all' -> no filter on contentId, but still filter by type='discussion'

    // Apply timeRange filter
    if (timeRange && timeRange !== "all") {
      const date = new Date();
      if (timeRange === "daily") {
        date.setDate(date.getDate() - 1);
      } else if (timeRange === "weekly") {
        date.setDate(date.getDate() - 7);
      } else if (timeRange === "monthly") {
        date.setMonth(date.getMonth() - 1);
      } else if (timeRange === "yearly") {
        date.setFullYear(date.getFullYear() - 1);
      }
      where.createdAt = { gte: date };
    }

    const discussions = await prisma.discussion.findMany({
      where,
      take: safeLimit,
      skip: safeOffset,
      orderBy,
      include: {
        author: true,
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
      },
    });

    const discussionsWithExtras = await addDiscussionVoteExtras(
      prisma,
      discussions,
      user?.id,
    );
    return discussionsWithExtras.map((d) => ({
      ...d,
      content: d.content ? convertContentForGraphQL(d.content) : null,
    })) as any;
  }

  @Query(() => [Discussion])
  async allComments(
    @Arg("sortBy", () => String, { nullable: true, defaultValue: "newest" })
    sortBy: string,
    @Arg("limit", () => Int, { nullable: true, defaultValue: 20 })
    limit: number,
    @Arg("offset", () => Int, { nullable: true, defaultValue: 0 })
    offset: number,
    @Arg("contentType", () => String, { nullable: true, defaultValue: "all" })
    contentType: string,
    @Arg("timeRange", () => String, { nullable: true, defaultValue: "all" })
    timeRange: string,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<Discussion[]> {
    const safeLimit = normalizePageSize(limit);
    const safeOffset = normalizePageOffset(offset);
    const orderBy =
      sortBy === "top"
        ? [{ upvoteCount: "desc" as const }, { createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

    // Build where clause based on contentType filter
    const contentTypeIdMap: Record<string, number> = {
      movie: 1,
      tv: 2,
      game: 3,
      book: 4,
      music: 5,
    };
    let where: any = {
      type: "comment",
      isDeleted: false,
      isPublic: true,
      contentId: { not: null },
      content: { isDeleted: false },
    };
    if (contentTypeIdMap[contentType]) {
      where.content = {
        isDeleted: false,
        contentTypeId: contentTypeIdMap[contentType],
      };
    }

    // Apply timeRange filter
    if (timeRange && timeRange !== "all") {
      const date = new Date();
      if (timeRange === "daily") {
        date.setDate(date.getDate() - 1);
      } else if (timeRange === "weekly") {
        date.setDate(date.getDate() - 7);
      } else if (timeRange === "monthly") {
        date.setMonth(date.getMonth() - 1);
      } else if (timeRange === "yearly") {
        date.setFullYear(date.getFullYear() - 1);
      }
      where.createdAt = { gte: date };
    }

    const comments = await prisma.discussion.findMany({
      where,
      take: safeLimit,
      skip: safeOffset,
      orderBy,
      include: {
        author: true,
        content: {
          include: {
            contentType: true,
            images: {
              where: { type: { in: ["poster", "backdrop"] } },
              select: { id: true, type: true, version: true, filePath: true, upvoteCount: true, downvoteCount: true },
            },
          },
        },
      },
    });

    const commentsWithExtras = await addDiscussionVoteExtras(
      prisma,
      comments,
      user?.id,
    );
    return commentsWithExtras.map((c) => ({
      ...c,
      content: c.content ? convertContentForGraphQL(c.content) : null,
    })) as any;
  }

  // ==========================================
  // DISCUSSION MUTATIONS
  // ==========================================

  @Authorized()
  @Mutation(() => Discussion)
  async createDiscussion(
    @Arg("input", () => CreateDiscussionInput) input: CreateDiscussionInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Discussion> {
    if (!user) throw new Error("Not authenticated");

    // Check if content exists (only if contentId is provided)
    if (input.contentId) {
      const content = await prisma.content.findUnique({
        where: { id: input.contentId },
      });
      if (!content) throw new Error("Content not found");
    }

    const discussion = await prisma.discussion.create({
      data: {
        contentId: input.contentId || null,
        authorId: user.id,
        type: "discussion",
        title: input.title,
        description: input.description,
      },
      include: {
        author: true,
        content: true,
      },
    });

    return {
      ...discussion,
      score: 0,
      userVote: null,
    } as any;
  }

  @Authorized()
  @Mutation(() => Discussion)
  async createComment(
    @Arg("input", () => CreateCommentInput) input: CreateCommentInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Discussion> {
    if (!user) throw new Error("Not authenticated");

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id: input.contentId },
    });
    if (!content) throw new Error("Content not found");

    const comment = await prisma.discussion.create({
      data: {
        contentId: input.contentId,
        authorId: user.id,
        type: "comment",
        isPublic: input.isPublic ?? true,
        isSpoiler: input.isSpoiler ?? false,
        title: null,
        description: input.text,
      },
      include: {
        author: true,
        content: true,
      },
    });

    // Mention bildirimleri gönder
    if (input.mentionedUserIds && input.mentionedUserIds.length > 0) {
      const uniqueMentionIds = [...new Set(input.mentionedUserIds)].filter(
        (id) => id !== user.id
      );
      for (const mentionedUserId of uniqueMentionIds) {
        try {
          await createNotification(prisma, {
            recipientUserId: mentionedUserId,
            actorUserId: user.id,
            typeId: NOTIFICATION_TYPE_ID.COMMENT_MENTION,
            replyId: comment.id,
          });
        } catch (e) {
          console.error(`[createComment] Mention bildirim hatası ${mentionedUserId}:`, e);
        }
      }
    }

    return {
      ...comment,
      score: 0,
      userVote: null,
    } as any;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteDiscussion(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const discussion = await prisma.discussion.findUnique({
      where: { id },
    });

    if (!discussion) throw new Error("Discussion not found");
    if (discussion.authorId !== user.id && !user.isAdmin) {
      throw new Error("Not authorized");
    }

    // Soft delete - mark as deleted instead of permanent removal
    await prisma.discussion.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return true;
  }

  @Authorized()
  @Mutation(() => Discussion)
  async updateDiscussion(
    @Arg("input", () => UpdateDiscussionInput) input: UpdateDiscussionInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Discussion> {
    if (!user) throw new Error("Not authenticated");

    const discussion = await prisma.discussion.findUnique({
      where: { id: input.id },
    });

    if (!discussion) throw new Error("Discussion not found");
    if (discussion.authorId !== user.id && !user.isAdmin) {
      throw new Error("Not authorized");
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;
    if (input.isSpoiler !== undefined) updateData.isSpoiler = input.isSpoiler;

    const updated = await prisma.discussion.update({
      where: { id: input.id },
      data: updateData,
      include: { author: true, content: true },
    });

    return (await addSingleDiscussionVoteExtras(
      prisma,
      updated,
      user.id,
    )) as any;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async reportDiscussion(
    @Arg("id", () => Int) id: number,
    @Arg("reason", () => String) reason: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const discussion = await prisma.discussion.findUnique({
      where: { id },
      select: { authorId: true, type: true, isPublic: true },
    });

    if (!discussion) throw new Error("Discussion not found");
    assertDiscussionAccess(discussion, user);

    await prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: discussion.type,
        targetId: String(id),
        reason,
      },
    });

    return true;
  }

  @Authorized()
  @Mutation(() => Discussion)
  async voteDiscussion(
    @Arg("id", () => Int) id: number,
    @Arg("voteType", () => Int) voteType: number, // 1 = upvote, -1 = downvote, 0 = remove vote
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<Discussion> {
    if (!user) throw new Error("Not authenticated");
    if (voteType !== 1 && voteType !== -1 && voteType !== 0) {
      throw new Error("Invalid vote type");
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: { author: true, content: true },
    });

    if (!discussion) throw new Error("Discussion not found");
    assertDiscussionAccess(discussion, user);

    if (discussion.authorId === user.id) {
      throw new Error("Kendi tartışmanıza/yorumunuza oy veremezsiniz");
    }

    const { upvoteChange, downvoteChange } = await processVote(
      prisma,
      "discussionVote",
      "discussionId",
      id,
      user.id,
      voteType,
    );

    // Update counts
    const updated = await prisma.discussion.update({
      where: { id },
      data: {
        upvoteCount: { increment: upvoteChange },
        downvoteCount: { increment: downvoteChange },
      },
      include: { author: true, content: true },
    });

    // Send notification for votes on comments/reviews
    if ((voteType === 1 || voteType === -1) && discussion.authorId !== user.id) {
      try {
        const { createNotification } = await import("../lib/notifications");
        const { NOTIFICATION_TYPE_ID } =
          await import("../lib/notificationTypes");
        await createNotification(prisma, {
          recipientUserId: discussion.authorId,
          actorUserId: user.id,
          typeId:
            voteType === 1
              ? NOTIFICATION_TYPE_ID.COMMENT_LIKED
              : NOTIFICATION_TYPE_ID.COMMENT_DISLIKED,
          contentId: discussion.contentId,
          replyId: discussion.id,
        });
        console.log(
          `✅ [Discussion] Notification sent for vote on discussion ${id}`,
        );
      } catch (notifError) {
        console.error(`❌ [Discussion] Notification error:`, notifError);
      }
    }

    return {
      ...updated,
      score: updated.upvoteCount - updated.downvoteCount,
      userVote: voteType === 0 ? null : voteType,
    } as any;
  }
}
