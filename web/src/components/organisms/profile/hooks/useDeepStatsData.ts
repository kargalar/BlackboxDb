/**
 * useDeepStatsData — Fetches rich profile deep statistics from backend.
 * Separates data fetching (backend) from client-side computation (useStatsTabData).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ProfileDeepStats, ContentTypeFilterKey, TimeRangeKey } from '../StatsTabTypes';
import { emptyDeepStats } from '../StatsTabTypes';
import { fetchDeepStats } from '@/services/database/statsService';
import { getTimeRangeStart } from '../statsTabUtils';

interface UseDeepStatsDataParams {
  username: string;
  contentTypeFilter: ContentTypeFilterKey;
  timeRange: TimeRangeKey;
}

interface UseDeepStatsDataResult {
  deepStats: ProfileDeepStats;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const CONTENT_TYPE_ID_MAP: Record<ContentTypeFilterKey, number | undefined> = {
  all: undefined,
  movies: 1,
  tv: 2,
  games: 3,
  books: 4,
};

interface DeepStatsResult {
  requestKey: string;
  stats: ProfileDeepStats;
  error: string | null;
}

export function useDeepStatsData({
  username,
  contentTypeFilter,
  timeRange,
}: UseDeepStatsDataParams): UseDeepStatsDataResult {
  const [result, setResult] = useState<DeepStatsResult | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const requestKey = JSON.stringify([username, contentTypeFilter, timeRange, fetchKey]);
  const currentResult = result?.requestKey === requestKey ? result : null;
  const emptyStats = useMemo(() => emptyDeepStats(), []);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!username) return;

    const contentTypeId = CONTENT_TYPE_ID_MAP[contentTypeFilter];
    const startDate = getTimeRangeStart(timeRange);

    let cancelled = false;

    fetchDeepStats(username, contentTypeId, timeRange === 'all' ? undefined : startDate)
      .then((stats) => {
        if (cancelled) return;
        setResult({ requestKey, stats, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ [useDeepStatsData] Error:', msg);
        setResult({ requestKey, stats: emptyStats, error: msg });
      });

    return () => {
      cancelled = true;
    };
  }, [username, contentTypeFilter, timeRange, fetchKey, requestKey, emptyStats]);

  return {
    deepStats: currentResult?.stats ?? emptyStats,
    loading: Boolean(username) && currentResult === null,
    error: currentResult?.error ?? null,
    refetch,
  };
}
