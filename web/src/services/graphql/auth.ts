import { gql } from '@apollo/client';

// ==========================================
// AUTH MUTATIONS
// ==========================================

export const LOGIN_WITH_GOOGLE = gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      user {
        id
        username
        email
        isAdmin
        isModerator
        bio
        picturePath
        createdAt
      }
    }
  }
`;

export const REGISTER = gql`
  mutation Register($username: String!, $email: String!, $password: String!) {
    register(username: $username, email: $email, password: $password) {
      user {
        id
        username
        email
        isAdmin
        isModerator
        bio
        picturePath
        createdAt
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      user {
        id
        username
        email
        isAdmin
        isModerator
        bio
        picturePath
        createdAt
      }
    }
  }
`;

export const DELETE_MY_ACCOUNT = gql`
  mutation DeleteMyAccount {
    deleteMyAccount
  }
`;

export const REFRESH_TOKEN = gql`
  mutation RefreshToken($refreshToken: String) {
    refreshToken(refreshToken: $refreshToken) {
      user {
        id
        username
        email
        isAdmin
        isModerator
        bio
        picturePath
        createdAt
      }
    }
  }
`;

// ==========================================
// USER QUERIES
// ==========================================

export const GET_ME = gql`
  query GetMe {
    me {
      id
      username
      email
      bio
      location
      website
      picturePath
      coverPhotoUrl
      isAdmin
      isModerator
      contributionScore
      preferredContentTypes
      gridColumns
      gridRows
      posterZoomEnabled
      posterIconsBelow
      posterRatingEnabled
      showSensitiveContent
      preferredGamePlatformId
      preferredGamePlatformIds
      splitHomePopularSections
      notifyOnFollows
      notifyOnContentRequestUpdates
      notifyOnCommentVotes
      notifyOnCommentReplies
      notifyOnMentions
      notifyOnRecommendations
      notifyOnNewSeasons
      notifyOnContentReleased
      notifyOnRoleUpdates
      isSpotifyConnected
      createdAt
      updatedAt
    }
  }
`;

export const GET_USER = gql`
  query GetUser($username: String!) {
    user(username: $username) {
      id
      username
      email
      bio
      location
      website
      picturePath
      coverPhotoUrl
      isAdmin
      isModerator
      contributionScore
      createdAt
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      username
      email
      bio
      location
      website
      picturePath
      coverPhotoUrl
      isAdmin
      isModerator
      contributionScore
      createdAt
    }
  }
`;

export const GET_FOLLOWERS = gql`
  query GetFollowers($username: String!) {
    followers(username: $username) {
      id
      username
      email
      bio
      location
      website
      picturePath
    }
  }
`;

export const GET_FOLLOWING = gql`
  query GetFollowing($username: String!) {
    following(username: $username) {
      id
      username
      email
      bio
      location
      website
      picturePath
    }
  }
`;

// ==========================================
// USER MUTATIONS
// ==========================================

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $username: String
    $bio: String
    $picturePath: String
    $location: String
    $website: String
  ) {
    updateProfile(
      username: $username
      bio: $bio
      picturePath: $picturePath
      location: $location
      website: $website
    ) {
      id
      username
      email
      bio
      location
      website
      picturePath
      updatedAt
    }
  }
`;

export const FOLLOW_USER = gql`
  mutation FollowUser($username: String!) {
    followUser(username: $username)
  }
`;

export const UNFOLLOW_USER = gql`
  mutation UnfollowUser($username: String!) {
    unfollowUser(username: $username)
  }
`;

export const IS_FOLLOWING = gql`
  query IsFollowing($username: String!) {
    isFollowing(username: $username)
  }
`;

// ==========================================
// PREFERENCES
// ==========================================

export const UPDATE_PREFERENCES = gql`
  mutation UpdatePreferences(
    $preferredContentTypes: [Int!]
    $gridColumns: Int
    $gridRows: Int
    $posterZoomEnabled: Boolean
    $posterIconsBelow: Boolean
    $posterRatingEnabled: Boolean
    $showSensitiveContent: Boolean
    $preferredGamePlatformId: Int
    $preferredGamePlatformIds: [Int!]
    $splitHomePopularSections: Boolean
    $notifyOnFollows: Boolean
    $notifyOnContentRequestUpdates: Boolean
    $notifyOnCommentVotes: Boolean
    $notifyOnCommentReplies: Boolean
    $notifyOnMentions: Boolean
    $notifyOnRecommendations: Boolean
    $notifyOnNewSeasons: Boolean
    $notifyOnContentReleased: Boolean
    $notifyOnRoleUpdates: Boolean
  ) {
    updatePreferences(
      preferredContentTypes: $preferredContentTypes
      gridColumns: $gridColumns
      gridRows: $gridRows
      posterZoomEnabled: $posterZoomEnabled
      posterIconsBelow: $posterIconsBelow
      posterRatingEnabled: $posterRatingEnabled
      showSensitiveContent: $showSensitiveContent
      preferredGamePlatformId: $preferredGamePlatformId
      preferredGamePlatformIds: $preferredGamePlatformIds
      splitHomePopularSections: $splitHomePopularSections
      notifyOnFollows: $notifyOnFollows
      notifyOnContentRequestUpdates: $notifyOnContentRequestUpdates
      notifyOnCommentVotes: $notifyOnCommentVotes
      notifyOnCommentReplies: $notifyOnCommentReplies
      notifyOnMentions: $notifyOnMentions
      notifyOnRecommendations: $notifyOnRecommendations
      notifyOnNewSeasons: $notifyOnNewSeasons
      notifyOnContentReleased: $notifyOnContentReleased
      notifyOnRoleUpdates: $notifyOnRoleUpdates
    ) {
      id
      preferredContentTypes
      gridColumns
      gridRows
      posterZoomEnabled
      posterIconsBelow
      posterRatingEnabled
      showSensitiveContent
      preferredGamePlatformId
      preferredGamePlatformIds
      splitHomePopularSections
      notifyOnFollows
      notifyOnContentRequestUpdates
      notifyOnCommentVotes
      notifyOnCommentReplies
      notifyOnMentions
      notifyOnRecommendations
      notifyOnNewSeasons
      notifyOnContentReleased
      notifyOnRoleUpdates
    }
  }
`;
