export interface TMDBDiscoverMovie {
  id: number;
  title?: string;
  name?: string;
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  release_date?: string;
  first_air_date?: string;
}

export interface TMDBPaginated<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
}

export interface TMDBCredits {
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  published_at: string;
}

export interface TMDBMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: TMDBGenre[];
  original_language: string;
  budget: number;
  revenue: number;
  tagline: string | null;
  credits?: TMDBCredits;
  videos?: {
    results: TMDBVideo[];
  };
  similar?: TMDBPaginated<TMDBDiscoverMovie>;
}

export interface TMDBTvDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date?: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: TMDBGenre[];
  original_language: string;
  tagline: string | null;
  credits?: TMDBCredits;
  videos?: {
    results: TMDBVideo[];
  };
  similar?: TMDBPaginated<TMDBDiscoverMovie>;
}
