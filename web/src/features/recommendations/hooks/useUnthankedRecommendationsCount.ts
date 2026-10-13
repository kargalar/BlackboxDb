'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUnthankedRecommendationsCount } from '@/services/graphql/recommendations';

export function useUnthankedRecommendationsCount(pollMs: number = 30000) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!user) {
      setCount(0);
      return;
    }

    setLoading(true);
    const result = await fetchUnthankedRecommendationsCount();
    if (!result.error) {
      setCount(result.count);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;

    const id = window.setInterval(load, pollMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, pollMs]);

  return { count, loading, refresh: load };
}
