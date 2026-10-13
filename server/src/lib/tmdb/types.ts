// ─── Raw TMDB API response interfaces ───

export interface TmdbRawSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: string;
}

export interface TmdbRawMovieDetail {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  poster_path?: string;
  backdrop_path?: string;
  status?: string;
  vote_average?: number;
  budget?: number;
  revenue?: number;
  genres?: Array<{ id: number; name: string }>;
  spoken_languages?: Array<{
    iso_639_1: string;
    english_name: string;
    name: string;
  }>;
  credits?: {
    cast?: Array<{
      id: number;
      name: string;
      character?: string;
      profile_path?: string;
      order?: number;
      gender?: number;
      popularity?: number;
    }>;
    crew?: Array<{
      id: number;
      name: string;
      job?: string;
      department?: string;
      profile_path?: string;
      gender?: number;
      popularity?: number;
    }>;
  };
  videos?: {
    results?: Array<{
      key: string;
      name: string;
      site: string;
      type: string;
      official?: boolean;
    }>;
  };
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
    results?: Array<{ id: number; name: string }>;
  };
  production_companies?: Array<{
    id: number;
    name: string;
    logo_path?: string | null;
    origin_country?: string;
  }>;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string;
    backdrop_path?: string;
  };
  release_dates?: {
    results?: Array<{
      iso_3166_1: string;
      release_dates?: Array<{
        certification?: string;
      }>;
    }>;
  };
}

export interface TmdbRawCollectionDetail {
  id: number;
  name: string;
  poster_path?: string;
  backdrop_path?: string;
  parts?: Array<{
    id: number;
    title: string;
    original_title?: string;
    release_date?: string;
    poster_path?: string;
    backdrop_path?: string;
  }>;
}

export interface TmdbRawTvDetail extends Omit<
  TmdbRawMovieDetail,
  "title" | "original_title" | "release_date" | "runtime" | "budget" | "revenue"
> {
  name: string;
  original_name?: string;
  first_air_date?: string;
  last_air_date?: string;
  in_production?: boolean;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  seasons?: Array<{
    season_number: number;
    name: string;
    air_date?: string;
    episode_count?: number;
    overview?: string;
    poster_path?: string;
  }>;
  content_ratings?: {
    results?: Array<{
      iso_3166_1: string;
      rating?: string;
    }>;
  };
}

/**
 * TMDB aggregate_credits response for TV shows.
 * Returns complete cast/crew across all episodes/seasons.
 */
export interface TmdbRawAggregateCredits {
  cast?: Array<{
    id: number;
    name: string;
    profile_path?: string;
    gender?: number;
    popularity?: number;
    order?: number;
    roles?: Array<{
      character?: string;
      episode_count?: number;
    }>;
  }>;
  crew?: Array<{
    id: number;
    name: string;
    profile_path?: string;
    gender?: number;
    popularity?: number;
    department?: string;
    jobs?: Array<{
      job?: string;
      episode_count?: number;
    }>;
  }>;
}

export interface TmdbRawSeasonDetail {
  episodes?: Array<{
    episode_number: number;
    name: string;
    air_date?: string;
    overview?: string;
    runtime?: number;
    still_path?: string;
  }>;
}

// ─── Normalized result interfaces ───

export interface TmdbSearchItem {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType?: string;
}

export interface TmdbGenreItem {
  id: number;
  name: string;
}

export interface TmdbCastItem {
  id: number;
  name: string;
  character?: string;
  profilePath?: string;
  order?: number;
  gender?: number;
  popularity?: number;
  biography?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
}

export interface TmdbCrewItem {
  id: number;
  name: string;
  job?: string;
  department?: string;
  profilePath?: string;
  gender?: number;
  popularity?: number;
  biography?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
}

export interface TmdbLanguageItem {
  iso6391?: string;
  englishName?: string;
  name?: string;
}

export interface TmdbVideoItem {
  key: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
}

export interface TmdbEpisodeItem {
  episodeNumber: number;
  name: string;
  airDate?: string;
  overview?: string;
  runtime?: number;
  stillPath?: string;
}

export interface TmdbSeasonItem {
  seasonNumber: number;
  name: string;
  airDate?: string;
  episodeCount?: number;
  overview?: string;
  posterPath?: string;
  episodes?: TmdbEpisodeItem[];
}

export interface TmdbKeywordItem {
  id: number;
  name: string;
}

export interface TmdbCompanyItem {
  id: number;
  name: string;
  logoPath?: string;
  originCountry?: string;
}

export interface TmdbFranchiseItem {
  tmdbCollectionId: number;
  name: string;
  posterPath?: string;
  backdropPath?: string;
}

export interface TmdbCollectionPartItem {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  releaseDate?: string;
  posterPath?: string;
  backdropPath?: string;
}

export interface TmdbCollectionDetailData {
  tmdbCollectionId: number;
  name: string;
  posterPath?: string;
  backdropPath?: string;
  parts: TmdbCollectionPartItem[];
}

export interface TmdbPersonDetail {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  gender?: number;
  placeOfBirth?: string;
  profilePath?: string;
}

export interface TmdbDetailData {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  releaseDate?: string;
  runtime?: number;
  posterPath?: string;
  backdropPath?: string;
  status?: string;
  voteAverage?: number;
  budget?: number;
  revenue?: number;
  mediaType?: string;
  genres?: TmdbGenreItem[];
  spokenLanguages?: TmdbLanguageItem[];
  cast?: TmdbCastItem[];
  crew?: TmdbCrewItem[];
  videos?: TmdbVideoItem[];
  keywords?: TmdbKeywordItem[];
  productionCompanies?: TmdbCompanyItem[];
  franchise?: TmdbFranchiseItem;
  ageRating?: string;
  // TV-specific
  firstAirDate?: string;
  lastAirDate?: string;
  inProduction?: boolean;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: TmdbSeasonItem[];
}

