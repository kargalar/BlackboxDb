'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import PosterCard from '@/components/atoms/PosterCard';
import {
  Heart,
  UserPlus,
  CheckCircle,
  XCircle,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Gift,
  MessageSquare,
  Reply,
  Tv,
  AtSign,
  BellRing,
  Settings,
} from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  getNotificationHref,
  getNotificationType,
  markAllAsRead,
  markNotificationRead,
  renderNotificationSecondaryText,
  renderNotificationText,
  type Notification,
  type NotificationTranslator,
  type NotificationType,
} from '@/services/graphql/notificationService';
import { refreshNotificationBadge } from '@/features/notifications/hooks/useUnreadNotificationsCount';
import { useTranslations, useFormatter } from 'next-intl';

const EMPTY_NOTIFICATIONS: Notification[] = [];

/* ─── Relative time ─── */
function timeAgo(dateStr: string, format: any, now: Date): string {
  return format.relativeTime(new Date(dateStr), now);
}

/* ─── Notification type → icon + colour ─── */
type IconStyle = { icon: React.ReactNode; bg: string };

function getNotificationIcon(typeId: number): IconStyle {
  const type = getNotificationType(typeId);
  const s = 14;
  switch (type) {
    case 'REVIEW_LIKED':
      return { icon: <Heart size={s} />, bg: 'bg-pink-500/20 text-pink-400' };
    case 'FOLLOWED_YOU':
      return { icon: <UserPlus size={s} />, bg: 'bg-blue-500/20 text-blue-400' };
    case 'CONTENT_APPROVED':
      return { icon: <CheckCircle size={s} />, bg: 'bg-green-500/20 text-green-400' };
    case 'CONTENT_REJECTED':
      return { icon: <XCircle size={s} />, bg: 'bg-red-500/20 text-red-400' };
    case 'COMMENT_REMOVED':
      return { icon: <Trash2 size={s} />, bg: 'bg-orange-500/20 text-orange-400' };
    case 'COMMENT_LIKED':
      return { icon: <ThumbsUp size={s} />, bg: 'bg-pink-500/20 text-pink-400' };
    case 'COMMENT_DISLIKED':
      return { icon: <ThumbsDown size={s} />, bg: 'bg-rose-500/20 text-rose-400' };
    case 'COMMENT_REPLIED':
      return { icon: <MessageCircle size={s} />, bg: 'bg-cyan-500/20 text-cyan-400' };
    case 'RECOMMENDATION_THANKED':
      return { icon: <Gift size={s} />, bg: 'bg-purple-500/20 text-purple-400' };
    case 'DISCUSSION_REPLY':
      return { icon: <MessageSquare size={s} />, bg: 'bg-indigo-500/20 text-indigo-400' };
    case 'DISCUSSION_COMMENT_REPLY':
      return { icon: <Reply size={s} />, bg: 'bg-indigo-500/20 text-indigo-400' };
    case 'NEW_SEASON_ADDED':
      return { icon: <Tv size={s} />, bg: 'bg-emerald-500/20 text-emerald-400' };
    case 'COMMENT_MENTION':
      return { icon: <AtSign size={s} />, bg: 'bg-violet-500/20 text-violet-400' };
    case 'CONTENT_RELEASED':
      return { icon: <BellRing size={s} />, bg: 'bg-amber-500/20 text-amber-400' };
    case 'ROLE_GRANTED':
      return { icon: <UserPlus size={s} />, bg: 'bg-sky-500/20 text-sky-400' };
    default:
      return { icon: <MessageCircle size={s} />, bg: 'bg-gray-500/20 text-gray-400' };
  }
}

