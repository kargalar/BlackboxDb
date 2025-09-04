'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signUpWithEmail: (email: string, password: string, username?: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {}
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      // Ensure app_user row exists once we know the session
      if (session?.user) {
        await ensureAppUser(session.user)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await ensureAppUser(session.user)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) {
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    })
    if (error) {
      throw error
    }
    // Best-effort ensure profile row exists immediately (trigger should also handle this)
    if (data.user) {
      await ensureAppUser(data.user, username)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) {
      throw error
    }
    if (data.user) {
      await ensureAppUser(data.user)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Ensure a row exists in public.app_user for the authenticated user
async function ensureAppUser(user: User, usernameFallback?: string) {
  try {
    console.log('🔄 ensureAppUser called for user:', user.id, user.email);
    
    // Wait briefly to let database triggers complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if app_user row exists (trigger should have created it)
    const { data: existing, error: selectErr } = await supabase
      .from('app_user')
      .select('auth_user_id, username, email')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    console.log('🔍 Existing user check:', { existing, selectErr });

    if (selectErr) {
      console.warn('⚠️ Error checking existing user:', selectErr);
      // If RLS is blocking, that's normal for some edge cases
      return;
    }

    if (existing) {
      console.log('✅ app_user already exists:', existing);
      return;
    }

    // If no user found, trigger might have failed, try manual creation
    console.log('⚠️ No app_user found, attempting manual creation...');
    
    const email = user.email ?? (user.user_metadata?.email as string | undefined) ?? ''
    const username = (user.user_metadata?.username as string | undefined)
      || usernameFallback
      || (email ? email.split('@')[0] : 'user')

    console.log('➕ Creating new app_user record:', { 
      auth_user_id: user.id, 
      email, 
      username,
      userMetadata: user.user_metadata 
    });

    const { data: upsertData, error: upsertError } = await supabase
      .from('app_user')
      .upsert(
        { 
          auth_user_id: user.id, 
          email, 
          username,
          bio: '',
          picture_path: null
        },
        { onConflict: 'auth_user_id' }
      )
      .select('*')

    if (upsertError) {
      console.error('❌ Error creating app_user:', upsertError);
    } else {
      console.log('✅ app_user created successfully:', upsertData);
    }
    
  } catch (e) {
    // Swallow errors to avoid breaking auth flow; DB trigger likely created the row
    console.error('❌ ensureAppUser error:', e);
  }
}
