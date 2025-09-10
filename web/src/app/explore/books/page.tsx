"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import BookCard from '@/components/BookCard';
import ExploreLayout from '@/components/layouts/ExploreLayout'
import { booksSearch, type GoogleBook } from '@/services/api/books';
import { supabase } from '@/lib/supabase';

function BooksExploreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookStates, setBookStates] = useState<Record<string, { isWatched: boolean; isFavorite: boolean; isInList: boolean }>>({});
  const [totalItems, setTotalItems] = useState(0);

  const searchQuery = useMemo(() => (searchParams.get('search') || '').trim(), [searchParams]);
  const page = useMemo(() => Math.max(1, Number(searchParams.get('page') || '1')), [searchParams]);
  const sortBy = useMemo(() => searchParams.get('sort_by') || 'relevance', [searchParams]);
  const yearMin = useMemo(() => searchParams.get('year_min') || '', [searchParams]);
  const yearMax = useMemo(() => searchParams.get('year_max') || '', [searchParams]);
  const author = useMemo(() => searchParams.get('author') || '', [searchParams]);
  const query = searchQuery || 'harry potter';

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await booksSearch(query, 24, page);
        if (!cancelled) {
          setBooks(res.data);
          setTotalItems(res.totalItems || 0);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Books hata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [query, page]);

  // Load user states for books
  const loadUserStatesForBooks = async (books: GoogleBook[]) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) return;

      const bookIds = books.map(book => book.id);
      
      // Get user content logs for all books
      const { data: logs, error } = await supabase
        .from('user_content_log')
        .select('*')
        .eq('user_id', userRes.user.id)
        .in('content_id', bookIds);

      if (error) return;

      // Group logs by content_id and get the latest for each
      const latestLogs: Record<string, any> = {};
      logs?.forEach(log => {
        if (!latestLogs[log.content_id] || new Date(log.date) > new Date(latestLogs[log.content_id].date)) {
          latestLogs[log.content_id] = log;
        }
      });

      // Update book states
      const newStates: Record<string, { isWatched: boolean; isFavorite: boolean; isInList: boolean }> = {};
      bookIds.forEach(bookId => {
        const log = latestLogs[bookId];
        if (log) {
          newStates[bookId] = {
            isWatched: log.content_status_id === 1,
            isFavorite: log.is_favorite || false,
            isInList: log.is_consume_later || false
          };
        } else {
          newStates[bookId] = {
            isWatched: false,
            isFavorite: false,
            isInList: false
          };
        }
      });

      setBookStates(newStates);
    } catch (error) {
      console.error('Error loading user states for books:', error);
    }
  };

  useEffect(() => {
    if (books.length > 0) {
      loadUserStatesForBooks(books);
    }
  }, [books]);

  const handleWatchBook = async (bookId: string) => {
    console.log('📚 handleWatchBook called for bookId:', bookId);
    console.log('📚 Current bookStates:', bookStates);
    try {
      const { data: user } = await supabase.auth.getUser();
      console.log('📚 Auth user:', user?.user?.id);
      if (!user.user) {
        console.error('📚 No authenticated user');
        return;
      }

      console.log('📚 User authenticated, updating database...');
      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: bookId,
          content_status_id: 1,
          date: new Date().toISOString()
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('📚 Database error:', error);
        throw error;
      }

      console.log('📚 Book watch logged successfully, updating state...');
      setBookStates((prev) => {
        console.log('📚 Previous state:', prev);
        const newState = { ...prev, [bookId]: { ...prev[bookId], isWatched: true } };
        console.log('📚 New state:', newState);
        return newState;
      });
      console.log('📚 State update completed');
    } catch (err) {
      console.error('📚 Error in handleWatchBook:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const handleToggleFavorite = async (bookId: string) => {
    console.log('📚 handleToggleFavorite called for bookId:', bookId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('📚 No authenticated user');
        return;
      }

      const currentState = bookStates[bookId];
      const newFavoriteState = !currentState?.isFavorite;
      console.log('📚 Setting favorite state to:', newFavoriteState);

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: bookId,
          is_favorite: newFavoriteState
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('📚 Database error:', error);
        throw error;
      }

      console.log('📚 Book favorite updated successfully');
      setBookStates((prev) => ({ ...prev, [bookId]: { ...prev[bookId], isFavorite: newFavoriteState } }));
    } catch (err) {
      console.error('📚 Error in handleToggleFavorite:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const handleToggleWatchlist = async (bookId: string) => {
    console.log('📚 handleToggleWatchlist called for bookId:', bookId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('📚 No authenticated user');
        return;
      }

      const currentState = bookStates[bookId];
      const newWatchlistState = !currentState?.isInList;
      console.log('📚 Setting watchlist state to:', newWatchlistState);

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: bookId,
          is_consume_later: newWatchlistState
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('📚 Database error:', error);
        throw error;
      }

      console.log('📚 Book watchlist updated successfully');
      setBookStates((prev) => ({ ...prev, [bookId]: { ...prev[bookId], isInList: newWatchlistState } }));
    } catch (err) {
      console.error('📚 Error in handleToggleWatchlist:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get('search') || '').trim();
    const sortBy = String(form.get('sort_by') || 'relevance');
    const yearMin = String(form.get('year_min') || '');
    const yearMax = String(form.get('year_max') || '');
    const author = String(form.get('author') || '');
    
    const params = new URLSearchParams();
    if (next) params.set('search', next);
    if (sortBy !== 'relevance') params.set('sort_by', sortBy);
    if (yearMin) params.set('year_min', yearMin);
    if (yearMax) params.set('year_max', yearMax);
    if (author) params.set('author', author);
    
    const queryString = params.toString();
    router.push((`/explore/books${queryString ? `?${queryString}` : ''}`) as Route);
  };

  const makeQS = (entries: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      search: searchQuery,
      sort_by: sortBy,
      year_min: yearMin,
      year_max: yearMax,
      author: author,
    };
    const all = { ...base, ...entries };
    Object.entries(all).forEach(([k, v]) => { if (v) q.set(k, v); });
    return `?${q.toString()}`;
  };

  const totalPages = Math.ceil(totalItems / 24);

  // Client-side filtering
  const filteredBooks = useMemo(() => {
    let filtered = [...books];
    
    // Filter by year
    if (yearMin) {
      const minYear = parseInt(yearMin);
      filtered = filtered.filter(book => {
        if (!book.publishedDate) return false;
        const bookYear = parseInt(book.publishedDate.split('-')[0]);
        return bookYear >= minYear;
      });
    }
    
    if (yearMax) {
      const maxYear = parseInt(yearMax);
      filtered = filtered.filter(book => {
        if (!book.publishedDate) return false;
        const bookYear = parseInt(book.publishedDate.split('-')[0]);
        return bookYear <= maxYear;
      });
    }
    
    // Filter by author
    if (author) {
      filtered = filtered.filter(book => {
        if (!book.authors) return false;
        return book.authors.some(a => a.toLowerCase().includes(author.toLowerCase()));
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'author':
          const authorA = (a.authors || []).join(' ').toLowerCase();
          const authorB = (b.authors || []).join(' ').toLowerCase();
          return authorA.localeCompare(authorB);
        case 'newest':
          const dateA = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
          const dateB = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
          return dateB - dateA;
        case 'oldest':
          const dateA2 = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
          const dateB2 = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
          return dateA2 - dateB2;
        case 'relevance':
        default:
          return 0; // Keep original order for relevance
      }
    });
    
    return filtered;
  }, [books, sortBy, yearMin, yearMax, author]);

  return (
    <ExploreLayout title="Kitapları Keşfet" subtitle="Google Books üzerinden popüler ve aradığınız kitapları bulun" filters={!searchQuery ? (
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Sıralama */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sırala</label>
          <select
            name="sort_by"
            defaultValue={sortBy}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
          >
            <option value="relevance">Alakalılık</option>
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="title">Başlık A-Z</option>
            <option value="author">Yazar A-Z</option>
          </select>
        </div>

        {/* Yayın Yılı */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yayın Yılı</label>
          <div className="flex gap-2">
            <input
              name="year_min"
              defaultValue={yearMin}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
              placeholder="2000"
              type="number"
            />
            <input
              name="year_max"
              defaultValue={yearMax}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
              placeholder="2024"
              type="number"
            />
          </div>
        </div>

        {/* Yazar */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yazar</label>
          <input
            name="author"
            defaultValue={author}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            placeholder="J.K. Rowling, Stephen King..."
          />
        </div>

        {/* Filtreleri Temizle Butonu */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 opacity-0">Filtreler</label>
          <button
            type="button"
            onClick={() => router.push('/explore/books')}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>

        {/* Uygula Butonu */}
        <div className="lg:col-span-4 xl:col-span-4">
          <button type="submit" className="rounded-lg bg-gray-700 dark:bg-gray-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-colors">
            Filtreleri Uygula
          </button>
        </div>
      </form>
    ) : undefined}>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          name="search"
          defaultValue={searchQuery}
          placeholder="Kitap ara..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
        />
        <button className="rounded-lg bg-gray-700 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors">
          Ara
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))
          : filteredBooks.map((b) => <BookCard 
              key={b.id} 
              book={b} 
              size="large"
              showActions
              isWatched={!!bookStates[b.id]?.isWatched}
              isFavorite={!!bookStates[b.id]?.isFavorite}
              isInList={!!bookStates[b.id]?.isInList}
              onWatch={handleWatchBook}
              onToggleFavorite={handleToggleFavorite}
              onToggleWatchlist={handleToggleWatchlist}
            />)}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => router.push(('/explore/books' + makeQS({ page: String(Math.max(1, page - 1)) })) as any)} 
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" 
            disabled={loading || page <= 1}
          >
            ← Önceki
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Sayfa {page} / {totalPages}</span>
          <button 
            onClick={() => router.push(('/explore/books' + makeQS({ page: String(Math.min(totalPages, page + 1)) })) as any)} 
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
            disabled={loading || page >= totalPages}
          >
            Sonraki →
          </button>
        </div>
      )}
    </ExploreLayout>
  );
}

export default function BooksExplorePage() {
  return (
    <Suspense fallback={<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}> 
      <BooksExploreInner />
    </Suspense>
  );
}
