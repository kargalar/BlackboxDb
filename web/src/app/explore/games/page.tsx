"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { igdbSearch } from '@/services/api/igdb';
import ExploreLayout from '@/components/layouts/ExploreLayout'
import GameCard from '@/components/GameCard';
import { supabase } from '@/lib/supabase';

type Game = {
  id: number;
  name: string;
  cover?: { image_id: string };
  platforms?: { name: string }[];
  total_rating?: number;
};

function GamesExploreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameStates, setGameStates] = useState<Record<number, { isWatched: boolean; isFavorite: boolean; isInList: boolean }>>({});

  const searchQuery = useMemo(() => (searchParams.get('search') || '').trim(), [searchParams]);
  const page = useMemo(() => Math.max(1, Number(searchParams.get('page') || '1')), [searchParams]);
  const query = searchQuery || 'zelda';

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await igdbSearch(query, 48, page); // increased from 24 to 48
        if (!cancelled) setGames(res as any);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'IGDB hata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [query, page]);

  // Load user states for games
  const loadUserStatesForGames = async (games: Game[]) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) return;

      const gameIds = games.map(game => game.id);
      
      // Get user content logs for all games
      const { data: logs, error } = await supabase
        .from('user_content_log')
        .select('*')
        .eq('user_id', userRes.user.id)
        .in('content_id', gameIds);

      if (error) return;

      // Group logs by content_id and get the latest for each
      const latestLogs: Record<number, any> = {};
      logs?.forEach(log => {
        if (!latestLogs[log.content_id] || new Date(log.date) > new Date(latestLogs[log.content_id].date)) {
          latestLogs[log.content_id] = log;
        }
      });

      // Update game states
      const newStates: Record<number, { isWatched: boolean; isFavorite: boolean; isInList: boolean }> = {};
      gameIds.forEach(gameId => {
        const log = latestLogs[gameId];
        if (log) {
          newStates[gameId] = {
            isWatched: log.content_status_id === 1,
            isFavorite: log.is_favorite || false,
            isInList: log.is_consume_later || false
          };
        } else {
          newStates[gameId] = {
            isWatched: false,
            isFavorite: false,
            isInList: false
          };
        }
      });

      setGameStates(newStates);
    } catch (error) {
      console.error('Error loading user states for games:', error);
    }
  };

  useEffect(() => {
    if (games.length > 0) {
      loadUserStatesForGames(games);
    }
  }, [games]);

  const handleWatchGame = async (gameId: number) => {
    console.log('🎮 handleWatchGame called for gameId:', gameId);
    console.log('🎮 Current gameStates:', gameStates);
    try {
      const { data: user } = await supabase.auth.getUser();
      console.log('🎮 Auth user:', user?.user?.id);
      if (!user.user) {
        console.error('🎮 No authenticated user');
        return;
      }

      console.log('🎮 User authenticated, updating database...');
      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: gameId.toString(),
          content_status_id: 1,
          date: new Date().toISOString()
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('🎮 Database error:', error);
        throw error;
      }

      console.log('🎮 Game watch logged successfully, updating state...');
      setGameStates((prev) => {
        console.log('🎮 Previous state:', prev);
        const newState = { ...prev, [gameId]: { ...prev[gameId], isWatched: true } };
        console.log('🎮 New state:', newState);
        return newState;
      });
      console.log('🎮 State update completed');
    } catch (err) {
      console.error('🎮 Error in handleWatchGame:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const handleToggleFavorite = async (gameId: number) => {
    console.log('🎮 handleToggleFavorite called for gameId:', gameId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('🎮 No authenticated user');
        return;
      }

      const currentState = gameStates[gameId];
      const newFavoriteState = !currentState?.isFavorite;
      console.log('🎮 Setting favorite state to:', newFavoriteState);

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: gameId.toString(),
          is_favorite: newFavoriteState
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('🎮 Database error:', error);
        throw error;
      }

      console.log('🎮 Game favorite updated successfully');
      setGameStates((prev) => ({ ...prev, [gameId]: { ...prev[gameId], isFavorite: newFavoriteState } }));
    } catch (err) {
      console.error('🎮 Error in handleToggleFavorite:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const handleToggleWatchlist = async (gameId: number) => {
    console.log('🎮 handleToggleWatchlist called for gameId:', gameId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('🎮 No authenticated user');
        return;
      }

      const currentState = gameStates[gameId];
      const newWatchlistState = !currentState?.isInList;
      console.log('🎮 Setting watchlist state to:', newWatchlistState);

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: gameId.toString(),
          is_consume_later: newWatchlistState
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) {
        console.error('🎮 Database error:', error);
        throw error;
      }

      console.log('🎮 Game watchlist updated successfully');
      setGameStates((prev) => ({ ...prev, [gameId]: { ...prev[gameId], isInList: newWatchlistState } }));
    } catch (err) {
      console.error('🎮 Error in handleToggleWatchlist:', err);
      // Don't revert state on error since we want optimistic updates
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get('search') || '').trim();
  router.push((`/explore/games${next ? `?search=${encodeURIComponent(next)}` : ''}`) as Route);
  };

  const makeQS = (entries: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      search: searchQuery,
    };
    const all = { ...base, ...entries };
    Object.entries(all).forEach(([k, v]) => { if (v) q.set(k, v); });
    return `?${q.toString()}`;
  };

  // For games, we'll assume a reasonable total pages since IGDB doesn't provide total count easily
  // We can show pagination if we have results and allow navigation
  const hasResults = games.length > 0;
  const canGoNext = games.length === 48 && !loading; // If we got full limit, there might be more pages
  const canGoPrev = page > 1;

  // Try to detect if we're on the last page
  const mightBeLastPage = games.length > 0 && games.length < 48;

  return (
    <ExploreLayout title="Oyunları Keşfet" subtitle="IGDB üzerinden popüler ve aradığınız oyunları bulun">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          name="search"
          defaultValue={searchQuery}
          placeholder="Oyun ara..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
        />
        <button className="rounded-lg bg-gray-700 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors">
          Ara
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 space-y-2">
          <div className="font-medium">{error}</div>
          {(error.includes('IGDB_TWITCH_CLIENT_ID') || error.includes('IGDB_TWITCH_CLIENT_SECRET')) && (
            <div className="text-xs opacity-80">
              Lütfen `web/.env.local` dosyasına IGDB/Twitch kimlik bilgilerinizi ekleyin ve sunucuyu yeniden başlatın:
              <pre className="mt-2 rounded bg-black/10 p-2">IGDB_TWITCH_CLIENT_ID=...{"\n"}IGDB_TWITCH_CLIENT_SECRET=...</pre>
            </div>
          )}
          {error.includes('Failed to fetch IGDB token: 403') && (
            <div className="text-xs opacity-80">
              403 invalid client secret: Twitch uygulamanızın kimlik bilgileri hatalı. `IGDB_TWITCH_CLIENT_ID` ve `IGDB_TWITCH_CLIENT_SECRET` değerlerini kontrol edin.
            </div>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 24 }).map((_, i) => ( // increased skeleton count
              <div key={i} className="aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))
          : games.map((g) => <GameCard 
              key={g.id} 
              game={g as any} 
              size="large"
              showActions
              isWatched={!!gameStates[g.id]?.isWatched}
              isFavorite={!!gameStates[g.id]?.isFavorite}
              isInList={!!gameStates[g.id]?.isInList}
              onWatch={handleWatchGame}
              onToggleFavorite={handleToggleFavorite}
              onToggleWatchlist={handleToggleWatchlist}
            />)}
      </div>

      {hasResults && (
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => router.push(('/explore/games' + makeQS({ page: String(Math.max(1, page - 1)) })) as any)} 
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" 
            disabled={loading || !canGoPrev}
          >
            ← Önceki
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sayfa {page}</span>
            {mightBeLastPage && (
              <span className="text-xs text-gray-500 dark:text-gray-400">(son sayfa olabilir)</span>
            )}
          </div>
          
          <button 
            onClick={() => router.push(('/explore/games' + makeQS({ page: String(page + 1) })) as any)} 
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50" 
            disabled={loading || !canGoNext}
          >
            Sonraki →
          </button>
        </div>
      )}
    </ExploreLayout>
  );
}

export default function GamesExplorePage() {
  return (
    <Suspense fallback={<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}> 
      <GamesExploreInner />
    </Suspense>
  );
}
