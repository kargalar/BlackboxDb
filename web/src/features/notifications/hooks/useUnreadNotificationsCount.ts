'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUnreadNotificationCount } from '@/services/graphql/notificationService';

/** Custom event name used to trigger badge refresh from any page */
export const NOTIFICATION_BADGE_REFRESH_EVENT = 'notification-badge-refresh';

/**
 * Call this from any page/component after an action that changes unread count
 * (e.g. marking notification read, say thanks, mark all read).
 */
export function refreshNotificationBadge() {
  window.dispatchEvent(new Event(NOTIFICATION_BADGE_REFRESH_EVENT));
}

export function useUnreadNotificationsCount(pollMs: number = 30000) {
  const { user } = useAuth();
  const [countState, setCountState] = useState({ userId: null as string | null, count: 0 });
  const latestRequestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!user) return;

    const requestId = ++latestRequestIdRef.current;
    try {
      const result = await fetchUnreadNotificationCount(user.id);
      if (requestId === latestRequestIdRef.current && !result.error) {
        setCountState({ userId: user.id, count: result.count });
      }
    } catch {
      // Keep the last known count after transient request failures.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      latestRequestIdRef.current += 1;
      return;
    }

    // State updates happen only after the awaited notification request returns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    // Poll periodically
    const id = window.setInterval(() => void load(), pollMs);

    // Listen for manual refresh events from other pages
    const handleRefresh = () => void load();
    window.addEventListener(NOTIFICATION_BADGE_REFRESH_EVENT, handleRefresh);

    return () => {
      latestRequestIdRef.current += 1;
      window.clearInterval(id);
      window.removeEventListener(NOTIFICATION_BADGE_REFRESH_EVENT, handleRefresh);
    };
  }, [user, pollMs, load]);

  return {
    count: user && countState.userId === user.id ? countState.count : 0,
    refresh: load,
  };
}
