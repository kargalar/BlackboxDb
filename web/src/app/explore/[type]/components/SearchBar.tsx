'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updateExploreUrl } from '../../exploreUrl';

interface SearchBarProps {
  placeholder?: string;
}

export function SearchBar({ placeholder }: SearchBarProps) {
  const t = useTranslations('Explore');
  const pathname = usePathname();
  const urlQuery = useSearchParams().get('q') ?? '';
  const [draft, setDraft] = useState<{ pathname: string; urlQuery: string; text: string } | null>(null);
  const searchInput = draft?.pathname === pathname && draft.urlQuery === urlQuery
    ? draft.text
    : urlQuery;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSearch = () => {
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = null;
  };

  useEffect(() => {
    const syncHistory = () => {
      cancelSearch();
      setDraft(null);
    };
    window.addEventListener('popstate', syncHistory);
    return () => {
      cancelSearch();
      window.removeEventListener('popstate', syncHistory);
    };
  }, [pathname]);

  const commitSearch = (text: string) => {
    cancelSearch();
    const params = new URLSearchParams(window.location.search);
    const currentQuery = params.get('q') ?? '';
    const query = text.trim();
    setDraft({ pathname, urlQuery: currentQuery, text: query });
    if (query === currentQuery) return;

    if (query) params.set('q', query);
    else params.delete('q');
    params.delete('page');
    updateExploreUrl(params);
  };

  const changeSearch = (text: string) => {
    cancelSearch();
    setDraft({ pathname, urlQuery, text });
    const location = window.location.pathname;
    const currentQuery = new URLSearchParams(window.location.search).get('q');
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (window.location.pathname !== location) return;
      if (new URLSearchParams(window.location.search).get('q') !== currentQuery) return;
      commitSearch(text);
    }, 400);
  };

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    commitSearch(searchInput);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder={placeholder ?? t('searchPlaceholder')}
          aria-label={placeholder ?? t('searchPlaceholder')}
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
            onClick={() => commitSearch('')}
            aria-label={t('clearSearch')}
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
