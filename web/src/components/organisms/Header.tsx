'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/atoms/theme-toggle';
import { SettingsIcon } from '@/components/atoms/icons/SettingsIcon';
import { SearchIcon } from '@/components/atoms/icons/SearchIcon';
import NotificationsMenu from '@/components/organisms/NotificationsMenu';

export default function Header() {
  const { user, loading, signInWithGoogle, signOut, isPrivileged } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Scroll detection for hiding/showing header
  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        const currentScrollY = window.scrollY;

        // Show header when at top or scrolling up
        if (currentScrollY < lastScrollY || currentScrollY < 10) {
          setIsVisible(true);
        } else {
          // Hide header when scrolling down
          setIsVisible(false);
        }

        setLastScrollY(currentScrollY);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar);
      return () => {
        window.removeEventListener('scroll', controlNavbar);
      };
    }
  }, [lastScrollY]);

  // Debug logging
  // console.log('🎯 Header render:', {
  //   hasUser: !!user,
  //   userEmail: user?.email,
  //   loading,
  //   isSigningIn,
  //   isSigningOut
  // });

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Profil linki runtime'da kesin yola çevrilir (App Router dynamic href hatasını önler)
  const hasUsername = Boolean(user?.username);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const type =
        (document.getElementById('search-type') as HTMLSelectElement | null)?.value || 'movie';
      let path = '/explore/movie';
      if (type === 'game') path = '/explore/game';
      else if (type === 'tv') path = '/explore/tv';
      else if (type === 'book') path = '/explore/book';
      router.push(`${path}?search=${encodeURIComponent(searchQuery.trim())}` as any);
      setShowSearchInput(false);
      setSearchQuery('');
    }
  };

  const handleSearchToggle = () => {
    setShowSearchInput(!showSearchInput);
    if (!showSearchInput) {
      // Focus on search input when opening
      setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        searchInput?.focus();
      }, 100);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-gray-800/90 backdrop-blur-md border-b border-gray-700 shadow-lg transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gray-700 dark:bg-gray-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Blackbox</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/explore/movie"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Movies
            </Link>
            <Link
              href="/explore/tv"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              TV Shows
            </Link>
            <Link
              href="/explore/game"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Games
            </Link>
            <Link
              href="/explore/book"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              Books
            </Link>
            <Link
              href="/quiz"
              className="text-sm font-medium text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1"
            >
              🎯 Quiz
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user && <NotificationsMenu />}

            {/* Add Content Button */}
            {user && (isPrivileged || Boolean(user?.isAdmin) || Boolean(user?.isModerator)) && (
              <Link
                href="/add-content"
                className="rounded-full bg-green-600 hover:bg-green-700 p-2 text-white transition-colors"
                title="Add Content"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Link>
            )}

            {/* Search functionality */}
            {showSearchInput ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <select
                  id="search-type"
                  className="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  defaultValue="movie"
                >
                  <option value="movie">Movie</option>
                  <option value="tv">TV Show</option>
                  <option value="game">Game</option>
                  <option value="book">Book</option>
                </select>
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="rounded-full bg-gray-700 dark:bg-gray-600 p-2 text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
                >
                  <SearchIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchQuery('');
                  }}
                  className="rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="h-5 w-5 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={handleSearchToggle}
                className="hidden md:block rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                <SearchIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}

            {loading ? (
              <div className="w-20 h-8 rounded bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                {(isPrivileged || Boolean(user?.isAdmin) || Boolean(user?.isModerator)) && (
                  <Link
                    href="/admin"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href={hasUsername ? (`/profile/${user!.username}` as const) : '/profile'}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                >
                  {user?.username ?? 'Profile'}
                </Link>
                <Link
                  href="/settings"
                  className="rounded-full p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                  title="Settings"
                >
                  <SettingsIcon className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-lg bg-gray-700 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
