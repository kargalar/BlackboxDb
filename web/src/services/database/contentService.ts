import { apolloClient } from '@/lib/apollo-client';
import { logGraphqlRequest } from '@/lib/requestLogger';
import {
  GET_USER_WATCHED_CONTENT,
  GET_USER_FAVORITE_CONTENT,
  GET_USER_FEATURED_CONTENT,
  GET_USER_STATS,
  GET_USER_CONTENT_LOG,
  GET_USER_CONTENT_LOGS,
  LOG_CONTENT_WATCH,
  UNLOG_CONTENT_WATCH,
  TOGGLE_CONTENT_FAVORITE,
  TOGGLE_CONTENT_WATCHLIST,
  SET_FEATURED_CONTENT,
  RATE_CONTENT,
  GET_CONTENT_STATS,
  SAVE_CONTENT,
  Content,
  UserStats,
  UserContentLog,
  ContentStats,
  SaveContentInput,
  GetUserWatchedContentData,
  GetUserFavoriteContentData,
  GetUserStatsData,
  GetUserContentLogData,
  GetContentStatsData,
  SaveContentData,
} from '@/services/graphql/content';
import { toggleContinuing as toggleContinuingService } from '@/services/userContentService';

// Export toggleContinuing for use in page components
export { toggleContinuingService as toggleContinuing };

// ==========================================
// ADAPTERS - Convert GraphQL to Component Format
// ==========================================

/**
 * Converts GraphQL Content (camelCase) to component format (snake_case)
 * This is a temporary adapter for backward compatibility
 */
function adaptContentForComponents(content: Content): any {
  // userIsContinuing is the user's personal tracking status
  // isContinuing is the content's own production status (e.g. ongoing TV series)
  // For user-facing features like "Devam Edenler", we need userIsContinuing
  const userContinuing = (content as any).userIsContinuing ?? content.isContinuing;

  return {
    ...content,
    // Add snake_case aliases for backward compatibility
    poster_path: content.posterUrl,
    backdrop_path: content.backdropUrl,
    release_date: content.releaseDate,
    content_type: content.contentType,
    content_type_id: (content as any).contentTypeId,
    fav_count: content.favoriteCount,
    discussion_count: content.discussionCount,
    consume_count: content.consumeCount,
    // User-specific fields
    user_rating: content.userRating,
    is_favorite: content.isFavorite,
    is_consume_later: content.isConsumeLater,
    is_consumed: content.isConsumed,
    is_continuing: userContinuing,
    // Override camelCase isContinuing with user's tracking status for profile usage
    isContinuing: userContinuing,
    user_date: content.userDate,
    hasReview: content.hasReview ?? false,
  };
}

// Get user's watched content by type
// ==========================================
// USER CONTENT LOG FUNCTIONS - GraphQL
// ==========================================

// Get user's watched content by type
export async function getUserWatchedContent(
  userId: string,
  contentType: 'MOVIE' | 'TV' | 'GAME' | 'BOOK' | 'MUSIC'
): Promise<{ data: any[]; error?: any }> {
  try {
    console.log(
      `🔄 [GraphQL - getUserWatchedContent] Getting watched ${contentType} for user:`,
      userId
    );
    console.log(`🔄 [GraphQL - getUserWatchedContent] Request variables:`, { userId, contentType });

    const { data } = await apolloClient.query<GetUserWatchedContentData>({
      query: GET_USER_WATCHED_CONTENT,
      variables: { userId, contentType },
      fetchPolicy: 'network-only',
    });

    console.log(`📦 [GraphQL - getUserWatchedContent] Raw response data:`, data);

    if (data?.userWatchedContent) {
      console.log(
        `✅ [GraphQL - getUserWatchedContent] Watched ${contentType} loaded:`,
        data.userWatchedContent.length,
        'items'
      );
      if (data.userWatchedContent.length > 0) {
        console.log(`📦 [GraphQL - getUserWatchedContent] Sample item:`, {
          id: data.userWatchedContent[0].id,
          title: data.userWatchedContent[0].title,
          userRating: data.userWatchedContent[0].userRating,
          isFavorite: data.userWatchedContent[0].isFavorite,
          isConsumed: data.userWatchedContent[0].isConsumed,
        });
      }

      // Convert to component format
      const adaptedContent = data.userWatchedContent.map(adaptContentForComponents);
      console.log(
        `🔄 [GraphQL - getUserWatchedContent] Adapted ${adaptedContent.length} items for components`
      );
      return { data: adaptedContent };
    }

    console.log(`⚠️ [GraphQL - getUserWatchedContent] No data returned from GraphQL`);
    return { data: [] };
  } catch (e: any) {
    console.error(`❌ [GraphQL - getUserWatchedContent] Error getting watched ${contentType}:`, e);
    console.error(`❌ [GraphQL - getUserWatchedContent] Error details:`, e.message);
    if (e.networkError) {
      console.error(`❌ [GraphQL - getUserWatchedContent] Network error:`, e.networkError);
    }
    if (e.graphQLErrors) {
      console.error(`❌ [GraphQL - getUserWatchedContent] GraphQL errors:`, e.graphQLErrors);
    }
    return { data: [], error: e };
  }
}

