import { apolloClient } from '@/lib/apollo-client';
import {
  GET_ME,
  GET_USER,
  GET_USERS,
  UPDATE_PROFILE,
  FOLLOW_USER,
  UNFOLLOW_USER,
  GET_FOLLOWERS,
  GET_FOLLOWING,
  IS_FOLLOWING,
  DELETE_MY_ACCOUNT,
} from '@/services/graphql/auth';

export interface AppUser {
  id: string;
  auth_user_id?: string; // Backward compatibility - same as id
  username: string;
  email: string;
  bio: string | null;
  location?: string | null;
  website?: string | null;
  picturePath: string | null;
  coverPhotoUrl?: string | null;
  isAdmin?: boolean;
  isModerator?: boolean;
  contributionScore?: number;
  createdAt: string;
  updatedAt?: string;
}

// ==========================================
// USER PROFILE FUNCTIONS - GraphQL
// ==========================================

// Get current user's profile
export async function getCurrentUserProfile(): Promise<{ data: AppUser | null; error?: any }> {
  try {
    console.log('🔄 [GraphQL] Getting current user profile...');

    const { data } = await apolloClient.query<any>({
      query: GET_ME,
      fetchPolicy: 'network-only',
    });

    if (data?.me) {
      console.log('✅ [GraphQL] Current user profile loaded:', data.me.username);
      // Add backward compatibility field
      return { data: { ...data.me, auth_user_id: data.me.id } };
    }

    console.log('❌ [GraphQL] No user data found');
    return { data: null };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting current user:', e);
    return { data: null, error: e };
  }
}

// Get user by username
export async function getUserByUsername(
  username: string
): Promise<{ data: AppUser | null; error?: any }> {
  try {
    console.log('🔍 [GraphQL] Getting user by username:', username);

    const { data } = await apolloClient.query<any>({
      query: GET_USER,
      variables: { username },
      fetchPolicy: 'network-only',
    });

    if (data?.user) {
      console.log('✅ [GraphQL] User found:', data.user.username);
      // Add backward compatibility field
      return { data: { ...data.user, auth_user_id: data.user.id } };
    }

    console.log('❌ [GraphQL] User not found:', username);
    return { data: null };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting user:', e);
    return { data: null, error: e };
  }
}

// Get all app users (for admin purposes)
export async function getAllAppUsers(): Promise<{ data: AppUser[]; error?: any }> {
  try {
    console.log('📋 [GraphQL] Getting all users...');

    const { data } = await apolloClient.query<any>({
      query: GET_USERS,
      fetchPolicy: 'network-only',
    });

    if (data?.users) {
      console.log('✅ [GraphQL] Users loaded:', data.users.length);
      // Add backward compatibility field to each user
      const usersWithAuthId = data.users.map((u: any) => ({ ...u, auth_user_id: u.id }));
      return { data: usersWithAuthId };
    }

    return { data: [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting users:', e);
    return { data: [], error: e };
  }
}

// Update user profile
export async function updateUserProfile(
  updates: Partial<Pick<AppUser, 'username' | 'bio' | 'picturePath' | 'location' | 'website'>>
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('✏️ [GraphQL] Updating profile:', updates);

    const { data } = await apolloClient.mutate<any>({
      mutation: UPDATE_PROFILE,
      variables: {
        username: updates.username,
        bio: updates.bio,
        picturePath: updates.picturePath,
        location: updates.location,
        website: updates.website,
      },
    });

    if (data?.updateProfile) {
      console.log('✅ [GraphQL] Profile updated successfully');
      return { success: true };
    }

    console.log('❌ [GraphQL] Profile update failed');
    return { success: false, error: 'Update failed' };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error updating profile:', e);
    return { success: false, error: e };
  }
}

// ==========================================
// FOLLOW/UNFOLLOW FUNCTIONS - GraphQL
// ==========================================

// Follow a user
export async function followUser(username: string): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('➕ [GraphQL] Following user:', username);

    const { data } = await apolloClient.mutate<any>({
      mutation: FOLLOW_USER,
      variables: { username },
    });

    if (data?.followUser) {
      console.log('✅ [GraphQL] Follow successful');
      return { success: true };
    }

    return { success: false, error: 'Follow failed' };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error following user:', e);
    return { success: false, error: e };
  }
}

