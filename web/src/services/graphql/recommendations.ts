import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { logGraphqlRequest } from '@/lib/requestLogger';
import { emitDebugEvent } from '@/lib/debug-events';

export type Recommendation = {
  id: string;
  contentId: string;
  recipientUserId: string;
  recommenderUserId: string;
  createdAt: string;
  thankedAt: string | null;
  content: {
    id: string;
    title: string;
    contentTypeId: number;
    posterUrl?: string | null;
  };
  recommender: {
    id: string;
    username: string;
    picturePath?: string | null;
  };
};

export type SentRecommendation = {
  id: string;
  contentId: string;
  recipientUserId: string;
  recommenderUserId: string;
  createdAt: string;
  thankedAt: string | null;
  content: {
    id: string;
    title: string;
    contentTypeId: number;
    posterUrl?: string | null;
  };
  recipient: {
    id: string;
    username: string;
    picturePath?: string | null;
  };
};

const RECOMMEND_CONTENT = gql`
  mutation RecommendContent($contentId: String!, $recipientUserIds: [String!]!) {
    recommendContent(contentId: $contentId, recipientUserIds: $recipientUserIds)
  }
`;

const MY_RECOMMENDATIONS = gql`
  query MyRecommendations($limit: Int!) {
    myRecommendations(limit: $limit) {
      id
      contentId
      recipientUserId
      recommenderUserId
      createdAt
      thankedAt
      content {
        id
        title
        contentTypeId
        posterUrl
      }
      recommender {
        id
        username
        picturePath
      }
    }
  }
`;

const MY_UNTHANKED_RECOMMENDATIONS_COUNT_QUERY = gql`
  query MyUnthankedRecommendationsCount {
    myUnthankedRecommendationsCount
  }
`;

const MY_SENT_RECOMMENDATIONS = gql`
  query MySentRecommendations($limit: Int!) {
    mySentRecommendations(limit: $limit) {
      id
      contentId
      recipientUserId
      recommenderUserId
      createdAt
      thankedAt
      content {
        id
        title
        contentTypeId
        posterUrl
      }
      recipient {
        id
        username
        picturePath
      }
    }
  }
`;

const THANK_RECOMMENDATION = gql`
  mutation ThankRecommendation($recommendationId: Int!) {
    thankRecommendation(recommendationId: $recommendationId)
  }
`;

export async function recommendContent(
  contentId: string,
  recipientUserIds: string[]
): Promise<{ count: number; error?: any }> {
  try {
    logGraphqlRequest('RecommendContent', true);
    emitDebugEvent({
      level: 'info',
      scope: 'Recommend',
      message: 'Öneri gönderiliyor',
      data: { contentId, count: recipientUserIds.length },
    });
    const result = await apolloClient.mutate<{ recommendContent: number }>({
      mutation: RECOMMEND_CONTENT,
      variables: { contentId, recipientUserIds },
    });

    const count = result.data?.recommendContent ?? 0;
    emitDebugEvent({
      level: 'success',
      scope: 'Recommend',
      message: 'Öneri gönderildi',
      data: { contentId, count },
    });
    return { count };
  } catch (error) {
    logGraphqlRequest('RecommendContent', false, (error as any)?.message);
    emitDebugEvent({
      level: 'error',
      scope: 'Recommend',
      message: 'Öneri gönderimi hata',
      data: { contentId, error },
    });
    return { count: 0, error };
  }
}

export async function fetchUnthankedRecommendationsCount(): Promise<{
  count: number;
  error?: any;
}> {
  try {
    logGraphqlRequest('MyUnthankedRecommendationsCount', true);
    emitDebugEvent({
      level: 'info',
      scope: 'Recommended',
      message: 'Öneri rozet sayısı yükleniyor',
    });

    const result = await apolloClient.query<{ myUnthankedRecommendationsCount: number }>({
      query: MY_UNTHANKED_RECOMMENDATIONS_COUNT_QUERY,
      fetchPolicy: 'network-only',
    });

    const count = result.data?.myUnthankedRecommendationsCount ?? 0;
    emitDebugEvent({
      level: 'success',
      scope: 'Recommended',
      message: 'Öneri rozet sayısı yüklendi',
      data: { count },
    });
    return { count };
  } catch (error) {
    logGraphqlRequest('MyUnthankedRecommendationsCount', false, (error as any)?.message);
    emitDebugEvent({
      level: 'error',
      scope: 'Recommended',
      message: 'Öneri rozet sayısı yükleme hata',
      data: { error },
    });
    return { count: 0, error };
  }
}

export async function getMyRecommendations(
  limit: number = 50
): Promise<{ data: Recommendation[]; error?: any }> {
  try {
    logGraphqlRequest('MyRecommendations', true);
    emitDebugEvent({
      level: 'info',
      scope: 'Recommended',
      message: 'Önerilenler yükleniyor',
      data: { limit },
    });
    const result = await apolloClient.query<{ myRecommendations: Recommendation[] }>({
      query: MY_RECOMMENDATIONS,
      variables: { limit },
      fetchPolicy: 'network-only',
    });

    const data = result.data?.myRecommendations ?? [];
    emitDebugEvent({
      level: 'success',
      scope: 'Recommended',
      message: 'Önerilenler yüklendi',
      data: { count: data.length },
    });
    return { data };
  } catch (error) {
    logGraphqlRequest('MyRecommendations', false, (error as any)?.message);
    emitDebugEvent({
      level: 'error',
      scope: 'Recommended',
      message: 'Önerilenler yükleme hata',
      data: { error },
    });
    return { data: [], error };
  }
}

export async function thankRecommendation(
  recommendationId: number
): Promise<{ success: boolean; error?: any }> {
  try {
    logGraphqlRequest('ThankRecommendation', true);
    emitDebugEvent({
      level: 'info',
      scope: 'Recommended',
      message: 'Teşekkür gönderiliyor',
      data: { recommendationId },
    });
    await apolloClient.mutate<{ thankRecommendation: boolean }>({
      mutation: THANK_RECOMMENDATION,
      variables: { recommendationId },
    });
    emitDebugEvent({
      level: 'success',
      scope: 'Recommended',
      message: 'Teşekkür gönderildi',
      data: { recommendationId },
    });
    return { success: true };
  } catch (error) {
    logGraphqlRequest('ThankRecommendation', false, (error as any)?.message);
    emitDebugEvent({
      level: 'error',
      scope: 'Recommended',
      message: 'Teşekkür hata',
      data: { recommendationId, error },
    });
    return { success: false, error };
  }
}

export async function getMySentRecommendations(
  limit: number = 50
): Promise<{ data: SentRecommendation[]; error?: any }> {
  try {
    logGraphqlRequest('MySentRecommendations', true);
    emitDebugEvent({
      level: 'info',
      scope: 'Recommended',
      message: 'Gönderilen öneriler yükleniyor',
      data: { limit },
    });
    const result = await apolloClient.query<{ mySentRecommendations: SentRecommendation[] }>({
      query: MY_SENT_RECOMMENDATIONS,
      variables: { limit },
      fetchPolicy: 'network-only',
    });

    const data = result.data?.mySentRecommendations ?? [];
    emitDebugEvent({
      level: 'success',
      scope: 'Recommended',
      message: 'Gönderilen öneriler yüklendi',
      data: { count: data.length },
    });
    return { data };
  } catch (error) {
    logGraphqlRequest('MySentRecommendations', false, (error as any)?.message);
    emitDebugEvent({
      level: 'error',
      scope: 'Recommended',
      message: 'Gönderilen öneriler yükleme hata',
      data: { error },
    });
    return { data: [], error };
  }
}
