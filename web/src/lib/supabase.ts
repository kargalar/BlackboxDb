import { createClient } from '@supabase/supabase-js'
import { logSupabaseRequest } from './requestLogger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  if (error) {
    logSupabaseRequest('auth', 'signInWithOAuth', false);
  } else {
    logSupabaseRequest('auth', 'signInWithOAuth', true);
  }
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) {
    logSupabaseRequest('auth', 'signOut', false);
  } else {
    logSupabaseRequest('auth', 'signOut', true);
  }
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    logSupabaseRequest('auth', 'getUser', false);
  } else {
    logSupabaseRequest('auth', 'getUser', true);
  }
  return { user, error }
}