// Get user's favorite content by type
export async function getUserFavoriteContent(
  userId: string,
  contentType: 'MOVIE' | 'TV' | 'GAME' | 'BOOK' | 'MUSIC'
): Promise<{ data: any[]; error?: any }> {
  try {
    console.log(
      `🔄 [GraphQL - getUserFavoriteContent] Getting favorite ${contentType} for user:`,
      userId
    );
    console.log(`🔄 [GraphQL - getUserFavoriteContent] Request variables:`, {
      userId,
      contentType,
    });

    const { data } = await apolloClient.query<GetUserFavoriteContentData>({
      query: GET_USER_FAVORITE_CONTENT,
      variables: { userId, contentType },
      fetchPolicy: 'network-only',
    });

    console.log(`📦 [GraphQL - getUserFavoriteContent] Raw response data:`, data);

    if (data?.userFavoriteContent) {
      console.log(
        `✅ [GraphQL - getUserFavoriteContent] Favorite ${contentType} loaded:`,
        data.userFavoriteContent.length,
        'items'
      );
      if (data.userFavoriteContent.length > 0) {
        console.log(`📦 [GraphQL - getUserFavoriteContent] Sample favorite:`, {
          id: data.userFavoriteContent[0].id,
          title: data.userFavoriteContent[0].title,
          isFavorite: data.userFavoriteContent[0].isFavorite,
        });
      }

      // Convert to component format
      const adaptedContent = data.userFavoriteContent.map(adaptContentForComponents);
      console.log(
        `🔄 [GraphQL - getUserFavoriteContent] Adapted ${adaptedContent.length} favorite items for components`
      );
      return { data: adaptedContent };
    }

    console.log(`⚠️ [GraphQL - getUserFavoriteContent] No favorite data returned from GraphQL`);
    return { data: [] };
  } catch (e: any) {
    console.error(
      `❌ [GraphQL - getUserFavoriteContent] Error getting favorite ${contentType}:`,
      e
    );
    console.error(`❌ [GraphQL - getUserFavoriteContent] Error details:`, e.message);
    if (e.networkError) {
      console.error(`❌ [GraphQL - getUserFavoriteContent] Network error:`, e.networkError);
    }
    if (e.graphQLErrors) {
      console.error(`❌ [GraphQL - getUserFavoriteContent] GraphQL errors:`, e.graphQLErrors);
    }
    return { data: [], error: e };
  }
}

// Get user's featured content by type
export async function getUserFeaturedContent(
  userId: string,
  contentType: 'MOVIE' | 'TV' | 'GAME' | 'BOOK' | 'MUSIC'
): Promise<{ data: any[]; error?: any }> {
  try {
    console.log(
      `🔄 [GraphQL - getUserFeaturedContent] Getting featured ${contentType} for user:`,
      userId
    );

    const { data } = await apolloClient.query<{ userFeaturedContent: Content[] }>({
      query: GET_USER_FEATURED_CONTENT,
      variables: { userId, contentType },
      fetchPolicy: 'network-only',
    });

    if (data?.userFeaturedContent) {
      console.log(
        `✅ [GraphQL - getUserFeaturedContent] Featured ${contentType} loaded:`,
        data.userFeaturedContent.length,
        'items'
      );

      // Convert to component format
      const adaptedContent = data.userFeaturedContent.map(adaptContentForComponents);
      return { data: adaptedContent };
    }

    console.log(`⚠️ [GraphQL - getUserFeaturedContent] No featured data returned from GraphQL`);
    return { data: [] };
  } catch (e: any) {
    console.error(
      `❌ [GraphQL - getUserFeaturedContent] Error getting featured ${contentType}:`,
      e
    );
    return { data: [], error: e };
  }
}

