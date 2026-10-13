'use client';

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { apolloClient } from '@/lib/apollo-client';
import {
  SEARCH_TMDB,
  FETCH_TMDB_DETAILS,
  type TmdbSearchResultData,
  type TmdbDetailResultData,
} from '@/services/graphql/admin/adminTmdb';
import {
  SEARCH_BOOKS,
  FETCH_BOOK_DETAILS,
  SEARCH_IGDB_GAMES,
  FETCH_IGDB_GAME_DETAILS,
  SEARCH_OPEN_LIBRARY,
  FETCH_OPEN_LIBRARY_DETAILS,
  SEARCH_LOCAL_CONTENT,
  type AutoFillSearchResultData,
  type AutoFillBookDetailData,
  type AutoFillGameDetailData,
} from '@/services/graphql/admin/adminAutoFill';
import { updateContent } from '@/services/admin/contentService';
import type { UnifiedSearchResult } from '@/components/molecules/TmdbSearchResults';
import { autoFillToUnified, tmdbToUnified } from './autoFillSearchResults';
import { fetchAndMapAutoFillDetails } from './fetchAndMapAutoFillDetails';
import { mapTmdbToFormData } from '../utils/tmdbMapper';
import { mapBookToFormData } from '../utils/bookMapper';
import { mapOpenLibraryToFormData } from '../utils/openLibraryMapper';
import { mapGameToFormData } from '../utils/gameMapper';
import type { AddContentFormData } from '../types';

/**
 * Auto-Fill Hook — Unified
 * Content tipine göre doğru API'yi (TMDB / Google Books / Open Library / IGDB) çağırır.
 * `source` parametresi ile zorunlu kaynak belirlenebilir (ör: oyunlar için IGDB, kitaplar için openlibrary).
 *
 * Content Type Routing (source='auto'):
 *   1 (Film)  → TMDB movie
 *   2 (Dizi)  → TMDB tv
 *   3 (Oyun)  → IGDB
 *   4 (Kitap) → Google Books
 *
 * Source Override:
 *   'igdb' → Her zaman IGDB kullanır (sadece oyunlar için)
 *   'openlibrary' → Her zaman Open Library kullanır (kitaplar için)
 */

export type AutoFillSource = 'auto' | 'igdb' | 'tmdb' | 'googlebooks' | 'openlibrary';

// ─── Source name mapping (UI'da gösterilir) ───
const SOURCE_NAMES: Record<string, string> = {
  '1': 'TMDB',
  '2': 'TMDB',
  '3': 'IGDB',
  '4': 'Google Books',
};

const SOURCE_OVERRIDE_NAMES: Record<string, string> = {
  igdb: 'IGDB',
  tmdb: 'TMDB',
  googlebooks: 'Google Books',
  openlibrary: 'Open Library',
};

const SEARCH_PAGE_SIZE = 20;

interface UseAutoFillOptions {
  formData: AddContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddContentFormData>>;
  /** Zorunlu kaynak (ör: 'igdb'). Default 'auto' → contentTypeId'ye göre seçer */
  source?: AutoFillSource;
}

interface UseAutoFillReturn {
  /** Birleşik arama sonuçları */
  searchResults: UnifiedSearchResult[];
  /** Veritabanımızdaki arama sonuçları */
  localResults: UnifiedSearchResult[];
  /** API'da arama yapılıyor mu */
  isSearching: boolean;
  isLoadingMore: boolean;
  hasMoreResults: boolean;
  /** DB'de arama yapılıyor mu */
  isSearchingLocal: boolean;
  /** Detay çekiliyor mu */
  isFetchingDetails: boolean;
  /** Bir kayıt güncelleniyor mu */
  isUpdatingExisting: boolean;
  /** Güncellenen yerel kayıt id'si */
  updatingLocalId: string | null;
  /** Sonuç listesi gösterilsin mi */
  showResults: boolean;
  /** Hata mesajı */
  error: string | null;
  /** Arama yap */
  handleSearch: (title: string, contentTypeId: string) => Promise<void>;
  loadMoreResults: () => Promise<void>;
  /** Sadece kendi veritabanımızda arama yap */
  searchLocal: () => Promise<void>;
  /** Sonuçlardan birini seç ve formu doldur (sourceId string) */
  handleSelect: (sourceId: string) => Promise<void>;
  /** Mevcut içerik kaydını API detaylarıyla güncelle */
  handleUpdateExisting: (localContentId: string, sourceId: string) => Promise<void>;
  /** Sonuç listesini kapat */
  closeResults: () => void;
  /** Kaynak adı (TMDB / Google Books / IGDB) */
  sourceName: string;
  /** Detay çekip mappedData döndürür (state güncellemeden) */
  fetchAndMapDetails: (
    sourceId: string,
    contentTypeId: string
  ) => Promise<{
    mappedData: Partial<AddContentFormData>;
    autoFillSource: string;
    effectiveSource: string;
  }>;
}

