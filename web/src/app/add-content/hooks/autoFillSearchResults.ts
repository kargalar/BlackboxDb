import type { UnifiedSearchResult } from '@/components/molecules/TmdbSearchResults';
import type { TmdbSearchResultData } from '@/services/graphql/admin/adminTmdb';
import type { AutoFillSearchResultData } from '@/services/graphql/admin/adminAutoFill';

export function tmdbToUnified(items: TmdbSearchResultData[]): UnifiedSearchResult[] {
  return items.map((item) => ({
    sourceId: String(item.tmdbId),
    title: item.title,
    originalTitle: item.originalTitle,
    overview: item.overview,
    posterPath: item.posterPath,
    releaseDate: item.releaseDate,
    voteAverage: item.voteAverage,
    mediaType: item.mediaType,
  }));
}

export function autoFillToUnified(items: AutoFillSearchResultData[]): UnifiedSearchResult[] {
  return items.map((item) => ({
    sourceId: item.sourceId,
    title: item.title,
    originalTitle: item.originalTitle,
    overview: item.overview,
    posterPath: item.posterPath,
    releaseDate: item.releaseDate,
    voteAverage: item.voteAverage,
    mediaType: item.mediaType,
    extraInfo: item.extraInfo,
  }));
}
