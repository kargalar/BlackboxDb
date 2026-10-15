'use client';

import { useEffect, useRef, useState } from 'react';
import { getUserContentLogs } from '@/services/database/contentService';
import { getUserStats } from '@/services/userContentService';
import {
  logContentWatch,
  unlogContentWatch,
  toggleContentFavorite,
  toggleContentWatchlist,
} from '@/services/database/contentService';
import type { UnifiedContent } from '@/types/unified-content';
import type { UserStats } from '@/services/graphql/userContent';
import { useAuth } from '@/contexts/AuthContext';
import { formatDaysUntil } from '@/lib/date-utils';
import { emitDebugEvent } from '@/lib/debug-events';
import type { ItemState, ContentType } from '../types';
import { DEFAULT_ITEM_STATE } from '../types';
import {
  ensureContentSaved,
  fetchMostAnticipatedUpcomingContent,
  fetchPopularContent,
  filterUpcoming,
} from './dashboardDataSource';

const DASHBOARD_TIME_RANGE_STORAGE_KEY = 'bb_dashboard_time_ranges';
// ─── Hook ────────────────────────────────────────────────────

/** Central hook for all dashboard data fetching and user interactions */
export function useDashboardData() {
  const { user } = useAuth();
  const userId = user?.id || null;

  // Content lists
  const [trendingMovies, setTrendingMovies] = useState<UnifiedContent[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<UnifiedContent[]>([]);
  const [trendingTv, setTrendingTv] = useState<UnifiedContent[]>([]);
  const [upcomingTv, setUpcomingTv] = useState<UnifiedContent[]>([]);
  const [popularBooks, setPopularBooks] = useState<UnifiedContent[]>([]);
  const [trendingGames, setTrendingGames] = useState<UnifiedContent[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<UnifiedContent[]>([]);

  // Anticipated content lists
  const [anticipatedMovies, setAnticipatedMovies] = useState<UnifiedContent[]>([]);
  const [anticipatedTv, setAnticipatedTv] = useState<UnifiedContent[]>([]);
  const [anticipatedGames, setAnticipatedGames] = useState<UnifiedContent[]>([]);
  const [anticipatedBooks, setAnticipatedBooks] = useState<UnifiedContent[]>([]);
  const [personalStats, setPersonalStats] = useState<UserStats | null>(null);
  const [personalStatsLoading, setPersonalStatsLoading] = useState(false);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [tvLoading, setTvLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [anticipatedLoading, setAnticipatedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-item interaction state
  const [itemStates, setItemStates] = useState<Record<string | number, ItemState>>({});

  // Content time range filter (per content type)
  const [contentTimeRanges, setContentTimeRanges] = useState<Record<string, string>>(() => {
    const defaults = {
      movie: 'all',
      tv: 'all',
      game: 'all',
      book: 'all',
    };

    if (typeof window === 'undefined') {
      return defaults;
    }

    try {
      const raw = window.localStorage.getItem(DASHBOARD_TIME_RANGE_STORAGE_KEY);
      if (!raw) {
        return defaults;
      }

      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...(parsed && typeof parsed === 'object' ? parsed : {}),
      };
    } catch (error) {
      console.error('Failed to restore dashboard time ranges:', error);
      return defaults;
    }
  });

  const setContentTimeRange = (type: string, range: string) => {
    setContentTimeRanges((prev) => ({ ...prev, [type]: range }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        DASHBOARD_TIME_RANGE_STORAGE_KEY,
        JSON.stringify(contentTimeRanges)
      );
    } catch (error) {
      console.error('Failed to persist dashboard time ranges:', error);
    }
  }, [contentTimeRanges]);

  // Add- modal
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedContentForList, setSelectedContentForList] = useState<UnifiedContent | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('movie');

  // ── Debug effects ──────────────────────────────────────────

  useEffect(() => {
    console.log('🏷️ Dashboard itemStates updated:', itemStates);
  }, [itemStates]);

  useEffect(() => {
    console.log('🏠 DashboardPage mounted (friends activity section enabled)');
  }, []);

  useEffect(() => {
    if (!userId) {
      setPersonalStats(null);
      return;
    }

    let cancelled = false;
    const statsUserId = userId;

    async function loadPersonalStats() {
      try {
        setPersonalStatsLoading(true);
        const { data, error } = await getUserStats(statsUserId);
        if (!cancelled) {
          setPersonalStats(error ? null : data);
        }
      } catch (error) {
        console.error('Dashboard: Failed to load personal stats:', error);
        if (!cancelled) {
          setPersonalStats(null);
        }
      } finally {
        if (!cancelled) {
          setPersonalStatsLoading(false);
        }
      }
    }

    loadPersonalStats();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const collectMissing = (items: UnifiedContent[]) =>
      items
        .filter((i) => !i.releaseDate)
        .slice(0, 10)
        .map((i) => i.id);

    const movieMissing = collectMissing(upcomingMovies);
    const tvMissing = collectMissing(upcomingTv);
    const gameMissing = collectMissing(upcomingGames);

    emitDebugEvent({
      level: 'info',
      scope: 'Dashboard',
      message: 'Yaklaşan içerikler: gün kalan metni hazır',
      data: { movies: upcomingMovies.length, tv: upcomingTv.length, games: upcomingGames.length },
    });

    if (movieMissing.length || tvMissing.length || gameMissing.length) {
      emitDebugEvent({
        level: 'warn',
        scope: 'Dashboard',
        message: 'Bazı yaklaşan içeriklerde releaseDate yok; gün kalan gösterilemedi',
        data: { movieMissing, tvMissing, gameMissing },
      });
    }
  }, [upcomingMovies, upcomingTv, upcomingGames]);

  // ── Load user states from GraphQL ──────────────────────────

  const loadItemStates = async (
    items: UnifiedContent[],
    isCurrentRequest: () => boolean = () => true
  ) => {
    if (!items.length || !user) return;

    try {
      const contentIds = Array.from(new Set(items.map((item) => item.id.toString())));
      console.log('🔍 Dashboard: Loading item states:', contentIds.length);

      const { data: logs } = await getUserContentLogs(contentIds);
      if (!isCurrentRequest()) return;
      console.log('✅ Dashboard: Loaded item states:', logs.length);

      const newStates: Record<string | number, ItemState> = {};
      logs?.forEach((log: any) => {
        newStates[log.contentId] = {
          isConsumed: log.isConsumed || false,
          isFavorite: log.isFavorite || false,
          isConsumeLater: log.isConsumeLater || false,
          isContinuing: log.isContinuing || false,
          rating: log.rating ?? null,
          hasReview: !!(log.review && (log.review as string).trim()),
        };
      });

      console.log('✅ Dashboard: New states:', Object.keys(newStates).length);
      setItemStates((prev) => ({ ...prev, ...newStates }));
    } catch (err) {
      console.error('❌ Dashboard: Error loading item states:', err);
    }
  };

  // ── Initial data fetch ─────────────────────────────────────

  const initialLoadDone = useRef(false);

  useEffect(() => {
    let isCurrentRequest = true;

    async function fetchData() {
      try {
        setLoading(true);
        setTvLoading(true);
        setBooksLoading(true);
        setAnticipatedLoading(true);

        console.log('🎬 Dashboard: Fetching popular and anticipated content from database…');

        const [movies, tv, games, books, antMovies, antTv, antGames, antBooks] =
          await Promise.all([
            fetchPopularContent('movie', contentTimeRanges.movie),
            fetchPopularContent('tv', contentTimeRanges.tv),
            fetchPopularContent('game', contentTimeRanges.game),
            fetchPopularContent('book', contentTimeRanges.book),
            fetchMostAnticipatedUpcomingContent('movie', 10),
            fetchMostAnticipatedUpcomingContent('tv', 10),
            fetchMostAnticipatedUpcomingContent('game', 10),
            fetchMostAnticipatedUpcomingContent('book', 10),
          ]);

        if (!isCurrentRequest) return;

        console.log('✅ Dashboard: Received content', {
          movies: movies.length,
          tv: tv.length,
          games: games.length,
          books: books.length,
          antMovies: antMovies.length,
          antTv: antTv.length,
          antGames: antGames.length,
          antBooks: antBooks.length,
        });

        setTrendingMovies(movies);
        setUpcomingMovies(filterUpcoming(movies));
        setTrendingTv(tv);
        setUpcomingTv(filterUpcoming(tv));
        setTrendingGames(games);
        setUpcomingGames(filterUpcoming(games));
        setPopularBooks(books);

        setAnticipatedMovies(antMovies);
        setAnticipatedTv(antTv);
        setAnticipatedGames(antGames);
        setAnticipatedBooks(antBooks);

        if (user) {
          await loadItemStates(
            [
              ...movies,
              ...tv,
              ...games,
              ...books,
              ...antMovies,
              ...antTv,
              ...antGames,
              ...antBooks,
            ],
            () => isCurrentRequest
          );
        }

        if (!isCurrentRequest) return;

        setLoading(false);
        setTvLoading(false);
        setBooksLoading(false);
        setAnticipatedLoading(false);
        setError(null);
        initialLoadDone.current = true;
      } catch (err) {
        if (isCurrentRequest) {
          setError(err instanceof Error ? err.message : 'An unknown error occurred.');
          console.error('❌ Dashboard: Failed to fetch data:', err);
        }
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
          setTvLoading(false);
          setBooksLoading(false);
          setAnticipatedLoading(false);
        }
      }
    }

    void fetchData();
    return () => {
      isCurrentRequest = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Time range change handler (silent re-fetch, no loading skeleton) ──

  const prevTimeRanges = useRef(contentTimeRanges);

  useEffect(() => {
    if (!initialLoadDone.current) return; // skip on initial mount

    const prev = prevTimeRanges.current;
    prevTimeRanges.current = contentTimeRanges;

    const typesToRefresh: string[] = [];
    for (const key of Object.keys(contentTimeRanges)) {
      if (contentTimeRanges[key] !== prev[key]) {
        typesToRefresh.push(key);
      }
    }

    if (typesToRefresh.length === 0) return;

    let isCurrentRequest = true;

    async function refreshTypes() {
      for (const type of typesToRefresh) {
        if (!isCurrentRequest) return;
        try {
          console.log(`🔄 Dashboard: Refreshing ${type} with timeRange=${contentTimeRanges[type]}`);
          const items = await fetchPopularContent(type, contentTimeRanges[type]);
          if (!isCurrentRequest) return;

          if (type === 'movie') {
            setTrendingMovies(items);
            setUpcomingMovies(filterUpcoming(items));
          } else if (type === 'tv') {
            setTrendingTv(items);
            setUpcomingTv(filterUpcoming(items));
          } else if (type === 'game') {
            setTrendingGames(items);
            setUpcomingGames(filterUpcoming(items));
          } else if (type === 'book') {
            setPopularBooks(items);
          }

          if (user) {
            await loadItemStates(items, () => isCurrentRequest);
          }
        } catch (err) {
          if (isCurrentRequest) {
            console.error(`❌ Dashboard: Error refreshing ${type}:`, err);
          }
        }
      }
    }

    void refreshTypes();
    return () => {
      isCurrentRequest = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentTimeRanges]);

  // ── Toggle handlers ────────────────────────────────────────

  const handleWatchToggle = async (item: any, contentType: string) => {
    if (!userId) {
      console.error('❌ handleWatchToggle: User not authenticated');
      return;
    }

    const itemId = item.id.toString();
    const currentState = itemStates[itemId] || DEFAULT_ITEM_STATE;
    const willBeConsumed = !currentState.isConsumed;

    console.log(`🎬 Dashboard handleWatchToggle: ${contentType} ${itemId}`, {
      currentState,
      newConsumedState: willBeConsumed,
    });

    // Optimistic update
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...currentState,
        isConsumed: willBeConsumed,
        ...(!willBeConsumed ? { isFavorite: false, rating: 0 } : {}),
      },
    }));

    try {
      const contentId = await ensureContentSaved(item, contentType);
      if (!contentId) {
        setItemStates((prev) => ({ ...prev, [itemId]: currentState }));
        return;
      }

      const updateData: any = { is_consumed: willBeConsumed };
      if (!willBeConsumed) {
        if (currentState.rating && currentState.rating > 0) updateData.rating = 0;
        if (currentState.isFavorite) updateData.is_favorite = false;
      }

      const { updateUserContentLog } = await import('@/services/userContentService');
      const { error } = await updateUserContentLog(contentId, updateData);

      if (error) throw new Error('Failed to update watch status');

      console.log(
        `✅ Dashboard: ${contentType.toUpperCase()} ${contentId} watch → ${willBeConsumed}`
      );
    } catch (err) {
      console.error(`❌ Dashboard: Error updating ${contentType} watch status:`, err);
      setItemStates((prev) => ({ ...prev, [itemId]: currentState }));
    }
  };

  const handleFavoriteToggle = async (item: any, contentType: string) => {
    if (!userId) {
      console.error('❌ handleFavoriteToggle: User not authenticated');
      return;
    }

    const itemId = item.id.toString();
    const currentState = itemStates[itemId] || DEFAULT_ITEM_STATE;
    const newFavoriteState = !currentState.isFavorite;

    console.log(`❤️ Dashboard handleFavoriteToggle: ${contentType} ${itemId}`, {
      currentState,
      newFavoriteState,
    });

    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...currentState,
        isFavorite: newFavoriteState,
        ...(newFavoriteState && !currentState.isConsumed ? { isConsumed: true } : {}),
      },
    }));

    try {
      const contentId = await ensureContentSaved(item, contentType);
      if (!contentId) {
        setItemStates((prev) => ({ ...prev, [itemId]: currentState }));
        return;
      }

      console.log(`❤️ Dashboard: Updating favorable status for ${contentType} (GraphQL)`);

      const updateData: any = { is_favorite: newFavoriteState };
      if (newFavoriteState && !currentState.isConsumed) {
        updateData.is_consumed = true;
      }

      const { updateUserContentLog } = await import('@/services/userContentService');
      const { error } = await updateUserContentLog(contentId, updateData);

      if (error) throw new Error('Failed to update favorite status');

      console.log(
        `✅ Dashboard: ${contentType.toUpperCase()} ${contentId} favorite → ${newFavoriteState}`
      );
    } catch (err) {
      console.error(`❌ Dashboard: Error updating ${contentType} favorite status:`, err);
      setItemStates((prev) => ({ ...prev, [itemId]: currentState }));
    }
  };

  const handleWatchlistToggle = async (item: any, contentType: string) => {
    if (!userId) {
      console.error('❌ handleWatchlistToggle: User not authenticated');
      return;
    }

    const itemId = item.id.toString();
    const currentState = itemStates[itemId] || DEFAULT_ITEM_STATE;
    const newListState = !currentState.isConsumeLater;

    console.log(`🔖 Dashboard handleWatchlistToggle: ${contentType} ${itemId}`, {
      currentState,
      newListState,
    });

    setItemStates((prev) => ({
      ...prev,
      [itemId]: { ...currentState, isConsumeLater: newListState },
    }));

    try {
      const contentId = await ensureContentSaved(item, contentType);
      if (!contentId) {
        setItemStates((prev) => ({ ...prev, [itemId]: currentState }));
        return;
      }

      console.log(`🔖 Dashboard: Updating watchlist status for ${contentType} (GraphQL)`);
      const { error } = await toggleContentWatchlist(contentId);
      if (error) throw new Error('Failed to update watchlist status');

      console.log(
        `✅ Dashboard: ${contentType.toUpperCase()} ${contentId} watchlist → ${newListState}`
      );
    } catch (err) {
      console.error(`❌ Dashboard: Error updating ${contentType} watchlist status:`, err);
      setItemStates((prev) => ({ ...prev, [itemId]: currentState }));
    }
  };

  // ── Add to list ────────────────────────────────────────────

  const handleAddToList = (item: UnifiedContent, contentType: ContentType) => {
    console.log(`📋 Dashboard: Opening add- for ${contentType} "${item.title}"`);
    setSelectedContentForList(item);
    setSelectedContentType(contentType);
    setShowAddToListModal(true);
  };

  const getUpcomingSubtitle = (releaseDate?: string) => {
    if (!releaseDate) return null;
    return formatDaysUntil(releaseDate);
  };

  // ── Return ─────────────────────────────────────────────────

  return {
    user,
    // Content lists
    trendingMovies,
    upcomingMovies,
    trendingTv,
    upcomingTv,
    popularBooks,
    trendingGames,
    upcomingGames,
    anticipatedMovies,
    anticipatedTv,
    anticipatedGames,
    anticipatedBooks,
    personalStats,
    personalStatsLoading,
    // Loading & error
    loading,
    tvLoading,
    booksLoading,
    anticipatedLoading,
    error,
    // Per-item state
    itemStates,
    // Content time range
    contentTimeRanges,
    setContentTimeRange,
    // Toggle handlers
    handleWatchToggle,
    handleFavoriteToggle,
    handleWatchlistToggle,
    // Add-
    handleAddToList,
    showAddToListModal,
    setShowAddToListModal,
    selectedContentForList,
    setSelectedContentForList,
    selectedContentType,
    // Helpers
    getUpcomingSubtitle,
  };
}
