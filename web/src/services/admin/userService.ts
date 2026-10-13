/**
 * User Service
 * Handles user management operations
 */

import { graphqlQuery, graphqlMutation } from '@/lib/graphqlHelpers';
import {
  LIST_USERS,
  UPDATE_USER_ROLES,
  DELETE_USER,
  type AdminUser,
  type UpdateUserRolesInput,
} from '../graphql/admin';

export async function listUsers(params?: {
  search?: string;
  limit?: number;
}): Promise<{ data: AdminUser[]; error?: any }> {
  console.log('📋 [GraphQL] Listing users:', params);
  return graphqlQuery<AdminUser[]>(
    LIST_USERS,
    { search: params?.search, limit: params?.limit },
    'listUsers'
  );
}

export async function updateUserRoles(
  userId: string,
  roles: UpdateUserRolesInput
): Promise<{ error?: any }> {
  console.log('🔧 [GraphQL] Updating user roles:', userId, roles);
  const { error } = await graphqlMutation<boolean>(
    UPDATE_USER_ROLES,
    { userId, roles },
    'updateUserRoles'
  );
  return { error };
}

export async function deleteUser(userId: string): Promise<{ error?: any }> {
  console.log('🗑️ [GraphQL] Deleting user:', userId);
  const { error } = await graphqlMutation<boolean>(DELETE_USER, { userId }, 'deleteUser');
  return { error };
}
