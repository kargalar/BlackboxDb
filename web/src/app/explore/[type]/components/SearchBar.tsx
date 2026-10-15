'use client';

import { useState, FormEvent, useEffect, useRef, startTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

type ContentType =
  | 'movie'
  | 'tv'
  | 'game'
  | 'book'
  | 'person'
  | 'company';

interface SearchBarProps {
  contentType: ContentType;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export function SearchBar({ contentType, placeholder = 'Ara...', onSearch }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(urlQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);

  const pushSearch = (query: string) => {
    const trimmedQuery = query.trim();

    // Prevent overriding the URL if the query hasn't actually changed
    // This fixes a race condition where stale closures from React Strict Mode
    // would push '?page=1' to the URL, erasing other filters applied on mount.
    if (trimmedQuery === urlQuery) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (trimmedQuery) {
      params.set('q', trimmedQuery);
      params.delete('page'); // Reset to page 1 by removing the param
    } else {
      params.delete('q');
      params.delete('page');
    }
    const nextUrl = `${pathname}?${params.toString()}`;
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    if (nextUrl !== currentUrl) {
      startTransition(() => {
        router.push(nextUrl as any, { scroll: false });
      });
    }
    onSearch?.(trimmedQuery);
  };

  useEffect(() => {
    // Only update search input from URL if we are not actively typing/debouncing
    // This prevents Next.js router.push race conditions from reverting the user's text
    if (!debounceRef.current) {
      setSearchInput(urlQuery);
    }
  }, [urlQuery]);

  // Debounced typing
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushSearch(searchInput);
      debounceRef.current = null;
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushSearch(searchInput);
  };

  const clearSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    params.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}` as any, { scroll: false });
    });
    onSearch?.('');
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-12 pr-12 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
