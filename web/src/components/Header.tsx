'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Debug logging
  console.log('🎯 Header render:', { 
    hasUser: !!user, 
    userEmail: user?.email, 
    loading,
    isSigningIn,
    isSigningOut 
  });

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Blackbox</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/explore" className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
              Keşfet
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="hidden md:block rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {loading ? (
              <div className="w-20 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleProfileClick}
                  className="text-sm font-medium text-gray-700 hover:text-purple-600 dark:text-gray-300 dark:hover:text-purple-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Profil'}
                </button>
                <button 
                  onClick={handleSignOut}
                  className="text-sm font-medium text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
                >
                  Çıkış
                </button>
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                  Giriş Yap
                </Link>
                <Link href="/auth/register" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors">
                  Üye Ol
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
