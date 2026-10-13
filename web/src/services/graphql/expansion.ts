import { gql } from '@apollo/client';

// Type definitions
export interface Expansion {
  id: number;
  contentId: string;
  name: string;
  description?: string;
  posterUrl?: string;
  releaseDate?: string;
  type: 'expansion' | 'remake'; // expansion veya remake
  consumeCount: number;
  ratingDistribution: number[];
  averageRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserExpansionLog {
  id: number;
  userId: string;
  expansionId: number;
  rating?: number;
  isConsumed: boolean;
  date: string;
  updatedAt: string;
}

// Query to get expansions for a content
export const GET_EXPANSIONS_BY_CONTENT = gql`
  query GetExpansionsByContent($contentId: String!, $type: String) {
    getExpansionsByContent(contentId: $contentId, type: $type) {
      id
      contentId
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

// Query to get single expansion
export const GET_EXPANSION = gql`
  query GetExpansion($id: Int!) {
    getExpansion(id: $id) {
      id
      contentId
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

// Query to get user's expansion log
export const GET_USER_EXPANSION_LOG = gql`
  query GetUserExpansionLog($expansionId: Int!) {
    getUserExpansionLog(expansionId: $expansionId) {
      id
      userId
      expansionId
      rating
      isConsumed
      date
      updatedAt
    }
  }
`;

// Query to get all user expansion logs for a content
export const GET_USER_EXPANSION_LOGS = gql`
  query GetUserExpansionLogs($contentId: String!) {
    getUserExpansionLogs(contentId: $contentId) {
      id
      userId
      expansionId
      rating
      isConsumed
      date
      updatedAt
    }
  }
`;

// Mutation to toggle expansion consumed status
export const TOGGLE_EXPANSION_CONSUMED = gql`
  mutation ToggleExpansionConsumed($expansionId: Int!) {
    toggleExpansionConsumed(expansionId: $expansionId) {
      id
      userId
      expansionId
      rating
      isConsumed
      date
      updatedAt
    }
  }
`;

// Mutation to rate an expansion
export const RATE_EXPANSION = gql`
  mutation RateExpansion($expansionId: Int!, $rating: Float!) {
    rateExpansion(expansionId: $expansionId, rating: $rating) {
      id
      userId
      expansionId
      rating
      isConsumed
      date
      updatedAt
    }
  }
`;

// Mutation to remove expansion rating
export const REMOVE_EXPANSION_RATING = gql`
  mutation RemoveExpansionRating($expansionId: Int!) {
    removeExpansionRating(expansionId: $expansionId) {
      id
      userId
      expansionId
      rating
      isConsumed
      date
      updatedAt
    }
  }
`;
