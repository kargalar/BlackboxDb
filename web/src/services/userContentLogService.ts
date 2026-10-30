import { apolloClient } from '@/lib/apollo-client';
import {
  DELETE_ALL_USER_CONTENT_LOGS,
  CREATE_USER_CONTENT_LOG,
  REMOVE_TAG_FROM_ALL_LOGS,
  RENAME_TAG_IN_ALL_LOGS,
  GET_INCOMING_ACTIVITY_FEED,
  UPDATE_USER_CONTENT_LOG,
  type UserContentLog,
} from '@/services/graphql/userContent';

/**
 * Delete all user content logs (reset all watch history)
 */
export async function deleteAllUserContentLogs(): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('🗑️ [GraphQL] Deleting all user content logs');

    const result = await apolloClient.mutate<{ deleteAllUserContentLogs: boolean }>({
      mutation: DELETE_ALL_USER_CONTENT_LOGS,
    });

    if (!result.data?.deleteAllUserContentLogs) {
      return { success: false, error: 'Failed to delete' };
    }

    console.log('✅ All user content logs deleted');
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting all logs:', error);
    return { success: false, error };
  }
}

// ==========================================
// LEGACY COMPATIBILITY FUNCTIONS
// These replace movieLogs.ts functions
// ==========================================

/**
 * Create a new user content log (allows multiple logs per content)
 * Replaces movieLogs.createUserContentLog
 */
export async function createUserContentLog(
  contentId: string,
  logData: {
    rating?: number | null;
    is_favorite?: boolean;
    is_consume_later?: boolean;
    notify_on_release?: boolean;
    is_consumed?: boolean;
    is_continuing?: boolean;
    is_abandoned?: boolean;
    date?: string;
    playtime_minutes?: number | string; // Oyun oynama süresi (dakika)
    review?: string;
    tags?: string[];
    taggedUserIds?: string[];
    bookPublicationId?: number | null;
    bookFormat?: string | null;
    ratingDetails?: any;
  } & { platformId?: number | string | null }
): Promise<{ data: boolean; error?: any }> {
  try {
    const result = await apolloClient.mutate<{ createUserContentLog: boolean }>({
      mutation: CREATE_USER_CONTENT_LOG,
      variables: {
        contentId,
        logData: {
          rating: logData.rating || undefined,
          isFavorite: logData.is_favorite,
          isConsumeLater: logData.is_consume_later,
          notifyOnRelease: logData.notify_on_release,
          isConsumed: logData.is_consumed,
          isContinuing: logData.is_continuing,
          isAbandoned: logData.is_abandoned,
          date: logData.date,
          playtimeMinutes:
            logData.playtime_minutes === '' || logData.playtime_minutes === null
              ? null
              : logData.playtime_minutes !== undefined
                ? Number(logData.playtime_minutes)
                : undefined,
          platformId: logData.platformId ? Number(logData.platformId) : undefined,
          review: logData.review,
          tags: logData.tags,
          taggedUserIds: logData.taggedUserIds,
          bookPublicationId: logData.bookPublicationId,
          bookFormat: logData.bookFormat,
          ratingDetails: logData.ratingDetails,
        },
      },
    });

    if (!result.data?.createUserContentLog) {
      return { data: false, error: 'Failed to create log' };
    }

    console.log('✅ User content log created');
    return { data: true };
  } catch (error) {
    console.error('❌ Error creating log:', error);
    return { data: false, error };
  }
}

export async function removeTagFromAllLogs(options: {
  tag?: string;
  taggedUserId?: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    const { data } = await apolloClient.mutate<{ removeTagFromAllLogs: boolean }>({
      mutation: REMOVE_TAG_FROM_ALL_LOGS,
      variables: options,
    });
    return { success: !!data?.removeTagFromAllLogs };
  } catch (error) {
    console.error('❌ [GraphQL] Error removing tag from all logs:', error);
    return { success: false, error };
  }
}

export async function renameTagInAllLogs(
  oldTag: string,
  newTag: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { data } = await apolloClient.mutate<{ renameTagInAllLogs: boolean }>({
      mutation: RENAME_TAG_IN_ALL_LOGS,
      variables: { oldTag, newTag },
    });
    return { success: !!data?.renameTagInAllLogs };
  } catch (error) {
    console.error('❌ [GraphQL] Error renaming tag in all logs:', error);
    return { success: false, error };
  }
}

