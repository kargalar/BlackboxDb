import { gql } from '@apollo/client';

// ==========================================
// SERIES TYPES & QUERIES
// ==========================================

export interface ContentSeries {
  id: string;
  name: string;
  createdAt: string;
}

export interface SeriesInput {
  id?: string;
  name: string;
}

export const LIST_SERIES = gql`
  query ListSeries(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listSeries(
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      createdAt
      contentCount
      posterUrl
    }
  }
`;

export const SEARCH_SERIES = gql`
  query SearchSeries($search: String!, $limit: Int) {
    searchSeries(search: $search, limit: $limit) {
      id
      name
      createdAt
    }
  }
`;

export const CREATE_SERIES = gql`
  mutation CreateSeries($input: SeriesInput!) {
    createSeries(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_SERIES = gql`
  mutation UpdateSeries($id: String!, $input: SeriesInput!) {
    updateSeries(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_SERIES = gql`
  mutation DeleteSeries($id: String!) {
    deleteSeries(id: $id)
  }
`;

// ==========================================
// GAME MODE TYPES & QUERIES
// ==========================================

export interface GameModeType {
  id: number;
  name: string;
  createdAt: string;
}

export interface GameModeInput {
  id?: number;
  name: string;
}

export interface GameEngineType {
  id: number;
  name: string;
  createdAt: string;
}

export interface GameEngineInput {
  id?: number;
  name: string;
}

export const LIST_GAME_MODES = gql`
  query ListGameModes(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listGameModes(
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      createdAt
      contentCount
    }
  }
`;

export const CREATE_GAME_MODE = gql`
  mutation CreateGameMode($input: GameModeInput!) {
    createGameMode(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_GAME_MODE = gql`
  mutation UpdateGameMode($id: Int!, $input: GameModeInput!) {
    updateGameMode(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_GAME_MODE = gql`
  mutation DeleteGameMode($id: Int!) {
    deleteGameMode(id: $id)
  }
`;

export const LIST_GAME_ENGINES = gql`
  query ListGameEngines(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listGameEngines(
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      createdAt
      contentCount
    }
  }
`;

export const CREATE_GAME_ENGINE = gql`
  mutation CreateGameEngine($input: GameEngineInput!) {
    createGameEngine(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_GAME_ENGINE = gql`
  mutation UpdateGameEngine($id: Int!, $input: GameEngineInput!) {
    updateGameEngine(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_GAME_ENGINE = gql`
  mutation DeleteGameEngine($id: Int!) {
    deleteGameEngine(id: $id)
  }
`;

// ==========================================
// PERSPECTIVE TYPES & QUERIES
// ==========================================

export interface PerspectiveType {
  id: number;
  name: string;
  createdAt: string;
}

export interface PerspectiveInput {
  id?: number;
  name: string;
}

export const LIST_PERSPECTIVES = gql`
  query ListPerspectives(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listPerspectives(
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      createdAt
      contentCount
    }
  }
`;

export const CREATE_PERSPECTIVE = gql`
  mutation CreatePerspective($input: PerspectiveInput!) {
    createPerspective(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_PERSPECTIVE = gql`
  mutation UpdatePerspective($id: Int!, $input: PerspectiveInput!) {
    updatePerspective(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_PERSPECTIVE = gql`
  mutation DeletePerspective($id: Int!) {
    deletePerspective(id: $id)
  }
`;

// ==========================================
// PLATFORM TYPES & QUERIES
// ==========================================

export interface PlatformType {
  id: number;
  name: string;
  createdAt: string;
}

export interface PlatformInput {
  id?: number;
  name: string;
}

export const LIST_PLATFORMS = gql`
  query ListPlatforms(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listPlatforms(
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      createdAt
      contentCount
    }
  }
`;

export const CREATE_PLATFORM = gql`
  mutation CreatePlatform($input: PlatformInput!) {
    createPlatform(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_PLATFORM = gql`
  mutation UpdatePlatform($id: Int!, $input: PlatformInput!) {
    updatePlatform(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_PLATFORM = gql`
  mutation DeletePlatform($id: Int!) {
    deletePlatform(id: $id)
  }
`;