// Unfollow a user
export async function unfollowUser(username: string): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('➖ [GraphQL] Unfollowing user:', username);

    const { data } = await apolloClient.mutate<any>({
      mutation: UNFOLLOW_USER,
      variables: { username },
    });

    if (data?.unfollowUser) {
      console.log('✅ [GraphQL] Unfollow successful');
      return { success: true };
    }

    return { success: false, error: 'Unfollow failed' };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error unfollowing user:', e);
    return { success: false, error: e };
  }
}

// Get user's followers
export async function getFollowers(username: string): Promise<{ data: AppUser[]; error?: any }> {
  try {
    console.log('👥 [GraphQL] Getting followers for:', username);

    const { data } = await apolloClient.query<any>({
      query: GET_FOLLOWERS,
      variables: { username },
      fetchPolicy: 'network-only',
    });

    if (data?.followers) {
      console.log('✅ [GraphQL] Followers loaded:', data.followers.length);
      // Add backward compatibility field to each user
      const followersWithAuthId = data.followers.map((u: any) => ({ ...u, auth_user_id: u.id }));
      return { data: followersWithAuthId };
    }

    return { data: [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting followers:', e);
    return { data: [], error: e };
  }
}

// Get user's following
export async function getFollowing(username: string): Promise<{ data: AppUser[]; error?: any }> {
  try {
    console.log('👥 [GraphQL] Getting following for:', username);

    const { data } = await apolloClient.query<any>({
      query: GET_FOLLOWING,
      variables: { username },
      fetchPolicy: 'network-only',
    });

    if (data?.following) {
      console.log('✅ [GraphQL] Following loaded:', data.following.length);
      // Add backward compatibility field to each user
      const followingWithAuthId = data.following.map((u: any) => ({ ...u, auth_user_id: u.id }));
      return { data: followingWithAuthId };
    }

    return { data: [] };
  } catch (e: any) {
    console.error('❌ [GraphQL] Error getting following:', e);
    return { data: [], error: e };
  }
}

// ==========================================
// DEPRECATED FUNCTIONS
// ==========================================

// Get user follow data - Now uses GraphQL isFollowing query
export async function getFollowData(profileUsername: string): Promise<{
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  error?: any;
}> {
  try {
    console.log('🔍 [GraphQL] Getting follow data for:', profileUsername);

    // Fetch followers, following, and isFollowing status in parallel
    const [followers, following, isFollowingResult] = await Promise.all([
      getFollowers(profileUsername),
      getFollowing(profileUsername),
      apolloClient
        .query<any>({
          query: IS_FOLLOWING,
          variables: { username: profileUsername },
          fetchPolicy: 'network-only',
        })
        .catch((e) => {
          // If user is not authenticated, isFollowing check will fail - that's expected
          console.log('⚠️ isFollowing query failed (user might not be authenticated):', e.message);
          return { data: { isFollowing: false } };
        }),
    ]);

    const isFollowing = isFollowingResult?.data?.isFollowing ?? false;
    console.log('✅ Follow data loaded:', {
      followersCount: followers.data?.length || 0,
      followingCount: following.data?.length || 0,
      isFollowing,
    });

    return {
      followersCount: followers.data?.length || 0,
      followingCount: following.data?.length || 0,
      isFollowing,
    };
  } catch (e: any) {
    console.error('❌ Error getting follow data:', e);
    return {
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
      error: e,
    };
  }
}

// Delete user account
export async function deleteAccount(): Promise<{ success: boolean; error?: any }> {
  try {
    const result = await apolloClient.mutate<{ deleteMyAccount: boolean }>({
      mutation: DELETE_MY_ACCOUNT,
      fetchPolicy: 'no-cache',
    });

    return result.data?.deleteMyAccount
      ? { success: true }
      : { success: false, error: 'Account deletion failed' };
  } catch (error) {
    return { success: false, error };
  }
}
