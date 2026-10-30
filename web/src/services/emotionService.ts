import { apolloClient } from '@/lib/apollo-client';
import {
  CONTENT_EMOTION_SUMMARY,
  EMOTION_CONTENTS,
  SET_CONTENT_EMOTION,
  type ContentEmotion,
} from '@/services/graphql/emotions';

export interface EmotionCount {
  emotion: ContentEmotion;
  count: number;
}

export interface EmotionSummary {
  myEmotion: ContentEmotion | null;
  counts: EmotionCount[];
}

export async function getContentEmotionSummary(contentId: string): Promise<EmotionSummary> {
  const { data } = await apolloClient.query<{ contentEmotionSummary: EmotionSummary }>({
    query: CONTENT_EMOTION_SUMMARY,
    variables: { contentId },
    fetchPolicy: 'network-only',
  });
  if (!data) throw new Error('Emotion summary was not returned');
  return data.contentEmotionSummary;
}

export async function setContentEmotion(
  contentId: string,
  emotion: ContentEmotion | null
): Promise<EmotionSummary> {
  const { data } = await apolloClient.mutate<{ setContentEmotion: EmotionSummary }>({
    mutation: SET_CONTENT_EMOTION,
    variables: { contentId, emotion },
  });
  if (!data) throw new Error('Updated emotion summary was not returned');
  return data.setContentEmotion;
}

export async function getEmotionContents(emotion: ContentEmotion, contentType?: string) {
  const { data } = await apolloClient.query<{
    emotionContents: Array<{
      reactionCount: number;
      content: {
        id: string;
        title: string;
        releaseDate?: string | null;
        posterUrl?: string | null;
        ratingDistribution?: number[] | null;
        tmdbRating?: number | null;
        contentType: { id: number; name: string; slug: string };
      };
    }>;
  }>({
    query: EMOTION_CONTENTS,
    variables: { emotion, contentType: contentType || null, limit: 48 },
    fetchPolicy: 'network-only',
  });
  if (!data) throw new Error('Emotion discovery results were not returned');
  return data.emotionContents;
}
