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
