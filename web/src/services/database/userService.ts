import { supabase } from '@/lib/supabase';
import { logSupabaseRequest } from '@/lib/requestLogger';

export interface AppUser {
  auth_user_id: string;
  username: string;
  email: string;
  bio: string | null;
  picture_path: string | null;
  personality_analyze: string | null;
  is_admin?: boolean;
  is_moderator?: boolean;
  created_at: string;
  updated_at: string;
}

// Get current user's profile from app_user table
export async function getCurrentUserProfile(): Promise<{ data: AppUser | null; error?: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logSupabaseRequest('auth', 'getUser', false);
      return { data: null, error: authError || 'Not authenticated' };
    }
    logSupabaseRequest('auth', 'getUser', true);

    const { data, error } = await supabase
      .from('app_user')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (error) {
      logSupabaseRequest('app_user', 'select', false);
      return { data: null, error };
    }
    logSupabaseRequest('app_user', 'select', true);
    return { data };
  } catch (e) {
    logSupabaseRequest('app_user', 'select', false);
    return { data: null, error: e };
  }
}

// Get user by username
export async function getUserByUsername(username: string): Promise<{ data: AppUser | null; error?: any }> {
  try {
    const { data, error } = await supabase
      .from('app_user')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      logSupabaseRequest('app_user', 'select', false);
      return { data: null, error };
    }
    logSupabaseRequest('app_user', 'select', true);
    return { data };
  } catch (e) {
    logSupabaseRequest('app_user', 'select', false);
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
      logSupabaseRequest('app_user', 'select', false);
      return { data: [], error };
    }
    logSupabaseRequest('app_user', 'select', true);
    return { data: data || [] };
  } catch (e) {
    logSupabaseRequest('app_user', 'select', false);
    return { data: [], error: e };
  }
}

