"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getTvDetails, tmdbImage } from '@/services/api/tmdb';
import type { TMDBTvDetail, TMDBCastMember } from '@/types/tmdb';

export default function TvShowPage() {
  const params = useParams();
  const id = params.id as string;
  const [tv, setTv] = useState<TMDBTvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getTvDetails(id);
        setTv(data);
      } catch (e: any) {
        setError(e?.message || 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-6">Yükleniyor…</div>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-red-500">{error}</div>
    );
  }
  if (!tv) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-8">
      <header className="relative rounded-2xl overflow-hidden">
        {tv.backdrop_path && (
          <div className="relative h-80">
            <Image src={tmdbImage(tv.backdrop_path, 'original')} alt={tv.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex gap-6 items-end">
            <div className="relative w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
              {tv.poster_path && (
                <Image src={tmdbImage(tv.poster_path, 'w342')} alt={tv.name} fill className="object-cover" />
              )}
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-bold">{tv.name}</h1>
              <p className="opacity-80 mt-2 text-sm max-w-3xl">{tv.overview}</p>
              <div className="mt-3 text-sm opacity-75">
                <span>Sezon: {tv.number_of_seasons ?? '-'} • Bölüm: {tv.number_of_episodes ?? '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Cast */}
      {tv.credits?.cast?.length ? (
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-2xl font-bold mb-6">Oyuncular</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {tv.credits.cast.slice(0, 10).map((m: TMDBCastMember) => (
              <Link key={m.id} href={`/person/${m.id}`} className="text-center">
                <div className="relative aspect-[2/3] mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {m.profile_path && (
                    <Image src={tmdbImage(m.profile_path, 'w185')} alt={m.name} fill className="object-cover" />
                  )}
                </div>
                <h3 className="font-medium text-sm text-gray-900 dark:text-white">{m.name}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">{m.character}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
