"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { igdbSearch } from '@/services/api/igdb';
import ExploreLayout from '@/components/layouts/ExploreLayout'
import GameCard from '@/components/GameCard';

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

  const searchQuery = useMemo(() => (searchParams.get('search') || '').trim(), [searchParams]);
  const query = searchQuery || 'zelda';

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await igdbSearch(query, 24);
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
  }, [query]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get('search') || '').trim();
  router.push((`/explore/games${next ? `?search=${encodeURIComponent(next)}` : ''}`) as Route);
  };

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
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))
          : games.map((g) => <GameCard key={g.id} game={g as any} size="large" />)}
      </div>
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