// Update user profile
export async function updateUserProfile(updates: Partial<Pick<AppUser, 'username' | 'bio' | 'picture_path'>>): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logSupabaseRequest('auth', 'getUser', false);
      return { success: false, error: authError || 'Not authenticated' };
    }
    logSupabaseRequest('auth', 'getUser', true);

    const { error } = await supabase
      .from('app_user')
      .update(updates)
      .eq('auth_user_id', user.id);

    if (error) {
      logSupabaseRequest('app_user', 'update', false);
      return { success: false, error };
    }
    logSupabaseRequest('app_user', 'update', true);
    return { success: true };
  } catch (e) {
    logSupabaseRequest('app_user', 'update', false);
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
      user_id: user.id,
      following_user_id: followingId,
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
      .eq('user_id', user.id)
      .eq('following_user_id', followingId);

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
      .eq('following_user_id', profileUserId);

    if (followersError) throw followersError;

    const { count: followingCount, error: followingError } = await supabase
      .from('user_follow')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileUserId);

    if (followingError) throw followingError;

    let isFollowing = false;
    if (user) {
      const { data: followCheck, error: followCheckError } = await supabase
        .from('user_follow')
        .select('*')
        .eq('user_id', user.id)
        .eq('following_user_id', profileUserId)
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
      .select('user_id')
      .eq('following_user_id', userId);

    if (followError) {
      return { data: [], error: followError };
    }

    if (!followData || followData.length === 0) {
      return { data: [] };
    }

    // Then get the user data for those IDs
    const followerIds = followData.map(item => item.user_id);
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
      .select('following_user_id')
      .eq('user_id', userId);

    if (followError) {
      return { data: [], error: followError };
    }

    if (!followData || followData.length === 0) {
      return { data: [] };
    }

    // Then get the user data for those IDs
    const followingIds = followData.map(item => item.following_user_id);
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

// Delete user account and all associated data
export async function deleteAccount(): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logSupabaseRequest('auth', 'getUser', false);
      return { success: false, error: authError || 'Not authenticated' };
    }
    logSupabaseRequest('auth', 'getUser', true);

    const userId = user.id;

    // Delete all user data in the correct order to handle foreign keys
    // 1. Delete review_reply_likes (likes on user's replies and by user)
    const { error: replyLikesError } = await supabase
      .from('review_reply_likes')
      .delete()
      .eq('user_id', userId);

    if (replyLikesError) {
      console.error('Error deleting review_reply_likes:', replyLikesError);
    }

    // Also delete likes on replies made by this user
    const userReplyIds = await getReplyIdsByUser(userId);
    if (userReplyIds.length > 0) {
      const { error: replyLikesError2 } = await supabase
        .from('review_reply_likes')
        .delete()
        .in('reply_id', userReplyIds);

      if (replyLikesError2) {
        console.error('Error deleting likes on user replies:', replyLikesError2);
      }
    }

    // 2. Delete review_replies
    const { error: repliesError } = await supabase
      .from('review_replies')
      .delete()
      .eq('user_id', userId);

    if (repliesError) {
      console.error('Error deleting review_replies:', repliesError);
    }

    // 3. Delete review_likes
    const { error: likesError } = await supabase
      .from('review_likes')
      .delete()
      .eq('user_id', userId);

    if (likesError) {
      console.error('Error deleting review_likes:', likesError);
    }

    // 4. Delete review_comments
    const { error: commentsError } = await supabase
      .from('review_comment')
      .delete()
      .eq('user_id', userId);

    if (commentsError) {
      console.error('Error deleting review_comments:', commentsError);
    }

    // 5. Delete user_content_log (this will cascade to reviews if FK is set)
    const { error: logError } = await supabase
      .from('user_content_log')
      .delete()
      .eq('user_id', userId);

    if (logError) {
      console.error('Error deleting user_content_log:', logError);
    }

    // 6. Delete reviews (if not cascaded)
    const { error: reviewsError } = await supabase
      .from('review')
      .delete()
      .eq('user_id', userId);

    if (reviewsError) {
      console.error('Error deleting reviews:', reviewsError);
    }

    // 7. Delete user_follow (both as follower and following)
    const { error: followError1 } = await supabase
      .from('user_follow')
      .delete()
      .eq('user_id', userId);

    const { error: followError2 } = await supabase
      .from('user_follow')
      .delete()
      .eq('following_user_id', userId);

    if (followError1 || followError2) {
      console.error('Error deleting user_follow:', followError1 || followError2);
    }

    // 8. Delete list_movie
    const { error: listError } = await supabase
      .from('list_movie')
      .delete()
      .eq('user_id', userId);

    if (listError) {
      console.error('Error deleting list_movie:', listError);
    }

    // 9. Delete notifications (both sent and received)
    const { error: notifError1 } = await supabase
      .from('notification')
      .delete()
      .eq('recipient_user_id', userId);

    const { error: notifError2 } = await supabase
      .from('notification')
      .delete()
      .eq('actor_user_id', userId);

    if (notifError1 || notifError2) {
      console.error('Error deleting notifications:', notifError1 || notifError2);
    }

    // 10. Delete content_requests
    const { error: requestError } = await supabase
      .from('content_request')
      .delete()
      .eq('requester_user_id', userId);

    if (requestError) {
      console.error('Error deleting content_requests:', requestError);
    }

    // 11. Finally, delete the app_user record
    const { error: userError } = await supabase
      .from('app_user')
      .delete()
      .eq('auth_user_id', userId);

    if (userError) {
      logSupabaseRequest('app_user', 'delete', false);
      return { success: false, error: userError };
    }
    logSupabaseRequest('app_user', 'delete', true);

    // Sign out the user
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('❌ Hesap silme sonrası çıkış yapılırken hata:', signOutError);
    } else {
      console.log('✅ Kullanıcı başarıyla çıkış yaptı');
    }

    console.log('✅ Kullanıcı hesabı ve tüm verileri başarıyla silindi');
    return { success: true };
  } catch (e) {
    logSupabaseRequest('app_user', 'delete', false);
    return { success: false, error: e };
  }
}

// Helper function to get reply IDs by user (for deleting likes on user's replies)
async function getReplyIdsByUser(userId: string): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('review_replies')
      .select('id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting reply IDs:', error);
      return [];
    }

    return data?.map(reply => reply.id) || [];
  } catch (e) {
    console.error('Error in getReplyIdsByUser:', e);
    return [];
  }
}
