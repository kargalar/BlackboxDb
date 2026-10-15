import { Screenshot } from '@/components/molecules/ScreenshotUpload';

// --- Shared item interfaces ---

export interface PersonItem {
  id?: number | string;
  name: string;
  role?: string;
  character?: string;
  profileUrl?: string;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
  placeOfBirth?: string;
  [key: string]: unknown;
}

export interface SimpleItem {
  id?: number;
  name: string;
}

export interface ContentItem {
  id: string;
  name: string;
  posterUrl?: string | null;
}

export interface CitationItem {
  id: string; // citingContentId
  name: string;
  posterUrl?: string | null;
  note?: string | null;
  imageUrl?: string | null;
  releaseDate?: string | null;
  contentTypeId?: number | null;
}

export interface CompanyItem {
  id?: number | string;
  name: string;
  description?: string;
  headquarters?: string;
  logoUrl?: string;
  website?: string;
  foundingYear?: number | null;
}

export interface SeasonItem {
  seasonNumber: number;
  name: string;
  airDate?: string;
  overview?: string;
  posterUrl?: string;
  episodes: Array<{
    episodeNumber: number;
    name: string;
    airDate?: string;
    overview?: string;
    runtime?: number;
    stillUrl?: string;
  }>;
}

export interface ExpansionItem {
  id?: number;
  name: string;
  description?: string;
  posterUrl?: string;
  releaseDate?: string;
  type?: 'expansion' | 'remake';
}

export interface BookPublicationItem {
  id?: number;
  title?: string;
  subtitle?: string;
  isbn?: string;
  publisher?: CompanyItem | null;
  translators?: PersonItem[] | string;
  language?: string;
  pageCount?: string;
  coverUrl?: string;
  coverBase64?: string;
  coverFileName?: string;
  publishedDate?: string;
  editionType?: string;
  format?: string;
  isOriginal?: boolean;
  isAbridged?: boolean;
}

// --- Main form data interface ---

export interface AddContentFormData {
  // Common fields
  title: string;
  originalTitle: string;
  alternativeTitles: string[];
  contentTypeId: string;
  contentTypeSlug: string;
  tmdbId?: number;
  igdbId?: number;
  description: string;
  releaseDate: string;
  runtime: string;
  posterUrl?: string;
  backdropUrl?: string;
  autoSelectHighestVotedMedia?: boolean;
  images?: Array<{
    id?: number;
    contentId?: string;
    type: string;
    version?: string;
    filePath: string;
    upvoteCount?: number;
    downvoteCount?: number;
    userVote?: number | null;
    isNew?: boolean;
    file?: File;
  }>;
  status: string;
  isContinuing: boolean;
  genres: SimpleItem[];
  franchise: { id?: string; name: string; description?: string } | null;
  languages: SimpleItem[];
  themes: SimpleItem[];
  moods: SimpleItem[];
  ageRating: SimpleItem | null;
  awards: string[];
  additionalRatingCategories: string[];

  // Movie-specific
  budget: string;
  revenue: string;
  cast: PersonItem[];
  crew: PersonItem[];

  // TV-specific (averageDuration is au by backend)
  tvType: string;
  inProduction: boolean;
  firstAirDate: string;
  lastAirDate: string;
  seasons: SeasonItem[];

  isbn: string;
  pageCount: string;
  translators: string;
  authors: PersonItem[];
  publisher?: CompanyItem | null;
  bookPublications: BookPublicationItem[];
  previewLink?: string;
  infoLink?: string;

  // Game-specific
  gameModes: SimpleItem[];
  gameEngines: SimpleItem[];
  perspectives: SimpleItem[];
  developerCompanies?: CompanyItem[];
  publisherCompanies?: CompanyItem[];
  studios?: CompanyItem[];
  platforms: SimpleItem[];
  fileSize: string;
  expansions: ExpansionItem[];

  // Screenshots
  screenshots: Screenshot[];

  // Trailer
  trailerUrl: string;
  reviewVideoUrl: string;
  gameplayVideoUrl: string;

  // Soundtrack
  spotifyPlaylistUrl: string;

  // Similar Contents
  similarContents: ContentItem[];

  // Citations
  citationsReceived: CitationItem[];
  citationsMade: CitationItem[];

  // Au metadata (görsel seçimi için)
  autoFillSourceId?: string;
  autoFillSource?: string; // tmdb_movie | tmdb_tv | igdb | googlebooks
}

// --- Default initial values ---

export const INITIAL_FORM_DATA: AddContentFormData = {
  title: '',
  originalTitle: '',
  alternativeTitles: [],
  contentTypeId: '',
  contentTypeSlug: '',
  tmdbId: undefined,
  igdbId: undefined,
  description: '',
  releaseDate: '',
  runtime: '',
  posterUrl: '',
  backdropUrl: '',
  autoSelectHighestVotedMedia: true,
  images: [],
  status: 'finished',
  isContinuing: false,
  genres: [],
  franchise: null,
  languages: [],
  themes: [],
  moods: [],
  ageRating: null,
  awards: [],
  additionalRatingCategories: [],
  budget: '',
  revenue: '',
  cast: [],
  crew: [],
  tvType: 'series',
  inProduction: false,
  firstAirDate: '',
  lastAirDate: '',
  seasons: [],
  isbn: '',
  pageCount: '',
  translators: '',
  authors: [],
  publisher: null,
  bookPublications: [],
  previewLink: '',
  infoLink: '',
  gameModes: [],
  gameEngines: [],
  perspectives: [],
  platforms: [],
  fileSize: '',
  publisherCompanies: [],
  developerCompanies: [],
  studios: [],
  expansions: [],
  screenshots: [],
  trailerUrl: '',
  reviewVideoUrl: '',
  gameplayVideoUrl: '',
  spotifyPlaylistUrl: '',
  similarContents: [],
  citationsReceived: [],
  citationsMade: [],
  autoFillSourceId: '',
  autoFillSource: '',
};
