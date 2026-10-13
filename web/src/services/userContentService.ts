/**
 * Modern User Content Service using GraphQL
 * This replaces the legacy movieLogs.ts Supabase implementation
 */

import { apolloClient } from '@/lib/apollo-client';
import { logApiRequest } from '@/lib/requestLogger';
import {
  GET_USER_WATCHED_CONTENT,
  GET_USER_STATS,
  GET_CONTENT_STATS,
  LOG_CONTENT_WATCH,
  UNLOG_CONTENT_WATCH,
  TOGGLE_CONTENT_FAVORITE,
  RATE_CONTENT,
  TOGGLE_CONSUME_LATER,
  DELETE_CONTENT_WATCH,
  UPDATE_CONTENT_WATCH,
  GET_USER_CONTENT_LOG,
  GET_USER_CONTENT_LOGS,
  GET_ALL_USER_CONTENT_LOGS,
  GET_ACTIVITY_FEED,
  GET_FRIENDS_ACTIVITY_FEED,
  TOGGLE_CONTINUING,
  TOGGLE_ABANDONED,
  type GetUserWatchedContentData,
  type GetUserStatsData,
  type GetContentStatsData,
  type GetUserContentLogData,
  type GetUserContentLogsData,
  type GetAllUserContentLogsData,
  type GetActivityFeedData,
  type GetFriendsActivityFeedData,
  type UserContentLog,
  type UserStats,
  type ContentStats,
} from '@/services/graphql/userContent';

// ==========================================
// USER CONTENT QUERIES
// ==========================================

/**
 * Get user's watched content by type (MOVIE, TV, GAME, BOOK)
 */
export async function getUserWatchedContent(
  userId: string,
  contentType: 'MOVIE' | 'TV' | 'GAME' | 'BOOK'
) {
  try {
    console.log(`🔍 [GraphQL] Fetching user watched ${contentType}, userId:`, userId);

    const { data } = await apolloClient.query<GetUserWatchedContentData>({
      query: GET_USER_WATCHED_CONTENT,
      variables: { userId, contentType },
      fetchPolicy: 'network-only',
    });

    if (!data?.userWatchedContent) {
      console.log('⚠️ No data returned');
      return { data: [], error: null };
    }

    console.log(`✅ Found ${data.userWatchedContent.length} items`);
    return { data: data.userWatchedContent, error: null };
  } catch (error) {
    console.error('❌ Error fetching watched content:', error);
    return { data: [], error };
  }
}

/**
 * Get user statistics (total movies, this year, average rating, etc)
 */
export async function getUserStats(
  userId: string
): Promise<{ data: UserStats | null; error?: any }> {
  try {
    console.log('📊 [GraphQL] Fetching user stats, userId:', userId);

    const { data } = await apolloClient.query<GetUserStatsData>({
      query: GET_USER_STATS,
      variables: { userId },
      fetchPolicy: 'network-only',
    });

    if (!data?.userStats) {
      return { data: null, error: 'No stats found' };
    }

    console.log('✅ User stats fetched');
    return { data: data.userStats, error: null };
  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    return { data: null, error };
  }
}

/**
 * Get content statistics (consume count, favorite count, reviews, etc)
 */
export async function getContentStats(
  contentId: string
): Promise<{ data: ContentStats | null; error?: any }> {
  try {
    console.log('📊 [GraphQL] Fetching content stats, contentId:', contentId);

    const { data } = await apolloClient.query<GetContentStatsData>({
      query: GET_CONTENT_STATS,
      variables: { contentId },
      fetchPolicy: 'network-only',
    });

    if (!data?.contentStats) {
      return { data: null, error: 'No stats found' };
    }

    console.log('✅ Content stats fetched');
    return { data: data.contentStats, error: null };
  } catch (error) {
    console.error('❌ Error fetching content stats:', error);
    return { data: null, error };
  }
}

/**
 * Get user's content log for a specific content
 */
export async function getUserContentLog(
  contentId: string
): Promise<{ data: UserContentLog | null; error?: any }> {
  try {
    console.log('📝 [GraphQL] Fetching user content log, contentId:', contentId);

    const { data } = await apolloClient.query<GetUserContentLogData>({
      query: GET_USER_CONTENT_LOG,
      variables: { contentId },
      fetchPolicy: 'network-only',
    });

    return { data: data?.userContentLog ?? null, error: null };
  } catch (error) {
    console.error('❌ Error fetching user content log:', error);
    return { data: null, error };
  }
}

/**
 * Get user's content logs for multiple content IDs (bulk)
 */
