'use client';

import Image from 'next/image';
import { discoverMovies, tmdbImage } from '@/services/tmdb';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sp = Object.fromEntries(searchParams.entries());
  const sort_by = sp.sort_by || 'popularity.desc';
  const with_original_language = sp.with_original_language || '';
  const with_genres = sp.with_genres || '';
  const page = sp.page || '1';
  const yearMin = sp.yearMin || '';
  const yearMax = sp.yearMax || '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const gte = yearMin ? `${yearMin}-01-01` : undefined;
        const lte = yearMax ? `${yearMax}-12-31` : undefined;

        const result = await discoverMovies({
          sort_by,
          with_original_language,
          with_genres,
          page,
          'primary_release_date.gte': gte,
          'primary_release_date.lte': lte,
        });
        
        setData(result);
      } catch (e: any) {
        setError(e?.message || 'Beklenmeyen hata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sort_by, with_original_language, with_genres, page, yearMin, yearMax]);

  const results = data?.results || [];

  const makeQS = (entries: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      sort_by,
      with_original_language,
      with_genres,
      yearMin,
      yearMax,
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Keşfet</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Popüler filmler ve yeni çıkanları keşfet
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sırala
            </label>
            <select 
              name="sort_by" 
              defaultValue={sort_by} 
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
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
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
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
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                placeholder="2024" 
              />
            </div>
          </div>
          
          <div className="lg:col-span-4">
            <button className="rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-colors">
              Filtreleri Uygula
            </button>
          </div>
        </form>
      </div>

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
            <article key={m.id} className="group">
              <a href={`/movie?id=${m.id}`} className="block">
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
                  
                  {/* Overlay with rating */}
                  <div className="absolute top-2 right-2">
                    <div className="rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      ⭐ {m.vote_average?.toFixed?.(1) ?? '—'}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 space-y-1">
                  <h3 className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
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
