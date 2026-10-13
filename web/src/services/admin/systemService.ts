/**
 * System Service
 * Handles dangerous system-level operations (reset, backup, restore)
 */

import { graphqlMutation } from '@/lib/graphqlHelpers';
import { RESET_ALL_DATA, DELETE_ALL_USERS, DELETE_ALL_CONTENT_BY_TYPE } from '../graphql/admin';

export async function resetAllData(): Promise<{ error?: any }> {
  console.log('🔥 [GraphQL] Resetting all data (keeping users)...');
  const { error } = await graphqlMutation<boolean>(RESET_ALL_DATA, undefined, 'resetAllData');
  if (error) console.error('❌ [systemService] resetAllData failed:', error);
  else console.log('✅ [systemService] resetAllData succeeded');
  return { error };
}

export async function deleteAllContentByType(typeSlug: string): Promise<{ error?: any }> {
  console.log(`🔥 [GraphQL] Deleting all content for type: ${typeSlug}...`);
  const { error } = await graphqlMutation<boolean>(
    DELETE_ALL_CONTENT_BY_TYPE,
    { typeSlug },
    'deleteAllContentByType'
  );
  if (error)
    console.error(`❌ [systemService] deleteAllContentByType (${typeSlug}) failed:`, error);
  else console.log(`✅ [systemService] deleteAllContentByType (${typeSlug}) succeeded`);
  return { error };
}

export async function deleteAllUsers(): Promise<{ error?: any }> {
  console.log('🔥 [GraphQL] Deleting all users...');
  const { error } = await graphqlMutation<boolean>(DELETE_ALL_USERS, undefined, 'deleteAllUsers');
  if (error) console.error('❌ [systemService] deleteAllUsers failed:', error);
  else console.log('✅ [systemService] deleteAllUsers succeeded');
  return { error };
}
