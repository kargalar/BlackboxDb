// ==========================================
// CONTENT TYPESCRIPT TYPES
// ==========================================

export interface AdminContent {
  id: string;
  title: string;
  tmdbId?: number;
  igdbId?: number;
  originalTitle?: string;
  alternativeTitles?: string[];
  contentTypeId: string | number;
  contentTypeSlug?: string;
  additionalRatingCategories?: string[];
  releaseDate?: string;
  description?: string;
  status?: string;
  runtime?: number;
  isbn?: string;
  pageCount?: number;
  isContinuing?: boolean;
  posterUrl?: string;
  backdropUrl?: string;
  autoSelectHighestVotedMedia?: boolean;
  images?: Array<{
    id: number;
    contentId: string;
    type: string;
    version: string;
    filePath: string;
    upvoteCount: number;
    downvoteCount: number;
    userVote?: number | null;
  }>;
  seriesId?: number;
  franchiseId?: string;
  franchiseName?: string;
  seriesName?: string;
  genres?: Array<{ id?: number; name: string }>;
  budget?: string | number;
  revenue?: string | number;
  averageDuration?: number;
  numberOfEpisodes?: number;
  numberOfSeasons?: number;
  tvType?: string;
  inProduction?: boolean;
  firstAirDate?: string;
  lastAirDate?: string;
  authors?: string;

  previewLink?: string;
  infoLink?: string;
  primaryBookPublication?: AdminBookPublication | null;
  bookPublications?: AdminBookPublication[];
  publisherId?: number;
  languages?: string[];
  gameModes?: Array<{ id?: number; name: string }>;
  gameEngines?: Array<{ id?: number; name: string }>;
  perspectives?: Array<{ id?: number; name: string }>;
  platforms?: Array<{ id?: number; name: string }>;
  fileSize?: string;
  themes?: Array<{ id?: number; name: string }>;
  moods?: Array<{ id?: number; name: string }>;
  ageRating?: { id?: number; name: string } | null;
  awards?: string[];
  cast?: string;
  crew?: string;
  seasons?: string;
  companies?: Array<{
    id: number;
    contentId: string;
    companyId: string;
    companyRoleId: number;
    company?: {
      id: string;
      name: string;
      description?: string;
      headquarters?: string;
      logoUrl?: string;
      website?: string;
      foundingYear?: number;
    };
  }>;
  expansions?: Array<{
    id: number;
    contentId: string;
    name: string;
    description?: string;
    posterUrl?: string;
    releaseDate?: string;
  }>;
  screenshots?: Array<{
    id: number;
    imageUrl: string;
    difficulty: number;
    order: number;
    seasonNumber?: number | null;
    isEnabledForQuiz: boolean;
    isSpoiler?: boolean;
    isSensitive?: boolean;
    upvoteCount: number;
    downvoteCount: number;
    userVote?: number | null;
  }>;
  similarContents?: Array<{
    id: string;
    title: string;
    releaseDate?: string;
    posterUrl?: string;
    contentType: {
      id: number;
      name: string;
    };
  }>;
  trailerUrl?: string;
  reviewVideoUrl?: string;
  gameplayVideoUrl?: string;
  spotifyPlaylistUrl?: string;
  lockedFields?: string[];
  createdAt: string;
}

export interface AdminBookPublication {
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
  ratingDistribution: number[];
  averageRating?: number | null;
  ratingCount: number;
}

export interface ContentEditHistory {
  id: number;
  contentId?: string | null;
  actorUserId?: string | null;
  action: string;
  summary?: string | null;
  changedFields: string[];
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  createdAt: string;
  actor?: {
    id: string;
    username: string;
    email: string;
    picturePath?: string;
  } | null;
  content?: {
    id: string;
    title: string;
    originalTitle?: string;
    contentTypeId: number;
    posterUrl?: string;
    isDeleted?: boolean;
  } | null;
}

export interface AdminContentEditHistoryResponse {
  items: ContentEditHistory[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ContentRequest {
  id: number;
  requesterUserId: string;
  title: string;
  contentTypeId: number;
  releaseDate?: string;
  description?: string;
  reason?: string;
  payload?: Record<string, any>;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface UpdateContentInput {
  [key: string]: any;
  title?: string;
  description?: string;
  releaseDate?: string;
  runtime?: number;
  autoSelectHighestVotedMedia?: boolean;

  images?: ImageInput[];
}

export interface CreateContentRequestInput {
  title: string;
  contentTypeId: number;
  releaseDate?: string;
  description?: string;
  reason?: string;
  payload?: Record<string, any>;
}

export interface ContentLanguageInput {
  id?: number;
  name: string;
}

export interface AdminBookPublicationInput {
  id?: number;
  title?: string;
  subtitle?: string;
  isbn?: string;
  publisher?: {
    id?: string;
    name: string;
    companyRoleId: number;
    description?: string;
    headquarters?: string;
    logoUrl?: string;
    website?: string;
    foundingYear?: number;
  };
  translators?: string;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  publishedDate?: string;
  editionType?: string;
  format?: string;
  isOriginal?: boolean;
  isAbridged?: boolean;
}

export interface ImageInput {
  id?: number;
  filePath: string;
  type: string;
}

export interface CreateContentInput {
  title: string;
  tmdbId?: number;
  igdbId?: number;
  contentTypeId: number;
  releaseDate?: string;
  description?: string;
  status?: string;
  runtime?: number;
  isbn?: string;
  pageCount?: number;
  isContinuing?: boolean;
  posterUrl?: string;
  backdropUrl?: string;
  seriesId?: number;
  franchiseId?: string;
  franchiseName?: string;
  languages?: ContentLanguageInput[];
  budget?: bigint;
  revenue?: bigint;
  averageDuration?: number;
  numberOfEpisodes?: number;
  numberOfSeasons?: number;
  tvType?: string;
  inProduction?: boolean;
  firstAirDate?: string;
  lastAirDate?: string;
  subtitle?: string;
  authors?: string[];
  translators?: string;
  publisher?: string;
  publishedDate?: string;
  bookPublications?: AdminBookPublicationInput[];
  previewLink?: string;
  infoLink?: string;
  categories?: string[];
  maturityRating?: string;
  gameEngines?: Array<{ id?: number; name: string }>;
  gameModeIds?: number[];
  perspectiveIds?: number[];
  themeIds?: number[];
  similarContentIds?: string[];
  images?: ImageInput[];
  trailerUrl?: string;
  reviewVideoUrl?: string;
  gameplayVideoUrl?: string;
}
