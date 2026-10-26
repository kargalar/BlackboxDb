import type { UnifiedContent } from '@/types/unified-content';

interface SearchResult {
  items: UnifiedContent[];
  total: number;
  page: number;
  totalPages: number;
}

// Server-side filter parameters
export interface ServerFilters {
  genreIds?: number[];
  themeIds?: number[];
  moodIds?: number[];
  ageRatingIds?: number[];
  platformIds?: number[];
  actorIds?: string[];
  directorIds?: string[];
  companyIds?: string[];
  languageCodes?: string[];
  publicationLanguageCodes?: string[];
  yearMin?: number;
  yearMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  durationMin?: number;
  durationMax?: number;
  gameModeIds?: number[];
  gameEngineIds?: number[];
  perspectiveIds?: number[];
  emptyFilters?: string[];
  sortBy?: string;
  sortOrder?: string;
  hasAwards?: boolean;
  // User-state filters: 'show' | 'hide' | 'passive'
  hideWatched?: string;
  hideWatchlist?: string;
  hideContinuing?: string;
  hideFavorites?: string;
  hideAbandoned?: string;
  hideInAnyList?: string;
}

// Filter counts interface for sidebar display
export interface FilterCounts {
  genres: Record<string, number>;
  themes: Record<string, number>;
  moods: Record<string, number>;
  ageRatings: Record<string, number>;
  languages: Record<string, number>;
  publicationLanguages: Record<string, number>;
  platforms: Record<string, number>;
  actors: Record<number | string, number>;
  directors: Record<number | string, number>;
  companies: Record<number | string, number>;
  gameModes: Record<string, number>;
  gameEngines?: Record<string, number>;
  perspectives: Record<string, number>;
}

// Backend GraphQL endpoint
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

function getAuthHeaders(): Record<string, string> {
  return {};
}

// Common GraphQL fragment for content fields
const CONTENT_FIELDS = `
  id
  title
  description
  posterUrl
  backdropUrl
  releaseDate
  runtime
  averageDuration
  pageCount
  languages
  ratingDistribution
  tmdbRating
  discussionCount
  consumeCount
  favoriteCount
  contentType {
    id
    name
  }
  genres {
    id
    name
  }
  themes {
    id
    name
  }
  moods {
    id
    name
  }
  ageRating {
    id
    name
  }
  people {
    role
    person {
      id
      name
    }
  }
  companies {
    companyId
    companyRoleId
    company {
      id
      name
    }
  }
  screenshots {
    id
    imageUrl
    order
  }
`;

