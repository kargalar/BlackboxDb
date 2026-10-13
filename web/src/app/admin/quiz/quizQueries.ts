import { gql } from '@apollo/client';

export const GET_ALL_QUIZ_SETTINGS = gql`
  query GetAllQuizSettings {
    getAllQuizSettings {
      id
      contentTypeId
      isActive
      timePerQuestion
      questionsCount
      pointsLevel1
      pointsLevel2
      pointsLevel3
      pointsLevel4
      pointsLevel5
    }
  }
`;

export const UPDATE_QUIZ_SETTINGS = gql`
  mutation UpdateQuizSettings($input: UpdateQuizSettingsInput!) {
    updateQuizSettings(input: $input) {
      id
      contentTypeId
      isActive
      timePerQuestion
      questionsCount
      pointsLevel1
      pointsLevel2
      pointsLevel3
      pointsLevel4
      pointsLevel5
    }
  }
`;

export const GET_QUIZ_ENABLED_COUNT = gql`
  query GetQuizEnabledScreenshotCount($contentTypeId: Int!) {
    getQuizEnabledScreenshotCount(contentTypeId: $contentTypeId)
  }
`;

export const GET_QUIZ_ENABLED_CONTENT_COUNT = gql`
  query GetQuizEnabledContentCount($contentTypeId: Int!) {
    getQuizEnabledContentCount(contentTypeId: $contentTypeId)
  }
`;

export const SEARCH_CONTENT = gql`
  query SearchContent(
    $searchQuery: String
    $contentTypeId: Int
    $limit: Int
    $offset: Int
    $hasScreenshot: Boolean
    $hasEnabledScreenshot: Boolean
  ) {
    searchContent(
      searchQuery: $searchQuery
      contentTypeId: $contentTypeId
      limit: $limit
      offset: $offset
      hasScreenshot: $hasScreenshot
      hasEnabledScreenshot: $hasEnabledScreenshot
    ) {
      items {
        id
        title
        posterUrl
        contentTypeId
        isEnabledForQuiz
        enabledScreenshotCount
        screenshotCount
      }
      total
      page
      totalPages
    }
  }
`;

export const GET_CONTENT_SCREENSHOTS = gql`
  query GetContentScreenshots($contentId: String!) {
    getContentScreenshots(contentId: $contentId) {
      id
      contentId
      imageUrl
      difficulty
      order
      description
      isEnabledForQuiz
    }
  }
`;

export const TOGGLE_SCREENSHOT_QUIZ = gql`
  mutation ToggleScreenshotQuizStatus($id: Int!, $enabled: Boolean!) {
    toggleScreenshotQuizStatus(id: $id, enabled: $enabled)
  }
`;

export const TOGGLE_CONTENT_QUIZ = gql`
  mutation ToggleContentQuizStatus($contentId: String!, $enabled: Boolean!) {
    toggleContentQuizStatus(contentId: $contentId, enabled: $enabled)
  }
`;

export const UPDATE_SCREENSHOT = gql`
  mutation UpdateScreenshot($input: UpdateScreenshotInput!) {
    updateScreenshot(input: $input) {
      id
      difficulty
      order
      description
      isEnabledForQuiz
    }
  }
`;

export const DELETE_SCREENSHOT = gql`
  mutation DeleteScreenshot($id: Int!) {
    deleteScreenshot(id: $id)
  }
`;
