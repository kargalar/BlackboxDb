import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
export * from './userContent';
import {
  UserContentLog,
  GET_CONTENT_LOG_HISTORY,
  SAVE_CONTENT,
  SaveContentData,
  SaveContentInput,
  Content,
} from './userContent';

import { CONTENT_BASIC_FIELDS, CONTENT_DETAIL_FIELDS } from './contentFragments';
export { CONTENT_BASIC_FIELDS, CONTENT_DETAIL_FIELDS } from './contentFragments';

// ==========================================
// CONTENT QUERIES
// ==========================================

export const GET_CONTENT = gql`
  query GetContent($id: String!) {
    content(id: $id) {
      ...ContentDetailFields
    }
  }
  ${CONTENT_DETAIL_FIELDS}
`;

export const GET_CONTENTS = gql`
  query GetContents($type: String, $limit: Int, $offset: Int) {
    contents(type: $type, limit: $limit, offset: $offset) {
      ...ContentBasicFields
    }
  }
  ${CONTENT_BASIC_FIELDS}
`;

export const SEARCH_CONTENT_MINIMAL = gql`
  query SearchContentMinimal($searchQuery: String!, $contentTypeId: Int, $limit: Int) {
    searchContent(searchQuery: $searchQuery, contentTypeId: $contentTypeId, limit: $limit) {
      items {
        id
        title
        originalTitle
        releaseDate
        posterUrl
        backdropUrl
        contentType {
          id
          name
        }
      }
    }
  }
`;

export const SEARCH_CONTENT = gql`
  query SearchContent($query: String!, $type: String, $limit: Int) {
    searchContent(query: $query, type: $type, limit: $limit) {
      ...ContentBasicFields
    }
  }
  ${CONTENT_BASIC_FIELDS}
`;

export const GET_POPULAR_CONTENT = gql`
  query GetPopularContent($type: String, $limit: Int) {
    popularContent(type: $type, limit: $limit) {
      ...ContentBasicFields
    }
  }
  ${CONTENT_BASIC_FIELDS}
`;

export const GET_FRANCHISE_CONTENT = gql`
  query GetFranchiseContent($franchiseId: String!, $excludeContentId: String) {
    getFranchiseContent(franchiseId: $franchiseId, excludeContentId: $excludeContentId) {
      id
      title
      releaseDate
      posterUrl
      runtime
      contentTypeId
      contentType {
        id
        name
      }
    }
  }
`;

export const GET_PLAYTIME_LEADERBOARD = gql`
  query ContentPlaytimeLeaderboard($contentId: String!, $orderBy: String!, $limit: Int) {
    contentPlaytimeLeaderboard(contentId: $contentId, orderBy: $orderBy, limit: $limit) {
      userId
      username
      avatarUrl
      playtimeMinutes
      updatedAt
    }
  }
`;

export const GET_USER_TOTAL_PLAYTIME = gql`
  query UserTotalPlaytimeForContent($contentId: String!) {
    userTotalPlaytimeForContent(contentId: $contentId)
  }
`;

// ==========================================
// CONTENT TYPES
// ==========================================

export const GET_PUBLIC_CONTENT_EDIT_HISTORY = gql`
  query PublicContentEditHistory($contentId: String!, $limit: Int) {
    publicContentEditHistory(contentId: $contentId, limit: $limit) {
      id
      action
      summary
      changedFields
      before
      after
      createdAt
      actor {
        id
        username
        picturePath
      }
    }
  }
`;

export interface GetContentData {
  content: Content;
}

export interface GetContentsData {
  contents: Content[];
}

export interface SearchContentData {
  searchContent: Content[];
}

export interface PopularContentData {
  popularContent: Content[];
}

// ==========================================
// CONTENT SAVE HELPERS (GraphQL)
// ==========================================

