import {
  saveContentFromTMDB,
  saveContentFromTMDBTv,
  saveContentFromIGDB,
  saveContentFromBook,
  getContentById,
} from '@/services/graphql/content';
import { isUpcomingContent } from '@/lib/contentStatus';
import type { UnifiedContent } from '@/types/unified-content';
const DASHBOARD_POPULAR_CONTENT_LIMIT = 20;

/** Fetch popular content from the GraphQL endpoint */
export async function fetchPopularContent(
  type: string,
  timeRange: string = 'all'
): Promise<UnifiedContent[]> {
  const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        query GetPopularContent($type: String, $timeRange: String, $limit: Int) {
          popularContent(type: $type, timeRange: $timeRange, limit: $limit) {
            id
            title
            contentTypeId
            releaseDate
            description
            posterUrl
            backdropUrl
            runtime
            status
          }
        }
      `,
      variables: { type, timeRange, limit: DASHBOARD_POPULAR_CONTENT_LIMIT },
    }),
  });
  if (!response.ok) {
    throw new Error(`Popular content request failed (${response.status})`);
  }
  const result = (await response.json()) as {
    data?: { popularContent?: UnifiedContent[] };
    errors?: Array<{ message?: string }>;
  };
  if (result.errors?.length) {
    throw new Error(
      result.errors
        .map((error: { message?: string }) => error.message)
        .filter(Boolean)
        .join('; ') || 'Popular content query failed.'
    );
  }
  console.log(
    `📡 fetchPopularContent(${type}, ${timeRange}): ${result.data?.popularContent?.length ?? 0} items`
  );
  return result.data?.popularContent || [];
}

/** Fetch most anticipated upcoming content from the GraphQL endpoint */
export async function fetchMostAnticipatedUpcomingContent(
  type: string,
  limit: number = 5
): Promise<UnifiedContent[]> {
  const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
  const typeMap: Record<string, number> = { movie: 1, tv: 2, game: 3, book: 4 };
  const contentTypeId = typeMap[type] || 1;

  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetMostAnticipatedUpcomingContent($contentTypeId: Int!, $limit: Int) {
            mostAnticipatedUpcomingContent(contentTypeId: $contentTypeId, limit: $limit) {
              id
              title
              contentTypeId
              releaseDate
              description
              posterUrl
              backdropUrl
              runtime
              status
              consumeLaterCount
            }
          }
        `,
        variables: { contentTypeId, limit },
      }),
    });
    if (!response.ok) {
      throw new Error(`Anticipated content request failed (${response.status})`);
    }
    const result = (await response.json()) as {
      data?: { mostAnticipatedUpcomingContent?: UnifiedContent[] };
      errors?: Array<{ message?: string }>;
    };
    if (result.errors?.length) {
      throw new Error(
        result.errors
          .map((error) => error.message)
          .filter(Boolean)
          .join('; ') || 'Anticipated content query failed.'
      );
    }
    console.log(
      `📡 fetchMostAnticipatedUpcomingContent(${type}): ${result.data?.mostAnticipatedUpcomingContent?.length ?? 0} items`
    );
    return result.data?.mostAnticipatedUpcomingContent || [];
  } catch (error) {
    console.error(`❌ fetchMostAnticipatedUpcomingContent(${type}) failed:`, error);
    return [];
  }
}

/** Filter items that are upcoming by release date */
export function filterUpcoming(items: UnifiedContent[]): UnifiedContent[] {
  return items.filter((i) =>
    isUpcomingContent({
      status: i.status,
      releaseDate: i.releaseDate,
    })
  );
}

/**
 * Ensure content exists in the database, saving it if necessary.
 * @returns content ID on success, `null` on failure.
 */
export async function ensureContentSaved(item: any, contentType: string): Promise<string | null> {
  const itemId = item.id.toString();

  try {
    const existingContent = await getContentById(itemId);
    if (existingContent?.data) {
      console.log(`✅ ensureContentSaved: ${contentType} ${itemId} already exists`);
      return itemId;
    }

    console.log(`📝 ensureContentSaved: ${contentType} ${itemId} not in DB, saving…`);
    console.log(`📊 ensureContentSaved: Item data for ${contentType}:`, item);

    let saveResult;

    if (contentType === 'movie') {
      saveResult = await saveContentFromTMDB(item);
    } else if (contentType === 'tv') {
      saveResult = await saveContentFromTMDBTv(item);
    } else if (contentType === 'game') {
      console.log('🎮 ensureContentSaved: Saving game:', {
        id: item.id,
        name: item.name,
        cover: item.cover,
        summary: item.summary,
        first_release_date: item.first_release_date,
      });
      saveResult = await saveContentFromIGDB(item);
    } else if (contentType === 'book') {
      console.log('📚 ensureContentSaved: Saving book:', {
        id: itemId,
        title: item.title || item.volumeInfo?.title,
        authors: item.authors,
        thumbnail: item.thumbnail || item.volumeInfo?.imageLinks?.thumbnail,
      });
      const bookData = {
        title: item.title || item.volumeInfo?.title || 'Unknown',
        description: item.description || item.volumeInfo?.description || null,
        publishedDate: item.publishedDate || item.volumeInfo?.publishedDate || null,
        isbn:
          item.isbn ||
          item.volumeInfo?.industryIdentifiers?.find(
            (identifier: any) => identifier?.type === 'ISBN_13'
          )?.identifier ||
          item.volumeInfo?.industryIdentifiers?.[0]?.identifier ||
          null,
        pageCount: item.pageCount || item.volumeInfo?.pageCount || null,
        thumbnail: item.thumbnail || item.volumeInfo?.imageLinks?.thumbnail || null,
        authors: item.authors || item.volumeInfo?.authors || [],
        categories: item.categories || item.volumeInfo?.categories || [],
        averageRating: item.averageRating || item.volumeInfo?.averageRating || undefined,
        ratingsCount: item.ratingsCount || item.volumeInfo?.ratingsCount || undefined,
      };
      saveResult = await saveContentFromBook(itemId, bookData);
    }

    if (saveResult?.data) {
      const contentId = saveResult.data.id.toString();
      console.log(`✅ ensureContentSaved: ${contentType.toUpperCase()} saved → ${contentId}`);
      return contentId;
    }

    console.error(`❌ ensureContentSaved: Failed to save ${contentType}:`, saveResult?.error);
    return null;
  } catch (error) {
    console.error(`❌ ensureContentSaved: Error for ${contentType} ${itemId}:`, error);
    return null;
  }
}