/* ─── Label for notification type ─── */
function getNotificationLabel(typeId: number, t: any): string {
  const type = getNotificationType(typeId);
  switch (type) {
    case 'REVIEW_LIKED':
      return t('labels.reviewLiked');
    case 'FOLLOWED_YOU':
      return t('labels.followedYou');
    case 'CONTENT_APPROVED':
      return t('labels.contentApproved');
    case 'CONTENT_REJECTED':
      return t('labels.contentRejected');
    case 'COMMENT_REMOVED':
      return t('labels.commentRemoved');
    case 'COMMENT_LIKED':
      return t('labels.commentLiked');
    case 'COMMENT_DISLIKED':
      return t('labels.commentDisliked');
    case 'COMMENT_REPLIED':
      return t('labels.commentReplied');
    case 'RECOMMENDATION_THANKED':
      return t('labels.recommendationThanked');
    case 'DISCUSSION_REPLY':
      return t('labels.discussionReply');
    case 'DISCUSSION_COMMENT_REPLY':
      return t('labels.discussionCommentReply');
    case 'NEW_SEASON_ADDED':
      return t('labels.newSeasonAdded');
    case 'COMMENT_MENTION':
      return t('labels.commentMention');
    case 'CONTENT_RELEASED':
      return t('labels.contentReleased');
    case 'ROLE_GRANTED':
      return t('labels.roleGranted');
    default:
      return t('labels.default');
  }
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTranslations('Notifications');
  const format = useFormatter();
  const translateNotification: NotificationTranslator = (key, values) => t(key, values as never);
  const [notificationState, setNotificationState] = useState<{
    userId: string | null;
    items: Notification[];
    unreadCount: number;
    loading: boolean;
  }>({ userId: null, items: [], unreadCount: 0, loading: false });
  const latestRequestIdRef = useRef(0);
  const userId = user?.id ?? null;
  const currentUserIdRef = useRef(userId);
  currentUserIdRef.current = userId;
  const isCurrentUser = notificationState.userId === userId;
  const items = isCurrentUser ? notificationState.items : EMPTY_NOTIFICATIONS;
  const unreadCount = isCurrentUser ? notificationState.unreadCount : 0;
  const loading = userId !== null && (!isCurrentUser || notificationState.loading);
  const now = new Date();

  const load = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;
    if (!userId) {
      setNotificationState({ userId: null, items: [], unreadCount: 0, loading: false });
      return;
    }

    setNotificationState((previous) => ({
      userId,
      items: previous.userId === userId ? previous.items : [],
      unreadCount: previous.userId === userId ? previous.unreadCount : 0,
      loading: true,
    }));

    try {
      const [result, unreadResult] = await Promise.all([
        fetchNotifications(50, userId),
        fetchUnreadNotificationCount(userId),
      ]);
      if (requestId !== latestRequestIdRef.current || currentUserIdRef.current !== userId) return;
      if (result.error) {
        toast.error(t('errors.loadFailed'));
        return;
      }
      setNotificationState({
        userId,
        items: result.data,
        unreadCount: unreadResult.error
          ? result.data.filter((notification) => !notification.readAt).length
          : unreadResult.count,
        loading: false,
      });
    } catch (error) {
      if (requestId === latestRequestIdRef.current && currentUserIdRef.current === userId) {
        console.error('Failed to load notifications:', error);
        toast.error(t('errors.loadFailed'));
      }
    } finally {
      if (requestId === latestRequestIdRef.current && currentUserIdRef.current === userId) {
        setNotificationState((previous) =>
          previous.userId === userId ? { ...previous, loading: false } : previous
        );
      }
    }
  }, [t, userId]);

  useEffect(() => {
    void load();
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, [load]);

  const handleMarkAll = async () => {
    if (!user) return;

    const targetUserId = user.id;
    const result = await markAllAsRead(targetUserId);
    if (result.success && currentUserIdRef.current === targetUserId) {
      latestRequestIdRef.current += 1;
      const readAt = new Date().toISOString();
      setNotificationState((previous) =>
        previous.userId === targetUserId
          ? {
              ...previous,
              loading: false,
              unreadCount: 0,
              items: previous.items.map((notification) => ({
                ...notification,
                readAt: notification.readAt ?? readAt,
              })),
            }
          : previous
      );
      refreshNotificationBadge();
    } else if (currentUserIdRef.current === targetUserId) {
      toast.error(t('errors.markReadFailed'));
    }
  };

  const handleItemClick = async (n: Notification) => {
    if (!user) return;

    const targetUserId = user.id;

    if (!n.readAt) {
      const notificationId = Number(n.id);
      if (Number.isNaN(notificationId)) {
        console.warn('⚠️ Notification id is not numeric, cannot mark read:', n.id);
        toast.error(t('errors.markReadFailed'));
      } else {
        const result = await markNotificationRead(notificationId, targetUserId);
        if (result.success && currentUserIdRef.current === targetUserId) {
          latestRequestIdRef.current += 1;
          const readAt = new Date().toISOString();
          setNotificationState((previous) =>
            previous.userId === targetUserId
              ? {
                  ...previous,
                  loading: false,
                  unreadCount: previous.items.some(
                    (notification) => notification.id === n.id && !notification.readAt
                  )
                    ? Math.max(0, previous.unreadCount - 1)
                    : previous.unreadCount,
                  items: previous.items.map((notification) => {
                    if (notification.id !== n.id || notification.readAt) return notification;
                    return { ...notification, readAt };
                  }),
                }
              : previous
          );
          refreshNotificationBadge();
        } else if (currentUserIdRef.current === targetUserId) {
          toast.error(t('errors.markReadFailed'));
        }
      }
    }

    if (currentUserIdRef.current !== targetUserId) return;
    const href = getNotificationHref(n, user.username);
    if (href) router.push(href as any);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
        <p className="mt-4 text-sm text-gray-400">{t('loginRequired')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-[0_0_10px_rgba(59,130,246,0.35)]">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-40 border border-gray-700/50"
          >
            {loading ? t('loading') : t('refresh')}
          </button>
          <button
            onClick={() => router.push('/settings?tab=notifications')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <Settings size={14} />
            {t('settings')}
          </button>
          <button
            onClick={handleMarkAll}
            disabled={loading || unreadCount === 0}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            {t('markAllAsRead')}
          </button>
        </div>
      </div>

      {/* ─── List ─── */}
      <div className="mt-6 space-y-2">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <p className="text-xs text-gray-500 font-medium">{t('loadingNotifications')}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/20 p-12 text-center">
            <p className="text-sm text-gray-500">{t('noNotifications')}</p>
          </div>
        ) : (
          items.map((n) => {
            const isUnread = !n.readAt;
            const { icon, bg } = getNotificationIcon(n.typeId);
            const label = getNotificationLabel(n.typeId, t);
            const secondaryText = renderNotificationSecondaryText(n);

            return (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`group relative w-full text-left rounded-xl border transition-all duration-200 ${
                  isUnread
                    ? 'border-blue-500/20 bg-blue-500/[0.04] hover:bg-blue-500/[0.08] hover:border-blue-500/30'
                    : 'border-gray-800/60 bg-surface-page hover:bg-surface-panel hover:border-gray-700/80'
                }`}
              >
                {/* Unread accent */}
                {isUnread && (
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]" />
                )}

                <div className="flex items-start gap-4 p-4">
                  {/* Avatar with type icon badge */}
                  <div className="relative flex-shrink-0">
                    <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-gray-800/80">
                      <PosterCard
                        src={n.actor?.picturePath ?? undefined}
                        alt={n.actor?.username ? `${n.actor.username} avatar` : t('userAvatar')}
                        aspectClassName="aspect-square"
                        hoverZoom={false}
                        useNextImage={false}
                        className="h-11 w-11 rounded-full border-0"
                        imageClassName="rounded-full"
                        fallback={
                          <div className="h-full w-full rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-400">
                            {(n.actor?.username || 'U').slice(0, 1).toUpperCase()}
                          </div>
                        }
                      />
                    </div>
                    {/* Icon badge */}
                    <div
                      className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-[#0a0a0a] ${bg}`}
                    >
                      {icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Type label + time */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest ${bg.replace(/bg-\S+/, '').trim()}`}
                      >
                        {label}
                      </span>
                      <span className="text-[10px] text-gray-600">·</span>
                      <span className="text-[10px] text-gray-500">
                        {timeAgo(n.createdAt, format, now)}
                      </span>
                    </div>

                    {/* Notification text */}
                    <p
                      className={`text-sm leading-relaxed ${isUnread ? 'text-gray-100 font-medium' : 'text-gray-300'}`}
                    >
                      {renderNotificationText(n, translateNotification)}
                    </p>

                    {secondaryText && (
                      <p className="text-xs leading-relaxed text-gray-400 whitespace-pre-wrap">
                        {secondaryText}
                      </p>
                    )}

                    {/* Content title if available */}
                    {n.content?.title && (
                      <p className="text-xs text-gray-500 truncate">{n.content.title}</p>
                    )}
                  </div>

                  {/* Poster image */}
                  {n.content?.posterUrl && (
                    <div className="flex-shrink-0 w-12 h-[4.5rem] rounded-lg overflow-hidden bg-gray-800/50 ring-1 ring-white/5 transition-transform group-hover:scale-105">
                      <Image
                        src={n.content.posterUrl}
                        alt={n.content.title || ''}
                        width={48}
                        height={72}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
