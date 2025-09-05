'use client';

import Image from 'next/image';
import { discoverMovies, tmdbImage, searchMovies, getMovieDetails } from '@/services/tmdb';
import { getContentStats, toggleFavorite, updateUserContentLog, saveContentFromTMDB } from '@/services/movieLogs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [movieStates, setMovieStates] = useState<Record<number, { isWatched: boolean; isFavorite: boolean; isInList: boolean }>>({});

  // Load user states for movies
  const loadUserStatesForMovies = async (movies: any[]) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) return;

      const movieIds = movies.map(m => m.id);
      
      // Get user content logs for all movies
      const { data: logs, error } = await supabase
        .from('user_content_log')
        .select('*')
        .eq('user_id', userRes.user.id)
        .in('content_id', movieIds);

      if (error) return;

      // Group logs by content_id and get the latest for each
      const latestLogs: Record<number, any> = {};
      logs?.forEach(log => {
        if (!latestLogs[log.content_id] || new Date(log.date) > new Date(latestLogs[log.content_id].date)) {
          latestLogs[log.content_id] = log;
        }
      });

      // Update movie states
      const newStates: Record<number, { isWatched: boolean; isFavorite: boolean; isInList: boolean }> = {};
      movieIds.forEach(movieId => {
        const log = latestLogs[movieId];
        if (log) {
          newStates[movieId] = {
            isWatched: log.content_status_id === 1,
            isFavorite: log.is_favorite || false,
            isInList: log.is_consume_later || false
          };
        } else {
          newStates[movieId] = {
            isWatched: false,
            isFavorite: false,
            isInList: false
          };
        }
      });

      setMovieStates(newStates);
    } catch (error) {
      console.error('Error loading user states for movies:', error);
    }
  };

  // Action handlers
  const handleWatchMovie = async (movieId: number, movieData: any) => {
    try {
      // First ensure movie is saved to content table
      const movieDetails = await getMovieDetails(movieId);
      if (movieDetails) {
        await saveContentFromTMDB(movieDetails);
      }
      
      // Optimistic update
      setMovieStates(prev => ({
        ...prev,
        [movieId]: { 
          ...prev[movieId], 
          isWatched: true
          // Keep watchlist status unchanged
        }
      }));

      // Update database
      const result = await updateUserContentLog(movieId, {
        content_status_id: 1, // CONSUMED
        date: new Date().toISOString()
      });

      if (!result.data) {
        // Revert on error
        setMovieStates(prev => ({
          ...prev,
          [movieId]: { ...prev[movieId], isWatched: false }
        }));
      }
    } catch (error) {
      console.error('Error marking movie as watched:', error);
      setMovieStates(prev => ({
        ...prev,
        [movieId]: { ...prev[movieId], isWatched: false }
      }));
    }
  };

  const handleToggleFavorite = async (movieId: number, movieData: any) => {
    try {
      // First ensure movie is saved to content table
      const movieDetails = await getMovieDetails(movieId);
      if (movieDetails) {
        await saveContentFromTMDB(movieDetails);
      }
      
      const currentState = movieStates[movieId]?.isFavorite || false;
      const nextState = !currentState;

      // Optimistic update
      setMovieStates(prev => ({
        ...prev,
        [movieId]: { ...prev[movieId], isFavorite: nextState }
      }));

      // Update database
      const result = await toggleFavorite(movieId);
      if (!result.data) {
        // Revert on error
        setMovieStates(prev => ({
          ...prev,
          [movieId]: { ...prev[movieId], isFavorite: currentState }
        }));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      const currentState = movieStates[movieId]?.isFavorite || false;
      setMovieStates(prev => ({
        ...prev,
        [movieId]: { ...prev[movieId], isFavorite: currentState }
      }));
    }
  };

  const handleToggleWatchlist = async (movieId: number, movieData: any) => {
    try {
      // First ensure movie is saved to content table
      const movieDetails = await getMovieDetails(movieId);
      if (movieDetails) {
        await saveContentFromTMDB(movieDetails);
      }
      
      const currentState = movieStates[movieId]?.isInList || false;
      const nextState = !currentState;

      // Optimistic update
      setMovieStates(prev => ({
        ...prev,
        [movieId]: { ...prev[movieId], isInList: nextState }
      }));

      // Update database
      const result = await updateUserContentLog(movieId, {
        is_consume_later: nextState,
        content_status_id: nextState ? 2 : undefined, // CONSUME_LATER or undefined
        date: new Date().toISOString()
      });

      if (!result.data) {
        // Revert on error
        setMovieStates(prev => ({
          ...prev,
          [movieId]: { ...prev[movieId], isInList: currentState }
        }));
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
      const currentState = movieStates[movieId]?.isInList || false;
      setMovieStates(prev => ({
        ...prev,
        [movieId]: { ...prev[movieId], isInList: currentState }
      }));
    }
  };

  const sp = Object.fromEntries(searchParams.entries());
  const sort_by = sp.sort_by || 'popularity.desc';
  const with_original_language = sp.with_original_language || '';
  const with_genres = sp.with_genres || '';
  const page = sp.page || '1';
  const yearMin = sp.yearMin || '';
  const yearMax = sp.yearMax || '';
  const searchQuery = sp.search || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let result;
        
        if (searchQuery.trim()) {
          // If there's a search query, use search endpoint
          result = await searchMovies(searchQuery, parseInt(page));
        } else {
          // Otherwise use discover endpoint
          const gte = yearMin ? `${yearMin}-01-01` : undefined;
          const lte = yearMax ? `${yearMax}-12-31` : undefined;

          result = await discoverMovies({
            sort_by,
            with_original_language,
            with_genres,
            page,
            'primary_release_date.gte': gte,
            'primary_release_date.lte': lte,
          });
        }
        
        if (result && result.results) {
          // Load user states for all movies
          await loadUserStatesForMovies(result.results);
        }
        
        // Get database ratings for each movie
        if (result?.results?.length) {
          const moviesWithDbRatings = await Promise.all(
            result.results.map(async (movie: any) => {
              try {
                const stats = await getContentStats(movie.id);
                return {
                  ...movie,
                  db_rating: stats.average_rating || 0,
                  db_review_count: stats.review_count || 0
                };
              } catch (error) {
                // If error, fallback to TMDB rating
                return {
                  ...movie,
                  db_rating: movie.vote_average / 2 || 0, // Convert TMDB 10-scale to 5-scale
                  db_review_count: 0
                };
              }
            })
          );
          
          setData({
            ...result,
            results: moviesWithDbRatings
          });
        } else {
          setData(result);
        }
      } catch (e: any) {
        setError(e?.message || 'Beklenmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sort_by, with_original_language, with_genres, page, yearMin, yearMax, searchQuery]);

  const results = data?.results || [];

  const makeQS = (entries: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      sort_by,
      with_original_language,
      with_genres,
      yearMin,
      yearMax,
      search: searchQuery,
    };
    const all = { ...base, ...entries };
    Object.entries(all).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    return `?${q.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {searchQuery ? `"${searchQuery}" için arama sonuçları` : 'Keşfet'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {searchQuery ? `${data?.total_results || 0} sonuç bulundu` : 'Popüler filmler ve yeni çıkanları keşfet'}
        </p>
      </div>

      {/* Filters - Hide when searching */}
      {!searchQuery && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sırala
            </label>
            <select 
              name="sort_by" 
              defaultValue={sort_by} 
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="popularity.desc">Popülarite ↓</option>
              <option value="vote_average.desc">Puan ↓</option>
              <option value="primary_release_date.desc">Çıkış Tarihi ↓</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dil
            </label>
            <input 
              name="with_original_language" 
              defaultValue={with_original_language} 
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" 
              placeholder="en, tr" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tür ID&apos;ler
            </label>
            <input 
              name="with_genres" 
              defaultValue={with_genres} 
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" 
              placeholder="28,12" 
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Yıl ≥
              </label>
              <input 
                name="yearMin" 
                defaultValue={yearMin} 
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" 
                placeholder="2015" 
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Yıl ≤
              </label>
              <input 
                name="yearMax" 
                defaultValue={yearMax} 
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" 
                placeholder="2024" 
              />
            </div>
          </div>
          
          <div className="lg:col-span-4">
            <button className="rounded-lg bg-gray-700 dark:bg-gray-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-colors">
              Filtreleri Uygula
            </button>
          </div>
        </form>
      </div>
      )}

      {/* Errors */}
      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {error.includes('TMDB_API_KEY') ? (
            <>
              <p>
                TMDB_API_KEY ayarlanmadı. Lütfen `web/.env.local` dosyasına TMDB anahtarınızı ekleyin ve sunucuyu yeniden başlatın.
              </p>
              <p className="mt-1 text-xs opacity-80">V3 API Key veya V4 Bearer token kullanabilirsiniz.</p>
            </>
          ) : (
            <p>{error}</p>
          )}
        </div>
      ) : null}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((m: any) => {
          const title = m.title || m.name || '—';
          const year = m.release_date ? new Date(m.release_date).getFullYear() : null;
          
          return (
            <article key={m.id} className="group relative">
              <a href={`/content/movie/${m.id}`} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 shadow-sm">
                  {m.poster_path ? (
                    <Image
                      src={tmdbImage(m.poster_path, 'w342')}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                      className="object-cover transition-all duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Overlay with rating - only show if rating exists */}
                  {m.db_rating > 0 && (
                    <div className="absolute top-2 right-2">
                      <div className="rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        ⭐ {m.db_rating.toFixed(1)}
                        {m.db_review_count > 0 && (
                          <span className="ml-1 opacity-75">({m.db_review_count})</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hover Overlay with Action Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleWatchMovie(m.id, m);
                        }}
                        className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-sm text-white transition-colors ${
                          movieStates[m.id]?.isWatched 
                            ? 'bg-blue-600' 
                            : 'bg-white/20 hover:bg-white/30'
                        }`}
                        title="İzle"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleFavorite(m.id, m);
                        }}
                        className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-sm text-white transition-colors ${
                          movieStates[m.id]?.isFavorite 
                            ? 'bg-red-600' 
                            : 'bg-white/20 hover:bg-white/30'
                        }`}
                        title="Favori"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleWatchlist(m.id, m);
                        }}
                        className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-sm text-white transition-colors ${
                          movieStates[m.id]?.isInList 
                            ? 'bg-green-600' 
                            : 'bg-white/20 hover:bg-white/30'
                        }`}
                        title="İzleme Listesi"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 space-y-1">
                  <h3 className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    {title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    {year && <span>{year}</span>}
                    {year && m.original_language && <span>·</span>}
                    {m.original_language && (
                      <span className="uppercase">{m.original_language}</span>
                    )}
                  </div>
                </div>
              </a>
            </article>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => router.push(('/explore' + makeQS({ page: String(Math.max(1, (data?.page || 1) - 1)) })) as any)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          disabled={loading || (data?.page || 1) <= 1}
        >
          ← Önceki
        </button>
        
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Sayfa {data?.page ?? 1} / {data?.total_pages ?? 1}
        </span>
        
        <button
          onClick={() => router.push(('/explore' + makeQS({ page: String(Math.min(data?.total_pages || 1, (data?.page || 1) + 1)) })) as any)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={loading || (data?.page || 1) >= (data?.total_pages || 1)}
        >
          Sonraki →
        </button>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}
