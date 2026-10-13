import { gql } from '@apollo/client';

// ==========================================
// QUERIES
// ==========================================

export const GET_EPISODES_BY_SEASON = gql`
  query GetEpisodesBySeason($tvShowId: String!, $seasonNumber: Int!) {
    getEpisodesBySeason(tvShowId: $tvShowId, seasonNumber: $seasonNumber) {
      id
      tvShowId
      seasonNumber
      episodeNumber
      name
      overview
      airDate
      runtime
      stillUrl
      watched
      watchedAt
      userRating
      createdAt
      updatedAt
    }
  }
`;

export const GET_SEASONS_BY_TV_SHOW = gql`
  query GetSeasonsByTvShow($tvShowId: String!) {
    getSeasonsByTvShow(tvShowId: $tvShowId) {
      id
      tvShowId
      seasonNumber
      name
      overview
      airDate
      episodeCount
      posterUrl
      userRating
      viewerCount
      episodes {
        id
        tvShowId
        seasonNumber
        episodeNumber
        name
        overview
        airDate
        runtime
        stillUrl
        watched
        watchedAt
        userRating
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_EPISODES_BY_TV_SHOW = gql`
  query GetEpisodesByTvShow($tvShowId: String!) {
    getEpisodesByTvShow(tvShowId: $tvShowId) {
      id
      tvShowId
      seasonNumber
      episodeNumber
      name
      overview
      airDate
      runtime
      stillUrl
      watched
      watchedAt
      userRating
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER_EPISODE_LOGS = gql`
  query GetUserEpisodeLogs($tvShowId: String!) {
    getUserEpisodeLogs(tvShowId: $tvShowId) {
      id
      userId
      episodeId
      watched
      watchedAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_CONTINUING_TV_TRACKER = gql`
  query GetContinuingTvTracker {
    continuingTvTracker {
      pastDue {
        tvShowId
        tvShowTitle
        tvShowPosterUrl
        seasonNumber
        episodeNumber
        episodeTitle
        episodeAirDate
        episodeStillUrl
        backlogCount
        contentRouteType
      }
      thisWeek {
        tvShowId
        tvShowTitle
        tvShowPosterUrl
        seasonNumber
        episodeNumber
        episodeTitle
        episodeAirDate
        episodeStillUrl
        backlogCount
        contentRouteType
      }
      nextWeek {
        tvShowId
        tvShowTitle
        tvShowPosterUrl
        seasonNumber
        episodeNumber
        episodeTitle
        episodeAirDate
        episodeStillUrl
        backlogCount
        contentRouteType
      }
      summary {
        continuingSeriesCount
        pastDueCount
        thisWeekCount
        nextWeekCount
      }
      allContinuingSeries {
        tvShowId
        tvShowTitle
        tvShowPosterUrl
        expectedEpisodeCount
        airedUnwatchedCount
        unairedCount
        contentRouteType
      }
    }
  }
`;

// ==========================================
// MUTATIONS
// ==========================================

export const RATE_EPISODE = gql`
  mutation RateEpisode(
    $tvShowId: String!
    $seasonNumber: Int!
    $episodeNumber: Int!
    $rating: Float
  ) {
    rateEpisode(
      tvShowId: $tvShowId
      seasonNumber: $seasonNumber
      episodeNumber: $episodeNumber
      rating: $rating
    )
  }
`;

export const MARK_EPISODE_WATCHED = gql`
  mutation MarkEpisodeWatched(
    $tvShowId: String!
    $seasonNumber: Int!
    $episodeNumber: Int!
    $watched: Boolean!
  ) {
    markEpisodeWatched(
      tvShowId: $tvShowId
      seasonNumber: $seasonNumber
      episodeNumber: $episodeNumber
      watched: $watched
    )
  }
`;

export const MARK_SEASON_WATCHED = gql`
  mutation MarkSeasonWatched($tvShowId: String!, $seasonNumber: Int!, $watched: Boolean!) {
    markSeasonWatched(tvShowId: $tvShowId, seasonNumber: $seasonNumber, watched: $watched)
  }
`;

// ==========================================
// TYPES
// ==========================================

export interface TvEpisode {
  id: number;
  tvShowId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  airDate?: Date | string;
  runtime?: number;
  stillUrl?: string;
  watched?: boolean;
  watchedAt?: Date | string;
  userRating?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserEpisodeLog {
  id: number;
  userId: string;
  episodeId: number;
  watched: boolean;
  watchedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ContinuingTvTrackerItem {
  tvShowId: string;
  tvShowTitle: string;
  tvShowPosterUrl?: string | null;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle: string;
  episodeAirDate: Date | string;
  episodeStillUrl?: string | null;
  backlogCount: number;
  contentRouteType: 'tv';
}

export interface ContinuingTvTrackerSummary {
  continuingSeriesCount: number;
  pastDueCount: number;
  thisWeekCount: number;
  nextWeekCount: number;
}

export interface ContinuingSeriesItem {
  tvShowId: string;
  tvShowTitle: string;
  tvShowPosterUrl?: string | null;
  expectedEpisodeCount: number;
  airedUnwatchedCount: number;
  unairedCount: number;
  contentRouteType: 'tv';
}

export interface ContinuingTvTrackerPayload {
  pastDue: ContinuingTvTrackerItem[];
  thisWeek: ContinuingTvTrackerItem[];
  nextWeek: ContinuingTvTrackerItem[];
  allContinuingSeries: ContinuingSeriesItem[];
  summary: ContinuingTvTrackerSummary;
}

export interface GetEpisodesBySeasonData {
  getEpisodesBySeason: TvEpisode[];
}

export interface GetEpisodesByTvShowData {
  getEpisodesByTvShow: TvEpisode[];
}

export interface GetUserEpisodeLogsData {
  getUserEpisodeLogs: UserEpisodeLog[];
}

export interface GetContinuingTvTrackerData {
  continuingTvTracker: ContinuingTvTrackerPayload;
}

export interface MarkEpisodeWatchedData {
  markEpisodeWatched: boolean;
}

export interface MarkSeasonWatchedData {
  markSeasonWatched: boolean;
}
