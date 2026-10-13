import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';

export type NotificationType =
  | 'REVIEW_LIKED'
  | 'FOLLOWED_YOU'
  | 'CONTENT_APPROVED'
  | 'CONTENT_REJECTED'
  | 'COMMENT_REMOVED'
  | 'COMMENT_LIKED'
  | 'COMMENT_DISLIKED'
  | 'COMMENT_REPLIED'
  | 'RECOMMENDATION_THANKED'
  | 'DISCUSSION_REPLY'
  | 'DISCUSSION_COMMENT_REPLY'
  | 'NEW_SEASON_ADDED'
  | 'COMMENT_MENTION'
  | 'CONTENT_RELEASED'
  | 'ROLE_GRANTED'
  | 'CONTRIBUTION_APPROVED'
  | 'CONTRIBUTION_REJECTED'
  | 'REPORT_APPROVED'
  | 'REPORT_REJECTED';

export interface Notification {
  id: string;
  recipientUserId: string;
  actorUserId?: string | null;
  typeId: number;
  message?: string | null;
  contentId?: string | null;
  replyId: number | null;
  discussionCommentId?: number | null;
  commentText?: string | null;
  createdAt: string;
  readAt: string | null;
  actor?: {
    username: string;
    picturePath: string | null;
  };
  content?: {
    id: string;
    title: string;
    contentTypeId: number;
    posterUrl?: string | null;
  };
}

export type NotificationMessageKey =
  | 'messages.reviewLiked'
  | 'messages.followedYou'
  | 'messages.contentApproved'
  | 'messages.contentRejected'
  | 'messages.commentRemoved'
  | 'messages.commentDisliked'
  | 'messages.commentReplied'
  | 'messages.recommendationThanked'
  | 'messages.discussionReply'
  | 'messages.discussionCommentReply'
  | 'messages.newSeasonAdded'
  | 'messages.newSeasonAddedWithMessage'
  | 'messages.commentMention'
  | 'messages.contentReleased'
  | 'messages.roleGranted'
  | 'messages.roleGrantedWithMessage'
  | 'messages.contributionApproved'
  | 'messages.contributionRejected'
  | 'messages.reportApproved'
  | 'messages.reportRejected'
  | 'messages.default';

export type NotificationMessageValues = {
  actorName?: string;
  contentTitle?: string;
  message?: string;
};

export type NotificationTranslator = (
  key: NotificationMessageKey,
  values?: NotificationMessageValues
) => string;

const TYPE_MAP: Record<number, NotificationType> = {
  1: 'REVIEW_LIKED',
  2: 'FOLLOWED_YOU',
  3: 'CONTENT_APPROVED',
  4: 'CONTENT_REJECTED',
  5: 'COMMENT_REMOVED',
  6: 'COMMENT_LIKED',
  7: 'COMMENT_REPLIED',
  8: 'RECOMMENDATION_THANKED',
  9: 'DISCUSSION_REPLY',
  10: 'DISCUSSION_COMMENT_REPLY',
  11: 'NEW_SEASON_ADDED',
  12: 'COMMENT_MENTION',
  13: 'CONTENT_RELEASED',
  14: 'ROLE_GRANTED',
  15: 'COMMENT_DISLIKED',
  16: 'CONTRIBUTION_APPROVED',
  17: 'CONTRIBUTION_REJECTED',
  18: 'REPORT_APPROVED',
  19: 'REPORT_REJECTED',
};

export function getNotificationType(typeId: number): NotificationType | undefined {
  return TYPE_MAP[typeId];
}

export function getNotificationHref(notification: Notification, username?: string): string | null {
  const type = getNotificationType(notification.typeId);
  const actorUsername = notification.actor?.username;

  if ((type === 'FOLLOWED_YOU' || type === 'RECOMMENDATION_THANKED') && actorUsername) {
    return `/profile/${actorUsername}`;
  }

  if (
    (type === 'DISCUSSION_REPLY' ||
      type === 'DISCUSSION_COMMENT_REPLY' ||
      type === 'COMMENT_MENTION') &&
    notification.replyId
  ) {
    const hash = notification.discussionCommentId
      ? `#comment-${notification.discussionCommentId}`
      : '';
    return `/discussion/${notification.replyId}${hash}`;
  }

  if ((type === 'CONTENT_APPROVED' || type === 'CONTENT_REJECTED') && username) {
    return `/content-request/${username}`;
  }

  if (
    type === 'NEW_SEASON_ADDED' ||
    type === 'CONTENT_RELEASED' ||
    type === 'REVIEW_LIKED' ||
    type === 'COMMENT_LIKED' ||
    type === 'COMMENT_DISLIKED' ||
    type === 'COMMENT_REPLIED' ||
    type === 'COMMENT_REMOVED'
  ) {
    const typeById: Record<number, string> = {
      1: 'movie',
      2: 'tv',
      3: 'game',
      4: 'book',
      5: 'music',
    };
    const contentId = notification.content?.id || notification.contentId;
    const contentType = notification.content?.contentTypeId;
    return contentId && contentType && typeById[contentType]
      ? `/content/${typeById[contentType]}/${contentId}`
      : null;
  }

  return null;
}

const GET_NOTIFICATIONS = gql`
  query GetNotifications($userId: String!, $limit: Int!) {
    notifications(userId: $userId, limit: $limit) {
      id
      recipientUserId
      actorUserId
      typeId
      message
      contentId
      replyId
      discussionCommentId
      commentText
      createdAt
      readAt
      actor {
        username
        picturePath
      }
      content {
        id
        title
        contentTypeId
        posterUrl
      }
    }
  }
`;

const MARK_NOTIFICATIONS_READ = gql`
  mutation MarkNotificationsRead($userId: String!) {
    markNotificationsRead(userId: $userId)
  }
`;

