/**
 * GraphQL CRUD Factory
 * Creates standardized list/create/update/delete functions for admin category entities.
 * Eliminates the need to write 4 nearly identical functions per entity type.
 */

import { DocumentNode } from 'graphql';
import { apolloClient } from '@/lib/apollo-client';

// ==========================================
// GENERIC QUERY / MUTATION HELPERS
// ==========================================

/**
 * Execute a GraphQL query with standard error handling
 */
export async function graphqlQuery<T>(
  query: DocumentNode,
  variables?: Record<string, any>,
  dataKey?: string,
  options?: { fetchPolicy?: 'network-only' | 'cache-first' | 'no-cache' }
): Promise<{ data: T; error?: any }> {
  try {
    const result = await apolloClient.query<Record<string, T>>({
      query,
      variables,
      fetchPolicy: options?.fetchPolicy ?? 'network-only',
    });

    const data = dataKey ? result.data?.[dataKey] : Object.values(result.data ?? {})[0];
    return { data: data as T };
  } catch (error) {
    console.error('❌ [GraphQL] Query failed:', error);
    return { data: [] as unknown as T, error };
  }
}

/**
 * Execute a GraphQL mutation with standard error handling
 */
export async function graphqlMutation<T>(
  mutation: DocumentNode,
  variables?: Record<string, any>,
  dataKey?: string,
  refetchQueries?: Array<{ query: DocumentNode; variables?: Record<string, any> }>
): Promise<{ data?: T; error?: any }> {
  try {
    const result = await apolloClient.mutate<Record<string, T>>({
      mutation,
      variables,
      refetchQueries,
    });

    const data = dataKey ? result.data?.[dataKey] : undefined;
    return { data: data as T | undefined };
  } catch (error) {
    console.error('❌ [GraphQL] Mutation failed:', error);
    return { error };
  }
}

// ==========================================
// CRUD FACTORY
// ==========================================

interface CrudConfig<T, TInput> {
  /** Display name for logging (e.g. "genre", "platform") */
  entityName: string;
  /** Emoji for logging */
  emoji: string;
  /** GraphQL queries/mutations */
  queries: {
    list: DocumentNode;
    create: DocumentNode;
    update: DocumentNode;
    delete: DocumentNode;
  };
  /** Keys in the GraphQL response data object */
  dataKeys: {
    list: string;
    create: string;
    update: string;
    delete: string;
  };
  /** Default limit for list queries */
  defaultLimit?: number;
  /** Custom list variables (e.g. for personRoles with contentTypeId) */
  listVarsFn?: (limit?: number) => Record<string, any>;
  /** Key in the input used for create logging (default: 'name') */
  nameKey?: keyof TInput;
}

interface ListOptions {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CrudOperations<T, TInput> {
  list: (limitOrOptions?: number | ListOptions) => Promise<{ data: T[]; error?: any }>;
  create: (input: TInput) => Promise<{ data?: T; error?: any }>;
  update: (id: number | string, input: TInput) => Promise<{ data?: T; error?: any }>;
  delete: (id: number | string) => Promise<{ error?: any }>;
}

/**
 * Creates standardized CRUD functions for an admin category entity.
 *
 * @example
 * const genreOps = createCrudOperations<GenreType, { name: string }>({
 *   entityName: 'genre',
 *   emoji: '📚',
 *   queries: { list: LIST_GENRES, create: CREATE_GENRE, update: UPDATE_GENRE, delete: DELETE_GENRE },
 *   dataKeys: { list: 'listGenres', create: 'createGenre', update: 'updateGenre', delete: 'deleteGenre' },
 * });
 * // genreOps.list(), genreOps.create({name: 'Action'}), genreOps.update(1, {name: 'Drama'}), genreOps.delete(1)
 */
export function createCrudOperations<T, TInput>(
  config: CrudConfig<T, TInput>
): CrudOperations<T, TInput> {
  const {
    entityName,
    emoji,
    queries,
    dataKeys,
    defaultLimit = 100,
    listVarsFn,
    nameKey = 'name' as keyof TInput,
  } = config;

  const getRefetchQueries = () => {
    const vars = listVarsFn ? listVarsFn() : { limit: defaultLimit };
    return [{ query: queries.list, variables: vars }];
  };

  return {
    async list(limitOrOptions?: number | ListOptions): Promise<{ data: T[]; error?: any }> {
      try {
        let vars: Record<string, any>;
        if (typeof limitOrOptions === 'object' && limitOrOptions !== null) {
          const { limit, offset, search, sortBy, sortOrder } = limitOrOptions;
          vars = listVarsFn ? listVarsFn(limit) : { limit: limit || defaultLimit };
          if (offset !== undefined) vars.offset = offset;
          if (search !== undefined) vars.search = search;
          if (sortBy !== undefined) vars.sortBy = sortBy;
          if (sortOrder !== undefined) vars.sortOrder = sortOrder;
        } else {
          vars = listVarsFn
            ? listVarsFn(limitOrOptions)
            : { limit: limitOrOptions || defaultLimit };
        }
        console.log(`${emoji} [GraphQL] Listing ${entityName}s`, vars);

        const result = await apolloClient.query<Record<string, T[]>>({
          query: queries.list,
          variables: vars,
          fetchPolicy: 'network-only',
        });

        const items = result.data?.[dataKeys.list] ?? [];
        console.log(`✅ Found ${items.length} ${entityName}s`);
        return { data: items };
      } catch (error) {
        console.error(`❌ Error listing ${entityName}s:`, error);
        return { data: [], error };
      }
    },

    async create(input: TInput): Promise<{ data?: T; error?: any }> {
      try {
        const displayName = (input as any)?.[nameKey] ?? '';
        console.log(`➕ [GraphQL] Creating ${entityName}:`, displayName);

        const result = await apolloClient.mutate<Record<string, T>>({
          mutation: queries.create,
          variables: { input },
          refetchQueries: getRefetchQueries(),
        });

        const created = result.data?.[dataKeys.create];
        console.log(`✅ ${entityName} created:`, created);
        return { data: created };
      } catch (error) {
        console.error(`❌ Error creating ${entityName}:`, error);
        return { error };
      }
    },

    async update(id: number | string, input: TInput): Promise<{ data?: T; error?: any }> {
      try {
        console.log(`✏️ [GraphQL] Updating ${entityName}:`, id);

        const result = await apolloClient.mutate<Record<string, T>>({
          mutation: queries.update,
          variables: { id, input },
          refetchQueries: getRefetchQueries(),
        });

        const updated = result.data?.[dataKeys.update];
        console.log(`✅ ${entityName} updated:`, updated);
        return { data: updated };
      } catch (error) {
        console.error(`❌ Error updating ${entityName}:`, error);
        return { error };
      }
    },

    async delete(id: number | string): Promise<{ error?: any }> {
      try {
        console.log(`🗑️ [GraphQL] Deleting ${entityName}:`, id);

        await apolloClient.mutate<Record<string, boolean>>({
          mutation: queries.delete,
          variables: { id },
          refetchQueries: getRefetchQueries(),
        });

        console.log(`✅ ${entityName} deleted`);
        return {};
      } catch (error) {
        console.error(`❌ Error deleting ${entityName}:`, error);
        return { error };
      }
    },
  };
}