export async function searchContent(
  searchQuery: string,
  contentTypeId: number,
  page: number = 1,
  limit: number = 20,
  filters?: ServerFilters,
  signal?: AbortSignal
): Promise<SearchResult> {
  const offset = (page - 1) * limit;

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    signal,
    body: JSON.stringify({
      query: `
        query SearchContent(
          $searchQuery: String
          $contentTypeId: Int
          $limit: Int
          $offset: Int
          $genreIds: [Int!]
          $themeIds: [Int!]
          $moodIds: [Int!]
          $ageRatingIds: [Int!]
          $platformIds: [Int!]
          $actorIds: [String!]
          $directorIds: [String!]
          $companyIds: [String!]
          $languageCodes: [String!]
          $publicationLanguageCodes: [String!]
          $yearMin: Int
          $yearMax: Int
          $ratingMin: Float
          $ratingMax: Float
          $durationMin: Int
          $durationMax: Int
          $gameModeIds: [Int!]
          $gameEngineIds: [Int!]
          $perspectiveIds: [Int!]
          $emptyFilters: [String!]
          $sortBy: String
          $sortOrder: String
          $hasAwards: Boolean
          $hideWatched: String
          $hideWatchlist: String
          $hideContinuing: String
          $hideFavorites: String
          $hideAbandoned: String
          $hideInAnyList: String
        ) {
          searchContent(
            searchQuery: $searchQuery
            contentTypeId: $contentTypeId
            limit: $limit
            offset: $offset
            genreIds: $genreIds
            themeIds: $themeIds
            moodIds: $moodIds
            ageRatingIds: $ageRatingIds
            platformIds: $platformIds
            actorIds: $actorIds
            directorIds: $directorIds
            companyIds: $companyIds
            languageCodes: $languageCodes
            publicationLanguageCodes: $publicationLanguageCodes
            yearMin: $yearMin
            yearMax: $yearMax
            ratingMin: $ratingMin
            ratingMax: $ratingMax
            durationMin: $durationMin
            durationMax: $durationMax
            gameModeIds: $gameModeIds
            gameEngineIds: $gameEngineIds
            perspectiveIds: $perspectiveIds
            emptyFilters: $emptyFilters
            sortBy: $sortBy
            sortOrder: $sortOrder
            hasAwards: $hasAwards
            hideWatched: $hideWatched
            hideWatchlist: $hideWatchlist
            hideContinuing: $hideContinuing
            hideFavorites: $hideFavorites
            hideAbandoned: $hideAbandoned
            hideInAnyList: $hideInAnyList
          ) {
            items {
              ${CONTENT_FIELDS}
            }
            total
            page
            totalPages
          }
        }
      `,
      variables: {
        searchQuery,
        contentTypeId,
        limit,
        offset,
        ...(filters?.genreIds?.length ? { genreIds: filters.genreIds } : {}),
        ...(filters?.themeIds?.length ? { themeIds: filters.themeIds } : {}),
        ...(filters?.moodIds?.length ? { moodIds: filters.moodIds } : {}),
        ...(filters?.ageRatingIds?.length ? { ageRatingIds: filters.ageRatingIds } : {}),
        ...(filters?.platformIds !== undefined ? { platformIds: filters.platformIds } : {}),
        ...(filters?.actorIds?.length ? { actorIds: filters.actorIds } : {}),
        ...(filters?.directorIds?.length ? { directorIds: filters.directorIds } : {}),
        ...(filters?.companyIds?.length ? { companyIds: filters.companyIds } : {}),
        ...(filters?.languageCodes?.length ? { languageCodes: filters.languageCodes } : {}),
        ...(filters?.publicationLanguageCodes?.length
          ? { publicationLanguageCodes: filters.publicationLanguageCodes }
          : {}),
        ...(filters?.yearMin ? { yearMin: filters.yearMin } : {}),
        ...(filters?.yearMax ? { yearMax: filters.yearMax } : {}),
        ...(filters?.ratingMin ? { ratingMin: filters.ratingMin } : {}),
        ...(filters?.ratingMax ? { ratingMax: filters.ratingMax } : {}),
        ...(filters?.sortBy ? { sortBy: filters.sortBy } : {}),
        ...(filters?.sortOrder ? { sortOrder: filters.sortOrder } : {}),
        ...(filters?.hasAwards !== undefined ? { hasAwards: filters.hasAwards } : {}),
        ...(filters?.hideWatched && filters.hideWatched !== 'passive'
          ? { hideWatched: filters.hideWatched }
          : {}),
        ...(filters?.hideWatchlist && filters.hideWatchlist !== 'passive'
          ? { hideWatchlist: filters.hideWatchlist }
          : {}),
        ...(filters?.hideContinuing && filters.hideContinuing !== 'passive'
          ? { hideContinuing: filters.hideContinuing }
          : {}),
        ...(filters?.hideFavorites && filters.hideFavorites !== 'passive'
          ? { hideFavorites: filters.hideFavorites }
          : {}),
        ...(filters?.hideAbandoned && filters.hideAbandoned !== 'passive'
          ? { hideAbandoned: filters.hideAbandoned }
          : {}),
        ...(filters?.hideInAnyList && filters.hideInAnyList !== 'passive'
          ? { hideInAnyList: filters.hideInAnyList }
          : {}),
        ...(filters?.durationMin != null ? { durationMin: filters.durationMin } : {}),
        ...(filters?.durationMax != null ? { durationMax: filters.durationMax } : {}),
        ...(filters?.gameModeIds?.length ? { gameModeIds: filters.gameModeIds } : {}),
        ...(filters?.gameEngineIds?.length ? { gameEngineIds: filters.gameEngineIds } : {}),
        ...(filters?.perspectiveIds?.length ? { perspectiveIds: filters.perspectiveIds } : {}),
        ...(filters?.emptyFilters ? { emptyFilters: filters.emptyFilters } : {}),
      },
    }),
  });

  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0]?.message);
  console.log(
    '🔍 [searchContent] Query results:',
    data.searchContent.items.length,
    'items, total:',
    data.searchContent.total,
    'filters applied:',
    filters
      ? Object.keys(filters)
          .filter((k) => (filters as any)[k] != null)
          .join(', ')
      : 'none'
  );
  return data.searchContent;
}

