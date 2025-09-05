import { supabase } from '@/lib/supabase';

export interface AppUser {
  auth_user_id: string;
  username: string;
  email: string;
  bio: string | null;
  picture_path: string | null;
  personality_analyze: string | null;
  created_at: string;
  updated_at: string;
}

// Get current user's profile from app_user table
export async function getCurrentUserProfile(): Promise<{ data: AppUser | null; error?: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { data: null, error: authError || 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('app_user')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error };
    }

    return { data };
  } catch (e) {
    return { data: null, error: e };
  }
}

// Get all app users (for admin purposes)
export async function getAllAppUsers(): Promise<{ data: AppUser[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from('app_user')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error };
    }

    return { data: data || [] };
  } catch (e) {
    return { data: [], error: e };
  }
}

// Update user profile
export async function updateUserProfile(updates: Partial<Pick<AppUser, 'username' | 'bio' | 'picture_path'>>): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: authError || 'Not authenticated' };
    }

    const { error } = await supabase
      .from('app_user')
      .update(updates)
      .eq('auth_user_id', user.id);

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e };
  }
}

// Follow a user
export async function followUser(followingId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: authError || 'Not authenticated' };
    }

    const { error } = await supabase.from('user_follow').insert({
      follower_id: user.id,
      following_id: followingId,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e };
  }
}

// Unfollow a user
export async function unfollowUser(followingId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: authError || 'Not authenticated' };
    }

    const { error } = await supabase
      .from('user_follow')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (error) {
      return { success: false, error };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e };
  }
}

// Get user follow data
export async function getFollowData(profileUserId: string): Promise<{
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  error?: any;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { count: followersCount, error: followersError } = await supabase
      .from('user_follow')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profileUserId);

    if (followersError) throw followersError;

    const { count: followingCount, error: followingError } = await supabase
      .from('user_follow')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profileUserId);

    if (followingError) throw followingError;

    let isFollowing = false;
    if (user) {
      const { data: followCheck, error: followCheckError } = await supabase
        .from('user_follow')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', profileUserId)
        .maybeSingle();
      
      if (followCheckError) throw followCheckError;
      isFollowing = !!followCheck;
    }

    return {
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
      isFollowing,
    };
  } catch (e) {
    return {
      followersCount: 0,
      followingCount: 0,
      isFollowing: false,
      error: e,
    };
  }
}

// Get user's followers
export async function getFollowers(userId: string): Promise<{ data: AppUser[]; error?: any }> {
  try {
    // First get the follower IDs
    const { data: followData, error: followError } = await supabase
      .from('user_follow')
      .select('follower_id')
      .eq('following_id', userId);

    if (followError) {
      return { data: [], error: followError };
    }

    if (!followData || followData.length === 0) {
      return { data: [] };
    }

    // Then get the user data for those IDs
    const followerIds = followData.map(item => item.follower_id);
    const { data: userData, error: userError } = await supabase
      .from('app_user')
      .select('*')
      .in('auth_user_id', followerIds);

    if (userError) {
      return { data: [], error: userError };
    }

    return { data: userData || [] };
  } catch (e) {
    return { data: [], error: e };
  }
}

// Get user's following
export async function getFollowing(userId: string): Promise<{ data: AppUser[]; error?: any }> {
  try {
    // First get the following IDs
    const { data: followData, error: followError } = await supabase
      .from('user_follow')
      .select('following_id')
      .eq('follower_id', userId);

    if (followError) {
      return { data: [], error: followError };
    }

    if (!followData || followData.length === 0) {
      return { data: [] };
    }

    // Then get the user data for those IDs
    const followingIds = followData.map(item => item.following_id);
    const { data: userData, error: userError } = await supabase
      .from('app_user')
      .select('*')
      .in('auth_user_id', followingIds);

    if (userError) {
      return { data: [], error: userError };
    }

    return { data: userData || [] };
  } catch (e) {
    return { data: [], error: e };
  }
}
