/**
 * Expansion Service
 * Handles admin expansion CRUD operations.
 */

import {
  type AdminExpansion,
  LIST_EXPANSIONS,
  GET_EXPANSION_BY_ID,
  CREATE_EXPANSION,
  UPDATE_EXPANSION,
  DELETE_EXPANSION,
} from '../graphql/admin';
import { graphqlQuery, graphqlMutation } from '@/lib/graphqlHelpers';

interface ServiceResponse<T> {
  data?: T;
  error?: any;
}

/**
 * List expansions with optional filters.
 */
export async function listExpansions(params?: {
  contentId?: string;
  search?: string;
  type?: string;
  limit?: number;
}): Promise<ServiceResponse<AdminExpansion[]>> {
  console.log('📋 [Expansion] Fetching expansions', params);

  const result = await graphqlQuery<AdminExpansion[]>(
    LIST_EXPANSIONS,
    params || {},
    'listExpansions'
  );

  return { data: result.data, error: result.error };
}

/**
 * Get a single expansion by ID.
 */
export async function getExpansionById(
  id: number
): Promise<ServiceResponse<AdminExpansion | null>> {
  const numericId = Number(id);
  console.log(
    `📋 [Expansion] Fetching expansion: ${numericId} (original: ${id}, type: ${typeof id})`
  );

  const result = await graphqlQuery<AdminExpansion | null>(
    GET_EXPANSION_BY_ID,
    { id: numericId },
    'getExpansionById'
  );

  return { data: result.data, error: result.error };
}

/**
 * Create a new expansion.
 */
export async function createExpansion(input: {
  contentId: string;
  name: string;
  description?: string;
  posterUrl?: string;
  releaseDate?: string;
  type?: string;
}): Promise<ServiceResponse<AdminExpansion>> {
  console.log(`➕ [Expansion] Creating: ${input.name}`);

  const result = await graphqlMutation<AdminExpansion>(CREATE_EXPANSION, input, 'createExpansion');

  return { data: result.data, error: result.error };
}

/**
 * Update an existing expansion.
 */
export async function updateExpansion(
  id: number,
  input: {
    name?: string;
    description?: string;
    posterUrl?: string;
    releaseDate?: string;
    type?: string;
  }
): Promise<ServiceResponse<AdminExpansion>> {
  const numericId = Number(id);
  console.log(`✏️ [Expansion] Updating: ${numericId} (original: ${id}, type: ${typeof id})`);

  const result = await graphqlMutation<AdminExpansion>(
    UPDATE_EXPANSION,
    { id: numericId, ...input },
    'updateExpansion'
  );

  return { data: result.data, error: result.error };
}

/**
 * Delete an expansion permanently.
 */
export async function deleteExpansion(id: number): Promise<ServiceResponse<boolean>> {
  const numericId = Number(id);
  console.log(`🗑️ [Expansion] Deleting: ${numericId} (original: ${id}, type: ${typeof id})`);

  const result = await graphqlMutation<boolean>(
    DELETE_EXPANSION,
    { id: numericId },
    'deleteExpansion'
  );

  return { data: result.data, error: result.error };
}