export async function getPopularContent(
  contentTypeId: number,
  page: number = 1,
  limit: number = 20,
  filters?: ServerFilters,
  signal?: AbortSignal
): Promise<SearchResult> {
  const offset = (page - 1) * limit;

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    signal,
    body: JSON.stringify({
      query: `
        query GetPopularContent(
          $contentTypeId: Int
          $limit: Int
          $offset: Int
          $genreIds: [Int!]
          $themeIds: [Int!]
          $moodIds: [Int!]
          $ageRatingIds: [Int!]
          $platformIds: [Int!]
          $actorIds: [String!]
          $directorIds: [String!]
          $companyIds: [String!]
          $languageCodes: [String!]
          $publicationLanguageCodes: [String!]
          $yearMin: Int
          $yearMax: Int
          $ratingMin: Float
          $ratingMax: Float
          $durationMin: Int
          $durationMax: Int
          $gameModeIds: [Int!]
          $perspectiveIds: [Int!]
          $emptyFilters: [String!]
          $sortBy: String
          $sortOrder: String
          $hasAwards: Boolean
          $hideWatched: String
          $hideWatchlist: String
          $hideContinuing: String
          $hideFavorites: String
          $hideAbandoned: String
          $hideInAnyList: String
        ) {
          searchContent(
            contentTypeId: $contentTypeId
            limit: $limit
            offset: $offset
            genreIds: $genreIds
            themeIds: $themeIds
            moodIds: $moodIds
            ageRatingIds: $ageRatingIds
            platformIds: $platformIds
            actorIds: $actorIds
            directorIds: $directorIds
            companyIds: $companyIds
            languageCodes: $languageCodes
            publicationLanguageCodes: $publicationLanguageCodes
            yearMin: $yearMin
            yearMax: $yearMax
            ratingMin: $ratingMin
            ratingMax: $ratingMax
            durationMin: $durationMin
            durationMax: $durationMax
            gameModeIds: $gameModeIds
            perspectiveIds: $perspectiveIds
            emptyFilters: $emptyFilters
            sortBy: $sortBy
            sortOrder: $sortOrder
            hasAwards: $hasAwards
            hideWatched: $hideWatched
            hideWatchlist: $hideWatchlist
            hideContinuing: $hideContinuing
            hideFavorites: $hideFavorites
            hideAbandoned: $hideAbandoned
            hideInAnyList: $hideInAnyList
          ) {
            items {
              ${CONTENT_FIELDS}
            }
            total
            page
            totalPages
          }
        }
      `,
      variables: {
        contentTypeId,
        limit,
        offset,
        ...(filters?.genreIds?.length ? { genreIds: filters.genreIds } : {}),
        ...(filters?.themeIds?.length ? { themeIds: filters.themeIds } : {}),
        ...(filters?.moodIds?.length ? { moodIds: filters.moodIds } : {}),
        ...(filters?.ageRatingIds?.length ? { ageRatingIds: filters.ageRatingIds } : {}),
        ...(filters?.platformIds !== undefined ? { platformIds: filters.platformIds } : {}),
        ...(filters?.actorIds?.length ? { actorIds: filters.actorIds } : {}),
        ...(filters?.directorIds?.length ? { directorIds: filters.directorIds } : {}),
        ...(filters?.companyIds?.length ? { companyIds: filters.companyIds } : {}),
        ...(filters?.languageCodes?.length ? { languageCodes: filters.languageCodes } : {}),
        ...(filters?.publicationLanguageCodes?.length
          ? { publicationLanguageCodes: filters.publicationLanguageCodes }
          : {}),
        ...(filters?.yearMin ? { yearMin: filters.yearMin } : {}),
        ...(filters?.yearMax ? { yearMax: filters.yearMax } : {}),
        ...(filters?.ratingMin ? { ratingMin: filters.ratingMin } : {}),
        ...(filters?.ratingMax ? { ratingMax: filters.ratingMax } : {}),
        ...(filters?.sortBy ? { sortBy: filters.sortBy } : {}),
        ...(filters?.sortOrder ? { sortOrder: filters.sortOrder } : {}),
        ...(filters?.hasAwards !== undefined ? { hasAwards: filters.hasAwards } : {}),
        ...(filters?.hideWatched && filters.hideWatched !== 'passive'
          ? { hideWatched: filters.hideWatched }
          : {}),
        ...(filters?.hideWatchlist && filters.hideWatchlist !== 'passive'
          ? { hideWatchlist: filters.hideWatchlist }
          : {}),
        ...(filters?.hideContinuing && filters.hideContinuing !== 'passive'
          ? { hideContinuing: filters.hideContinuing }
          : {}),
        ...(filters?.hideFavorites && filters.hideFavorites !== 'passive'
          ? { hideFavorites: filters.hideFavorites }
          : {}),
        ...(filters?.hideAbandoned && filters.hideAbandoned !== 'passive'
          ? { hideAbandoned: filters.hideAbandoned }
          : {}),
        ...(filters?.hideInAnyList && filters.hideInAnyList !== 'passive'
          ? { hideInAnyList: filters.hideInAnyList }
          : {}),
        ...(filters?.durationMin != null ? { durationMin: filters.durationMin } : {}),
        ...(filters?.durationMax != null ? { durationMax: filters.durationMax } : {}),
        ...(filters?.gameModeIds?.length ? { gameModeIds: filters.gameModeIds } : {}),
        ...(filters?.perspectiveIds?.length ? { perspectiveIds: filters.perspectiveIds } : {}),
        ...(filters?.emptyFilters ? { emptyFilters: filters.emptyFilters } : {}),
      },
    }),
  });

  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0]?.message);
  console.log(
    '🔥 [getPopularContent] Query results:',
    data.searchContent.items.length,
    'items, total:',
    data.searchContent.total,
    'filters applied:',
    filters
      ? Object.keys(filters)
          .filter((k) => (filters as any)[k] != null)
          .join(', ')
      : 'none'
  );
  return data.searchContent;
}