// ─── Helpers: TMDB sonuçlarını unified formata dönüştür ───

export function useAutoFill({
  formData,
  setFormData,
  source = 'auto',
}: UseAutoFillOptions): UseAutoFillReturn {
  const searchRequestId = useRef(0);
  const localSearchRequestId = useRef(0);
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[]>([]);
  const [localResults, setLocalResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [lastSearch, setLastSearch] = useState<{
    title: string;
    contentTypeId: string;
    effectiveSource: string;
    nextPage: number;
  } | null>(null);
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);
  const [isUpdatingExisting, setIsUpdatingExisting] = useState(false);
  const [updatingLocalId, setUpdatingLocalId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceName =
    source !== 'auto'
      ? SOURCE_OVERRIDE_NAMES[source] || source
      : SOURCE_NAMES[formData.contentTypeId] || 'Auto Fill';

  const searchLocal = useCallback(async () => {
    const title = formData.title;
    const contentTypeId = formData.contentTypeId;

    if (!title.trim()) return;

    const requestId = ++localSearchRequestId.current;
    setIsSearchingLocal(true);
    setError(null);

    try {
      const res = await apolloClient.query<any>({
        query: SEARCH_LOCAL_CONTENT,
        variables: { searchQuery: title.trim(), limit: 10, contentTypeId: parseInt(contentTypeId) },
        fetchPolicy: 'network-only',
      });
      const items = res.data?.searchContent?.items || [];
      const mappedLocal = items.map((item: any) => ({
        sourceId: item.id,
        title: item.title,
        originalTitle: item.originalTitle,
        overview: item.description,
        posterPath: item.posterUrl,
        releaseDate: item.releaseDate,
        mediaType: item.contentType?.name,
      }));
      if (requestId === localSearchRequestId.current) {
        setLocalResults(mappedLocal);
      }
    } catch (err) {
      console.error('[useAutoFill] Local search error:', err);
      if (requestId === localSearchRequestId.current) {
        setError('Veritabanında arama yapılırken hata oluştu.');
      }
    } finally {
      if (requestId === localSearchRequestId.current) {
        setIsSearchingLocal(false);
      }
    }
  }, [formData.title, formData.contentTypeId]);
  const getEffectiveSource = useCallback(
    (contentTypeId: string): string => {
      if (source !== 'auto') return source;
      if (contentTypeId === '1' || contentTypeId === '2') return 'tmdb';
      if (contentTypeId === '3') return 'igdb';
      if (contentTypeId === '4') return 'googlebooks';
      return 'unknown';
    },
    [source]
  );

  const fetchExternalResults = useCallback(
    async (title: string, contentTypeId: string, effectiveSource: string, page: number) => {
      if (effectiveSource === 'tmdb') {
        const mediaType = contentTypeId === '2' ? 'tv' : 'movie';
        const { data } = await apolloClient.query<{
          searchTmdb: TmdbSearchResultData[];
        }>({
          query: SEARCH_TMDB,
          variables: { query: title.trim(), type: mediaType, page },
          fetchPolicy: 'network-only',
        });
        return tmdbToUnified(data?.searchTmdb || []);
      }

      if (effectiveSource === 'googlebooks') {
        const { data } = await apolloClient.query<{
          searchBooks: AutoFillSearchResultData[];
        }>({
          query: SEARCH_BOOKS,
          variables: {
            query: title.trim(),
            startIndex: (page - 1) * SEARCH_PAGE_SIZE,
            maxResults: SEARCH_PAGE_SIZE,
          },
          fetchPolicy: 'network-only',
        });
        return autoFillToUnified(data?.searchBooks || []);
      }

      if (effectiveSource === 'igdb') {
        const { data } = await apolloClient.query<{
          searchIgdbGames: AutoFillSearchResultData[];
        }>({
          query: SEARCH_IGDB_GAMES,
          variables: {
            query: title.trim(),
            limit: SEARCH_PAGE_SIZE,
            offset: (page - 1) * SEARCH_PAGE_SIZE,
          },
          fetchPolicy: 'network-only',
        });
        return autoFillToUnified(data?.searchIgdbGames || []);
      }

      if (effectiveSource === 'openlibrary') {
        const { data } = await apolloClient.query<{
          searchOpenLibrary: AutoFillSearchResultData[];
        }>({
          query: SEARCH_OPEN_LIBRARY,
          variables: {
            query: title.trim(),
            offset: (page - 1) * SEARCH_PAGE_SIZE,
            limit: SEARCH_PAGE_SIZE,
          },
          fetchPolicy: 'network-only',
        });
        return autoFillToUnified(data?.searchOpenLibrary || []);
      }

      return [];
    },
    []
  );

  /**
   * Arama yap — source'a göre doğru API'e yönlendir
   */
  const handleSearch = useCallback(
    async (title: string, contentTypeId: string) => {
      if (!title.trim()) {
        searchRequestId.current += 1;
        localSearchRequestId.current += 1;
        setIsSearching(false);
        setIsSearchingLocal(false);
        setIsLoadingMore(false);
        console.warn('[useAutoFill] Empty title, skipping search');
        setError('Lütfen bir başlık girin');
        return;
      }

      const effectiveSource = getEffectiveSource(contentTypeId);
      const requestId = ++searchRequestId.current;
      const localRequestId = ++localSearchRequestId.current;
      console.log(`[useAutoFill] Searching ${effectiveSource}: "${title}" (type=${contentTypeId})`);

      setIsSearching(true);
      setIsSearchingLocal(true);
      setError(null);
      setSearchResults([]);
      setHasMoreResults(false);
      setLastSearch(null);
      setIsLoadingMore(false);
      setLocalResults([]); // Clear local results when external search starts
      setShowResults(true);

      // Veritabanı aramasını eş zamanlı başlat (böylece API sekmesinde 'Zaten Kayıtlı' kontrolü anında çalışır)
      apolloClient
        .query<any>({
          query: SEARCH_LOCAL_CONTENT,
          variables: {
            searchQuery: title.trim(),
            limit: 10,
            contentTypeId: parseInt(contentTypeId),
          },
          fetchPolicy: 'network-only',
        })
        .then((res) => {
          const items = res.data?.searchContent?.items || [];
          const mappedLocal = items.map((item: any) => ({
            sourceId: item.id,
            title: item.title,
            originalTitle: item.originalTitle,
            overview: item.description,
            posterPath: item.posterUrl,
            releaseDate: item.releaseDate,
            mediaType: item.contentType?.name,
          }));
          if (localRequestId === localSearchRequestId.current) {
            setLocalResults(mappedLocal);
          }
        })
        .catch((err) => {
          console.error('[useAutoFill] Local search error:', err);
        })
        .finally(() => {
          if (localRequestId === localSearchRequestId.current) {
            setIsSearchingLocal(false);
          }
        });

      try {
        let unified: UnifiedSearchResult[] = [];

        if (effectiveSource === 'tmdb') {
          // ─── TMDB (Film / Dizi) ───
          const mediaType = contentTypeId === '2' ? 'tv' : 'movie';
          const { data } = await apolloClient.query<{
            searchTmdb: TmdbSearchResultData[];
          }>({
            query: SEARCH_TMDB,
            variables: { query: title.trim(), type: mediaType, page: 1 },
            fetchPolicy: 'network-only',
          });
          unified = tmdbToUnified(data?.searchTmdb || []);
        } else if (effectiveSource === 'googlebooks') {
          // ─── Google Books (Kitap) ───
          const { data } = await apolloClient.query<{
            searchBooks: AutoFillSearchResultData[];
          }>({
            query: SEARCH_BOOKS,
            variables: { query: title.trim(), startIndex: 0, maxResults: SEARCH_PAGE_SIZE },
            fetchPolicy: 'network-only',
          });
          unified = autoFillToUnified(data?.searchBooks || []);
        } else if (effectiveSource === 'igdb') {
          // ─── IGDB (Oyun) ───
          const { data } = await apolloClient.query<{
            searchIgdbGames: AutoFillSearchResultData[];
          }>({
            query: SEARCH_IGDB_GAMES,
            variables: { query: title.trim(), limit: SEARCH_PAGE_SIZE, offset: 0 },
            fetchPolicy: 'network-only',
          });
          unified = autoFillToUnified(data?.searchIgdbGames || []);
        } else if (effectiveSource === 'openlibrary') {
          // ─── Open Library (Kitap) ───
          const { data } = await apolloClient.query<{
            searchOpenLibrary: AutoFillSearchResultData[];
          }>({
            query: SEARCH_OPEN_LIBRARY,
            variables: { query: title.trim(), offset: 0, limit: SEARCH_PAGE_SIZE },
            fetchPolicy: 'network-only',
          });
          unified = autoFillToUnified(data?.searchOpenLibrary || []);
        }

        if (requestId !== searchRequestId.current) return;

        setSearchResults(unified);
        setLastSearch({
          title: title.trim(),
          contentTypeId,
          effectiveSource,
          nextPage: 2,
        });
        setHasMoreResults(unified.length === SEARCH_PAGE_SIZE);

        if (unified.length === 0) {
          setError('Sonuç bulunamadı');
          console.log('[useAutoFill] No results found');
        } else {
          console.log(`[useAutoFill] Found ${unified.length} results from ${effectiveSource}`);
        }
      } catch (err: unknown) {
        if (requestId !== searchRequestId.current) return;
        const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
        console.error('[useAutoFill] Search failed:', message);
        setError(`Arama başarısız: ${message}`);
      } finally {
        if (requestId === searchRequestId.current) {
          setIsSearching(false);
        }
      }
    },
    [getEffectiveSource]
  );

  const loadMoreResults = useCallback(async () => {
    if (!lastSearch || isLoadingMore || !hasMoreResults) return;

    const requestId = searchRequestId.current;
    setIsLoadingMore(true);
    setError(null);

    try {
      const nextResults = await fetchExternalResults(
        lastSearch.title,
        lastSearch.contentTypeId,
        lastSearch.effectiveSource,
        lastSearch.nextPage
      );

      if (requestId !== searchRequestId.current) return;

      setSearchResults((prev) => {
        if (requestId !== searchRequestId.current) return prev;
        const existingIds = new Set(prev.map((item) => item.sourceId));
        const uniqueNext = nextResults.filter((item) => !existingIds.has(item.sourceId));
        return [...prev, ...uniqueNext];
      });
      setLastSearch((prev) =>
        requestId === searchRequestId.current &&
        prev?.title === lastSearch.title &&
        prev.contentTypeId === lastSearch.contentTypeId &&
        prev.effectiveSource === lastSearch.effectiveSource &&
        prev.nextPage === lastSearch.nextPage
          ? { ...prev, nextPage: prev.nextPage + 1 }
          : prev
      );
      setHasMoreResults(nextResults.length === SEARCH_PAGE_SIZE);
    } catch (err: unknown) {
      if (requestId !== searchRequestId.current) return;
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('[useAutoFill] Load more failed:', message);
      setError(`Daha fazla sonuç alınamadı: ${message}`);
    } finally {
      if (requestId === searchRequestId.current) {
        setIsLoadingMore(false);
      }
    }
  }, [fetchExternalResults, hasMoreResults, isLoadingMore, lastSearch]);

  /**
   * Detay çekip mappedData döndüren standalone yardımcı fonksiyon (Toplu ekleme vb. için)
   */
  const fetchAndMapDetails = useCallback(
    (sourceId: string, contentTypeId: string) =>
      fetchAndMapAutoFillDetails(sourceId, contentTypeId, getEffectiveSource),
    [getEffectiveSource]
  );
  const handleSelect = useCallback(
    async (sourceId: string) => {
      const contentTypeId = formData.contentTypeId;
      setIsFetchingDetails(true);
      setError(null);

      try {
        const { mappedData, autoFillSource, effectiveSource } = await fetchAndMapDetails(
          sourceId,
          contentTypeId
        );

        setFormData((prev) => ({
          ...prev,
          ...mappedData,
          tmdbId: effectiveSource === 'tmdb' ? parseInt(sourceId, 10) : prev.tmdbId,
          igdbId: effectiveSource === 'igdb' ? parseInt(sourceId, 10) : prev.igdbId,
          autoFillSourceId: sourceId,
          autoFillSource,
        }));

        console.log(`[useAutoFill] Form data updated from ${effectiveSource}`);
        setShowResults(false);
        setSearchResults([]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
        console.error('[useAutoFill] Detail fetch failed:', message);
        setError(`Detay alınamadı: ${message}`);
      } finally {
        setIsFetchingDetails(false);
      }
    },
    [formData.contentTypeId, setFormData, fetchAndMapDetails]
  );

  const handleUpdateExisting = useCallback(
    async (localContentId: string, sourceId: string) => {
      const contentTypeId = formData.contentTypeId;
      if (!contentTypeId) {
        const errorMessage = 'Content tipi belirlenemedi.';
        toast.error(errorMessage);
        setError(errorMessage);
        return;
      }

      setIsUpdatingExisting(true);
      setUpdatingLocalId(localContentId);
      setError(null);

      try {
        const effectiveSource = getEffectiveSource(contentTypeId);
        let mappedData: Partial<AddContentFormData> = {};

        if (effectiveSource === 'tmdb') {
          const mediaType = contentTypeId === '2' ? 'tv' : 'movie';
          const tmdbId = parseInt(sourceId, 10);
          const { data } = await apolloClient.query<{
            fetchTmdbDetails: TmdbDetailResultData;
          }>({
            query: FETCH_TMDB_DETAILS,
            variables: { tmdbId, type: mediaType },
            fetchPolicy: 'network-only',
          });
          const detail = data?.fetchTmdbDetails;
          if (!detail) throw new Error('TMDB detayları alınamadı.');
          mappedData = mapTmdbToFormData(detail, contentTypeId);
        } else if (effectiveSource === 'googlebooks') {
          const { data } = await apolloClient.query<{
            fetchBookDetails: AutoFillBookDetailData;
          }>({
            query: FETCH_BOOK_DETAILS,
            variables: { volumeId: sourceId },
            fetchPolicy: 'network-only',
          });
          const detail = data?.fetchBookDetails;
          if (!detail) throw new Error('Google Books detayları alınamadı.');
          mappedData = mapBookToFormData(detail);
        } else if (effectiveSource === 'igdb') {
          const gameId = parseInt(sourceId, 10);
          const { data } = await apolloClient.query<{
            fetchIgdbGameDetails: AutoFillGameDetailData;
          }>({
            query: FETCH_IGDB_GAME_DETAILS,
            variables: { gameId },
            fetchPolicy: 'network-only',
          });
          const detail = data?.fetchIgdbGameDetails;
          if (!detail) throw new Error('IGDB oyun detayları alınamadı.');
          mappedData = mapGameToFormData(detail);
        } else if (effectiveSource === 'openlibrary') {
          const { data } = await apolloClient.query<{
            fetchOpenLibraryDetails: AutoFillBookDetailData;
          }>({
            query: FETCH_OPEN_LIBRARY_DETAILS,
            variables: { workKey: sourceId },
            fetchPolicy: 'network-only',
          });
          const detail = data?.fetchOpenLibraryDetails;
          if (!detail) throw new Error('Open Library kitap detayları alınamadı.');
          mappedData = mapOpenLibraryToFormData(detail);
        } else {
          throw new Error('Desteklenmeyen kaynak.');
        }

        const input: any = {
          ...mappedData,
          contentTypeId: parseInt(contentTypeId, 10),
        };

        const result = await updateContent(localContentId, input);
        if (result.error) {
          throw result.error;
        }

        toast.success('İçerik API verileriyle güncellendi.');
        await searchLocal();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Güncelleme başarısız oldu.';
        setError(`Güncelleme başarısız: ${message}`);
        toast.error(message);
        console.error('[useAutoFill] Update existing failed:', err);
      } finally {
        setIsUpdatingExisting(false);
        setUpdatingLocalId(null);
      }
    },
    [formData.contentTypeId, getEffectiveSource, searchLocal]
  );

  /**
   * Sonuç listesini kapat
   */
  const closeResults = useCallback(() => {
    searchRequestId.current += 1;
    localSearchRequestId.current += 1;
    setShowResults(false);
    setSearchResults([]);
    setLocalResults([]);
    setIsSearching(false);
    setIsSearchingLocal(false);
    setIsLoadingMore(false);
    setHasMoreResults(false);
    setLastSearch(null);
    setError(null);
  }, []);

  return {
    searchResults,
    localResults,
    isSearching,
    isLoadingMore,
    hasMoreResults,
    isSearchingLocal,
    isFetchingDetails,
    isUpdatingExisting,
    updatingLocalId,
    showResults,
    error,
    handleSearch,
    loadMoreResults,
    searchLocal,
    handleSelect,
    handleUpdateExisting,
    closeResults,
    sourceName,
    fetchAndMapDetails,
  };
}
