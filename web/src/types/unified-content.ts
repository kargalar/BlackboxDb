// ======================================
// Unified Content Type Definitions
// Phase 2: API Removal
// ======================================
// These types replace the old TMDB, IGDB, and Google Books types

// ======================================
// Base Entity Types
// ======================================

export interface Person {
  id: number;
  name: string;
  biography?: string;
  birthDate?: string; // ISO date string
  deathDate?: string; // ISO date string
  gender?: 'male' | 'female' | 'other' | 'unknown';
  profileUrl?: string; // Full CDN URL
  placeOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  headquarters?: string;
  logoUrl?: string; // Full CDN URL
  website?: string;
  foundingYear?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookPublication {
  id: number;
  contentId: string;
  title?: string | null;
  subtitle?: string | null;
  isbn?: string | null;
  publisherId?: string | null;
  publisher?: Company | null;
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

export interface Genre {
  id: number;
  name: string;
  createdAt?: string;
}

export interface Language {
  id: number;
  name: string;
}

// ======================================
// Relationship Types
// ======================================

export interface ContentPerson {
  id: number;
  contentId: string;
  personId: string | number;
  role?: string; // Legacy string field - can be 'actor', 'director', 'writer', 'author', etc. (case may vary)
  character?: string; // For actors
  department?: string; // For crew
  job?: string; // Specific job title
  creditOrder?: number; // Display order
  person: Person;
}

export interface ContentCompany {
  id: number;
  contentId: string;
  companyId: string;
  companyRoleId: number; // 1 | 2
  company: Company;
}

export interface ContentLanguage {
  id: number;
  contentId: string;
  languageId: number;
  role: 'original' | 'spoken' | 'subtitle';
  language: Language;
}

export interface ContentImage {
  id: number;
  contentId: string;
  type: 'poster' | 'backdrop' | 'still' | 'profile';
  version?: string;
  filePath: string; // Full CDN URL
  width?: number;
  height?: number;
  aspectRatio?: number;
  language?: string; // 2-letter code
  isPrimary?: boolean;
  upvoteCount?: number;
  downvoteCount?: number;
  userVote?: number | null;
}

// ======================================
// Type-Specific Details
// ======================================

export interface MovieDetails {
  contentId: string;
  collectionName?: string;
  budget?: number;
  revenue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TvDetails {
  contentId: string;
  averageDuration?: number; // Average episode duration in minutes
  numberOfEpisodes?: number;
  numberOfSeasons?: number;
  type?: 'series' | 'miniseries' | 'documentary';
  inProduction?: boolean;
  firstAirDate?: string; // ISO date string
  lastAirDate?: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

export interface TvSeason {
  id: number;
  tvShowId: string;
  seasonNumber: number;
  name: string;
  overview?: string;
  airDate?: string; // ISO date string
  episodeCount: number;
  posterUrl?: string; // Full CDN URL
  userRating?: number;
  viewerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TvEpisode {
  id: number;
  tvShowId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  airDate?: string; // ISO date string
  runtime?: number;
  stillUrl?: string; // Full CDN URL
  userRating?: number;
  createdAt: string;
  updatedAt: string;
  seasonId?: number;
}

export interface GameDetails {
  contentId: string;
  versionTitle?: string;
  versionParent?: number;
  collection?: number;
  gameModes: string[]; // ['single_player', 'multiplayer', 'co_op']
  perspectives: string[]; // ['first_person', 'third_person', 'side_view']
  themes: string[]; // ['action', 'horror', 'fantasy']
  createdAt: string;
  updatedAt: string;
}

export interface BookDetails {
  contentId: string;
  subtitle?: string;
  authors: string[]; // Array of author names
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories: string[]; // Array of categories
  maturityRating?: string;
  language?: string; // Language code
  series?: string;
  seriesNumber?: number;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
  createdAt: string;
  updatedAt: string;
}

// ======================================
// Main Content Type (Unified)
// ======================================

export interface UnifiedContent {
  id: string;
  title: string;
  alternativeTitles?: string[];
  originalTitle?: string; // Orijinal dildeki başlık (ör: Japonca, Arapça)
  contentTypeId: number; // 1=Movie, 2=TV, 3=Game, 4=Book, 5=Music
  additionalRatingCategories?: string[];
  contentType?: {
    id: number;
    name: string;
    slug: string;
  };
  releaseDate?: string; // ISO date string
  firstAirDate?: string; // ISO date string
  lastAirDate?: string; // ISO date string
  description?: string;
  status?: 'finished' | 'ongoing' | 'upcoming';
  runtime?: number; // Duration in minutes
  averageDuration?: number; // Average episode duration or average game playtime in minutes

  // Franchise reference (renamed from seriesId)
  franchiseId?: string;
  franchiseName?: string;

  // External references (optional)
  isbn?: string; // For books

  // Book-specific
  pageCount?: number; // For books
  authors?: string[]; // For books - array of author names
  language?: string; // For books - language code
  categories?: string[]; // For books - array of categories
  bookSeries?: string; // For books - series name
  bookSeriesNumber?: number; // For books - position in series
  maturityRating?: string; // For books - age rating
  previewLink?: string; // For books - Google Books preview URL
  infoLink?: string; // For books - Google Books info URL
  publishedDate?: string; // For books - publication date
  explicit?: boolean;
  label?: string;
  totalTracks?: number;
  musicReleaseType?: 'ALBUM' | 'SINGLE' | 'TRACK' | null;
  spotifyUrl?: string;
  primaryBookPublication?: BookPublication | null;
  bookPublications?: BookPublication[];

  isContinuing: boolean; // For ongoing series/games
  consumeCount: number;
  consumeLaterCount?: number;
  favoriteCount: number;
  discussionCount: number;
  ratingDistribution: number[]; // [1star, 2star, 3star, 4star, 5star]

  // Images
  posterUrl?: string; // Full CDN URL
  backdropUrl?: string; // Full CDN URL

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Trailer URL (YouTube link)
  trailerUrl?: string;
  reviewVideoUrl?: string;
  gameplayVideoUrl?: string;

  // Soundtrack URL (Spotify playlist/album/track)
  spotifyPlaylistUrl?: string;

  // Type-specific details (only one will be present)
  movieDetails?: MovieDetails;
  tvDetails?: TvDetails;
  gameDetails?: GameDetails;
  bookDetails?: BookDetails;

  // Relationships
  genres?: Genre[];
  people?: ContentPerson[];
  companies?: ContentCompany[];

  languages?: ContentLanguage[];
  images?: ContentImage[];

  // Metadata from junction tables
  themes?: Array<{ id: number; name: string }>;
  moods?: Array<{ id: number; name: string }>;
  gameModes?: Array<{ id: number; name: string }>;
  gameEngines?: Array<{ id: number; name: string }>;
  perspectives?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  ageRating?: { id: number; name: string } | null;
  awards?: string[];

  /**
   * Optional screenshots used by the content detail page.
   * Some parts of the app still use this legacy shape.
   */
  screenshots?: Array<{
    id: number;
    imageUrl: string;
    difficulty: number;
    order: number;
    seasonNumber?: number | null;
    isEnabledForQuiz: boolean;
    isSpoiler?: boolean;
    isSensitive?: boolean;
    upvoteCount?: number;
    downvoteCount?: number;
    userVote?: number | null;
  }>;

  // Similar Content relationships
  similarContents?: UnifiedContent[];
  similarDisplayTitle?: string;
  similarDisplaySubtitle?: string;
  similarIsFranchise?: boolean;
  similarGroupCount?: number;
}

// ======================================
// Content Type Enum
// ======================================

export enum ContentType {
  MOVIE = 1,
  TV = 2,
  GAME = 3,
  BOOK = 4,
  MUSIC = 5,
}

export const CONTENT_TYPE_NAMES: Record<ContentType, string> = {
  [ContentType.MOVIE]: 'Movie',
  [ContentType.TV]: 'TV Show',
  [ContentType.GAME]: 'Game',
  [ContentType.BOOK]: 'Book',
  [ContentType.MUSIC]: 'Music',
};

// ======================================
// User Interaction Types
// ======================================

export interface UserContentLog {
  id: number;
  userId: string;
  contentId: string;
  bookPublicationId?: number | null;
  bookPublication?: BookPublication | null;
  rating?: number;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
  isConsumed: boolean;

  date: string;
  updatedAt: string;
}

// ======================================
// Helper Types
// ======================================

export type ContentStatus = 'finished' | 'ongoing' | 'upcoming';
export type PersonRole =
  | 'actor'
  | 'director'
  | 'writer'
  | 'author'
  | 'developer'
  | 'designer'
  | 'voice_actor';
// CompanyRole type removed - replaced by Developer model
export type ImageType = 'poster' | 'backdrop' | 'still' | 'profile';
export type GameMode = 'single_player' | 'multiplayer' | 'co_op';
export type GamePerspective = 'first_person' | 'third_person' | 'side_view' | 'isometric';