export async function getUserContentLogs(
  contentIds: string[]
): Promise<{ data: UserContentLog[]; error?: any }> {
  try {
    console.log('📝 [GraphQL] Fetching user content logs, count:', contentIds.length);

    const result = await apolloClient.query<GetUserContentLogsData>({
      query: GET_USER_CONTENT_LOGS,
      variables: { contentIds },
      fetchPolicy: 'network-only',
    });

    return { data: result.data?.userContentLogs || [], error: null };
  } catch (error) {
    console.error('❌ Error fetching user content logs:', error);
    return { data: [], error };
  }
}

/**
 * Get all user content logs (for settings/export)
 */
export async function getAllUserContentLogs(
  userId?: string,
  limit?: number
): Promise<{ data: UserContentLog[]; error?: any }> {
  try {
    console.log('📝 [GraphQL] Fetching all user content logs:', { userId, limit });

    const result = await apolloClient.query<GetAllUserContentLogsData>({
      query: GET_ALL_USER_CONTENT_LOGS,
      variables: { userId, limit },
      fetchPolicy: 'network-only',
    });

    return { data: result.data?.allUserContentLogs || [], error: null };
  } catch (error) {
    console.error('❌ Error fetching all user content logs:', error);
    return { data: [], error };
  }
}

/**
 * Get activity feed (recent activity with content details)
 */
export async function getActivityFeed(
  userId?: string,
  limit?: number
): Promise<{ data: UserContentLog[]; error?: any }> {
  try {
    console.log('📰 [GraphQL] Fetching activity feed:', { userId, limit });

    const result = await apolloClient.query<GetActivityFeedData>({
      query: GET_ACTIVITY_FEED,
      variables: { userId, limit },
      fetchPolicy: 'network-only',
    });

    return { data: result.data?.activityFeed || [], error: null };
  } catch (error) {
    console.error('❌ Error fetching activity feed:', error);
    return { data: [], error };
  }
}

/**
 * Get friends activity feed (recent activity from users that the current user follows)
 */
export async function getFriendsActivityFeed(
  limit?: number
): Promise<{ data: UserContentLog[]; error?: any }> {
  try {
    console.log('👥📰 [GraphQL] Fetching friends activity feed:', { limit });

    // Debug info that helps spot auth/cors issues quickly
    if (typeof window !== 'undefined') {
      console.log('🧭 [GraphQL] friendsActivityFeed env:', {
        endpoint: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
      });
    }

    const result = await apolloClient.query<GetFriendsActivityFeedData>({
      query: GET_FRIENDS_ACTIVITY_FEED,
      variables: { limit },
      fetchPolicy: 'network-only',
    });

    const items = result.data?.friendsActivityFeed || [];
    console.log('✅ 👥📰 [GraphQL] Friends activity feed loaded:', { count: items.length });
    return { data: items, error: null };
  } catch (error) {
    console.error('❌ Error fetching friends activity feed:', error);
    return { data: [], error };
  }
}

// ==========================================
// USER CONTENT ACTIONS (MUTATIONS)
// ==========================================

/**
 * Log content as watched/read/played
 */
export async function logContentWatch(
  contentId: string,
  bookPublicationId?: number | null
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('➕ [GraphQL] Logging content watch, contentId:', contentId);

    const result = await apolloClient.mutate<{ logContentWatch: boolean }>({
      mutation: LOG_CONTENT_WATCH,
      variables: { contentId, bookPublicationId },
    });

    if (!result.data?.logContentWatch) {
      logApiRequest('GraphQL:logContentWatch', 'MUTATION', false, 'Failed to log');
      return { success: false, error: 'Failed to log' };
    }

    console.log('✅ Content watch logged');
    logApiRequest('GraphQL:logContentWatch', 'MUTATION', true);
    return { success: true };
  } catch (error) {
    console.error('❌ Error logging content watch:', error);
    logApiRequest(
      'GraphQL:logContentWatch',
      'MUTATION',
      false,
      error instanceof Error ? error.message : String(error)
    );
    return { success: false, error };
  }
}

/**
 * Unlog content watch
 */
