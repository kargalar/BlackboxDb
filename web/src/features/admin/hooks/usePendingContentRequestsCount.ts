'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listPendingContentRequests } from '@/services/adminService';
import { apolloClient } from '@/lib/apollo-client';
import { GET_PENDING_CONTRIBUTIONS } from '@/services/graphql/contribution';
import { GET_CONTENT_REPORTS } from '@/services/graphql/report';

export const PENDING_CONTENT_REQUESTS_BADGE_REFRESH_EVENT =
  'pending-content-requests-badge-refresh';

export function refreshPendingContentRequestsBadge() {
  window.dispatchEvent(new Event(PENDING_CONTENT_REQUESTS_BADGE_REFRESH_EVENT));
}

export function usePendingContentRequestsCount(pollMs: number = 30000) {
  const { user, isPrivileged } = useAuth();
  const [countState, setCountState] = useState({ userId: null as string | null, count: 0 });
  const [loadingState, setLoadingState] = useState({
    userId: null as string | null,
    loading: false,
  });
  const requestIdRef = useRef(0);
  const requestInFlightRef = useRef<{ userId: string; requestId: number } | null>(null);

  const canView = !!user && (isPrivileged || user.isAdmin || user.isModerator);
  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!canView || !userId || requestInFlightRef.current?.userId === userId) return;

    const requestId = ++requestIdRef.current;
    requestInFlightRef.current = { userId, requestId };
    setLoadingState({ userId, loading: true });

    try {
      const [pendingRequests, pendingContributions, contentReports] = await Promise.all([
        listPendingContentRequests().catch((error) => {
          console.error('Error fetching pending content requests', error);
          return null;
        }),
        apolloClient
          .query<{ getPendingContributions: unknown[] }>({
            query: GET_PENDING_CONTRIBUTIONS,
            fetchPolicy: 'network-only',
          })
          .catch((error) => {
            console.error('Error fetching pending contributions', error);
            return null;
          }),
        apolloClient
          .query<{ getContentReports: unknown[] }>({
            query: GET_CONTENT_REPORTS,
            fetchPolicy: 'network-only',
          })
          .catch((error) => {
            console.error('Error fetching content reports', error);
            return null;
          }),
      ]);

      if (
        !pendingRequests ||
        pendingRequests.error ||
        !pendingContributions ||
        pendingContributions.error ||
        !contentReports ||
        contentReports.error
      ) {
        return;
      }

      if (requestId === requestIdRef.current) {
        const totalCount =
          (pendingRequests.data?.length ?? 0) +
          (pendingContributions?.data?.getPendingContributions?.length ?? 0) +
          (contentReports?.data?.getContentReports?.length ?? 0);
        setCountState({ userId, count: totalCount });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        requestInFlightRef.current = null;
        setLoadingState({ userId, loading: false });
      }
    }
  }, [canView, userId]);

  useEffect(() => {
    load();
    if (!canView) return;

    const intervalId = window.setInterval(load, pollMs);
    const handleRefresh = () => load();

    window.addEventListener(PENDING_CONTENT_REQUESTS_BADGE_REFRESH_EVENT, handleRefresh);

    return () => {
      requestIdRef.current += 1;
      requestInFlightRef.current = null;
      window.clearInterval(intervalId);
      window.removeEventListener(PENDING_CONTENT_REQUESTS_BADGE_REFRESH_EVENT, handleRefresh);
    };
  }, [canView, load, pollMs]);

  return {
    count: canView && countState.userId === userId ? countState.count : 0,
    loading: canView && loadingState.userId === userId && loadingState.loading,
    refresh: load,
  };
}
