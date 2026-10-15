import { gql } from '@apollo/client';

// ==========================================
// CONTENT MANAGEMENT - MUTATIONS
// ==========================================

export const UPDATE_CONTENT = gql`
  mutation UpdateContent($id: String!, $input: UpdateContentInput!) {
    updateContent(id: $id, input: $input) {
      id
      title
      tmdbId
      igdbId
      contentTypeId
      releaseDate
      description
      status
      runtime
      isbn
      pageCount
      isContinuing
      posterUrl
      backdropUrl
      autoSelectHighestVotedMedia
      genres {
        id
        name
      }
      budget
      revenue
      cast
      crew
      averageDuration
      numberOfEpisodes
      numberOfSeasons
      tvType
      inProduction
      firstAirDate
      lastAirDate
      subtitle
      authors
      previewLink
      infoLink
      publisher
      publishedDate
      categories
      maturityRating
      languages
      gameModes {
        id
        name
      }
      perspectives {
        id
        name
      }
      platforms {
        id
        name
      }
      fileSize
      themes {
        id
        name
      }
      seasons
      lockedFields
      createdAt
    }
  }
`;

export const DELETE_CONTENT = gql`
  mutation DeleteContent($id: String!) {
    deleteContent(id: $id)
  }
`;

export const CREATE_CONTENT = gql`
  mutation CreateContent($input: CreateContentInput!) {
    createContent(input: $input) {
      id
      title
      tmdbId
      igdbId
      contentTypeId
      releaseDate
      description
      status
      runtime
      isbn
      pageCount
      isContinuing
      posterUrl
      backdropUrl
      autoSelectHighestVotedMedia
      genres {
        id
        name
      }
      budget
      revenue
      cast
      crew
      averageDuration
      numberOfEpisodes
      numberOfSeasons
      tvType
      inProduction
      firstAirDate
      lastAirDate
      subtitle
      authors
      previewLink
      infoLink
      publisher
      publishedDate
      categories
      maturityRating
      languages
      gameModes {
        id
        name
      }
      perspectives {
        id
        name
      }
      platforms {
        id
        name
      }
      fileSize
      themes {
        id
        name
      }
      seasons
      createdAt
    }
  }
`;

// ==========================================
// CONTENT REQUESTS
// ==========================================

export const CREATE_CONTENT_REQUEST = gql`
  mutation CreateContentRequest($input: CreateContentRequestInput!) {
    createContentRequest(input: $input) {
      id
      requesterUserId
      title
      contentTypeId
      releaseDate
      description
      reason
      payload
      status
      reviewedBy
      reviewedAt
      createdAt
    }
  }
`;

export const MY_CONTENT_REQUESTS = gql`
  query MyContentRequests {
    myContentRequests {
      id
      requesterUserId
      title
      contentTypeId
      releaseDate
      description
      reason
      payload
      status
      reviewedBy
      reviewedAt
      createdAt
    }
  }
`;

export const CONTENT_REQUEST_BY_ID = gql`
  query ContentRequest($id: Int!) {
    contentRequest(id: $id) {
      id
      requesterUserId
      title
      contentTypeId
      releaseDate
      description
      reason
      payload
      status
      reviewedBy
      reviewedAt
      createdAt
    }
  }
`;

export const PENDING_CONTENT_REQUESTS = gql`
  query PendingContentRequests {
    pendingContentRequests {
      id
      requesterUserId
      title
      contentTypeId
      releaseDate
      description
      reason
      status
      reviewedBy
      reviewedAt
      createdAt
    }
  }
`;

export const APPROVE_CONTENT_REQUEST = gql`
  mutation ApproveContentRequest($id: Int!, $contentId: String) {
    approveContentRequest(id: $id, contentId: $contentId)
  }
`;

export const UPDATE_CONTENT_REQUEST = gql`
  mutation UpdateContentRequest($id: Int!, $input: CreateContentRequestInput!) {
    updateContentRequest(id: $id, input: $input) {
      id
      requesterUserId
      title
      contentTypeId
      releaseDate
      description
      reason
      payload
      status
      reviewedBy
      reviewedAt
      createdAt
    }
  }
`;

export const REJECT_CONTENT_REQUEST = gql`
  mutation RejectContentRequest($id: Int!, $reason: String) {
    rejectContentRequest(id: $id, reason: $reason)
  }
`;

export const DELETE_CONTENT_REQUEST = gql`
  mutation DeleteContentRequest($id: Int!) {
    deleteContentRequest(id: $id)
  }
`;

export const VOTE_IMAGE = gql`
  mutation VoteImage($imageId: Int!, $voteType: Int!) {
    voteImage(imageId: $imageId, voteType: $voteType) {
      id
      upvoteCount
      downvoteCount
      userVote
    }
  }
`;

export const VOTE_SCREENSHOT = gql`
  mutation VoteScreenshot($screenshotId: Int!, $voteType: Int!) {
    voteScreenshot(screenshotId: $screenshotId, voteType: $voteType) {
      id
      upvoteCount
      downvoteCount
      userVote
    }
  }
`;
