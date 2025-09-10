"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Route } from 'next';
import { discoverTV, searchTV } from '@/services/api/tmdb';
import ExploreLayout from '@/components/layouts/ExploreLayout'
import type { TMDBDiscoverMovie } from '@/types/tmdb';
import TvCard from '@/components/TvCard';
import { getTvDetails } from '@/services/api/tmdb';
import { saveContentFromTMDBTv } from '@/services/database/movieLogs';
import { supabase } from '@/lib/supabase';

function TvExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sp = Object.fromEntries(searchParams.entries());
  const sort_by = sp.sort_by || 'popularity.desc';
  const with_original_language = sp.with_original_language || '';
  const with_genres = sp.with_genres || '';
  const page = sp.page || '1';
  const yearMin = sp.yearMin || '';
  const yearMax = sp.yearMax || '';
  const searchQuery = sp.search || '';

  const [data, setData] = useState<{ page: number; total_pages: number; total_results: number; results: TMDBDiscoverMovie[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tvStates, setTvStates] = useState<Record<number, { isWatched: boolean; isFavorite: boolean; isInList: boolean }>>({});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        let result;
        if (searchQuery.trim()) {
          result = await searchTV(searchQuery, parseInt(page));
        } else {
          const gte = yearMin ? `${yearMin}-01-01` : undefined;
          const lte = yearMax ? `${yearMax}-12-31` : undefined;
          result = await discoverTV({
            sort_by,
            with_original_language,
            with_genres,
            page,
            'first_air_date.gte': gte,
            'first_air_date.lte': lte,
          });
        }
        setData(result as any);
      } catch (e: any) {
        setError(e?.message || 'Beklenmeyen hata');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sort_by, with_original_language, with_genres, page, yearMin, yearMax, searchQuery]);

  // Load user states for TV shows
  const loadUserStatesForTV = async (tvs: any[]) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) return;

      const tvIds = tvs.map(tv => tv.id);
      
      // Get user content logs for all TV shows
      const { data: logs, error } = await supabase
        .from('user_content_log')
        .select('*')
        .eq('user_id', userRes.user.id)
        .in('content_id', tvIds);

      if (error) return;

      // Group logs by content_id and get the latest for each
      const latestLogs: Record<number, any> = {};
      logs?.forEach(log => {
        if (!latestLogs[log.content_id] || new Date(log.date) > new Date(latestLogs[log.content_id].date)) {
          latestLogs[log.content_id] = log;
        }
      });

      // Update TV states
      const newStates: Record<number, { isWatched: boolean; isFavorite: boolean; isInList: boolean }> = {};
      tvIds.forEach(tvId => {
        const log = latestLogs[tvId];
        if (log) {
          newStates[tvId] = {
            isWatched: log.content_status_id === 1,
            isFavorite: log.is_favorite || false,
            isInList: log.is_consume_later || false
          };
        } else {
          newStates[tvId] = {
            isWatched: false,
            isFavorite: false,
            isInList: false
          };
        }
      });

      setTvStates(newStates);
    } catch (error) {
      console.error('Error loading user states for TV shows:', error);
    }
  };

  useEffect(() => {
    if (data?.results) {
      loadUserStatesForTV(data.results);
    }
  }, [data?.results]);

  const handleWatchTv = async (tvId: number) => {
    console.log('📺 handleWatchTv called for tvId:', tvId);
    try {
      const details = await getTvDetails(tvId);
      if (details) await saveContentFromTMDBTv(details as any);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('📺 No authenticated user');
        return;
      }

      console.log('📺 User authenticated, updating database...');
      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: tvId.toString(),
          content_status_id: 1,
          date: new Date().toISOString()
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('📺 Database error:', error);
        throw error;
      }

      console.log('📺 TV watch logged successfully');
      setTvStates((prev) => ({ ...prev, [tvId]: { ...prev[tvId], isWatched: true } }));
    } catch (err) {
      console.error('📺 Error in handleWatchTv:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const handleToggleFavorite = async (tvId: number) => {
    console.log('📺 handleToggleFavorite called for tvId:', tvId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('📺 No authenticated user');
        return;
      }

      const currentState = tvStates[tvId];
      const newFavoriteState = !currentState?.isFavorite;
      console.log('📺 Setting favorite state to:', newFavoriteState);

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: tvId.toString(),
          is_favorite: newFavoriteState
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('📺 Database error:', error);
        throw error;
      }

      console.log('📺 TV favorite updated successfully');
      setTvStates((prev) => ({ ...prev, [tvId]: { ...prev[tvId], isFavorite: newFavoriteState } }));
    } catch (err) {
      console.error('📺 Error in handleToggleFavorite:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const handleToggleWatchlist = async (tvId: number) => {
    console.log('📺 handleToggleWatchlist called for tvId:', tvId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('📺 No authenticated user');
        return;
      }

      const currentState = tvStates[tvId];
      const newWatchlistState = !currentState?.isInList;
      console.log('📺 Setting watchlist state to:', newWatchlistState);

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: tvId.toString(),
          is_consume_later: newWatchlistState
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('📺 Database error:', error);
        throw error;
      }

      console.log('📺 TV watchlist updated successfully');
      setTvStates((prev) => ({ ...prev, [tvId]: { ...prev[tvId], isInList: newWatchlistState } }));
    } catch (err) {
      console.error('📺 Error in handleToggleWatchlist:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

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
    Object.entries(all).forEach(([k, v]) => { if (v) q.set(k, v); });
    return `?${q.toString()}`;
  };

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get('search') || '').trim();
    router.push((`/explore/tv${next ? `?search=${encodeURIComponent(next)}` : ''}`) as Route);
  };

  return (
    <ExploreLayout
      title={searchQuery ? `"${searchQuery}" için dizi araması` : 'Dizileri Keşfet'}
      subtitle={searchQuery ? `${data?.total_results || 0} sonuç bulundu` : 'TMDB üzerinden popüler ve aradığınız dizileri bulun'}
      filters={!searchQuery ? (
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sırala</label>
              <select name="sort_by" defaultValue={sort_by} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20">
                <option value="popularity.desc">Popülarite ↓</option>
                <option value="vote_average.desc">Puan ↓</option>
                <option value="first_air_date.desc">Yayın Tarihi ↓</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dil</label>
              <input name="with_original_language" defaultValue={with_original_language} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" placeholder="en, tr" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tür ID&rsquo;ler</label>
              <input name="with_genres" defaultValue={with_genres} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" placeholder="18,80" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yıl ≥</label>
                <input name="yearMin" defaultValue={yearMin} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" placeholder="2018" />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yıl ≤</label>
                <input name="yearMax" defaultValue={yearMax} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20" placeholder="2025" />
              </div>
            </div>
            <div className="lg:col-span-4">
              <button className="rounded-lg bg-gray-700 dark:bg-gray-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-colors">
                Filtreleri Uygula
              </button>
            </div>
          </form>
  ) : undefined}>

      {/* Search bar for TV */}
      <form onSubmit={onSearchSubmit} className="flex gap-2">
        <input
          name="search"
          defaultValue={searchQuery}
          placeholder="Dizi ara..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
        />
        <button className="rounded-lg bg-gray-700 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors">
          Ara
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {data?.results?.map((tv) => (
          <TvCard 
            key={tv.id} 
            tv={tv as any} 
            size="large" 
            showActions 
            isWatched={!!tvStates[tv.id]?.isWatched}
            isFavorite={!!tvStates[tv.id]?.isFavorite}
            isInList={!!tvStates[tv.id]?.isInList}
            onWatch={handleWatchTv}
            onToggleFavorite={handleToggleFavorite}
            onToggleWatchlist={handleToggleWatchlist}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button onClick={() => router.push(('/explore/tv' + makeQS({ page: String(Math.max(1, (data?.page || 1) - 1)) })) as any)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" disabled={loading || (data?.page || 1) <= 1}>
          ← Önceki
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">Sayfa {data?.page ?? 1} / {data?.total_pages ?? 1}</span>
        <button onClick={() => router.push(('/explore/tv' + makeQS({ page: String(Math.min(data?.total_pages || 1, (data?.page || 1) + 1)) })) as any)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" disabled={loading || (data?.page || 1) >= (data?.total_pages || 1)}>
          Sonraki →
        </button>
      </div>
    </ExploreLayout>
  );
}

export default function TvExplorePage() {
  return (
    <Suspense fallback={<div className="space-y-8"><div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /><div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{Array.from({ length: 20 }).map((_, i) => (<div key={i} className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>))}</div></div>}>
      <TvExploreContent />
    </Suspense>
  );
}
