import { gql } from '@apollo/client';
import { USER_CONTENT_LOG_FIELDS } from './userContentQueries';

export const LOG_CONTENT_WATCH = gql`
  mutation LogContentWatch($contentId: String!, $bookPublicationId: Int) {
    logContentWatch(contentId: $contentId, bookPublicationId: $bookPublicationId)
  }
`;

export const UNLOG_CONTENT_WATCH = gql`
  mutation UnlogContentWatch($contentId: String!) {
    unlogContentWatch(contentId: $contentId)
  }
`;

export const TOGGLE_CONTENT_FAVORITE = gql`
  mutation ToggleContentFavorite($contentId: String!) {
    toggleContentFavorite(contentId: $contentId)
  }
`;

export const RATE_CONTENT = gql`
  mutation RateContent($contentId: String!, $rating: Float, $bookPublicationId: Int) {
    rateContent(contentId: $contentId, rating: $rating, bookPublicationId: $bookPublicationId)
  }
`;
export const TOGGLE_CONSUME_LATER = gql`
  mutation ToggleConsumeLater($contentId: String!) {
    toggleConsumeLater(contentId: $contentId)
  }
`;

export const TOGGLE_CONTENT_WATCHLIST = gql`
  mutation ToggleContentWatchlist($contentId: String!) {
    toggleContentWatchlist(contentId: $contentId)
  }
`;

export const TOGGLE_CONTINUING = gql`
  mutation ToggleContinuing($contentId: String!) {
    toggleContentContinuing(contentId: $contentId)
  }
`;

export const TOGGLE_ABANDONED = gql`
  mutation ToggleAbandoned($contentId: String!) {
    toggleContentAbandoned(contentId: $contentId)
  }
`;

export const TOGGLE_CONTENT_FEATURED = gql`
  mutation ToggleContentFeatured($contentId: String!) {
    toggleContentFeatured(contentId: $contentId)
  }
`;

export const SET_FEATURED_CONTENT = gql`
  mutation SetFeaturedContent($contentIds: [String!]!, $contentType: String!) {
    setFeaturedContent(contentIds: $contentIds, contentType: $contentType)
  }
`;

export const DELETE_CONTENT_WATCH = gql`
  mutation DeleteContentWatch($logId: Int!) {
    deleteContentWatch(logId: $logId)
  }
`;

export const UPDATE_CONTENT_WATCH = gql`
  mutation UpdateContentWatch($logId: Int!, $date: DateTimeISO, $rating: Float) {
    updateContentWatch(logId: $logId, date: $date, rating: $rating) {
      ...UserContentLogFields
    }
  }
  ${USER_CONTENT_LOG_FIELDS}
`;

export const SAVE_CONTENT = gql`
  mutation SaveContent($input: SaveContentInput!) {
    saveContent(input: $input) {
      id
      title
      posterUrl
      contentType {
        id
        name
      }
    }
  }
`;

export const DELETE_ALL_USER_CONTENT_LOGS = gql`
  mutation DeleteAllUserContentLogs {
    deleteAllUserContentLogs
  }
`;

export const CREATE_USER_CONTENT_LOG = gql`
  mutation CreateUserContentLog($contentId: String!, $logData: UserContentLogInput!) {
    createUserContentLog(contentId: $contentId, logData: $logData)
  }
`;

export const UPDATE_USER_CONTENT_LOG = gql`
  mutation UpdateUserContentLog($contentId: String!, $updates: UserContentLogInput!) {
    updateUserContentLog(contentId: $contentId, updates: $updates)
  }
`;

export const REMOVE_TAG_FROM_ALL_LOGS = gql`
  mutation RemoveTagFromAllLogs($tag: String, $taggedUserId: String) {
    removeTagFromAllLogs(tag: $tag, taggedUserId: $taggedUserId)
  }
`;

// ==========================================
// TYPESCRIPT TYPES
// ==========================================
