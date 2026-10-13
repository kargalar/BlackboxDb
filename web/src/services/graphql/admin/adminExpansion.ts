import { gql } from '@apollo/client';

// ==========================================
// TYPES
// ==========================================

export interface AdminExpansion {
  id: number;
  contentId: string;
  contentTitle?: string;
  name: string;
  description?: string;
  posterUrl?: string;
  releaseDate?: string;
  type: string;
  consumeCount: number;
  ratingDistribution: number[];
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// QUERIES
// ==========================================

export const LIST_EXPANSIONS = gql`
  query ListExpansions($contentId: String, $search: String, $type: String, $limit: Int) {
    listExpansions(contentId: $contentId, search: $search, type: $type, limit: $limit) {
      id
      contentId
      contentTitle
      name
      description
      posterUrl
      releaseDate
      type
      consumeCount
      ratingDistribution
      averageRating
      createdAt
      updatedAt
    }
  }
`;

export const GET_EXPANSION_BY_ID = gql`
  query GetExpansionById($id: Int!) {
    getExpansionById(id: $id) {
      id
      contentId
      contentTitle
      name
      description
      posterUrl
      releaseDate
      type
      consumeCount
      ratingDistribution
      averageRating
      createdAt
      updatedAt
    }
  }
`;

// ==========================================
// MUTATIONS
// ==========================================

export const CREATE_EXPANSION = gql`
  mutation CreateExpansion(
    $contentId: String!
    $name: String!
    $description: String
    $posterUrl: String
    $releaseDate: String
    $type: String
  ) {
    createExpansion(
      contentId: $contentId
      name: $name
      description: $description
      posterUrl: $posterUrl
      releaseDate: $releaseDate
      type: $type
    ) {
      id
      contentId
      name
      type
      createdAt
    }
  }
`;

export const UPDATE_EXPANSION = gql`
  mutation UpdateExpansion(
    $id: Int!
    $name: String
    $description: String
    $posterUrl: String
    $releaseDate: String
    $type: String
  ) {
    updateExpansion(
      id: $id
      name: $name
      description: $description
      posterUrl: $posterUrl
      releaseDate: $releaseDate
      type: $type
    ) {
      id
      contentId
      name
      type
      updatedAt
    }
  }
`;

export const DELETE_EXPANSION = gql`
  mutation DeleteExpansion($id: Int!) {
    deleteExpansion(id: $id)
  }
`;
