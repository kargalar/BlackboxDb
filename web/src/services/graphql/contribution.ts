import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';

// ==========================================
// CONTRIBUTION QUERIES
// ==========================================

export const GET_TOP_CONTRIBUTORS = gql`
  query GetTopContributors($limit: Int) {
    getTopContributors(limit: $limit) {
      rank
      contributionScore
      user {
        id
        username
        picturePath
      }
    }
  }
`;

export const GET_CONTENT_CONTRIBUTIONS = gql`
  query GetContentContributions($contentId: String!) {
    getContentContributions(contentId: $contentId) {
      id
      type
      status
      pointsEarned
      createdAt
      user {
        id
        username
        picturePath
      }
      reviewer {
        id
        username
      }
    }
  }
`;

export const GET_USER_CONTRIBUTIONS = gql`
  query GetUserContributions($username: String!, $limit: Int, $offset: Int) {
    getUserContributions(username: $username, limit: $limit, offset: $offset) {
      id
      type
      status
      pointsEarned
      createdAt
      content {
        id
        title
        posterUrl
      }
      reviewer {
        id
        username
      }
    }
  }
`;

export const MY_CONTRIBUTIONS = gql`
  query MyContributions {
    myContributions {
      id
      type
      status
      pointsEarned
      payload
      createdAt
      content {
        id
        title
        posterUrl
        contentTypeId
      }
      reviewer {
        id
        username
      }
    }
  }
`;

export const GET_PENDING_CONTRIBUTIONS = gql`
  query GetPendingContributions($limit: Int, $offset: Int) {
    getPendingContributions(limit: $limit, offset: $offset) {
      id
      type
      status
      payload
      createdAt
      user {
        id
        username
        picturePath
      }
      content {
        id
        title
        posterUrl
      }
    }
  }
`;

// ==========================================
// CONTRIBUTION MUTATIONS
// ==========================================

export const GET_CONTRIBUTION = gql`
  query GetContribution($id: Int!) {
    getContribution(id: $id) {
      id
      type
      status
      payload
      createdAt
      user {
        id
        username
        picturePath
      }
      content {
        id
        title
        posterUrl
      }
    }
  }
`;

export const CREATE_CONTRIBUTION = gql`
  mutation CreateContribution($type: String!, $payload: JSON!, $contentId: String) {
    createContribution(type: $type, payload: $payload, contentId: $contentId) {
      id
      status
    }
  }
`;

export const UPDATE_CONTRIBUTION = gql`
  mutation UpdateContribution($id: Int!, $payload: JSON!) {
    updateContribution(id: $id, payload: $payload) {
      id
      status
    }
  }
`;

export const DELETE_CONTRIBUTION = gql`
  mutation DeleteContribution($id: Int!) {
    deleteContribution(id: $id)
  }
`;

export const REVIEW_CONTRIBUTION = gql`
  mutation ReviewContribution(
    $id: Int!
    $status: String!
    $pointsEarned: Int
    $updatedPayload: JSON
  ) {
    reviewContribution(
      id: $id
      status: $status
      pointsEarned: $pointsEarned
      updatedPayload: $updatedPayload
    ) {
      id
      status
      pointsEarned
    }
  }
`;

// ==========================================
// CONTRIBUTION TYPES
// ==========================================

export interface TopContributorEntry {
  rank: number;
  contributionScore: number;
  user: {
    id: string;
    username: string;
    picturePath?: string | null;
  };
}

export interface ContributionUser {
  id: string;
  username: string;
  picturePath?: string;
  contributionScore?: number;
}

export interface Contribution {
  id: number;
  type: string;
  status: string;
  payload?: any;
  pointsEarned: number;
  createdAt: string;
  user: ContributionUser;
  reviewer?: {
    id: string;
    username: string;
  };
  content?: {
    id: string;
    title: string;
    posterUrl?: string;
  };
}
