import { gql } from '@apollo/client';

export const CONTENT_EMOTION_SUMMARY = gql`
  query ContentEmotionSummary($contentId: String!) {
    contentEmotionSummary(contentId: $contentId) {
      myEmotion
      counts {
        emotion
        count
      }
    }
  }
`;

export const SET_CONTENT_EMOTION = gql`
  mutation SetContentEmotion($contentId: String!, $emotion: String) {
    setContentEmotion(contentId: $contentId, emotion: $emotion) {
      myEmotion
      counts {
        emotion
        count
      }
    }
  }
`;

export const EMOTION_CONTENTS = gql`
  query EmotionContents($emotion: String!, $contentType: String, $limit: Int) {
    emotionContents(emotion: $emotion, contentType: $contentType, limit: $limit) {
      reactionCount
      content {
        id
        title
        releaseDate
        posterUrl
        ratingDistribution
        tmdbRating
        contentType {
          id
          name
          slug
        }
      }
    }
  }
`;

export type ContentEmotion =
  | 'funny'
  | 'scary'
  | 'emotional'
  | 'exciting'
  | 'relaxing'
  | 'thoughtful';

export const CONTENT_EMOTIONS: Array<{
  id: ContentEmotion;
  emoji: string;
}> = [
  { id: 'scary', emoji: '😱' },
  { id: 'emotional', emoji: '😭' },
  { id: 'funny', emoji: '😂' },
  { id: 'exciting', emoji: '🤯' },
  { id: 'relaxing', emoji: '😌' },
  { id: 'thoughtful', emoji: '🤔' },
];
