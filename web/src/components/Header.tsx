'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/theme-toggle'
import { getCurrentUserProfile } from '@/services/userService'

export default function Header() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [appUser, setAppUser] = useState<{ username: string; email: string; picture_path: string | null; bio: string | null } | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // User profile bilgisini al
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          const result = await getCurrentUserProfile()
          if (result?.data) {
            setAppUser(result.data)
          }
        } catch (error) {
          console.error('User profile yüklenemedi:', error)
        }
      } else {
        setAppUser(null)
      }
    }

    loadUserProfile()
  }, [user])

  // Scroll detection for hiding/showing header
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY
        
        // Show header when at top or scrolling up
        if (currentScrollY < lastScrollY || currentScrollY < 10) {
          setIsVisible(true)
        } else {
          // Hide header when scrolling down
          setIsVisible(false)
        }
        
        setLastScrollY(currentScrollY)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar)
      return () => {
        window.removeEventListener('scroll', controlNavbar)
      }
    }
  }, [lastScrollY])

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
    if (appUser?.username) {
      router.push(`/profile/${appUser.username}`)
    } else {
      router.push('/profile')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/explore?search=${encodeURIComponent(searchQuery.trim())}`)
      setShowSearchInput(false)
      setSearchQuery('')
    }
  }

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput)
    if (!showSearchInput) {
      // Focus on search input when opening
      setTimeout(() => {
        const searchInput = document.getElementById('search-input')
        searchInput?.focus()
      }, 100)
    }
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 dark:bg-gray-900/80 dark:border-gray-800 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-700 dark:bg-gray-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Blackbox</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/explore" className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
              Keşfet
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            
            {/* Search functionality */}
            {showSearchInput ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Film ara..."
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gray-700 dark:bg-gray-600 p-2 text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchInput(false)
                    setSearchQuery('')
                  }}
                  className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <button 
                onClick={handleSearchToggle}
                className="hidden md:block rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            
            {loading ? (
              <div className="w-20 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleProfileClick}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {appUser?.username || user?.user_metadata?.username || user.email?.split('@')[0] || 'Profil'}
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
                <Link href="/auth/register" className="rounded-lg bg-gray-700 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors">
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