// Set featured content for a content type
export async function setFeaturedContent(
  contentIds: string[],
  contentType: 'MOVIE' | 'TV' | 'GAME' | 'BOOK' | 'MUSIC'
): Promise<{ data: boolean; error?: any }> {
  try {
    console.log(`🔄 [GraphQL - setFeaturedContent] Setting featured ${contentType}:`, contentIds);

    const { data } = await apolloClient.mutate<{ setFeaturedContent: boolean }>({
      mutation: SET_FEATURED_CONTENT,
      variables: { contentIds, contentType },
    });

    const ok = data?.setFeaturedContent || false;
    logGraphqlRequest('setFeaturedContent', ok, ok ? undefined : 'Mutation returned false');

    console.log('✅ [GraphQL - setFeaturedContent] Featured content set');
    return { data: ok };
  } catch (e: any) {
    console.error(`❌ [GraphQL - setFeaturedContent] Error setting featured ${contentType}:`, e);
    const errorMessage =
      e?.graphQLErrors?.[0]?.message || e?.networkError?.message || e?.message || 'Unknown error';
    logGraphqlRequest('setFeaturedContent', false, errorMessage);
    return { data: false, error: e };
  }
}

// Get user stats
export async function getUserStats(
  userId: string
): Promise<{ data: UserStats | null; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Getting user stats:', userId);

    const { data } = await apolloClient.query<GetUserStatsData>({
      query: GET_USER_STATS,
      variables: { userId },
      fetchPolicy: 'network-only',
    });

    if (data?.userStats) {
      console.log('✅ [GraphQL] User stats loaded:', data.userStats);
      return { data: data.userStats };
    }

    return { data: null };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting user stats:', e);
    return { data: null, error: e };
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Get all watched content for a user (all types)
export async function getAllWatchedContent(userId: string) {
  const [movies, tv, games, books, music] = await Promise.all([
    getUserWatchedContent(userId, 'MOVIE'),
    getUserWatchedContent(userId, 'TV'),
    getUserWatchedContent(userId, 'GAME'),
    getUserWatchedContent(userId, 'BOOK'),
    getUserWatchedContent(userId, 'MUSIC'),
  ]);

  return {
    movies: movies.data,
    tv: tv.data,
    games: games.data,
    books: books.data,
    music: music.data,
  };
}

// Get all favorite content for a user (all types)
export async function getAllFavoriteContent(userId: string) {
  const [movies, tv, games, books, music] = await Promise.all([
    getUserFavoriteContent(userId, 'MOVIE'),
    getUserFavoriteContent(userId, 'TV'),
    getUserFavoriteContent(userId, 'GAME'),
    getUserFavoriteContent(userId, 'BOOK'),
    getUserFavoriteContent(userId, 'MUSIC'),
  ]);

  return {
    movies: movies.data,
    tv: tv.data,
    games: games.data,
    books: books.data,
    music: music.data,
  };
}

// ==========================================
// USER CONTENT LOG FUNCTIONS
// ==========================================

// Get user's content log for specific content
export async function getUserContentLog(
  contentId: string
): Promise<{ data: UserContentLog | null; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Getting user content log:', contentId);

    const { data } = await apolloClient.query<GetUserContentLogData>({
      query: GET_USER_CONTENT_LOG,
      variables: { contentId },
      fetchPolicy: 'network-only',
    });

    if (data?.userContentLog) {
      console.log('✅ [GraphQL] User content log loaded');
      return { data: data.userContentLog };
    }

    return { data: null };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting user content log:', e);
    return { data: null, error: e };
  }
}