// Save TMDB Movie to content database via GraphQL
export async function saveContentFromTMDB(movie: any): Promise<{ data?: any; error?: any }> {
  try {
    console.log('🎬 [GraphQL] Saving TMDB movie:', movie.id, movie.title);

    const input: SaveContentInput = {
      id: movie.id.toString(),
      title: movie.title || 'Unknown',
      originalTitle: movie.original_title,
      contentTypeId: 1, // MOVIE
      releaseDate: movie.release_date,
      description: movie.overview,
      runtime: movie.runtime,
      status: movie.status,
      adult: movie.adult,
      rawData: JSON.stringify(movie), // Tüm TMDB verisi - normalize edilecek
    };

    const { data } = await apolloClient.mutate<SaveContentData>({
      mutation: SAVE_CONTENT,
      variables: { input },
    });

    console.log('✅ [GraphQL] Movie saved with normalized data:', data?.saveContent.id);
    return { data: data?.saveContent };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error saving movie:', e);
    return { error: e };
  }
}

// Save TMDB TV to content database via GraphQL
export async function saveContentFromTMDBTv(tv: any): Promise<{ data?: any; error?: any }> {
  try {
    console.log('📺 [GraphQL] Saving TMDB TV:', tv.id, tv.name);

    const input: SaveContentInput = {
      id: tv.id.toString(),
      title: tv.name || 'Unknown',
      originalTitle: tv.original_name,
      contentTypeId: 2, // TV
      releaseDate: tv.first_air_date,
      description: tv.overview,
      status: tv.status,
      rawData: JSON.stringify(tv), // Tüm TMDB verisi
    };

    const { data } = await apolloClient.mutate<SaveContentData>({
      mutation: SAVE_CONTENT,
      variables: { input },
    });

    console.log('✅ [GraphQL] TV saved with normalized data:', data?.saveContent.id);
    return { data: data?.saveContent };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error saving TV:', e);
    return { error: e };
  }
}

// Save IGDB Game to content database via GraphQL
export async function saveContentFromIGDB(game: any): Promise<{ data?: any; error?: any }> {
  try {
    console.log('🎮 [GraphQL] Saving IGDB game:', game.id, game.name);

    const input: SaveContentInput = {
      id: game.id.toString(),
      title: game.name || 'Unknown',
      contentTypeId: 3, // GAME
      releaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
        : undefined,
      description: game.summary,
      rawData: JSON.stringify(game), // Tüm IGDB verisi
    };

    const { data } = await apolloClient.mutate<SaveContentData>({
      mutation: SAVE_CONTENT,
      variables: { input },
    });

    console.log('✅ [GraphQL] Game saved with normalized data:', data?.saveContent.id);
    return { data: data?.saveContent };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error saving game:', e);
    return { error: e };
  }
}

// Save Google Book to content database via GraphQL
export async function saveContentFromBook(
  bookId: string,
  bookData: any
): Promise<{ data?: any; error?: any }> {
  try {
    console.log('📚 [GraphQL] Saving Google Book:', bookId, bookData.title);

    const input: SaveContentInput = {
      id: bookId,
      title: bookData.title || 'Unknown',
      contentTypeId: 4, // BOOK
      releaseDate: bookData.publishedDate,
      description: bookData.description,
      isbn: bookData.isbn,
      rawData: JSON.stringify(bookData), // Tüm Google Books verisi
    };

    const { data } = await apolloClient.mutate<SaveContentData>({
      mutation: SAVE_CONTENT,
      variables: { input },
    });

    console.log('✅ [GraphQL] Book saved with normalized data:', data?.saveContent.id);
    return { data: data?.saveContent };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error saving book:', e);
    return { error: e };
  }
}

// Get content by ID via GraphQL
export async function getContentById(contentId: string): Promise<{ data?: any; error?: any }> {
  try {
    console.log('🔍 [GraphQL] Getting content by ID:', contentId);

    const { data } = await apolloClient.query<{ content: any }>({
      query: GET_CONTENT,
      variables: { id: contentId },
      fetchPolicy: 'network-only',
    });

    console.log('✅ [GraphQL] Content found:', data?.content?.id);
    return { data: data?.content };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting content:', e);
    return { error: e };
  }
}

