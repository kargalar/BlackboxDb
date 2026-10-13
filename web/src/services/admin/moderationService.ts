/**
 * Moderation Service
 * Handles moderation actions (comments, reports, deletions)
 */

import {
  type ModerationComment,
  LIST_MODERATION_COMMENTS,
  DELETE_MODERATION_COMMENT,
  DISMISS_REPORTS,
} from '../graphql/admin';
import { graphqlQuery, graphqlMutation } from '@/lib/graphqlHelpers';

/**
 * Default limit for listing recent items.
 */
const DEFAULT_LIMIT = 100;

/**
 * Service response wrapper to standardize error handling.
 */
interface ServiceResponse<T> {
  data?: T;
  error?: any;
}

/**
 * Lists all comments for moderation. Reported comments are prioritized.
 */
export async function listModerationComments(
  limit: number = DEFAULT_LIMIT
): Promise<ServiceResponse<ModerationComment[]>> {
  console.log(`📋 [Moderation] Fetching moderation comments (Limit: ${limit})`);

  return graphqlQuery<ModerationComment[]>(
    LIST_MODERATION_COMMENTS,
    { limit },
    'listModerationComments'
  );
}

/**
 * Deletes a comment (soft delete) by its ID and type.
 */
export async function deleteModerationComment(
  id: number | string,
  type: string
): Promise<ServiceResponse<void>> {
  console.log(`🗑️ [Moderation] Deleting ${type} with ID: ${id}`);
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

  const { error } = await graphqlMutation<void>(DELETE_MODERATION_COMMENT, { id: numericId, type });

  if (!error) {
    console.log('✅ [Moderation] Comment deleted successfully');
  }

  return { error };
}

/**
 * Dismisses reports for a comment without deleting the comment.
 */
export async function dismissReports(
  targetId: number | string,
  targetType: string
): Promise<ServiceResponse<void>> {
  console.log(`🔕 [Moderation] Dismissing reports for ${targetType}:${targetId}`);
  const numericId = typeof targetId === 'string' ? parseInt(targetId, 10) : targetId;

  const { error } = await graphqlMutation<void>(DISMISS_REPORTS, {
    targetId: numericId,
    targetType,
  });

  if (!error) {
    console.log('✅ [Moderation] Reports dismissed successfully');
  }

  return { error };
}

// Legacy exports for backward compatibility
export { listModerationComments as listRecentReplies };
export { deleteModerationComment as deleteReviewReply };