// Get user's content logs for multiple content IDs (for explore page)
export async function getUserContentLogs(
  contentIds: string[]
): Promise<{ data: UserContentLog[]; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Getting user content logs:', contentIds.length);

    const { data } = await apolloClient.query<{ userContentLogs: UserContentLog[] }>({
      query: GET_USER_CONTENT_LOGS,
      variables: { contentIds },
      fetchPolicy: 'network-only',
    });

    if (data?.userContentLogs) {
      console.log('✅ [GraphQL] User content logs loaded:', data.userContentLogs.length);
      return { data: data.userContentLogs };
    }

    return { data: [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting user content logs:', e);
    return { data: [], error: e };
  }
}

// Log content as watched/read/played
export async function logContentWatch(
  contentId: string,
  bookPublicationId?: number | null
): Promise<{ data: boolean; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Logging content watch:', contentId);

    const { data } = await apolloClient.mutate<{ logContentWatch: boolean }>({
      mutation: LOG_CONTENT_WATCH,
      variables: { contentId, bookPublicationId },
    });

    console.log('✅ [GraphQL] Content watch logged');
    return { data: data?.logContentWatch || false };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error logging content watch:', e);
    return { data: false, error: e };
  }
}

// Unlog content watch
export async function unlogContentWatch(
  contentId: string
): Promise<{ data: boolean; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Unlogging content watch:', contentId);

    const { data } = await apolloClient.mutate<{ unlogContentWatch: boolean }>({
      mutation: UNLOG_CONTENT_WATCH,
      variables: { contentId },
    });

    console.log('✅ [GraphQL] Content watch unlogged');
    return { data: data?.unlogContentWatch || false };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error unlogging content watch:', e);
    return { data: false, error: e };
  }
}

// Toggle favorite
export async function toggleContentFavorite(
  contentId: string
): Promise<{ data: boolean; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Toggling content favorite:', contentId);

    const { data } = await apolloClient.mutate<{ toggleContentFavorite: boolean }>({
      mutation: TOGGLE_CONTENT_FAVORITE,
      variables: { contentId },
    });

    console.log('✅ [GraphQL] Content favorite toggled');
    return { data: data?.toggleContentFavorite || false };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error toggling content favorite:', e);
    return { data: false, error: e };
  }
}

// Toggle watchlist (consume later)
export async function toggleContentWatchlist(
  contentId: string
): Promise<{ data: boolean; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Toggling content watchlist:', contentId);

    const { data } = await apolloClient.mutate<{ toggleContentWatchlist: boolean }>({
      mutation: TOGGLE_CONTENT_WATCHLIST,
      variables: { contentId },
    });

    console.log('✅ [GraphQL] Content watchlist toggled');
    return { data: data?.toggleContentWatchlist || false };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error toggling content watchlist:', e);
    return { data: false, error: e };
  }
}

// Rate content
export async function rateContent(
  contentId: string,
  rating: number | null,
  bookPublicationId?: number | null
): Promise<{ data: boolean; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Rating content:', { contentId, rating });

    const { data } = await apolloClient.mutate<{ rateContent: boolean }>({
      mutation: RATE_CONTENT,
      variables: { contentId, rating, bookPublicationId },
    });

    console.log('✅ [GraphQL] Content rated');
    return { data: data?.rateContent || false };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error rating content:', e);
    return { data: false, error: e };
  }
}

// Get content statistics
export async function getContentStats(
  contentId: string
): Promise<{ data: ContentStats | null; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Fetching content stats:', contentId);

    const { data } = await apolloClient.query<GetContentStatsData>({
      query: GET_CONTENT_STATS,
      variables: { contentId },
      fetchPolicy: 'network-only', // Always fetch fresh stats
    });

    console.log('✅ [GraphQL] Content stats fetched:', data?.contentStats);
    return { data: data?.contentStats || null };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error fetching content stats:', e);
    return { data: null, error: e };
  }
}

// Save content to database
export async function saveContent(input: SaveContentInput): Promise<{ data: any; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Saving content:', input.id);

    const { data } = await apolloClient.mutate<SaveContentData>({
      mutation: SAVE_CONTENT,
      variables: { input },
    });

    console.log('✅ [GraphQL] Content saved:', data?.saveContent);
    return { data: data?.saveContent };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error saving content:', e);
    return { data: null, error: e };
  }
}
