/**
 * StatsTab — Type definitions
 * Shared types for the StatsTab feature (charts, hooks, utils).
 */

export type ContentTypeLabel = 'Movies' | 'TV' | 'Games' | 'Books';

export type SnakeCasedContentItem = {
  id?: string | number;
  title?: string;
  name?: string;
  posterUrl?: string | null;
  consumeCount?: number;
  favoriteCount?: number;
  contentType?: string | { id?: number; name?: string } | null;
  content_type?: string | { id?: number; name?: string } | null;
  content_type_id?: number;
  release_date?: string | null;
  user_date?: string | null;
  user_rating?: number | null;
  is_favorite?: boolean;
  is_consumed?: boolean;
  is_continuing?: boolean;
  is_consume_later?: boolean;
  is_abandoned?: boolean;
  genres?: Array<{ id?: number; name?: string } | string>;
  platform?: string;
  runtime?: number | null;
  page_count?: number | null;
  playtime_minutes?: number | null;
};

export interface ProfileStatsTabProps {
  username: string;
  watched: {
    movies: SnakeCasedContentItem[];
    tv: SnakeCasedContentItem[];
    games: SnakeCasedContentItem[];
    books: SnakeCasedContentItem[];
  };
  favorites: {
    movies: SnakeCasedContentItem[];
    tv: SnakeCasedContentItem[];
    games: SnakeCasedContentItem[];
    books: SnakeCasedContentItem[];
  };
  basicStats: {
    totalMovies: number;
    thisYearMovies: number;
    averageRating: number;
    discussionCount: number;
  };
}

export type TimeRangeKey = '24h' | 'week' | 'month' | '6m' | 'year' | 'all';

export type ContentTypeFilterKey = 'all' | 'movies' | 'tv' | 'games' | 'books';

export type DateBucket = {
  month: string; // YYYY-MM
  count: number;
  ratedCount: number;
  avgRating: number | null;
};

export interface ComputedStats {
  monthSeries: DateBucket[];
  ratingHistogram: { rating: number; count: number }[];
  typePie: { name: string; value: number }[];
  favoritePie: { name: string; value: number }[];
  topGenres: { name: string; value: number }[];
  yearsConsumed: { year: string; value: number; avgRating: number | null }[];
  yearsRelease: { year: string; value: number }[];
  avgRatingAll: number | null;
  ratedCount: number;
  streak: { current: number; best: number };
  continuingCount: number;
  consumeLaterCount: number;
  favoritesInWatchedCount: number;
  completionPct: number;
  favoriteFromWatchedPct: number;
  totalWatched: number;
  totalConsumed: number;
  totalFavorites: number;
  consumedTypeCounts: {
    movies: number;
    tv: number;
    games: number;
    books: number;
  };
}

export interface ComparisonStats {
  watchedP: number;
  favP: number;
  streakP: number;
  ratingP: number | null;
}

// ── Deep Stats Types ──────────────────────────────────────

export type PersonStat = {
  personId: number;
  personName: string;
  profileUrl?: string | null;
  count: number;
  avgRating: number | null;
  favoriteCount: number;
};

export type CompanyStat = {
  companyId: string;
  companyName: string;
  logoUrl?: string | null;
  count: number;
  avgRating: number | null;
  totalPlaytimeMinutes: number;
};

export type TagStat = {
  name: string;
  count: number;
  avgRating: number | null;
};

export type FranchiseStat = {
  franchiseName: string;
  count: number;
  avgRating: number | null;
  totalRuntime: number;
};

export type ContentRatingComp = {
  contentId: string;
  title: string;
  posterUrl?: string | null;
  contentTypeSlug?: string;
  userRating: number;
  globalAvgRating: number;
  globalRatingCount: number;
  delta: number;
};

export type RuntimeSummary = {
  totalRuntimeMinutes: number;
  totalPlaytimeMinutes: number;
  totalPagesRead: number;
  estimatedReadHours: number;
};

export type TypeCountStat = {
  name: string;
  count: number;
};

export type UserCompatibilityStat = {
  userId: string;
  username: string;
  picturePath?: string | null;
  score: number;
  sharedRatingsCount: number;
  avgRatingDiff: number;
};

export interface ProfileDeepStats {
  runtimeSummary: RuntimeSummary;
  topDirectors: PersonStat[];
  bestRatedDirectors: PersonStat[];
  worstRatedDirectors: PersonStat[];
  topActors: PersonStat[];
  topWriters: PersonStat[];
  topAuthors: PersonStat[];
  topCrew: PersonStat[];
  topPublishers: CompanyStat[];
  topDevelopers: CompanyStat[];
  topThemes: TagStat[];
  topMoods: TagStat[];
  topGameModes: TagStat[];
  topPlatforms: TagStat[];
  topPerspectives: TagStat[];
  topFranchises: FranchiseStat[];
  ageRatingDistribution: TagStat[];
  mostOverrated: ContentRatingComp[];
  mostUnderrated: ContentRatingComp[];
  abandonedCount: number;
  abandonedByType: TypeCountStat[];
  reviewCount: number;
  avgReviewLength: number;
  friendCompatibility: UserCompatibilityStat[];
  globalCompatibility: UserCompatibilityStat[];
}

export function emptyDeepStats(): ProfileDeepStats {
  return {
    runtimeSummary: {
      totalRuntimeMinutes: 0,
      totalPlaytimeMinutes: 0,
      totalPagesRead: 0,
      estimatedReadHours: 0,
    },
    topDirectors: [],
    bestRatedDirectors: [],
    worstRatedDirectors: [],
    topActors: [],
    topWriters: [],
    topAuthors: [],
    topCrew: [],
    topPublishers: [],
    topDevelopers: [],
    topThemes: [],
    topMoods: [],
    topGameModes: [],
    topPlatforms: [],
    topPerspectives: [],
    topFranchises: [],
    ageRatingDistribution: [],
    mostOverrated: [],
    mostUnderrated: [],
    abandonedCount: 0,
    abandonedByType: [],
    reviewCount: 0,
    avgReviewLength: 0,
    friendCompatibility: [],
    globalCompatibility: [],
  };
}
