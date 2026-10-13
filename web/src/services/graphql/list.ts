/**
 * List Service Functions
 * GraphQL service layer for user list operations
 */

import { apolloClient } from '@/lib/apollo-client';
import {
  GET_MY_LISTS,
  GET_USER_LISTS,
  GET_LIST,
  GET_SAVED_LISTS,
  IS_LIST_SAVED,
  CREATE_LIST,
  UPDATE_LIST,
  DELETE_LIST,
  ADD_TO_LIST,
  REMOVE_FROM_LIST,
  ADD_COLLABORATOR,
  REMOVE_COLLABORATOR,
  LEAVE_LIST,
  SAVE_LIST,
  UNSAVE_LIST,
  GET_PUBLIC_LISTS,
  VOTE_LIST,
  SEARCH_USERS,
  REORDER_LIST_ITEMS,
} from './listQueries';
import type { UserList, UserListItem, UserListCollaborator, UserSearchResult } from './listTypes';

// Re-export types and queries for backward compatibility
export * from './listQueries';
export * from './listTypes';

// ==========================================
// LIST SERVICE FUNCTIONS
// ==========================================

// Get current user's lists
export async function getMyLists(): Promise<{ data?: UserList[]; error?: any }> {
  try {
    console.log('📋 [GraphQL] Fetching my lists');

    const { data } = await apolloClient.query<{ myLists: UserList[] }>({
      query: GET_MY_LISTS,
      fetchPolicy: 'network-only',
    });

    console.log('✅ [GraphQL] My lists loaded:', data?.myLists?.length || 0);
    return { data: data?.myLists || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error fetching my lists:', e);
    return { error: e };
  }
}

// Get user's public lists
export async function getUserLists(username: string): Promise<{ data?: UserList[]; error?: any }> {
  try {
    console.log('📋 [GraphQL] Fetching lists for user:', username);

    const { data } = await apolloClient.query<{ userLists: UserList[] }>({
      query: GET_USER_LISTS,
      variables: { username },
      fetchPolicy: 'network-only',
    });

    console.log('✅ [GraphQL] User lists loaded:', data?.userLists?.length || 0);
    return { data: data?.userLists || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error fetching user lists:', e);
    return { error: e };
  }
}

// Get a single list with items and collaborators
export async function getList(id: number): Promise<{ data?: UserList; error?: any }> {
  try {
    const intId = parseInt(String(id), 10);
    console.log('📋 [GraphQL] Fetching list:', intId);

    const { data } = await apolloClient.query<{ list: UserList }>({
      query: GET_LIST,
      variables: { id: intId },
      fetchPolicy: 'network-only',
    });

    console.log('✅ [GraphQL] List loaded:', data?.list?.id);
    return { data: data?.list };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error fetching list:', e);
    return { error: e };
  }
}

// Get current user's saved lists
export async function getSavedLists(): Promise<{ data?: UserList[]; error?: any }> {
  try {
    console.log('🔖 [GraphQL] Fetching saved lists');

    const { data } = await apolloClient.query<{ savedLists: UserList[] }>({
      query: GET_SAVED_LISTS,
      fetchPolicy: 'network-only',
    });

    console.log('✅ [GraphQL] Saved lists loaded:', data?.savedLists?.length || 0);
    return { data: data?.savedLists || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error fetching saved lists:', e);
    return { error: e };
  }
}

export async function isListSaved(listId: number): Promise<{ data?: boolean; error?: any }> {
  try {
    const intListId = parseInt(String(listId), 10);
    console.log('🔖 [GraphQL] Checking isListSaved:', intListId);

    const { data } = await apolloClient.query<{ isListSaved: boolean }>({
      query: IS_LIST_SAVED,
      variables: { listId: intListId },
      fetchPolicy: 'network-only',
    });

    return { data: Boolean(data?.isListSaved) };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error checking isListSaved:', e);
    return { error: e };
  }
}

// Create a new list
export async function createList(
  name: string,
  contentTypeId: number,
  description?: string,
  isPublic: boolean = false,
  isOrdered: boolean = false
): Promise<{ data?: UserList; error?: any }> {
  try {
    console.log('➕ [GraphQL] Creating list:', name);

    const { data } = await apolloClient.mutate<{ createList: UserList }>({
      mutation: CREATE_LIST,
      variables: { name, description, contentTypeId, isPublic, isOrdered },
    });

    console.log('✅ [GraphQL] List created:', data?.createList?.id);
    return { data: data?.createList };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error creating list:', e);
    return { error: e };
  }
}

// Update a list
export async function updateList(
  id: number,
  updates: { name?: string; description?: string; isPublic?: boolean; isOrdered?: boolean }
): Promise<{ data?: UserList; error?: any }> {
  try {
    const intId = parseInt(String(id), 10);
    console.log('✏️ [GraphQL] Updating list:', intId);

    const { data } = await apolloClient.mutate<{ updateList: UserList }>({
      mutation: UPDATE_LIST,
      variables: { id: intId, ...updates },
    });

    console.log('✅ [GraphQL] List updated:', data?.updateList?.id);
    return { data: data?.updateList };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error updating list:', e);
    return { error: e };
  }
}

// Delete a list
export async function deleteList(id: number): Promise<{ success: boolean; error?: any }> {
  try {
    const intId = parseInt(String(id), 10);
    console.log('🗑️ [GraphQL] Deleting list:', intId);

    await apolloClient.mutate<{ deleteList: boolean }>({
      mutation: DELETE_LIST,
      variables: { id: intId },
    });

    console.log('✅ [GraphQL] List deleted');
    return { success: true };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error deleting list:', e);
    return { success: false, error: e };
  }
}

// Add content to a list
export async function addToList(
  listId: number,
  contentId: string
): Promise<{ data?: UserListItem; error?: any }> {
  try {
    // Ensure listId is a proper integer
    const intListId = parseInt(String(listId), 10);
    console.log('➕ [GraphQL] Adding to list:', intListId, contentId);

    const { data } = await apolloClient.mutate<{ addToList: UserListItem }>({
      mutation: ADD_TO_LIST,
      variables: { listId: intListId, contentId },
    });

    console.log('✅ [GraphQL] Content added to list');
    return { data: data?.addToList };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error adding to list:', e);
    return { error: e };
  }
}

// Remove content from a list
export async function removeFromList(
  listId: number,
  contentId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const intListId = parseInt(String(listId), 10);
    console.log('➖ [GraphQL] Removing from list:', intListId, contentId);

    await apolloClient.mutate<{ removeFromList: boolean }>({
      mutation: REMOVE_FROM_LIST,
      variables: { listId: intListId, contentId },
    });

    console.log('✅ [GraphQL] Content removed from list');
    return { success: true };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error removing from list:', e);
    return { success: false, error: e };
  }
}

// Add collaborator to a list
export async function addCollaborator(
  listId: number,
  username: string,
  role: 'editor' | 'viewer' = 'editor'
): Promise<{ data?: UserListCollaborator; error?: any }> {
  try {
    const intListId = parseInt(String(listId), 10);
    console.log('👥 [GraphQL] Adding collaborator:', username, 'to list:', intListId);

    const { data } = await apolloClient.mutate<{ addCollaborator: UserListCollaborator }>({
      mutation: ADD_COLLABORATOR,
      variables: { listId: intListId, username, role },
    });

    console.log('✅ [GraphQL] Collaborator added');
    return { data: data?.addCollaborator };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error adding collaborator:', e);
    return { error: e };
  }
}

// Remove collaborator from a list
export async function removeCollaborator(
  listId: number,
  username: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const intListId = parseInt(String(listId), 10);
    console.log('👥 [GraphQL] Removing collaborator:', username, 'from list:', intListId);

    await apolloClient.mutate<{ removeCollaborator: boolean }>({
      mutation: REMOVE_COLLABORATOR,
      variables: { listId: intListId, username },
    });

    console.log('✅ [GraphQL] Collaborator removed');
    return { success: true };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error removing collaborator:', e);
    return { success: false, error: e };
  }
}

// Leave a list (remove self as collaborator)
export async function leaveList(listId: number): Promise<{ success: boolean; error?: any }> {
  try {
    const intListId = parseInt(String(listId), 10);
    console.log('🚪 [GraphQL] Leaving list:', intListId);

    await apolloClient.mutate<{ leaveList: boolean }>({
      mutation: LEAVE_LIST,
      variables: { listId: intListId },
    });

    console.log('✅ [GraphQL] Left list');
    return { success: true };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error leaving list:', e);
    return { success: false, error: e };
  }
}

export async function saveList(listId: number): Promise<{ success: boolean; error?: any }> {
  try {
    // GraphQL Int için kesin integer garanti edelim (bazı yerlerden listId string gelebiliyor)
    const intListId = parseInt(String(listId), 10);
    console.log('🔖 [GraphQL] Saving list:', intListId);

    await apolloClient.mutate<{ saveList: boolean }>({
      mutation: SAVE_LIST,
      variables: { listId: intListId },
    });

    console.log('✅ [GraphQL] List saved');
    return { success: true };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error saving list:', e);
    return { success: false, error: e };
  }
}

export async function unsaveList(listId: number): Promise<{ success: boolean; error?: any }> {
  try {
    const intListId = parseInt(String(listId), 10);
    console.log('🔖 [GraphQL] Unsaving list:', intListId);

    await apolloClient.mutate<{ unsaveList: boolean }>({
      mutation: UNSAVE_LIST,
      variables: { listId: intListId },
    });

    console.log('✅ [GraphQL] List unsaved');
    return { success: true };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error unsaving list:', e);
    return { success: false, error: e };
  }
}

export async function searchUsers(
  query: string,
  limit: number = 10
): Promise<{ data?: UserSearchResult[]; error?: any }> {
  try {
    const q = query.trim();
    if (q.length < 2) return { data: [] };

    console.log('🔎 [GraphQL] searchUsers:', q);

    const { data } = await apolloClient.query<{ searchUsers: UserSearchResult[] }>({
      query: SEARCH_USERS,
      variables: { query: q, limit },
      fetchPolicy: 'network-only',
    });

    return { data: data?.searchUsers || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error searching users:', e);
    return { error: e };
  }
}

// Get public lists for browse page
export async function getPublicLists(
  sortBy: string = 'newest',
  contentTypeId?: number | null,
  limit: number = 20,
  offset: number = 0
): Promise<{ data?: UserList[]; error?: any }> {
  try {
    console.log('📋 [GraphQL] Fetching public lists:', { sortBy, contentTypeId, limit, offset });

    const { data } = await apolloClient.query<{ publicLists: UserList[] }>({
      query: GET_PUBLIC_LISTS,
      variables: { sortBy, contentTypeId, limit, offset },
      fetchPolicy: 'network-only',
    });

    console.log('✅ [GraphQL] Public lists loaded:', data?.publicLists?.length || 0);
    return { data: data?.publicLists || [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error fetching public lists:', e);
    return { error: e };
  }
}

// Vote on a list
export async function voteList(
  id: number,
  voteType: number
): Promise<{ data?: Partial<UserList>; error?: any }> {
  try {
    const intId = parseInt(String(id), 10);
    console.log('🗳️ [GraphQL] Voting on list:', intId, 'voteType:', voteType);

    const { data } = await apolloClient.mutate<{ voteList: Partial<UserList> }>({
      mutation: VOTE_LIST,
      variables: { id: intId, voteType },
    });

    console.log('✅ [GraphQL] Vote recorded:', data?.voteList);
    return { data: data?.voteList };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error voting on list:', e);
    return { error: e };
  }
}

// Reorder list items
export async function reorderListItems(
  listId: number,
  items: { contentId: string; displayOrder: number }[]
): Promise<{ success: boolean; error?: any }> {
  try {
    const intListId = parseInt(String(listId), 10);
    console.log('🔄 [GraphQL] Reordering list items:', intListId);

    await apolloClient.mutate<{ reorderListItems: boolean }>({
      mutation: REORDER_LIST_ITEMS,
      variables: { listId: intListId, items },
    });

    console.log('✅ [GraphQL] List items reordered');
    return { success: true };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error reordering list items:', e);
    return { success: false, error: e };
  }
}
