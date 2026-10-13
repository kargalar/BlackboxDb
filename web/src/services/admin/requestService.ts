/**
 * Request Service
 * Handles user content requests
 */

import { graphqlQuery, graphqlMutation } from '@/lib/graphqlHelpers';
import {
  CREATE_CONTENT_REQUEST,
  MY_CONTENT_REQUESTS,
  CONTENT_REQUEST_BY_ID,
  PENDING_CONTENT_REQUESTS,
  APPROVE_CONTENT_REQUEST,
  UPDATE_CONTENT_REQUEST,
  REJECT_CONTENT_REQUEST,
  DELETE_CONTENT_REQUEST,
  type ContentRequest,
  type CreateContentRequestInput,
} from '../graphql/admin';

export async function createContentRequest(
  input: CreateContentRequestInput
): Promise<{ data?: ContentRequest; error?: any }> {
  console.log('📝 [GraphQL] Creating content request:', input);
  return graphqlMutation<ContentRequest>(CREATE_CONTENT_REQUEST, { input }, 'createContentRequest');
}

export async function listMyContentRequests(): Promise<{ data: ContentRequest[]; error?: any }> {
  console.log('📋 [GraphQL] Getting my content requests');
  return graphqlQuery<ContentRequest[]>(MY_CONTENT_REQUESTS, undefined, 'myContentRequests');
}

export async function getContentRequestById(
  id: number
): Promise<{ data?: ContentRequest | null; error?: any }> {
  console.log('🔎 [GraphQL] Getting content request by id:', id);
  const { data, error } = await graphqlQuery<ContentRequest | null>(
    CONTENT_REQUEST_BY_ID,
    { id },
    'contentRequest'
  );
  // Explicitly handle null if needed, but the generic cleaner mostly handles it.
  // The previous code returned { data: result.data?.contentRequest } which could be null.
  return { data, error };
}

export async function listPendingContentRequests(): Promise<{
  data: ContentRequest[];
  error?: any;
}> {
  console.log('📋 [GraphQL] Getting pending content requests');
  return graphqlQuery<ContentRequest[]>(
    PENDING_CONTENT_REQUESTS,
    undefined,
    'pendingContentRequests'
  );
}

export async function approveContentRequest(
  id: number,
  contentId?: string
): Promise<{ error?: any }> {
  console.log('✅ [GraphQL] Approving content request:', id, 'contentId:', contentId);
  const { error } = await graphqlMutation<boolean>(
    APPROVE_CONTENT_REQUEST,
    { id, contentId },
    'approveContentRequest'
  );
  return { error };
}

export async function updateContentRequest(
  id: number,
  input: CreateContentRequestInput
): Promise<{ data?: ContentRequest; error?: any }> {
  console.log('[GraphQL] Updating content request:', id, input);
  return graphqlMutation<ContentRequest>(
    UPDATE_CONTENT_REQUEST,
    { id, input },
    'updateContentRequest'
  );
}

export async function rejectContentRequest(id: number, reason?: string): Promise<{ error?: any }> {
  console.log('❌ [GraphQL] Rejecting content request:', id, reason);
  const { error } = await graphqlMutation<boolean>(
    REJECT_CONTENT_REQUEST,
    { id, reason },
    'rejectContentRequest'
  );
  return { error };
}

export async function deleteContentRequest(id: number): Promise<{ error?: any }> {
  console.log('[GraphQL] Deleting content request:', id);
  const { error } = await graphqlMutation<boolean>(
    DELETE_CONTENT_REQUEST,
    { id },
    'deleteContentRequest'
  );
  return { error };
}
