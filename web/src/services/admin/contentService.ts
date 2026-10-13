/**
 * Content Service
 * Handles content management operations
 */

import { graphqlQuery, graphqlMutation, createCrudOperations } from '@/lib/graphqlHelpers';
import {
  LIST_CONTENT,
  GET_CONTENT_BY_ID,
  UPDATE_CONTENT,
  GET_CONTENT_EDIT_HISTORY,
  ROLLBACK_CONTENT_EDIT_HISTORY,
  DELETE_CONTENT,
  CREATE_CONTENT,
  VOTE_IMAGE,
  VOTE_SCREENSHOT,
  type AdminContent,
  type ContentEditHistory,
  type CreateContentInput,
} from '../graphql/admin';

// --- CONTENT CRUD ---
const contentOps = createCrudOperations<AdminContent, any>({
  entityName: 'content',
  emoji: '🎬',
  queries: {
    list: LIST_CONTENT,
    create: CREATE_CONTENT,
    update: UPDATE_CONTENT,
    delete: DELETE_CONTENT,
  },
  dataKeys: {
    list: 'listContent',
    create: 'createContent',
    update: 'updateContent',
    delete: 'deleteContent',
  },
  listVarsFn: (limit?: number) => ({ search: undefined, limit }), // Default vars
});

export async function listContent(params?: { search?: string; limit?: number }) {
  // Override listVars for search support which the factory's default list() might not fully cover if we just called contentOps.list() directly without args.
  // However, createCrudOperations.list accepts a limit.
  // To support search, we might need to use graphqlQuery directly or enhance the factory.
  // For now, let's use the factory if it supports it, OR just use graphqlQuery if the factory is too rigid.
  // The factory's list() only takes `limit`.
  // Let's use graphqlQuery manually for listContent to support 'search', and use factory for CUD if possible,
  // OR just use helpers for all since 'listContent' has specific params.

  // Actually, looking at the factory, strictly it takes `list(limit?: number)`.
  // It doesn't support `search`.
  // So for listContent, we better use graphqlQuery manually to support search.
  // For CUD, we can use factory or helpers.
  // To keep it clean and consistent with previous files, let's use helpers for everything here,
  // or extend the factory. Extending factory might be overkill for one service.
  // Let's use helpers.

  console.log('📋 [GraphQL] Listing content:', params);
  return graphqlQuery<AdminContent[]>(
    LIST_CONTENT,
    { search: params?.search, limit: params?.limit },
    'listContent'
  );
}

export const createContent = contentOps.create;
export const updateContent = contentOps.update;
export const deleteContent = contentOps.delete;

export async function getContentById(id: string): Promise<{ data?: AdminContent; error?: any }> {
  console.log('🔍 [GraphQL] Getting content by ID:', id);
  const { data, error } = await graphqlQuery<AdminContent | null>(
    GET_CONTENT_BY_ID,
    { id },
    'getContentById'
  );

  if (data === null) return { error: 'Content not found' };
  return { data: data!, error };
}

export async function getContentEditHistory(
  contentId: string,
  limit = 50
): Promise<{ data?: ContentEditHistory[]; error?: any }> {
  return graphqlQuery<ContentEditHistory[]>(
    GET_CONTENT_EDIT_HISTORY,
    { contentId, limit },
    'contentEditHistory'
  );
}

export async function rollbackContentEditHistory(historyId: number) {
  return graphqlMutation<AdminContent>(
    ROLLBACK_CONTENT_EDIT_HISTORY,
    { historyId },
    'rollbackContentEditHistory'
  );
}

export async function voteImage(imageId: number, voteType: number) {
  return graphqlQuery(VOTE_IMAGE, { imageId, voteType }, 'voteImage');
}

export async function voteScreenshot(screenshotId: number, voteType: number) {
  return graphqlQuery(VOTE_SCREENSHOT, { screenshotId, voteType }, 'voteScreenshot');
}