// Get content log history for a single content via GraphQL
export async function getContentLogHistory(
  contentId: string
): Promise<{ data?: UserContentLog[]; error?: any }> {
  try {
    console.log('📜 [GraphQL] Getting content log history for:', contentId);

    const { data } = await apolloClient.query<{ contentLogHistory: UserContentLog[] }>({
      query: GET_CONTENT_LOG_HISTORY,
      variables: { contentId },
      fetchPolicy: 'network-only',
    });

    console.log(
      '✅ [GraphQL] Content log history loaded:',
      data?.contentLogHistory?.length || 0,
      'logs'
    );
    return { data: data?.contentLogHistory || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting content log history:', e);
    return { data: [], error: e };
  }
}

export interface PlaytimeLeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string;
  playtimeMinutes: number;
  updatedAt: string;
}

export async function getUserTotalPlaytime(
  contentId: string
): Promise<{ data: number; error?: any }> {
  try {
    const { data } = await apolloClient.query<{ userTotalPlaytimeForContent: number }>({
      query: GET_USER_TOTAL_PLAYTIME,
      variables: { contentId },
      fetchPolicy: 'network-only',
    });
    return { data: data?.userTotalPlaytimeForContent ?? 0 };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting user total playtime:', e);
    return { data: 0, error: e };
  }
}

export async function fetchPlaytimeLeaderboard(
  contentId: string,
  orderBy: 'playtime_desc' | 'playtime_asc' | 'date_desc' | 'date_asc' = 'playtime_desc'
): Promise<{ data?: PlaytimeLeaderboardEntry[]; error?: any }> {
  try {
    const { data } = await apolloClient.query<{
      contentPlaytimeLeaderboard: PlaytimeLeaderboardEntry[];
    }>({
      query: GET_PLAYTIME_LEADERBOARD,
      variables: { contentId, orderBy, limit: 100 },
      fetchPolicy: 'network-only',
    });
    return { data: data?.contentPlaytimeLeaderboard || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting playtime leaderboard:', e);
    return { data: [], error: e };
  }
}

export async function fetchContentEditHistory(
  contentId: string,
  limit: number = 50
): Promise<{ data?: any[]; error?: any }> {
  try {
    const { data } = await apolloClient.query<{ publicContentEditHistory: any[] }>({
      query: GET_PUBLIC_CONTENT_EDIT_HISTORY,
      variables: { contentId, limit },
      fetchPolicy: 'network-only',
    });
    return { data: data?.publicContentEditHistory || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting content edit history:', e);
    return { data: [], error: e };
  }
}

export const USER_VOTE_IMAGE = gql`
  mutation VoteImage($imageId: Int!, $voteType: Int!) {
    voteImage(imageId: $imageId, voteType: $voteType) {
      id
      upvoteCount
      downvoteCount
      userVote
    }
  }
`;

export const USER_VOTE_SCREENSHOT = gql`
  mutation VoteScreenshot($screenshotId: Int!, $voteType: Int!) {
    voteScreenshot(screenshotId: $screenshotId, voteType: $voteType) {
      id
      upvoteCount
      downvoteCount
      userVote
    }
  }
`;

export async function voteImage(imageId: number, voteType: number) {
  try {
    const { data } = await apolloClient.mutate<{ voteImage: any }>({
      mutation: USER_VOTE_IMAGE,
      variables: { imageId, voteType },
    });
    return { data: data?.voteImage };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error voting image:', e);
    return { error: e };
  }
}

export async function voteScreenshot(screenshotId: number, voteType: number) {
  try {
    const { data } = await apolloClient.mutate<{ voteScreenshot: any }>({
      mutation: USER_VOTE_SCREENSHOT,
      variables: { screenshotId, voteType },
    });
    return { data: data?.voteScreenshot };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error voting screenshot:', e);
    return { error: e };
  }
}

export const GET_CITATION_NETWORK = gql`
  query GetCitationNetwork {
    citationNetwork {
      id
      citingContentId
      citedContentId
      note
      imageUrl
      citingContent {
        id
        title
        posterUrl
        releaseDate
        contentTypeId
      }
      citedContent {
        id
        title
        posterUrl
        releaseDate
        contentTypeId
      }
    }
  }
`;
