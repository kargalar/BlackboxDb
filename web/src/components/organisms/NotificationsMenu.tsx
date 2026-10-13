'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import PosterCard from '@/components/atoms/PosterCard';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  getNotificationHref,
  markAllAsRead,
  renderNotificationSecondaryText,
  renderNotificationText,
  type NotificationTranslator,
  type Notification,
} from '@/services/graphql/notificationService';

export default function NotificationsMenu() {
  const t = useTranslations('Notifications');
  const translateNotification: NotificationTranslator = (key, values) => t(key, values as never);
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notificationState, setNotificationState] = useState<{
    userId: string | null;
    items: Notification[];
    unread: number;
    loading: boolean;
  }>({ userId: null, items: [], unread: 0, loading: false });
  const latestRequestIdRef = useRef(0);
  const currentUserIdRef = useRef(user?.id ?? null);
  const menuRef = useRef<HTMLDivElement>(null);
  currentUserIdRef.current = user?.id ?? null;

  const isCurrentUser = notificationState.userId === (user?.id ?? null);
  const items = isCurrentUser ? notificationState.items : [];
  const unread = isCurrentUser ? notificationState.unread : 0;
  const loading = !isCurrentUser || notificationState.loading;

  const load = useCallback(async () => {
    if (!user) {
      setNotificationState({ userId: null, items: [], unread: 0, loading: false });
      return;
    }

    const userId = user.id;
    const requestId = ++latestRequestIdRef.current;
    setNotificationState((previous) => ({
      userId,
      items: previous.userId === userId ? previous.items : [],
      unread: previous.userId === userId ? previous.unread : 0,
      loading: true,
    }));

    try {
      const [{ data, error }, unreadResult] = await Promise.all([
        fetchNotifications(20, userId),
        fetchUnreadNotificationCount(userId),
      ]);
      if (requestId !== latestRequestIdRef.current || currentUserIdRef.current !== userId) return;
      if (error) {
        toast.error(t('errors.loadFailed'));
        return;
      }
      setNotificationState({
        userId,
        items: data,
        unread: unreadResult.error
          ? data.filter((notification) => !notification.readAt).length
          : unreadResult.count,
        loading: false,
      });
    } catch {
      if (requestId === latestRequestIdRef.current && currentUserIdRef.current === userId) {
        toast.error(t('errors.loadFailed'));
      }
    } finally {
      if (requestId === latestRequestIdRef.current && currentUserIdRef.current === userId) {
        setNotificationState((previous) =>
          previous.userId === userId ? { ...previous, loading: false } : previous
        );
      }
    }
  }, [t, user]);

  useEffect(() => {
    void load();
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0 && user) {
      const userId = user.id;
      const { success } = await markAllAsRead(userId);
      if (!success) {
        toast.error(t('errors.markReadFailed'));
        return;
      }
      if (currentUserIdRef.current !== userId) return;

      latestRequestIdRef.current += 1;
      const readAt = new Date().toISOString();
      setNotificationState((previous) =>
        previous.userId === userId
          ? {
              ...previous,
              unread: 0,
              items: previous.items.map((notification) => ({
                ...notification,
                readAt: notification.readAt ?? readAt,
              })),
            }
          : previous
      );
    }
  };

  const handleClick = (n: Notification) => {
    const href = getNotificationHref(n, user?.username);
    if (!href) return;

    setOpen(false);
    router.push(href as any);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('title')}
        aria-expanded={open}
        aria-controls="notifications-menu"
      >
        <svg
          className="h-5 w-5 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notifications-menu"
          aria-label={t('title')}
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-semibold">{t('title')}</span>
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={load}
              disabled={loading}
            >
              {t('refresh')}
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.length === 0 && (
              <div className="p-3 text-sm text-gray-500">{t('noNotifications')}</div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 ${!n.readAt ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 flex-shrink-0">
                    <PosterCard
                      src={n.actor?.picturePath ?? undefined}
                      alt={n.actor?.username ? `${n.actor.username} avatar` : t('userAvatar')}
                      aspectClassName="aspect-square"
                      hoverZoom={false}
                      useNextImage={false}
                      className="h-8 w-8 rounded-full border-0"
                      imageClassName="rounded-full"
                      fallback={
                        <div className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                          {(n.actor?.username || 'U').slice(0, 1).toUpperCase()}
                        </div>
                      }
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-gray-100">
                      {renderNotificationText(n, translateNotification)}
                    </div>
                    {renderNotificationSecondaryText(n) && (
                      <div className="mt-1 text-xs text-gray-500 whitespace-pre-wrap">
                        {renderNotificationSecondaryText(n)}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {n.content?.posterUrl && (
                    <div className="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-white/10">
                      <Image
                        src={n.content.posterUrl}
                        alt={n.content.title || ''}
                        width={40}
                        height={56}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
