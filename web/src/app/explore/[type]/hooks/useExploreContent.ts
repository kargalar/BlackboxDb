import { useState, useEffect, useRef } from 'react';
import type { UnifiedContent } from '@/types/unified-content';
import { searchContent, getPopularContent, type ServerFilters } from './contentSearch';
import { loadItemStates, updateItemState } from './itemStates';
import { type FilterState } from '../components/FilterSidebar';
import { type SortOption } from '../components/SortingBar';
import {
  logContentWatch,
  unlogContentWatch,
  toggleContentFavorite,
  toggleConsumeLater,
  toggleContinuing,
} from '@/services/userContentService';

// Special ID for "other" (null/empty) filter values
const OTHER_FILTER_ID = '__other__';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Convert client-side FilterState to server-side filter params.
 * Strips out '__other__' entries since the server doesn't handle them.
 */
function buildServerFilters(
  filters: FilterState,
  sortBy: SortOption,
  sortOrder: 'asc' | 'desc' | 'none'
): ServerFilters {
  const serverFilters: ServerFilters = {};
  const emptyFilters = new Set<string>();

  // Genre IDs (string[] -> number[])
  if (filters.genres.length > 0) {
    if (filters.genres.includes(OTHER_FILTER_ID)) emptyFilters.add('genre');
    const ids = filters.genres
      .filter((g) => g !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.genreIds = ids;
  }

  // Theme IDs
  if (filters.themes && filters.themes.length > 0) {
    if (filters.themes.includes(OTHER_FILTER_ID)) emptyFilters.add('theme');
    const ids = filters.themes
      .filter((t) => t !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.themeIds = ids;
  }

  // Mood IDs
  if (filters.moods && filters.moods.length > 0) {
    if (filters.moods.includes(OTHER_FILTER_ID)) emptyFilters.add('mood');
    const ids = filters.moods
      .filter((m) => m !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.moodIds = ids;
  }

  // Age Rating IDs
  if (filters.ageRatings && filters.ageRatings.length > 0) {
    if (filters.ageRatings.includes(OTHER_FILTER_ID)) emptyFilters.add('ageRating');
    const ids = filters.ageRatings
      .filter((a) => a !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.ageRatingIds = ids;
  }

  // Platform IDs
  if (filters.platforms && filters.platforms.length > 0) {
    if (filters.platforms.includes(OTHER_FILTER_ID)) emptyFilters.add('platform');
    const ids = filters.platforms
      .filter((p) => p !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.platformIds = ids;
  }

  // Actor IDs
  if (filters.actors && filters.actors.length > 0) {
    if (filters.actors.includes(OTHER_FILTER_ID)) emptyFilters.add('actor');
    const ids = filters.actors
      .filter((a) => a !== OTHER_FILTER_ID)
      .map(String)
      .filter(Boolean);
    if (ids.length > 0) serverFilters.actorIds = ids;
  }

  // Director IDs
  if (filters.directors && filters.directors.length > 0) {
    if (filters.directors.includes(OTHER_FILTER_ID)) emptyFilters.add('director');
    const ids = filters.directors
      .filter((d) => d !== OTHER_FILTER_ID)
      .map(String)
      .filter(Boolean);
    if (ids.length > 0) serverFilters.directorIds = ids;
  }

  // Company IDs
  if (filters.companies && filters.companies.length > 0) {
    if (filters.companies.includes(OTHER_FILTER_ID)) emptyFilters.add('company');
    const ids = filters.companies
      .filter((c) => c !== OTHER_FILTER_ID)
      .map(String)
      .filter(Boolean);
    if (ids.length > 0) serverFilters.companyIds = ids;
  }

  // Language codes
  if (filters.language && filters.language.length > 0) {
    if (filters.language.includes(OTHER_FILTER_ID)) emptyFilters.add('language');
    const codes = filters.language.filter((l) => l !== OTHER_FILTER_ID);
    if (codes.length > 0) serverFilters.languageCodes = codes;
  }

  if (filters.publicationLanguage && filters.publicationLanguage.length > 0) {
    if (filters.publicationLanguage.includes(OTHER_FILTER_ID)) {
      emptyFilters.add('publicationLanguage');
    }
    const codes = filters.publicationLanguage.filter((l) => l !== OTHER_FILTER_ID);
    if (codes.length > 0) serverFilters.publicationLanguageCodes = codes;
  }

  // Year range
  if (filters.year.min !== '' && filters.year.min > 1900) serverFilters.yearMin = filters.year.min;
  if (filters.year.max !== '' && filters.year.max < new Date().getFullYear())
    serverFilters.yearMax = filters.year.max;

  // Rating range
  if (filters.rating.min !== '' && filters.rating.min > 0)
    serverFilters.ratingMin = filters.rating.min;
  if (filters.rating.max !== '' && filters.rating.max < 10)
    serverFilters.ratingMax = filters.rating.max;

  // Duration range
  if (filters.duration?.min !== '' && filters.duration?.min > 0)
    serverFilters.durationMin = filters.duration.min;
  if (filters.duration?.max !== '' && filters.duration?.max > 0)
    serverFilters.durationMax = filters.duration.max;

  // Game mode IDs
  if (filters.gameModes && filters.gameModes.length > 0) {
    if (filters.gameModes.includes(OTHER_FILTER_ID)) emptyFilters.add('gameMode');
    const ids = filters.gameModes
      .filter((g) => g !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.gameModeIds = ids;
  }

  // Game engine IDs
  if (filters.gameEngines && filters.gameEngines.length > 0) {
    if (filters.gameEngines.includes(OTHER_FILTER_ID)) emptyFilters.add('gameEngine');
    const ids = filters.gameEngines
      .filter((g) => g !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.gameEngineIds = ids;
  }

  // Perspective IDs
  if (filters.perspectives && filters.perspectives.length > 0) {
    if (filters.perspectives.includes(OTHER_FILTER_ID)) emptyFilters.add('perspective');
    const ids = filters.perspectives
      .filter((p) => p !== OTHER_FILTER_ID)
      .map(Number)
      .filter((n) => !isNaN(n));
    if (ids.length > 0) serverFilters.perspectiveIds = ids;
  }

  // Sort
  if (sortOrder !== 'none') {
    serverFilters.sortBy = sortBy;
    serverFilters.sortOrder = sortOrder;
  }

  if (filters.hasAwards !== undefined) {
    serverFilters.hasAwards = filters.hasAwards;
  }
  if (filters.hideWatched && filters.hideWatched !== 'passive') {
    serverFilters.hideWatched = filters.hideWatched;
  }
  if (filters.hideWatchlist && filters.hideWatchlist !== 'passive') {
    serverFilters.hideWatchlist = filters.hideWatchlist;
  }
  if (filters.hideContinuing && filters.hideContinuing !== 'passive') {
    serverFilters.hideContinuing = filters.hideContinuing;
  }
  if (filters.hideFavorites && filters.hideFavorites !== 'passive') {
    serverFilters.hideFavorites = filters.hideFavorites;
  }
  if (filters.hideAbandoned && filters.hideAbandoned !== 'passive') {
    serverFilters.hideAbandoned = filters.hideAbandoned;
  }
  if (filters.hideInAnyList && filters.hideInAnyList !== 'passive') {
    serverFilters.hideInAnyList = filters.hideInAnyList;
  }

  if (emptyFilters.size > 0) {
    serverFilters.emptyFilters = [...emptyFilters];
    if (emptyFilters.has('platform') && !serverFilters.platformIds) {
      serverFilters.platformIds = [];
    }
  }

  return serverFilters;
}

interface UseExploreContentProps {
  contentType: string;
  contentTypeId: number;
  itemsPerPage: number;
  query: string;
  page: number;
  filters: FilterState;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc' | 'none';
}

export function useExploreContent({
  contentType,
  contentTypeId,
  itemsPerPage,
  query,
  page,
  filters,
  sortBy,
  sortOrder,
}: UseExploreContentProps) {
  const [items, setItems] = useState<UnifiedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemStates, setItemStates] = useState<
    Record<
      string,
      {
        isConsumed: boolean;
        isFavorite: boolean;
        isConsumeLater: boolean;
        isContinuing?: boolean;
        isAbandoned?: boolean;
        rating?: number | null;
        hasReview?: boolean;
      }
    >
  >({});
  const latestRequestRef = useRef(0);

  useEffect(() => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const controller = new AbortController();

    const isStaleRequest = () =>
      controller.signal.aborted || latestRequestRef.current !== requestId;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Convert client-side filters to server-side filter params
      const serverFilters = buildServerFilters(filters, sortBy, sortOrder);
      console.log(
        `[ExploreContent] Fetching ${contentType}. Query: "${query}", Page: ${page}`,
        'Server filters:',
        serverFilters
      );

      try {
        let result;

        if (query.trim()) {
          result = await searchContent(
            query,
            contentTypeId,
            page,
            itemsPerPage,
            serverFilters,
            controller.signal
          );
          console.log(
            `[ExploreContent] Search results: ${result.items.length} items, total: ${result.total}`
          );
        } else {
          result = await getPopularContent(
            contentTypeId,
            page,
            itemsPerPage,
            serverFilters,
            controller.signal
          );
          console.log(
            `[ExploreContent] Popular content: ${result.items.length} items, total: ${result.total}`
          );
        }

        if (isStaleRequest()) return;

        let filteredItems = result.items;

        // Load user states for items (needed for card UI state display)
        const contentIds = filteredItems.map((item: UnifiedContent) => item.id.toString());
        const states = await loadItemStates(contentIds);

        if (isStaleRequest()) return;

        setItemStates(states);

        // Note: hide/show user-state filters are now handled server-side for correct pagination
        console.log(
          `[ExploreContent] Final: ${filteredItems.length} items, page ${result.page}/${result.totalPages}`
        );

        setItems(filteredItems);
        setCurrentPage(result.page);
        setTotalPages(result.totalPages);
        setTotalCount(result.total);
      } catch (error) {
        if (isStaleRequest() || isAbortError(error)) return;
        console.error(`[ExploreContent] Error fetching ${contentType}:`, error);
        setError(error instanceof Error ? error : new Error('Content could not be loaded'));
        setItems([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        if (!isStaleRequest()) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [contentType, query, page, contentTypeId, itemsPerPage, filters, sortBy, sortOrder, retryKey]);

  const handleWatch = async (item: UnifiedContent) => {
    console.log(`[ExploreContent] Toggle watch for ${item.title}`, item);
    try {
      const currentState = itemStates[item.id];
      if (currentState?.isConsumed) {
        await unlogContentWatch(item.id.toString());
      } else {
        await logContentWatch(item.id.toString());
      }
      const newState = await updateItemState(item.id.toString());
      setItemStates((prev) => ({ ...prev, [item.id]: newState }));
      console.log(`[ExploreContent] Watch toggled successfully for ${item.title}`);
    } catch (error) {
      console.error(`[ExploreContent] Error toggling watch:`, error);
    }
  };

  const handleToggleFavorite = async (item: UnifiedContent) => {
    console.log(`[ExploreContent] Toggle favorite for ${item.title}`, item);
    try {
      await toggleContentFavorite(item.id.toString());
      const newState = await updateItemState(item.id.toString());
      setItemStates((prev) => ({ ...prev, [item.id]: newState }));
      console.log(`[ExploreContent] Favorite toggled successfully for ${item.title}`);
    } catch (error) {
      console.error(`[ExploreContent] Error toggling favorite:`, error);
    }
  };

  const handleToggleWatchlist = async (item: UnifiedContent) => {
    console.log(`[ExploreContent] Toggle watchlist for ${item.title}`, item);
    try {
      await toggleConsumeLater(item.id.toString());
      const newState = await updateItemState(item.id.toString());
      setItemStates((prev) => ({ ...prev, [item.id]: newState }));
      console.log(`[ExploreContent] Watchlist toggled successfully for ${item.title}`);
    } catch (error) {
      console.error(`[ExploreContent] Error toggling watchlist:`, error);
    }
  };

  const handleToggleContinuing = async (item: UnifiedContent) => {
    console.log(`[ExploreContent] Toggle continuing for ${item.title}`, item);
    try {
      await toggleContinuing(item.id.toString());
      const newState = await updateItemState(item.id.toString());
      setItemStates((prev) => ({ ...prev, [item.id]: newState }));
      console.log(`[ExploreContent] Continuing toggled successfully for ${item.title}`);
    } catch (error) {
      console.error(`[ExploreContent] Error toggling continuing:`, error);
    }
  };

  return {
    items,
    loading,
    error,
    retry: () => setRetryKey((value) => value + 1),
    currentPage,
    totalPages,
    totalCount,
    itemStates,
    handleWatch,
    handleToggleFavorite,
    handleToggleWatchlist,
    handleToggleContinuing,
  };
}
