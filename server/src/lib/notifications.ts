import type { Prisma, PrismaClient } from '@prisma/client';
import type { NotificationTypeId } from './notificationTypes';
import { NOTIFICATION_TYPE_ID } from './notificationTypes';

type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  typeId: NotificationTypeId;
  message?: string | null;
  contentId?: string | null;
  replyId?: number | null;
  discussionCommentId?: number | null;
};

type PrismaLike = PrismaClient | Prisma.TransactionClient;

async function recipientAllowsNotification(
  prisma: PrismaLike,
  recipientUserId: string,
  typeId: NotificationTypeId,
) {
  const recipient = await prisma.appUser.findUnique({
    where: { id: recipientUserId },
    select: {
      notifyOnFollows: true,
      notifyOnContentRequestUpdates: true,
      notifyOnCommentVotes: true,
      notifyOnCommentReplies: true,
      notifyOnMentions: true,
      notifyOnRecommendations: true,
      notifyOnNewSeasons: true,
      notifyOnContentReleased: true,
      notifyOnRoleUpdates: true,
    },
  });

  if (!recipient) return false;

  switch (typeId) {
    case NOTIFICATION_TYPE_ID.FOLLOWED_YOU:
      return recipient.notifyOnFollows;
    case NOTIFICATION_TYPE_ID.CONTENT_REQUEST_APPROVED:
    case NOTIFICATION_TYPE_ID.CONTENT_REQUEST_REJECTED:
    case NOTIFICATION_TYPE_ID.CONTRIBUTION_APPROVED:
    case NOTIFICATION_TYPE_ID.CONTRIBUTION_REJECTED:
    case NOTIFICATION_TYPE_ID.REPORT_APPROVED:
    case NOTIFICATION_TYPE_ID.REPORT_REJECTED:
      return recipient.notifyOnContentRequestUpdates;
    case NOTIFICATION_TYPE_ID.REVIEW_LIKED:
    case NOTIFICATION_TYPE_ID.COMMENT_LIKED:
    case NOTIFICATION_TYPE_ID.COMMENT_DISLIKED:
      return recipient.notifyOnCommentVotes;
    case NOTIFICATION_TYPE_ID.COMMENT_REPLIED:
    case NOTIFICATION_TYPE_ID.DISCUSSION_REPLY:
    case NOTIFICATION_TYPE_ID.DISCUSSION_COMMENT_REPLY:
      return recipient.notifyOnCommentReplies;
    case NOTIFICATION_TYPE_ID.COMMENT_MENTION:
      return recipient.notifyOnMentions;
    case NOTIFICATION_TYPE_ID.RECOMMENDATION_THANKED:
      return recipient.notifyOnRecommendations;
    case NOTIFICATION_TYPE_ID.NEW_SEASON_ADDED:
      return recipient.notifyOnNewSeasons;
    case NOTIFICATION_TYPE_ID.CONTENT_RELEASED:
      return recipient.notifyOnContentReleased;
    case NOTIFICATION_TYPE_ID.ROLE_GRANTED:
      return recipient.notifyOnRoleUpdates;
    default:
      return true;
  }
}

export async function createNotification(prisma: PrismaLike, input: CreateNotificationInput) {
  try {
    if (!input.recipientUserId) return;
    if (input.actorUserId && input.actorUserId === input.recipientUserId) return;

    const isAllowed = await recipientAllowsNotification(
      prisma,
      input.recipientUserId,
      input.typeId,
    );
    if (!isAllowed) return;

    await prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId ?? null,
        typeId: input.typeId,
        message: input.message ?? null,
        contentId: input.contentId ?? null,
        replyId: input.replyId ?? null,
        discussionCommentId: input.discussionCommentId ?? null,
      },
    });

    console.log('🔔 Notification created:', {
      recipientUserId: input.recipientUserId,
      actorUserId: input.actorUserId ?? null,
      typeId: input.typeId,
      message: input.message ?? null,
      contentId: input.contentId ?? null,
      replyId: input.replyId ?? null,
      discussionCommentId: input.discussionCommentId ?? null,
    });
  } catch (error) {
    console.error('❌ Failed to create notification:', { input, error });
  }
}
