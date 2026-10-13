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
  CreateDiscussionCommentInput,
  UpdateDiscussionCommentInput,
  DiscussionVoter,
} from "../types/Discussion";
import { GraphQLContext } from "../context";
import { createNotification } from "../lib/notifications";
import { NOTIFICATION_TYPE_ID } from "../lib/notificationTypes";

import {
  processVote,
} from "../lib/discussionHelpers";
import {
  assertDiscussionAccess,
} from "../lib/discussionVisibility";

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

@Resolver(DiscussionComment)
export class DiscussionCommentResolver {

  // ==========================================
  // DISCUSSION COMMENTS
  // ==========================================

  @Query(() => [DiscussionComment])
  async discussionComments(
    @Arg("discussionId", () => Int) discussionId: number,
    @Ctx() { prisma, user }: GraphQLContext,
  ): Promise<DiscussionComment[]> {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { authorId: true, type: true, isPublic: true },
    });

    if (!discussion) {
      throw new Error("Discussion not found");
    }

    assertDiscussionAccess(discussion, user);

    const allComments = await prisma.discussionComment.findMany({
      where: { discussionId, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: {
        author: true,
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
      },
    });

    const userId = user?.id;
    const votedMap = new Map<number, number>();
    if (userId && allComments.length > 0) {
      const votes = await prisma.discussionCommentVote.findMany({
        where: { userId, commentId: { in: allComments.map((c) => c.id) } },
        select: { commentId: true, voteType: true },
      });
      for (const v of votes) votedMap.set(v.commentId, v.voteType);
    }

    // Build tree
    const nodeById = new Map<number, any>();
    for (const c of allComments) {
      nodeById.set(c.id, {
        ...c,
        score: c.upvoteCount - c.downvoteCount,
        userVote: votedMap.get(c.id) ?? null,
        mentions: c.mentions.map((mention) => mention.mentionedUser),
        replies: [] as DiscussionComment[],
      });
    }

    const roots: any[] = [];
    for (const c of allComments) {
      const node = nodeById.get(c.id);
      if (!c.parentId) {
        roots.push(node);
      } else {
        const parent = nodeById.get(c.parentId);
        if (parent) {
          parent.replies.push(node);
        } else {
          roots.push(node);
        }
      }
    }

    return roots as any;
  }

  @Authorized()
  @Mutation(() => DiscussionComment)
  async createDiscussionComment(
    @Arg("input", () => CreateDiscussionCommentInput)
    input: CreateDiscussionCommentInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<DiscussionComment> {
    if (!user) throw new Error("Not authenticated");

    const discussion = await prisma.discussion.findUnique({
      where: { id: input.discussionId },
    });

    if (!discussion) throw new Error("Discussion not found");
    assertDiscussionAccess(discussion, user);

    const requestedMentionIds = uniqueUserIds(input.mentionedUserIds, user.id);
    const mentionedUsers = requestedMentionIds.length
      ? await prisma.appUser.findMany({
          where: {
            id: { in: requestedMentionIds },
            isDeleted: false,
          },
          select: {
            id: true,
            username: true,
            picturePath: true,
            email: true,
            bio: true,
            personalityAnalyze: true,
            isAdmin: true,
            isModerator: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : [];
    const validMentionIds = mentionedUsers.map((mentionedUser) => mentionedUser.id);
    const mentionedUserIdSet = new Set(validMentionIds);

    const comment = await prisma.discussionComment.create({
      data: {
        discussionId: input.discussionId,
        authorId: user.id,
        text: input.text,
        parentId: input.parentId ?? null,
        mentions: validMentionIds.length
          ? {
              createMany: {
                data: validMentionIds.map((mentionedUserId) => ({
                  mentionedUserId,
                })),
              },
            }
          : undefined,
      },
      include: {
        author: true,
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
      },
    });

    // Update discussion comment count
    await prisma.discussion.update({
      where: { id: input.discussionId },
      data: { commentCount: { increment: 1 } },
    });

    // Send notifications
    const { createNotification } = await import("../lib/notifications");
    const { NOTIFICATION_TYPE_ID } = await import("../lib/notificationTypes");

    if (input.parentId) {
      // Reply to a comment - notify parent comment author
      const parentComment = await prisma.discussionComment.findUnique({
        where: { id: input.parentId },
        select: { authorId: true },
      });
      if (
        parentComment &&
        parentComment.authorId !== user.id &&
        !mentionedUserIdSet.has(parentComment.authorId)
      ) {
        await createNotification(prisma, {
          recipientUserId: parentComment.authorId,
          actorUserId: user.id,
          typeId: NOTIFICATION_TYPE_ID.DISCUSSION_COMMENT_REPLY,
          contentId: discussion.contentId,
          replyId: discussion.id,
          discussionCommentId: comment.id,
        });
      }
    } else {
      // Top-level comment - notify discussion author
      if (
        discussion.authorId !== user.id &&
        !mentionedUserIdSet.has(discussion.authorId)
      ) {
        await createNotification(prisma, {
          recipientUserId: discussion.authorId,
          actorUserId: user.id,
          typeId: NOTIFICATION_TYPE_ID.DISCUSSION_REPLY,
          contentId: discussion.contentId,
          replyId: discussion.id,
          discussionCommentId: comment.id,
        });
      }
    }

    for (const mentionedUser of mentionedUsers) {
      await createNotification(prisma, {
        recipientUserId: mentionedUser.id,
        actorUserId: user.id,
        typeId: NOTIFICATION_TYPE_ID.COMMENT_MENTION,
        contentId: discussion.contentId,
        replyId: discussion.id,
        discussionCommentId: comment.id,
      });
    }

    return {
      ...comment,
      score: 0,
      userVote: null,
      mentions: comment.mentions.map((mention) => mention.mentionedUser),
      replies: [],
    } as any;
  }

  @Authorized()
  @Mutation(() => DiscussionComment)
  async updateDiscussionComment(
    @Arg("input", () => UpdateDiscussionCommentInput)
    input: UpdateDiscussionCommentInput,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<DiscussionComment> {
    if (!user) throw new Error("Not authenticated");

    const comment = await prisma.discussionComment.findUnique({
      where: { id: input.id },
    });

    if (!comment) throw new Error("Comment not found");
    // Only the author or an admin can update the comment
    if (comment.authorId !== user.id && !user.isAdmin) {
      throw new Error("Not authorized");
    }

    const requestedMentionIds = uniqueUserIds(input.mentionedUserIds, comment.authorId);
    const existingMentions = await prisma.discussionCommentMention.findMany({
      where: { commentId: input.id },
      select: { mentionedUserId: true },
    });
    const existingMentionIdSet = new Set(
      existingMentions.map((mention) => mention.mentionedUserId),
    );
    const mentionedUsers = requestedMentionIds.length
      ? await prisma.appUser.findMany({
          where: {
            id: { in: requestedMentionIds },
            isDeleted: false,
          },
          select: {
            id: true,
            username: true,
            picturePath: true,
            email: true,
            bio: true,
            personalityAnalyze: true,
            isAdmin: true,
            isModerator: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : [];
    const validMentionIds = mentionedUsers.map((mentionedUser) => mentionedUser.id);
    const validMentionIdSet = new Set(validMentionIds);
    const mentionIdsToAdd = validMentionIds.filter(
      (mentionedUserId) => !existingMentionIdSet.has(mentionedUserId),
    );
    const mentionIdsToRemove = existingMentions
      .map((mention) => mention.mentionedUserId)
      .filter((mentionedUserId) => !validMentionIdSet.has(mentionedUserId));

    const updated = await prisma.discussionComment.update({
      where: { id: input.id },
      data: {
        text: input.text,
        mentions: {
          deleteMany: mentionIdsToRemove.length
            ? { mentionedUserId: { in: mentionIdsToRemove } }
            : undefined,
          createMany: mentionIdsToAdd.length
            ? {
                data: mentionIdsToAdd.map((mentionedUserId) => ({
                  mentionedUserId,
                })),
                skipDuplicates: true,
              }
            : undefined,
        },
      },
      include: {
        author: true,
        mentions: {
          include: {
            mentionedUser: true,
          },
        },
      },
    });

    if (mentionIdsToAdd.length > 0) {
      const discussion = await prisma.discussion.findUnique({
        where: { id: updated.discussionId },
        select: { id: true, contentId: true },
      });

      if (discussion) {
        for (const mentionedUserId of mentionIdsToAdd) {
          await createNotification(prisma, {
            recipientUserId: mentionedUserId,
            actorUserId: user.id,
            typeId: NOTIFICATION_TYPE_ID.COMMENT_MENTION,
            contentId: discussion.contentId,
            replyId: discussion.id,
            discussionCommentId: updated.id,
          });
        }
      }
    }

    // We can compute the score and return
    return {
      ...updated,
      score: updated.upvoteCount - updated.downvoteCount,
      mentions: updated.mentions.map((mention) => mention.mentionedUser),
    } as any;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async reportDiscussionComment(
    @Arg("id", () => Int) id: number,
    @Arg("reason", () => String) reason: string,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const comment = await prisma.discussionComment.findUnique({
      where: { id },
    });

    if (!comment) throw new Error("Comment not found");

    await prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: "discussionComment",
        targetId: String(id),
        reason,
      },
    });

    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async deleteDiscussionComment(
    @Arg("id", () => Int) id: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<boolean> {
    if (!user) throw new Error("Not authenticated");

    const comment = await prisma.discussionComment.findUnique({
      where: { id },
    });

    if (!comment) throw new Error("Comment not found");
    if (comment.authorId !== user.id && !user.isAdmin) {
      throw new Error("Not authorized");
    }

    // Helper function to recursively find all reply IDs
    const getAllReplyIds = async (parentId: number): Promise<number[]> => {
      const replies = await prisma.discussionComment.findMany({
        where: { parentId, isDeleted: false },
        select: { id: true },
      });

      let allIds: number[] = [];
      for (const reply of replies) {
        allIds.push(reply.id);
        const childIds = await getAllReplyIds(reply.id);
        allIds = allIds.concat(childIds);
      }
      return allIds;
    };

    // Get all nested reply IDs
    const replyIdsToDelete = await getAllReplyIds(id);
    const allIdsToDelete = [id, ...replyIdsToDelete];

    // Soft delete comment and all replies
    await prisma.discussionComment.updateMany({
      where: { id: { in: allIdsToDelete } },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    // Update discussion comment count removing the count of all nested comments
    await prisma.discussion.update({
      where: { id: comment.discussionId },
      data: { commentCount: { decrement: allIdsToDelete.length } },
    });

    return true;
  }

  @Authorized()
  @Mutation(() => DiscussionComment)
  async voteDiscussionComment(
    @Arg("id", () => Int) id: number,
    @Arg("voteType", () => Int) voteType: number,
    @Ctx() { user, prisma }: GraphQLContext,
  ): Promise<DiscussionComment> {
    if (!user) throw new Error("Not authenticated");
    if (voteType !== 1 && voteType !== -1 && voteType !== 0) {
      throw new Error("Invalid vote type");
    }

    const comment = await prisma.discussionComment.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!comment) throw new Error("Comment not found");

    if (comment.authorId === user.id) {
      throw new Error("Kendi yorumunuza oy veremezsiniz");
    }

    const { upvoteChange, downvoteChange } = await processVote(
      prisma,
      "discussionCommentVote",
      "commentId",
      id,
      user.id,
      voteType,
    );

    const updated = await prisma.discussionComment.update({
      where: { id },
      data: {
        upvoteCount: { increment: upvoteChange },
        downvoteCount: { increment: downvoteChange },
      },
      include: { author: true },
    });

    // Send notification for votes
    if ((voteType === 1 || voteType === -1) && comment.authorId !== user.id) {
      try {
        const { createNotification } = await import("../lib/notifications");
        const { NOTIFICATION_TYPE_ID } =
          await import("../lib/notificationTypes");

        // Get the discussion to find contentId
        const discussion = await prisma.discussion.findUnique({
          where: { id: comment.discussionId },
          select: { contentId: true },
        });

        await createNotification(prisma, {
          recipientUserId: comment.authorId,
          actorUserId: user.id,
          typeId:
            voteType === 1
              ? NOTIFICATION_TYPE_ID.COMMENT_LIKED
              : NOTIFICATION_TYPE_ID.COMMENT_DISLIKED,
          contentId: discussion?.contentId || null,
          discussionCommentId: comment.id,
        });
        console.log(
          `✅ [Discussion] Notification sent for vote on comment ${id}`,
        );
      } catch (notifError) {
        console.error(
          `❌ [Discussion] Comment vote notification error:`,
          notifError,
        );
      }
    }

    return {
      ...updated,
      score: updated.upvoteCount - updated.downvoteCount,
      userVote: voteType === 0 ? null : voteType,
      replies: [],
    } as any;
  }
}