const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: Int!, $userId: String!) {
    markNotificationRead(notificationId: $notificationId, userId: $userId)
  }
`;

const GET_UNREAD_COUNT = gql`
  query GetUnreadNotificationCount($userId: String!) {
    unreadNotificationCount(userId: $userId)
  }
`;

export async function fetchNotifications(
  limit: number = 20,
  userId?: string
): Promise<{ data: Notification[]; error?: any }> {
  if (!userId) return { data: [] };

  try {
    console.log('Fetching notifications via GraphQL:', { userId, limit });
    const result = await apolloClient.query<{ notifications: Notification[] }>({
      query: GET_NOTIFICATIONS,
      variables: { userId, limit },
      fetchPolicy: 'network-only',
    });

    const notifications = result.data?.notifications ?? [];
    console.log('Notifications fetched:', notifications.length);
    return { data: notifications };
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return { data: [], error };
  }
}

export async function markAllAsRead(userId?: string): Promise<{ success: boolean; error?: any }> {
  if (!userId) return { success: false, error: new Error('Missing userId') };

  try {
    console.log('Marking all notifications read via GraphQL:', { userId });
    const { data } = await apolloClient.mutate<{ markNotificationsRead: boolean }>({
      mutation: MARK_NOTIFICATIONS_READ,
      variables: { userId },
    });
    if (!data?.markNotificationsRead) return { success: false };
    console.log('All notifications marked read');
    return { success: true };
  } catch (error) {
    console.error('Failed to mark all notifications read:', error);
    return { success: false, error };
  }
}

export async function markNotificationRead(
  notificationId: number,
  userId?: string
): Promise<{ success: boolean; error?: any }> {
  if (!userId) return { success: false, error: new Error('Missing userId') };

  try {
    console.log('Marking notification read via GraphQL:', { notificationId, userId });
    const { data } = await apolloClient.mutate<{ markNotificationRead: boolean }>({
      mutation: MARK_NOTIFICATION_READ,
      variables: { notificationId, userId },
    });
    if (!data?.markNotificationRead) return { success: false };
    console.log('Notification marked read');
    return { success: true };
  } catch (error) {
    console.error('Failed to mark notification read:', error);
    return { success: false, error };
  }
}

export async function fetchUnreadNotificationCount(
  userId?: string
): Promise<{ count: number; error?: any }> {
  if (!userId) return { count: 0 };

  try {
    console.log('Fetching unread notification count via GraphQL:', { userId });
    const result = await apolloClient.query<{ unreadNotificationCount: number }>({
      query: GET_UNREAD_COUNT,
      variables: { userId },
      fetchPolicy: 'network-only',
    });

    const count = result.data?.unreadNotificationCount ?? 0;
    console.log('Unread notification count:', count);
    return { count };
  } catch (error) {
    console.error('Failed to fetch unread notification count:', error);
    return { count: 0, error };
  }
}

export function renderNotificationText(
  n: Notification,
  t: NotificationTranslator
): string {
  const type = TYPE_MAP[n.typeId];
  const actorName = n.actor?.username || '';
  const contentTitle = n.content?.title || '';
  const values = { actorName, contentTitle };

  switch (type) {
    case 'REVIEW_LIKED':
    case 'COMMENT_LIKED':
      return t('messages.reviewLiked', values);
    case 'FOLLOWED_YOU':
      return t('messages.followedYou', values);
    case 'CONTENT_APPROVED':
      return t('messages.contentApproved', values);
    case 'CONTENT_REJECTED':
      return t('messages.contentRejected', values);
    case 'COMMENT_REMOVED':
      return t('messages.commentRemoved');
    case 'COMMENT_DISLIKED':
      return t('messages.commentDisliked', values);
    case 'COMMENT_REPLIED':
      return t('messages.commentReplied', values);
    case 'RECOMMENDATION_THANKED':
      return t('messages.recommendationThanked', values);
    case 'DISCUSSION_REPLY':
      return n.commentText
        ? `"${n.commentText.slice(0, 80)}${n.commentText.length > 80 ? '...' : ''}"`
        : t('messages.discussionReply', values);
    case 'DISCUSSION_COMMENT_REPLY':
      return n.commentText
        ? `"${n.commentText.slice(0, 80)}${n.commentText.length > 80 ? '...' : ''}"`
        : t('messages.discussionCommentReply', values);
    case 'NEW_SEASON_ADDED':
      return n.message?.trim()
        ? t('messages.newSeasonAddedWithMessage', { ...values, message: n.message.trim() })
        : t('messages.newSeasonAdded', values);
    case 'COMMENT_MENTION':
      return t('messages.commentMention', values);
    case 'CONTENT_RELEASED':
      return t('messages.contentReleased', values);
    case 'ROLE_GRANTED':
      return n.message?.trim()
        ? t('messages.roleGrantedWithMessage', { message: n.message.trim() })
        : t('messages.roleGranted', values);
    case 'CONTRIBUTION_APPROVED':
      return t('messages.contributionApproved');
    case 'CONTRIBUTION_REJECTED':
      return t('messages.contributionRejected');
    case 'REPORT_APPROVED':
      return t('messages.reportApproved');
    case 'REPORT_REJECTED':
      return t('messages.reportRejected');
    default:
      return t('messages.default');
  }
}

export function renderNotificationSecondaryText(n: Notification): string | null {
  const type = TYPE_MAP[n.typeId];

  if (
    (type === 'CONTENT_REJECTED' ||
      type === 'CONTRIBUTION_REJECTED' ||
      type === 'REPORT_REJECTED' ||
      type === 'REPORT_APPROVED') &&
    n.message?.trim()
  ) {
    return n.message.trim();
  }

  return null;
}
