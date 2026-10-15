import { gql } from '@apollo/client';
import type { UserContentLog } from './userContentTypes';

// ==========================================
// USER CONTENT LOG FRAGMENTS
// ==========================================

export const USER_CONTENT_LOG_FIELDS = gql`
  fragment UserContentLogFields on UserContentLog {
    id
    userId
    contentId
    bookPublicationId
    date
    isFavorite
    rating
    isConsumed
    isConsumeLater
    notifyOnRelease
    isContinuing
    isAbandoned
    playtimeMinutes
    userConsumeCount
    platformId
    bookFormat
    ratingDetails
    tags
    taggedUsers {
      id
      username
      picturePath
    }
    createdAt
    updatedAt
    review
    hasReview
    reviewDiscussion {
      id
      isPublic
      upvoteCount
      downvoteCount
      commentCount
    }
    isStandaloneReview
    activityType
    targetUser {
      id
      username
      picturePath
    }
    discussion {
      id
      title
      description
      upvoteCount
      commentCount
      createdAt
    }
    userList {
      id
      name
      description
      isOrdered
      createdAt
    }
    user {
      id
      username
      picturePath
    }
    incomingComment {
      id
      text
      createdAt
    }
    favoritePerson {
      id
      name
      profileUrl
      roles
      roleCount
    }
    bookPublication {
      id
      contentId
      title
      subtitle
      isbn
      publisherId
      publisher {
        id
        name
        logoUrl
      }
      translators
      language
      pageCount
      coverUrl
      publishedDate
      editionType
      format
      isOriginal
      isAbridged
      consumeCount
      averageRating
      ratingCount
    }
  }
`;

// ==========================================
// USER CONTENT LOG QUERIES
// ==========================================

export const GET_USER_CONTENT_LOG = gql`
  query GetUserContentLog($contentId: String!) {
    userContentLog(contentId: $contentId) {
      ...UserContentLogFields
    }
  }
  ${USER_CONTENT_LOG_FIELDS}
`;

export const GET_USER_CONTENT_LOGS = gql`
  query GetUserContentLogs($contentIds: [String!]!) {
    userContentLogs(contentIds: $contentIds) {
      ...UserContentLogFields
    }
  }
  ${USER_CONTENT_LOG_FIELDS}
`;

export const GET_CONTENT_LOG_HISTORY = gql`
  query GetContentLogHistory($contentId: String!) {
    contentLogHistory(contentId: $contentId) {
      ...UserContentLogFields
    }
  }
  ${USER_CONTENT_LOG_FIELDS}
`;

export const GET_ALL_USER_CONTENT_LOGS = gql`
  query GetAllUserContentLogs($userId: String, $limit: Int) {
    allUserContentLogs(userId: $userId, limit: $limit) {
      id
      userId
      contentId
      date
      isFavorite
      rating
      isConsumed
      tags
      review
      content {
        id
        title
        releaseDate
        contentTypeId
        people {
          job
          personRole {
            label
          }
          person {
            name
          }
        }
      }
    }
  }
`;

export const GET_ACTIVITY_FEED = gql`
  query GetActivityFeed($userId: String, $limit: Int) {
    activityFeed(userId: $userId, limit: $limit) {
      ...UserContentLogFields
      content {
        id
        title
        posterUrl
        backdropUrl
        releaseDate
        description
        contentTypeId
        contentType {
          id
          name
        }
        consumeCount
        favoriteCount
      }
    }
  }
  ${USER_CONTENT_LOG_FIELDS}
`;
export const GET_INCOMING_ACTIVITY_FEED = gql`
  query GetIncomingActivityFeed($userId: String!, $limit: Int) {
    incomingActivityFeed(userId: $userId, limit: $limit) {
      ...UserContentLogFields
      content {
        id
        title
        posterUrl
        backdropUrl
        releaseDate
        description
        contentTypeId
        contentType {
          id
          name
        }
        consumeCount
        favoriteCount
      }
    }
  }
  ${USER_CONTENT_LOG_FIELDS}
`;

