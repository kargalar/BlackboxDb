import { gql } from '@apollo/client';

// ==========================================
// GENRE TYPES & QUERIES
// ==========================================

export const LIST_GENRES = gql`
  query ListGenres(
    $contentTypeId: Int
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listGenres(
      contentTypeId: $contentTypeId
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      contentTypeId
      createdAt
      contentCount
    }
  }
`;

export const CREATE_GENRE = gql`
  mutation CreateGenre($input: GenreInput!) {
    createGenre(input: $input) {
      id
      name
      contentTypeId
      createdAt
    }
  }
`;

export const UPDATE_GENRE = gql`
  mutation UpdateGenre($id: Int!, $input: GenreInput!) {
    updateGenre(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_GENRE = gql`
  mutation DeleteGenre($id: Int!) {
    deleteGenre(id: $id)
  }
`;

// ==========================================
// LANGUAGE TYPES & QUERIES
// ==========================================

export const LIST_LANGUAGES = gql`
  query ListLanguages(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listLanguages(
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

export const CREATE_LANGUAGE = gql`
  mutation CreateLanguage($input: LanguageInput!) {
    createLanguage(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_LANGUAGE = gql`
  mutation UpdateLanguage($id: Int!, $input: LanguageInput!) {
    updateLanguage(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_LANGUAGE = gql`
  mutation DeleteLanguage($id: Int!) {
    deleteLanguage(id: $id)
  }
`;

// ==========================================
// THEME TYPES & QUERIES
// ==========================================

export interface ThemeType {
  id: number;
  name: string;
  createdAt: string;
}

export interface ThemeInput {
  id?: number;
  name: string;
}

export const LIST_THEMES = gql`
  query ListThemes(
    $contentTypeId: Int
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listThemes(
      contentTypeId: $contentTypeId
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

export const CREATE_THEME = gql`
  mutation CreateTheme($input: ThemeInput!) {
    createTheme(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_THEME = gql`
  mutation UpdateTheme($id: Int!, $input: ThemeInput!) {
    updateTheme(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_THEME = gql`
  mutation DeleteTheme($id: Int!) {
    deleteTheme(id: $id)
  }
`;

// ==========================================
// MOOD TYPES & QUERIES
// ==========================================

export interface MoodType {
  id: number;
  name: string;
  createdAt: string;
}

export interface MoodInput {
  id?: number;
  name: string;
}

export const LIST_MOODS = gql`
  query ListMoods(
    $contentTypeId: Int
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listMoods(
      contentTypeId: $contentTypeId
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

export const CREATE_MOOD = gql`
  mutation CreateMood($input: MoodInput!) {
    createMood(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_MOOD = gql`
  mutation UpdateMood($id: Int!, $input: MoodInput!) {
    updateMood(id: $id, input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const DELETE_MOOD = gql`
  mutation DeleteMood($id: Int!) {
    deleteMood(id: $id)
  }
`;

// ==========================================
// AGE RATING TYPES & QUERIES
// ==========================================

export interface AgeRatingType {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgeRatingInput {
  id?: number;
  name: string;
}

export const LIST_AGE_RATINGS = gql`
  query ListAgeRatings(
    $limit: Int
    $offset: Int
    $search: String
    $sortBy: String
    $sortOrder: String
  ) {
    listAgeRatings(
      limit: $limit
      offset: $offset
      search: $search
      sortBy: $sortBy
      sortOrder: $sortOrder
    ) {
      id
      name
      createdAt
      updatedAt
      contentCount
    }
  }
`;

export const CREATE_AGE_RATING = gql`
  mutation CreateAgeRating($input: AgeRatingInput!) {
    createAgeRating(input: $input) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_AGE_RATING = gql`
  mutation UpdateAgeRating($id: Int!, $input: AgeRatingInput!) {
    updateAgeRating(id: $id, input: $input) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_AGE_RATING = gql`
  mutation DeleteAgeRating($id: Int!) {
    deleteAgeRating(id: $id)
  }
`;

// ==========================================
// CATEGORY COUNT (generic total count query)
// ==========================================

export const CATEGORY_COUNT = gql`
  query CategoryCount($type: String!, $search: String) {
    categoryCount(type: $type, search: $search)
  }
`;

// ==========================================
// CATEGORY TYPES
// ==========================================

export interface Language {
  id: number;
  name: string;
  createdAt: string;
}

export interface LanguageInput {
  id?: number;
  name: string;
}
