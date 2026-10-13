import { apolloClient } from '@/lib/apollo-client';
import {
  FETCH_BOOK_DETAILS,
  FETCH_IGDB_GAME_DETAILS,
  FETCH_OPEN_LIBRARY_DETAILS,
  type AutoFillBookDetailData,
  type AutoFillGameDetailData,
} from '@/services/graphql/admin/adminAutoFill';
import {
  FETCH_TMDB_DETAILS,
  type TmdbDetailResultData,
} from '@/services/graphql/admin/adminTmdb';
import { CREATE_SERIES, SEARCH_SERIES } from '@/services/graphql/admin/adminCategories';
import { mapBookToFormData } from '../utils/bookMapper';
import { mapGameToFormData } from '../utils/gameMapper';
import { mapOpenLibraryToFormData } from '../utils/openLibraryMapper';
import { mapTmdbToFormData } from '../utils/tmdbMapper';
import type { AddContentFormData } from '../types';

type EffectiveSourceResolver = (contentTypeId: string) => string;

export interface AutoFillDetailsResult {
  mappedData: Partial<AddContentFormData>;
  autoFillSource: string;
  effectiveSource: string;
}

export async function fetchAndMapAutoFillDetails(
  sourceId: string,
  contentTypeId: string,
  getEffectiveSource: EffectiveSourceResolver
): Promise<AutoFillDetailsResult> {
  const effectiveSource = getEffectiveSource(contentTypeId);
  console.log(`[useAutoFill] Fetching details from ${effectiveSource}: sourceId=${sourceId}`);

  let mappedData: Partial<AddContentFormData> = {};

  if (effectiveSource === 'tmdb') {
    const mediaType = contentTypeId === '2' ? 'tv' : 'movie';
    const tmdbId = parseInt(sourceId, 10);
    const { data } = await apolloClient.query<{ fetchTmdbDetails: TmdbDetailResultData }>({
      query: FETCH_TMDB_DETAILS,
      variables: { tmdbId, type: mediaType },
      fetchPolicy: 'network-only',
    });
    const detail = data?.fetchTmdbDetails;
    if (!detail) throw new Error('TMDB detay bilgisi alınamadı');
    mappedData = mapTmdbToFormData(detail, contentTypeId);
  } else if (effectiveSource === 'googlebooks') {
    const { data } = await apolloClient.query<{ fetchBookDetails: AutoFillBookDetailData }>({
      query: FETCH_BOOK_DETAILS,
      variables: { volumeId: sourceId },
      fetchPolicy: 'network-only',
    });
    const detail = data?.fetchBookDetails;
    if (!detail) throw new Error('Kitap detay bilgisi alınamadı');
    mappedData = mapBookToFormData(detail);
  } else if (effectiveSource === 'igdb') {
    const gameId = parseInt(sourceId, 10);
    const { data } = await apolloClient.query<{ fetchIgdbGameDetails: AutoFillGameDetailData }>({
      query: FETCH_IGDB_GAME_DETAILS,
      variables: { gameId },
      fetchPolicy: 'network-only',
    });
    const detail = data?.fetchIgdbGameDetails;
    if (!detail) throw new Error('IGDB oyun detay bilgisi alınamadı');
    mappedData = mapGameToFormData(detail);
  } else if (effectiveSource === 'openlibrary') {
    const { data } = await apolloClient.query<{ fetchOpenLibraryDetails: AutoFillBookDetailData }>({
      query: FETCH_OPEN_LIBRARY_DETAILS,
      variables: { workKey: sourceId },
      fetchPolicy: 'network-only',
    });
    const detail = data?.fetchOpenLibraryDetails;
    if (!detail) throw new Error('Open Library kitap detay bilgisi alınamadı');
    mappedData = mapOpenLibraryToFormData(detail);
  }

  const autoFillSource =
    effectiveSource === 'tmdb'
      ? contentTypeId === '2'
        ? 'tmdb_tv'
        : 'tmdb_movie'
      : effectiveSource === 'googlebooks'
        ? 'googlebooks'
        : effectiveSource === 'openlibrary'
          ? 'openlibrary'
          : effectiveSource;

  if (mappedData.franchise?.name && !mappedData.franchise.id) {
    try {
      const franchiseName = mappedData.franchise.name;
      const searchResult = await apolloClient.query<{
        searchSeries: Array<{ id: string; name: string }>;
      }>({
        query: SEARCH_SERIES,
        variables: { search: franchiseName, limit: 5 },
        fetchPolicy: 'network-only',
      });

      const existingSeries = searchResult.data?.searchSeries || [];
      const exactMatch = existingSeries.find(
        (series) => series.name.toLowerCase() === franchiseName.toLowerCase()
      );

      if (exactMatch) {
        mappedData.franchise = { id: exactMatch.id, name: exactMatch.name };
      } else {
        const createResult = await apolloClient.mutate<{
          createSeries: { id: string; name: string };
        }>({
          mutation: CREATE_SERIES,
          variables: { input: { name: franchiseName } },
        });

        if (createResult.data?.createSeries) {
          const created = createResult.data.createSeries;
          mappedData.franchise = { id: created.id, name: created.name };
        }
      }
    } catch (franchiseError) {
      console.error('[useAutoFill] Franchise resolution failed:', franchiseError);
    }
  }

  return { mappedData, autoFillSource, effectiveSource };
}
