export interface UserContentLog {
  id: string;
  userId: string;
  contentId: string;
  content?: {
    id: string;
    title: string;
    releaseDate?: Date | string | null;
    contentTypeId: number;
    people?: {
      job?: string | null;
      personRole?: { label: string } | null;
      person?: { name: string } | null;
    }[];
  } | null;
  bookPublicationId?: number | null;
  date?: Date | string | null;
  isFavorite: boolean;
  rating?: number | null;
  isConsumed?: boolean | null;
  isConsumeLater?: boolean | null;
  notifyOnRelease?: boolean | null;
  isContinuing?: boolean | null;
  isAbandoned?: boolean | null;
  playtimeMinutes?: number | null; // Oyun oynama süresi (dakika)
  userConsumeCount?: number | null;
  platformId?: number | null;
  bookFormat?: string | null;
  ratingDetails?: any;
  tags?: string[];
  taggedUsers?: { id: string; username: string; picturePath?: string }[] | null;
  updatedAt: Date | string;
  review?: string;
  hasReview?: boolean | null;
  isStandaloneReview?: boolean;
  activityType?: string;
  targetUser?: { id: string; username: string; picturePath?: string };
  discussion?: {
    id: string;
    title?: string | null;
    description?: string | null;
    upvoteCount: number;
    commentCount: number;
    createdAt: string;
  };
  userList?: {
    id: string;
    name: string;
    description?: string | null;
    isOrdered: boolean;
    createdAt: string;
  };
  user?: { id: string; username: string; picturePath?: string };
  incomingComment?: { id: string; text: string; createdAt: string };
  bookPublication?: BookPublication | null;
}

export interface BookPublication {
  id: number;
  contentId: string;
  title?: string | null;
  subtitle?: string | null;
  isbn?: string | null;
  publisherId?: string | null;
  publisher?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  translators: string[];
  language?: string | null;
  pageCount?: number | null;
  coverUrl?: string | null;
  publishedDate?: string | null;
  editionType?: string | null;
  format?: string | null;
  isOriginal: boolean;
  isAbridged: boolean;
  consumeCount: number;
  averageRating?: number | null;
  ratingCount: number;
}

export interface UserStats {
  totalMovies: number;
  thisYearMovies: number;
  averageRating: number;
  discussionCount: number;
}

export interface ContentStats {
  consumeCount: number;
  favoriteCount: number;
  consumeLaterCount: number;
  discussionCount: number;
  averageRating?: number | null;
  ratingCount: number;
  ratingDistribution: number[];
  averagePlaytimeMinutes?: number | null;
  tmdbRating?: number | null;
}

export interface RatingUser {
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  rating: number;
  createdAt: string;
}

export interface Content {
  id: string;
  title: string;
  description?: string;
  releaseDate?: string;
  posterUrl?: string;
  backdropUrl?: string;
  status?: string;
  discussionCount: number;
  favoriteCount: number;
  consumeCount: number;
  contentType: {
    id: number;
    name: string;
  };
  additionalRatingCategories?: string[];
  homepage?: string;
  spotifyPlaylistUrl?: string;
  isbn?: string;
  seriesId?: number;
  ratingDistribution?: number[];
  tmdbRating?: number | null;
  createdAt?: string;
  updatedAt?: string;
  similarDisplayTitle?: string;
  similarDisplaySubtitle?: string | null;
  similarIsFranchise?: boolean;
  similarGroupCount?: number;
  // User-specific fields (populated when queried with user context)
  userRating?: number;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  isContinuing?: boolean;
  userIsContinuing?: boolean;
  isConsumed?: boolean;
  userDate?: string;
  hasReview?: boolean;
}

export interface SaveContentInput {
  id: string;
  title: string;
  originalTitle?: string;
  contentTypeId: number;
  releaseDate?: string;
  description?: string;
  runtime?: number;
  status?: string;
  adult?: boolean;
  isbn?: string;
  rawData?: string; // Full API response - will be normalized by server
  spotifyPlaylistUrl?: string;
}

// ==========================================
// QUERY & MUTATION DATA TYPES
// ==========================================

export interface GetUserContentLogData {
  userContentLog: UserContentLog | null;
}

export interface GetUserContentLogsData {
  userContentLogs: UserContentLog[];
}

export interface GetContentLogHistoryData {
  contentLogHistory: UserContentLog[];
}

export interface GetUserWatchedContentData {
  userWatchedContent: Content[];
}

export interface GetUserFavoriteContentData {
  userFavoriteContent: Content[];
}

export interface GetUserStatsData {
  userStats: UserStats;
}

export interface GetUserFeaturedContentData {
  userFeaturedContent: Content[];
}

export interface GetContentStatsData {
  contentStats: ContentStats | null;
}

export interface GetAllUserContentLogsData {
  allUserContentLogs: UserContentLog[];
}

export interface GetActivityFeedData {
  activityFeed: UserContentLog[];
}

export interface LogContentWatchData {
  logContentWatch: boolean;
}

export interface UnlogContentWatchData {
  unlogContentWatch: boolean;
}

export interface ToggleContentFavoriteData {
  toggleContentFavorite: boolean;
}

export interface RateContentData {
  rateContent: boolean;
}

export interface SaveContentData {
  saveContent: Content;
}

// ==========================================
// LETTERBOXD IMPORT
// ==========================================