export async function unlogContentWatch(
  contentId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('➖ [GraphQL] Unlogging content watch, contentId:', contentId);

    const result = await apolloClient.mutate<{ unlogContentWatch: boolean }>({
      mutation: UNLOG_CONTENT_WATCH,
      variables: { contentId },
    });

    if (!result.data?.unlogContentWatch) {
      logApiRequest('GraphQL:unlogContentWatch', 'MUTATION', false, 'Failed to unlog');
      return { success: false, error: 'Failed to unlog' };
    }

    console.log('✅ Content watch unlogged');
    logApiRequest('GraphQL:unlogContentWatch', 'MUTATION', true);
    return { success: true };
  } catch (error) {
    console.error('❌ Error unlogging content watch:', error);
    logApiRequest(
      'GraphQL:unlogContentWatch',
      'MUTATION',
      false,
      error instanceof Error ? error.message : String(error)
    );
    return { success: false, error };
  }
}

/**
 * Toggle content favorite status
 */
export async function toggleContentFavorite(
  contentId: string
): Promise<{ isFavorite: boolean; error?: any }> {
  try {
    console.log('⭐ [GraphQL] Toggling content favorite, contentId:', contentId);

    const result = await apolloClient.mutate<{ toggleContentFavorite: boolean }>({
      mutation: TOGGLE_CONTENT_FAVORITE,
      variables: { contentId },
    });

    const isFavorite = result.data?.toggleContentFavorite ?? false;

    console.log(`✅ Favorite ${isFavorite ? 'added' : 'removed'}`);
    logApiRequest('GraphQL:toggleContentFavorite', 'MUTATION', true);
    return { isFavorite };
  } catch (error) {
    console.error('❌ Error toggling favorite:', error);
    logApiRequest(
      'GraphQL:toggleContentFavorite',
      'MUTATION',
      false,
      error instanceof Error ? error.message : String(error)
    );
    return { isFavorite: false, error };
  }
}

/**
 * Rate content (1 to 10)
 */
export async function rateContent(
  contentId: string,
  rating: number | null,
  bookPublicationId?: number | null
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('⭐ [GraphQL] Rating content, contentId:', contentId, 'rating:', rating);

    // Validate rating
    if (rating !== null && (rating < 1 || rating > 10)) {
      return { success: false, error: 'Rating must be between 1 and 10' };
    }

    const result = await apolloClient.mutate<{ rateContent: boolean }>({
      mutation: RATE_CONTENT,
      variables: { contentId, rating, bookPublicationId },
    });

    if (!result.data?.rateContent) {
      return { success: false, error: 'Failed to rate' };
    }

    console.log('✅ Content rated');
    return { success: true };
  } catch (error) {
    console.error('❌ Error rating content:', error);
    return { success: false, error };
  }
}

/**
 * Toggle consume later (watch later / read later)
 */
export async function toggleConsumeLater(
  contentId: string
): Promise<{ isConsumeLater: boolean; error?: any }> {
  try {
    console.log('⏰ [GraphQL] Toggling consume later, contentId:', contentId);

    const result = await apolloClient.mutate<{ toggleConsumeLater: boolean }>({
      mutation: TOGGLE_CONSUME_LATER,
      variables: { contentId },
    });

    const isConsumeLater = result.data?.toggleConsumeLater ?? false;

    console.log(`✅ Consume later ${isConsumeLater ? 'enabled' : 'disabled'}`);
    logApiRequest('GraphQL:toggleConsumeLater', 'MUTATION', true);
    return { isConsumeLater };
  } catch (error) {
    console.error('❌ Error toggling consume later:', error);
    logApiRequest(
      'GraphQL:toggleConsumeLater',
      'MUTATION',
      false,
      error instanceof Error ? error.message : String(error)
    );
    return { isConsumeLater: false, error };
  }
}

/**
 * Toggle continuing (in progress)
 */
export async function toggleContinuing(
  contentId: string
): Promise<{ isContinuing: boolean; error?: any }> {
  try {
    console.log('▶️ [GraphQL] Toggling continuing:', contentId);

    const result = await apolloClient.mutate<{ toggleContentContinuing: boolean }>({
      mutation: TOGGLE_CONTINUING,
      variables: { contentId },
    });

    const isContinuing = result.data?.toggleContentContinuing ?? false;
    console.log('✅ Continuing toggled:', isContinuing);
    logApiRequest('GraphQL:toggleContinuing', 'MUTATION', true);
    return { isContinuing };
  } catch (error) {
    console.error('❌ Error toggling continuing:', error);
    logApiRequest(
      'GraphQL:toggleContinuing',
      'MUTATION',
      false,
      error instanceof Error ? error.message : String(error)
    );
    return { isContinuing: false, error };
  }
}

/**
 * Toggle abandoned (dropped) status
 */
