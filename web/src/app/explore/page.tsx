import Image from 'next/image';
import { discoverMovies, tmdbImage } from '@/services/tmdb';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = searchParams || {};
  const sort_by = (sp.sort_by as string) || 'popularity.desc';
  const with_original_language = (sp.with_original_language as string) || '';
  const with_genres = (sp.with_genres as string) || '';
  const page = (sp.page as string) || '1';

  // Optional year filters converted to TMDB date range
  const yearMin = (sp.yearMin as string) || '';
  const yearMax = (sp.yearMax as string) || '';
  const gte = yearMin ? `${yearMin}-01-01` : undefined;
  const lte = yearMax ? `${yearMax}-12-31` : undefined;

  let data: Awaited<ReturnType<typeof discoverMovies>> | null = null;
  let error: string | null = null;
  try {
    data = await discoverMovies({
      sort_by,
      with_original_language,
      with_genres,
      page,
      'primary_release_date.gte': gte,
      'primary_release_date.lte': lte,
    });
  } catch (e: any) {
    error = e?.message || 'Beklenmeyen hata';
  }

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
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Keşfet</h1>

      {/* Filters */}
      <form className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-70">Sırala</span>
          <select name="sort_by" defaultValue={sort_by} className="rounded-md border p-2">
            <option value="popularity.desc">Popülarite ↓</option>
            <option value="vote_average.desc">Puan ↓</option>
            <option value="primary_release_date.desc">Çıkış Tarihi ↓</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-70">Dil (ör. en, tr)</span>
          <input name="with_original_language" defaultValue={with_original_language} className="rounded-md border p-2" placeholder="en" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="opacity-70">Tür ID’ler (virgülle)</span>
          <input name="with_genres" defaultValue={with_genres} className="rounded-md border p-2" placeholder="28,12" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-70">Yıl ≥</span>
            <input name="yearMin" defaultValue={yearMin} className="rounded-md border p-2" placeholder="2015" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="opacity-70">Yıl ≤</span>
            <input name="yearMax" defaultValue={yearMax} className="rounded-md border p-2" placeholder="2024" />
          </label>
        </div>
        <div className="sm:col-span-2 md:col-span-4">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
            Uygula
          </button>
        </div>
      </form>

      {/* Errors */}
      {error ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {results.map((m) => {
          const title = m.title || m.name || '—';
          return (
            <article key={m.id} className="group">
              <a href={`/content/movie/${m.id}`} className="block">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg border bg-slate-100 dark:bg-slate-900">
                  {m.poster_path ? (
                    <Image
                      src={tmdbImage(m.poster_path, 'w342')}
                      alt={title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="h-full w-full" />
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  <h3 className="line-clamp-2 text-sm font-medium">{title}</h3>
                  <div className="flex items-center gap-2 text-xs opacity-70">
                    <span>⭐ {m.vote_average?.toFixed?.(1) ?? '—'}</span>
                    <span>·</span>
                    <span>🔥 {Math.round(m.popularity)}</span>
                    {m.original_language ? (
                      <>
                        <span>·</span>
                        <span className="uppercase">{m.original_language}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </a>
            </article>
          );
        })}
      </div>

      {/* Pagination */}
    <div className="flex items-center justify-center gap-3">
        <a
          className="rounded-md border px-3 py-1 text-sm opacity-80 hover:opacity-100"
      href={makeQS({ page: String(Math.max(1, (data?.page || 1) - 1)) })}
        >
          ← Önceki
        </a>
        <span className="text-sm opacity-70">
      Sayfa {data?.page ?? 1} / {data?.total_pages ?? 1}
        </span>
        <a
          className="rounded-md border px-3 py-1 text-sm opacity-80 hover:opacity-100"
      href={makeQS({ page: String(Math.min(data?.total_pages || 1, (data?.page || 1) + 1)) })}
        >
          Sonraki →
        </a>
      </div>
    </section>
  );
}

