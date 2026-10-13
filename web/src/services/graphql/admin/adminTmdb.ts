import { gql } from '@apollo/client';

/**
 * TMDB Auto-Fill GraphQL Operations
 * Add Content sayfasında TMDB'den otomatik bilgi doldurmak için kullanılan sorgular
 */

// ─── Fragments ───

const TMDB_SEARCH_RESULT_FRAGMENT = gql`
  fragment TmdbSearchResultFields on TmdbSearchResult {
    tmdbId
    title
    originalTitle
    overview
    posterPath
    releaseDate
    voteAverage
    mediaType
  }
`;

const TMDB_DETAIL_RESULT_FRAGMENT = gql`
  fragment TmdbDetailResultFields on TmdbDetailResult {
    tmdbId
    title
    originalTitle
    overview
    releaseDate
    runtime
    posterPath
    backdropPath
    status
    voteAverage
    budget
    revenue
    mediaType
    genres {
      id
      name
    }
    spokenLanguages {
      iso6391
      englishName
      name
    }
    cast {
      id
      name
      character
      profilePath
      order
      gender
      popularity
      biography
      birthday
      deathday
      placeOfBirth
    }
    crew {
      id
      name
      job
      department
      profilePath
      gender
      popularity
      biography
      birthday
      deathday
      placeOfBirth
    }
    videos {
      key
      name
      site
      type
      official
    }
    keywords {
      id
      name
    }
    productionCompanies {
      id
      name
      logoPath
      originCountry
    }
    franchise {
      tmdbCollectionId
      name
      posterPath
      backdropPath
    }
    ageRating
    firstAirDate
    lastAirDate
    inProduction
    numberOfSeasons
    numberOfEpisodes
    seasons {
      seasonNumber
      name
      airDate
      episodeCount
      overview
      posterPath
      episodes {
        episodeNumber
        name
        airDate
        overview
        runtime
        stillPath
      }
    }
  }
`;

// ─── Queries ───

// ─── Queries ───

/**
 * TMDB'de film veya dizi arar
 * @param query - Arama metni (ör: "Interstellar")
 * @param type - "movie" veya "tv"
 */
export const SEARCH_TMDB = gql`
  ${TMDB_SEARCH_RESULT_FRAGMENT}
  query SearchTmdb($query: String!, $type: String!, $page: Int) {
    searchTmdb(query: $query, type: $type, page: $page) {
      ...TmdbSearchResultFields
    }
  }
`;

/**
 * TMDB'den seçilen içeriğin tüm detaylarını getirir
 * @param tmdbId - TMDB ID numarası
 * @param type - "movie" veya "tv"
 */
export const FETCH_TMDB_DETAILS = gql`
  ${TMDB_DETAIL_RESULT_FRAGMENT}
  query FetchTmdbDetails($tmdbId: Int!, $type: String!) {
    fetchTmdbDetails(tmdbId: $tmdbId, type: $type) {
      ...TmdbDetailResultFields
    }
  }
`;

/**
 * TMDB'de kişi araması yapar
 */
export const SEARCH_TMDB_PERSON = gql`
  query SearchTmdbPersonQuery($query: String!) {
    searchTmdbPersonQuery(query: $query)
  }
`;

/**
 * TMDB'den kişi detaylarını getirir
 */
export const FETCH_TMDB_PERSON_INFO = gql`
  query FetchTmdbPersonInfo($tmdbPersonId: Int!) {
    fetchTmdbPersonInfo(tmdbPersonId: $tmdbPersonId) {
      id
      name
      biography
      birthday
      deathday
      gender
      placeOfBirth
      profilePath
    }
  }
`;

// ─── TypeScript Interfaces (Client-side) ───

export interface TmdbSearchResultData {
  tmdbId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType?: string;
}

export interface TmdbGenreData {
  id: number;
  name: string;
}

export interface TmdbCastData {
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

export interface TmdbCrewData {
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

export interface TmdbLanguageData {
  iso6391?: string;
  englishName?: string;
  name?: string;
}

export interface TmdbVideoData {
  key: string;
  name?: string;
  site?: string;
  type?: string;
  official?: boolean;
}

export interface TmdbKeywordData {
  id: number;
  name: string;
}

export interface TmdbCompanyData {
  id: number;
  name: string;
  logoPath?: string;
  originCountry?: string;
}

export interface TmdbEpisodeData {
  episodeNumber: number;
  name: string;
  airDate?: string;
  overview?: string;
  runtime?: number;
  stillPath?: string;
}

export interface TmdbSeasonData {
  seasonNumber: number;
  name: string;
  airDate?: string;
  episodeCount?: number;
  overview?: string;
  runtime?: number;
  stillPath?: string;
  posterPath?: string;
  episodes?: TmdbEpisodeData[];
}

export interface TmdbFranchiseData {
  tmdbCollectionId: number;
  name: string;
  posterPath?: string;
  backdropPath?: string;
}

export interface TmdbDetailResultData {
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
  genres?: TmdbGenreData[];
  spokenLanguages?: TmdbLanguageData[];
  cast?: TmdbCastData[];
  crew?: TmdbCrewData[];
  videos?: TmdbVideoData[];
  keywords?: TmdbKeywordData[];
  productionCompanies?: TmdbCompanyData[];
  franchise?: TmdbFranchiseData;
  ageRating?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  inProduction?: boolean;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: TmdbSeasonData[];
}

export interface TmdbPersonDetailResultData {
  id: number;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  gender?: number;
  placeOfBirth?: string;
  profilePath?: string;
}
