'use client';

import { discoverMovies, tmdbImage, searchMovies, getMovieDetails } from '@/services/api/tmdb';
import { getContentStats, toggleFavorite, updateUserContentLog, saveContentFromTMDB } from '@/services/database/movieLogs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import MovieCard from '@/components/MovieCard';
import ExploreLayout from '@/components/layouts/ExploreLayout';
import type { Route } from 'next';

function MoviesExploreContent() {
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

  // Optimized batch stats loading
  const loadBatchStats = async (movieIds: number[]) => {
    if (movieIds.length === 0) return {};

    try {
      // Batch API calls in chunks of 10 to avoid overwhelming the server
      const chunkSize = 10;
      const statsPromises = [];

      for (let i = 0; i < movieIds.length; i += chunkSize) {
        const chunk = movieIds.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (id) => {
          try {
            const stats = await getContentStats(id.toString());
            return { id, stats };
          } catch (error) {
            return { id, stats: null };
          }
        });
        statsPromises.push(...chunkPromises);
      }

      const results = await Promise.all(statsPromises);
      const statsMap: Record<number, any> = {};

      results.forEach(({ id, stats }) => {
        if (stats) {
          statsMap[id] = stats;
        }
      });

      return statsMap;
    } catch (error) {
      console.error('Error loading batch stats:', error);
      return {};
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
      const result = await updateUserContentLog(movieId.toString(), {
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
      const result = await toggleFavorite(movieId.toString());
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
      const result = await updateUserContentLog(movieId.toString(), {
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
  const voteMin = sp.voteMin || '';
  const voteMax = sp.voteMax || '';
  const runtimeMin = sp.runtimeMin || '';
  const runtimeMax = sp.runtimeMax || '';
  const certification = sp.certification || '';
  const searchQuery = sp.search || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🎬 Movies: Starting data fetch');
        setLoading(true);
        setError(null);
        
        let result;
        
        if (searchQuery.trim()) {
          console.log('🎬 Movies: Searching for:', searchQuery);
          // If there's a search query, use search endpoint
          result = await searchMovies(searchQuery, parseInt(page));
        } else {
          console.log('🎬 Movies: Discovering movies with filters:', { sort_by, with_original_language, with_genres, page, yearMin, yearMax });
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
            'vote_average.gte': voteMin || undefined,
            'vote_average.lte': voteMax || undefined,
            'with_runtime.gte': runtimeMin || undefined,
            'with_runtime.lte': runtimeMax || undefined,
            certification: certification || undefined,
          } as any);
        }
        
        if (result && result.results) {
          console.log('🎬 Movies: Loaded', result.results.length, 'movies');
          // Load user states for all movies
          await loadUserStatesForMovies(result.results);

          // Load stats in batch for better performance
          const movieIds = result.results.map((m: any) => m.id);
          console.log('🎬 Movies: Loading stats for', movieIds.length, 'movies');
          const statsMap = await loadBatchStats(movieIds);
          console.log('🎬 Movies: Stats loaded for', Object.keys(statsMap).length, 'movies');

          // Combine TMDB data with database stats
          const moviesWithStats = result.results.map((movie: any) => {
            const stats = statsMap[movie.id];
            return {
              ...movie,
              db_rating: stats?.average_rating || 0,
              db_review_count: stats?.review_count || 0
            };
          });

          setData({
            ...result,
            results: moviesWithStats
          });
          console.log('🎬 Movies: Data processing completed');
        } else {
          setData(result);
        }
      } catch (e: any) {
        console.error('🎬 Movies: Error fetching data:', e);
        setError(e?.message || 'Beklenmeyen hata');
      } finally {
        setLoading(false);
        console.log('🎬 Movies: Loading completed');
      }
    };

    fetchData();
  }, [sort_by, with_original_language, with_genres, page, yearMin, yearMax, voteMin, voteMax, runtimeMin, runtimeMax, certification, searchQuery]);

  const results = data?.results || [];

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get('search') || '').trim();
    router.push((`/explore/movies${next ? `?search=${encodeURIComponent(next)}` : ''}`) as Route);
  };

  const makeQS = (entries: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      sort_by,
      with_original_language,
      with_genres,
      yearMin,
      yearMax,
      voteMin,
      voteMax,
      runtimeMin,
      runtimeMax,
      certification,
      search: searchQuery,
    };
    const all = { ...base, ...entries };
    Object.entries(all).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    return `?${q.toString()}`;
  };

  return (
    <ExploreLayout
      title={searchQuery ? `"${searchQuery}" için film araması` : 'Filmleri Keşfet'}
      subtitle={searchQuery ? `${data?.total_results || 0} sonuç bulundu` : 'TMDB üzerinden popüler ve aradığınız filmleri bulun'}
      filters={!searchQuery ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const params: Record<string, string> = {};
          
          // Collect all form values
          formData.forEach((value, key) => {
            if (value && typeof value === 'string' && value.trim()) {
              params[key] = value.trim();
            }
          });
          
          // Build query string
          const queryString = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
          router.push(`/explore/movies${queryString}` as Route);
        }} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Sıralama */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sırala</label>
            <select
              name="sort_by"
              defaultValue={sort_by}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="popularity.desc">Popülerlik ↓</option>
              <option value="popularity.asc">Popülerlik ↑</option>
              <option value="vote_average.desc">Puan ↓</option>
              <option value="vote_average.asc">Puan ↑</option>
              <option value="primary_release_date.desc">Çıkış Tarihi ↓</option>
              <option value="primary_release_date.asc">Çıkış Tarihi ↑</option>
              <option value="title.asc">Başlık A-Z</option>
              <option value="title.desc">Başlık Z-A</option>
              <option value="vote_count.desc">Oy Sayısı ↓</option>
              <option value="vote_count.asc">Oy Sayısı ↑</option>
            </select>
          </div>

          {/* Dil */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Orijinal Dil</label>
            <select
              name="with_original_language"
              defaultValue={with_original_language}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="">Tümü</option>
              <option value="en">İngilizce</option>
              <option value="tr">Türkçe</option>
              <option value="es">İspanyolca</option>
              <option value="fr">Fransızca</option>
              <option value="de">Almanca</option>
              <option value="it">İtalyanca</option>
              <option value="ja">Japonca</option>
              <option value="ko">Korece</option>
              <option value="zh">Çince</option>
            </select>
          </div>

          {/* Türler */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Türler</label>
            <input
              name="with_genres"
              defaultValue={with_genres}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
              placeholder="28,12,16 (Aksiyon, Macera, Animasyon)"
            />
          </div>

          {/* Yayın Yılı */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yayın Yılı</label>
            <div className="flex gap-2">
              <input
                name="yearMin"
                defaultValue={yearMin}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                placeholder="2020"
              />
              <input
                name="yearMax"
                defaultValue={yearMax}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                placeholder="2024"
              />
            </div>
          </div>

          {/* Puan Aralığı */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Puan Aralığı</label>
            <div className="flex gap-2">
              <input
                name="voteMin"
                defaultValue={voteMin}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                placeholder="7.0"
                step="0.1"
                min="0"
                max="10"
              />
              <input
                name="voteMax"
                defaultValue={voteMax}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                placeholder="10.0"
                step="0.1"
                min="0"
                max="10"
              />
            </div>
          </div>

          {/* Süre */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Süre (dk)</label>
            <div className="flex gap-2">
              <input
                name="runtimeMin"
                defaultValue={runtimeMin}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                placeholder="60"
                type="number"
              />
              <input
                name="runtimeMax"
                defaultValue={runtimeMax}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                placeholder="180"
                type="number"
              />
            </div>
          </div>

          {/* Yaş Sınırı */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yaş Sınırı</label>
            <select
              name="certification"
              defaultValue={certification}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="">Tümü</option>
              <option value="G">G (Genel İzleyici)</option>
              <option value="PG">PG (Velilerle)</option>
              <option value="PG-13">PG-13 (13 Yaş Altı)</option>
              <option value="R">R (Yetişkin)</option>
              <option value="NC-17">NC-17 (17 Yaş Altı)</option>
            </select>
          </div>

          {/* Filtreleri Temizle Butonu */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 opacity-0">Filtreler</label>
            <button
              type="button"
              onClick={() => router.push('/explore/movies')}
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
      ) : undefined}
      errorBox={error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {error.includes('TMDB_API_KEY') ? (
            <>
              <p>TMDB_API_KEY ayarlanmadı. Lütfen `web/.env.local` dosyasına TMDB anahtarınızı ekleyin ve sunucuyu yeniden başlatın.</p>
              <p className="mt-1 text-xs opacity-80">V3 API Key veya V4 Bearer token kullanabilirsiniz.</p>
            </>
          ) : (
            <p>{error}</p>
          )}
        </div>
      ) : null}
    >
      {/* Search bar */}
      <form onSubmit={onSearchSubmit} className="flex gap-2">
        <input
          name="search"
          defaultValue={searchQuery}
          placeholder="Film ara..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
        />
        <button className="rounded-lg bg-gray-700 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors">
          Ara
        </button>
      </form>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((m: any) => (
          <MovieCard
            key={m.id}
            movie={m}
            size="large"
            showActions
            showRating={m.db_rating > 0}
            rating={m.db_rating}
            reviewCount={m.db_review_count}
            isWatched={movieStates[m.id]?.isWatched}
            isFavorite={movieStates[m.id]?.isFavorite}
            isInList={movieStates[m.id]?.isInList}
            onWatch={(movieId) => handleWatchMovie(movieId, m)}
            onToggleFavorite={(movieId) => handleToggleFavorite(movieId, m)}
            onToggleWatchlist={(movieId) => handleToggleWatchlist(movieId, m)}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => router.push(('/explore/movies' + makeQS({ page: String(Math.max(1, (data?.page || 1) - 1)) })) as any)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          disabled={loading || (data?.page || 1) <= 1}
        >
          ← Önceki
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">Sayfa {data?.page ?? 1} / {data?.total_pages ?? 1}</span>
        <button
          onClick={() => router.push(('/explore/movies' + makeQS({ page: String(Math.min(data?.total_pages || 1, (data?.page || 1) + 1)) })) as any)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          disabled={loading || (data?.page || 1) >= (data?.total_pages || 1)}
        >
          Sonraki →
        </button>
      </div>
    </ExploreLayout>
  );
}

export default function MoviesExplorePage() {
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
      <MoviesExploreContent />
    </Suspense>
  );
}