// Fetch all content for a content type to calculate filter counts
// Uses a high limit to get all items in one request
export async function getFilterCounts(contentTypeId: number): Promise<FilterCounts> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({
      query: `
        query GetFilterCounts($contentTypeId: Int) {
          getFilterCounts(contentTypeId: $contentTypeId) {
            genres
            themes
            moods
            ageRatings
            languages
            publicationLanguages
            platforms
            actors
            directors
            companies
            gameModes
            perspectives
          }
        }
      `,
      variables: { contentTypeId },
    }),
  });

  const { data, errors } = await response.json();
  if (errors) throw new Error(errors[0]?.message);

  const counts = data.getFilterCounts;

  console.log('📊 [getFilterCounts] Retrieved fast counts:', {
    genres: Object.keys(counts.genres || {}).length,
    themes: Object.keys(counts.themes || {}).length,
    moods: Object.keys(counts.moods || {}).length,
    ageRatings: Object.keys(counts.ageRatings || {}).length,
    languages: Object.keys(counts.languages || {}).length,
    platforms: Object.keys(counts.platforms || {}).length,
    actors: Object.keys(counts.actors || {}).length,
    directors: Object.keys(counts.directors || {}).length,
    companies: Object.keys(counts.companies || {}).length,
  });

  return counts as FilterCounts;
}