/**
 * Get incoming activity feed (interactions from others)
 */
export async function getIncomingActivityFeed(
  userId: string,
  limit?: number
): Promise<{ data: UserContentLog[]; error?: any }> {
  try {
    console.log('📰 [GraphQL] Fetching incoming activity feed:', { userId, limit });

    const result = await apolloClient.query<{ incomingActivityFeed: UserContentLog[] }>({
      query: GET_INCOMING_ACTIVITY_FEED,
      variables: { userId, limit },
      fetchPolicy: 'network-only',
    });

    return { data: result.data?.incomingActivityFeed || [], error: null };
  } catch (error) {
    console.error('❌ Error fetching incoming activity feed:', error);
    return { data: [], error };
  }
}

/**
 * Update user's content log (updates latest log or creates new one)
 * Replaces movieLogs.updateUserContentLog
 */
export async function updateUserContentLog(
  contentId: string,
  updates: {
    rating?: number | null;
    is_favorite?: boolean;
    is_consume_later?: boolean;
    notify_on_release?: boolean;
    is_consumed?: boolean;
    is_continuing?: boolean;
    is_abandoned?: boolean;
    date?: string;
    platformId?: number | string | null;
    playtime_minutes?: number | string; // Oyun oynama süresi (dakika)
    review?: string;
    tags?: string[];
    taggedUserIds?: string[];
    bookPublicationId?: number | null;
    bookFormat?: string | null;
    ratingDetails?: any;
  }
): Promise<{ data: boolean; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Updating user content log:', {
      contentId,
      updates: {
        rating: updates.rating,
        is_favorite: updates.is_favorite,
        is_consumed: updates.is_consumed,
        is_consume_later: updates.is_consume_later,
        notify_on_release: updates.notify_on_release,
        is_continuing: updates.is_continuing,
        is_abandoned: updates.is_abandoned,
        date: updates.date,
        playtime_minutes: updates.playtime_minutes,
        platformId: updates.platformId,
        review: updates.review,
        tags: updates.tags,
        taggedUserIds: updates.taggedUserIds,
        bookPublicationId: updates.bookPublicationId,
        bookFormat: updates.bookFormat,
        ratingDetails: updates.ratingDetails,
      },
    });

    const variables = {
      contentId,
      updates: {
        rating: updates.rating !== undefined ? updates.rating : undefined,
        isFavorite: updates.is_favorite,
        isConsumeLater: updates.is_consume_later,
        notifyOnRelease: updates.notify_on_release,
        isConsumed: updates.is_consumed,
        isContinuing: updates.is_continuing,
        isAbandoned: updates.is_abandoned,
        date: updates.date,
        playtimeMinutes:
          updates.playtime_minutes === '' || updates.playtime_minutes === null
            ? null
            : updates.playtime_minutes !== undefined
              ? Number(updates.playtime_minutes)
              : undefined,
        platformId:
          updates.platformId === null
            ? null
            : updates.platformId !== undefined
              ? Number(updates.platformId)
              : undefined,
        review: updates.review,
        tags: updates.tags,
        taggedUserIds: updates.taggedUserIds,
        bookPublicationId: updates.bookPublicationId,
        bookFormat: updates.bookFormat,
        ratingDetails: updates.ratingDetails,
      },
    };

    console.log('📤 [GraphQL] GraphQL variables:', JSON.stringify(variables, null, 2));

    const result = await apolloClient.mutate<{ updateUserContentLog: boolean }>({
      mutation: UPDATE_USER_CONTENT_LOG,
      variables,
    });

    if (!result.data?.updateUserContentLog) {
      const errorMsg = 'Mutation returned false or null';
      console.error('❌ [GraphQL]', errorMsg);
      return { data: false, error: errorMsg };
    }

    console.log('✅ [GraphQL] User content log updated successfully');
    return { data: true };
  } catch (error: any) {
    console.error('❌ [GraphQL] Error updating log:', error?.message);

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
      });
    }

    return { data: false, error };
  }
}
