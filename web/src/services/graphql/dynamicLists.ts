import { gql } from '@apollo/client';
import type { UnifiedContent } from '@/types/unified-content';

const getAuthHeaders = (): Record<string, string> => {
  return {};
};

const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

const BASE_CONTENT_FIELDS = `
  id
  title
  contentTypeId
  releaseDate
  description
  posterUrl
  backdropUrl
  runtime
  status
`;

export async function getMostAbandonedContent(
  contentTypeId?: number,
  limit: number = 20
): Promise<{ data: UnifiedContent[] | null; error: any }> {
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        query: `
          query GetMostAbandonedContent($contentTypeId: Int, $limit: Int) {
            getMostAbandonedContent(contentTypeId: $contentTypeId, limit: $limit) {
              ${BASE_CONTENT_FIELDS}
            }
          }
        `,
        variables: { contentTypeId, limit },
      }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);

    return { data: result.data.getMostAbandonedContent, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getLongestPlaytimeContent(
  contentTypeId?: number,
  limit: number = 20
): Promise<{ data: UnifiedContent[] | null; error: any }> {
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        query: `
          query GetLongestPlaytimeContent($contentTypeId: Int, $limit: Int) {
            getLongestPlaytimeContent(contentTypeId: $contentTypeId, limit: $limit) {
              ${BASE_CONTENT_FIELDS}
            }
          }
        `,
        variables: { contentTypeId, limit },
      }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);

    return { data: result.data.getLongestPlaytimeContent, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getMostConsumedContent(
  contentTypeId?: number,
  limit: number = 20
): Promise<{ data: UnifiedContent[] | null; error: any }> {
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        query: `
          query GetMostConsumedContent($contentTypeId: Int, $limit: Int) {
            getMostConsumedContent(contentTypeId: $contentTypeId, limit: $limit) {
              ${BASE_CONTENT_FIELDS}
            }
          }
        `,
        variables: { contentTypeId, limit },
      }),
    });

    const result = await response.json();
    if (result.errors) throw new Error(result.errors[0].message);

    return { data: result.data.getMostConsumedContent, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