export async function toggleAbandoned(
  contentId: string
): Promise<{ isAbandoned: boolean; error?: any }> {
  try {
    console.log('🚫 [GraphQL] Toggling abandoned:', contentId);

    const result = await apolloClient.mutate<{ toggleContentAbandoned: boolean }>({
      mutation: TOGGLE_ABANDONED,
      variables: { contentId },
    });

    const isAbandoned = result.data?.toggleContentAbandoned ?? false;
    console.log('✅ Abandoned toggled:', isAbandoned);
    logApiRequest('GraphQL:toggleAbandoned', 'MUTATION', true);
    return { isAbandoned };
  } catch (error) {
    console.error('❌ Error toggling abandoned:', error);
    logApiRequest(
      'GraphQL:toggleAbandoned',
      'MUTATION',
      false,
      error instanceof Error ? error.message : String(error)
    );
    return { isAbandoned: false, error };
  }
}

/**
 * Delete specific content watch log by ID
 */
export async function deleteContentWatch(
  logId: number
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('🗑️ [GraphQL] Deleting content watch log, logId:', logId);

    const result = await apolloClient.mutate<{ deleteContentWatch: boolean }>({
      mutation: DELETE_CONTENT_WATCH,
      variables: { logId },
    });

    if (!result.data?.deleteContentWatch) {
      return { success: false, error: 'Failed to delete' };
    }

    console.log('✅ Content watch log deleted');
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting content watch:', error);
    return { success: false, error };
  }
}

/**
 * Update existing content watch log (date, rating)
 */
export async function updateContentWatch(
  logId: number,
  updates: {
    date?: Date;
    rating?: number;
  }
): Promise<{ data: UserContentLog | null; error?: any }> {
  try {
    console.log('📝 [GraphQL] Updating content watch log:', {
      logId,
      updates: {
        date: updates.date?.toISOString(),
        rating: updates.rating,
      },
    });

    // Validate rating if provided
    if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 10)) {
      const validationError = `Rating must be between 1 and 10, received: ${updates.rating}`;
      console.error('❌ [GraphQL] Invalid rating value:', updates.rating);
      return { data: null, error: validationError };
    }

    console.log('✅ [GraphQL] Rating validation passed');

    const result = await apolloClient.mutate<{ updateContentWatch: UserContentLog }>({
      mutation: UPDATE_CONTENT_WATCH,
      variables: {
        logId,
        date: updates.date,
        rating: updates.rating,
      },
    });

    if (!result.data?.updateContentWatch) {
      const noDataError = 'No data returned from updateContentWatch mutation';
      console.error('❌ [GraphQL]', noDataError);
      return { data: null, error: noDataError };
    }

    console.log('✅ [GraphQL] Content watch log updated successfully:', {
      id: result.data.updateContentWatch.id,
      date: result.data.updateContentWatch.date,
      rating: result.data.updateContentWatch.rating,
    });
    return { data: result.data.updateContentWatch };
  } catch (error: any) {
    console.error('❌ [GraphQL] Error updating content watch:', error?.message);

    // Log detailed error information
    if (error?.graphQLErrors?.length > 0) {
      console.error('📋 [GraphQL] GraphQL Errors:');
      error.graphQLErrors.forEach((gqlError: any, index: number) => {
        console.error(`   Error ${index + 1}:`, gqlError.message);
        if (gqlError.extensions) {
          console.error(`   Extensions:`, gqlError.extensions);
        }
      });
    }

    if (error instanceof Error) {
      console.error('❌ [GraphQL] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    return { data: null, error };
  }
}

// ==========================================
// HELPER FUNCTIONS (COMPATIBILITY)
// ==========================================

/**
 * Check if content is watched by user
 */
export async function isContentWatched(contentId: string): Promise<boolean> {
  const { data } = await getUserContentLog(contentId);
  return data?.date != null;
}

/**
 * Get user's rating for content
 */
export async function getUserRating(contentId: string): Promise<number | null> {
  const { data } = await getUserContentLog(contentId);
  return data?.rating ?? null;
}

/**
 * Get user's favorite status for content
 */
export async function getUserFavoriteStatus(contentId: string): Promise<boolean> {
  const { data } = await getUserContentLog(contentId);
  return data?.isFavorite ?? false;
}

// ==========================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC TYPES
// ==========================================

export const getUserWatchedMovies = (userId: string) => getUserWatchedContent(userId, 'MOVIE');

export const getUserWatchedTV = (userId: string) => getUserWatchedContent(userId, 'TV');

export const getUserWatchedGames = (userId: string) => getUserWatchedContent(userId, 'GAME');

export const getUserWatchedBooks = (userId: string) => getUserWatchedContent(userId, 'BOOK');

export * from './userContentLogService';