export const GET_FRIENDS_ACTIVITY_FEED = gql`
  query GetFriendsActivityFeed($limit: Int) {
    friendsActivityFeed(limit: $limit) {
      ...UserContentLogFields
      content {
        id
        title
        posterUrl
        backdropUrl
        releaseDate
        description
        contentTypeId
        contentType {
          id
          name
        }
      }
    }
  }
  ${USER_CONTENT_LOG_FIELDS}
`;

// ==========================================
// QUERY RESULT TYPES
// ==========================================

export type GetFriendsActivityFeedData = {
  friendsActivityFeed: UserContentLog[];
};

export const GET_FRIENDS_ACTIVITY_FOR_CONTENT = gql`
  query GetFriendsActivityForContent($contentId: String!, $limit: Int) {
    friendsActivityForContent(contentId: $contentId, limit: $limit) {
      id
      userId
      contentId
      isFavorite
      rating
      isConsumed
      isContinuing
      isAbandoned
      tags
      taggedUsers {
        id
        username
        picturePath
      }
      updatedAt
      user {
        id
        username
        picturePath
      }
    }
  }
`;

export type GetFriendsActivityForContentData = {
  friendsActivityForContent: {
    id: string;
    userId: string;
    contentId: string;
    isFavorite: boolean;
    rating?: number | null;
    isConsumed: boolean;
    isContinuing: boolean;
    isAbandoned: boolean;
    updatedAt: string;
    user: { id: string; username: string; picturePath?: string | null };
  }[];
};

export const GET_USER_WATCHED_CONTENT = gql`
  query GetUserWatchedContent($userId: String!, $contentType: String!) {
    userWatchedContent(userId: $userId, contentType: $contentType) {
      id
      title
      posterUrl
      consumeCount
      favoriteCount
      releaseDate
      contentTypeId
      contentType {
        id
        name
      }
      genres {
        id
        name
      }
      isConsumed
      isFavorite
      isConsumeLater
      isContinuing
      userIsContinuing
      userRating
      userDate
      hasReview
    }
  }
`;

export const GET_USER_FAVORITE_CONTENT = gql`
  query GetUserFavoriteContent($userId: String!, $contentType: String!) {
    userFavoriteContent(userId: $userId, contentType: $contentType) {
      id
      title
      posterUrl
      consumeCount
      favoriteCount
      releaseDate
      contentTypeId
      contentType {
        id
        name
      }
      genres {
        id
        name
      }
      isConsumed
      isFavorite
      isConsumeLater
      isContinuing
      userIsContinuing
      userRating
      userDate
      hasReview
    }
  }
`;

export const GET_USER_STATS = gql`
  query GetUserStats($userId: String!) {
    userStats(userId: $userId) {
      totalMovies
      thisYearMovies
      averageRating
      discussionCount
    }
  }
`;

export const GET_USER_FEATURED_CONTENT = gql`
  query GetUserFeaturedContent($userId: String!, $contentType: String!) {
    userFeaturedContent(userId: $userId, contentType: $contentType) {
      id
      title
      posterUrl
      releaseDate
      contentType {
        id
        name
      }
    }
  }
`;

export const GET_CONTENT_STATS = gql`
  query GetContentStats($contentId: String!) {
    contentStats(contentId: $contentId) {
      consumeCount
      favoriteCount
      consumeLaterCount
      discussionCount
      averageRating
      ratingCount
      ratingDistribution
      averagePlaytimeMinutes
    }
  }
`;

export const GET_USERS_BY_RATING = gql`
  query GetUsersByRating($contentId: String!, $rating: Float!) {
    getUsersByRating(contentId: $contentId, rating: $rating) {
      userId
      username
      displayName
      avatarUrl
      rating
      createdAt
    }
  }
`;

// ==========================================
// USER CONTENT LOG MUTATIONS
// ==========================================
