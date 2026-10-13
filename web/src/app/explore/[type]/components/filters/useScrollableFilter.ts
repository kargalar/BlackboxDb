'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentNode } from 'graphql';
import { apolloClient } from '@/lib/apollo-client';

const PAGE_SIZE = 1000;

interface FilterItem {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

interface UseScrollableFilterOptions<T extends FilterItem> {
  initialItems: T[];
  gqlQuery: DocumentNode;
  dataKey: string;
  pageSize?: number;
  /** Extra variables to pass with every query (e.g. contentTypeId) */
  extraVariables?: Record<string, unknown>;
}

interface UseScrollableFilterReturn<T extends FilterItem> {
  displayItems: T[];
  searchTerm: string;
  handleSearchChange: (value: string) => void;
  handleScroll: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Reusable hook for filter components with:
 * - Initial partial data from parent
 * - Debounced API search (300ms, 2+ chars)
 * - Infinite scroll pagination
 * - Deduplication by id
 */
export function useScrollableFilter<T extends FilterItem>({
  initialItems,
  gqlQuery,
  dataKey,
  pageSize = PAGE_SIZE,
  extraVariables = {},
}: UseScrollableFilterOptions<T>): UseScrollableFilterReturn<T> {
  const [searchTerm, setSearchTerm] = useState('');
  const [displayItems, setDisplayItems] = useState<T[]>(initialItems);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length >= pageSize);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update displayItems when initialItems change (from parent re-fetch)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDisplayItems(initialItems);
      setHasMore(initialItems.length >= pageSize);
    }
  }, [initialItems, searchTerm, pageSize]);

  // Debounced API search
  const searchAPI = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setDisplayItems(initialItems);
        setHasMore(initialItems.length >= pageSize);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data } = await apolloClient.query<Record<string, T[]>>({
          query: gqlQuery,
          variables: { limit: pageSize, offset: 0, search: query.trim(), ...extraVariables },
          fetchPolicy: 'network-only',
        });

        const results = data?.[dataKey] || [];
        setDisplayItems(results);
        setHasMore(results.length >= pageSize);
        console.log(
          `🔍 [useScrollableFilter] API search "${query}" → ${results.length} ${dataKey}`
        );
      } catch (error) {
        console.error(`❌ [useScrollableFilter] Search error (${dataKey}):`, error);
      } finally {
        setIsSearching(false);
      }
    },
    [gqlQuery, dataKey, pageSize, extraVariables, initialItems]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setDisplayItems(initialItems);
        setHasMore(initialItems.length >= pageSize);
        setIsSearching(false);
        return;
      }

      if (value.trim().length >= 2) {
        setIsSearching(true);
        debounceRef.current = setTimeout(() => searchAPI(value), 300);
      }
    },
    [initialItems, pageSize, searchAPI]
  );

  // Load more items for infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const variables: Record<string, unknown> = {
        limit: pageSize,
        offset: displayItems.length,
        ...extraVariables,
      };
      if (searchTerm.trim()) {
        variables.search = searchTerm.trim();
      }

      const { data } = await apolloClient.query<Record<string, T[]>>({
        query: gqlQuery,
        variables,
        fetchPolicy: 'network-only',
      });

      const newResults = data?.[dataKey] || [];
      if (newResults.length > 0) {
        const existingIds = new Set(displayItems.map((item) => item.id));
        const uniqueNew = newResults.filter((item) => !existingIds.has(item.id));
        setDisplayItems((prev) => [...prev, ...uniqueNew]);
        console.log(
          `📜 [useScrollableFilter] Loaded ${uniqueNew.length} more ${dataKey} (total: ${displayItems.length + uniqueNew.length})`
        );
      }
      setHasMore(newResults.length >= pageSize);
    } catch (error) {
      console.error(`❌ [useScrollableFilter] Load more error (${dataKey}):`, error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isLoadingMore,
    hasMore,
    displayItems,
    searchTerm,
    gqlQuery,
    dataKey,
    pageSize,
    extraVariables,
  ]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      loadMore();
    }
  }, [loadMore, isLoadingMore, hasMore]);

  return {
    displayItems,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  };
}
