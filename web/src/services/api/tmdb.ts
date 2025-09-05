import { TMDBDiscoverMovie, TMDBPaginated, TMDBMovieDetail } from '@/types/tmdb';

const TMDB_BASE = 'https://api.themoviedb.org/3';

function isV4Token(val: string) {
  // TMDB v4 tokens are long JWT-like strings starting with eyJ
  return val.trim().startsWith('eyJ');
}

function getAuth() {
  // Try both server-side and client-side environment variables
  const key = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY ayarlanmadı. Lütfen `web/.env.local` dosyasına TMDB anahtarınızı ekleyin ve sunucuyu yeniden başlatın.\n\nV3 API Key veya V4 Bearer token kullanabilirsiniz.');
  return key;
}

export type DiscoverParams = Partial<{
  sort_by: string;
  with_genres: string; // comma-separated ids
  with_original_language: string; // e.g. 'en','tr'
  'primary_release_date.gte': string; // YYYY-MM-DD
  'primary_release_date.lte': string; // YYYY-MM-DD
  page: string | number;
}>;

export async function discoverMovies(params: DiscoverParams, opts?: { revalidate?: number }) {
  const key = getAuth();
  const isV4 = isV4Token(key);

  const url = new URL(`${TMDB_BASE}/discover/movie`);
  if (!isV4) {
    url.searchParams.set('api_key', key);
  }
  // sane defaults
  const defaults: DiscoverParams = { sort_by: 'popularity.desc', page: '1' };
  const finalParams = { ...defaults, ...params };
  Object.entries(finalParams).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    next: { revalidate: opts?.revalidate ?? 60 },
  });

  if (res.status === 429) {
    // simple backoff once
    await new Promise((r) => setTimeout(r, 500));
    const retry = await fetch(url.toString(), {
      method: 'GET',
      headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
      next: { revalidate: opts?.revalidate ?? 60 },
    });
    if (!retry.ok) throw new Error(`TMDB rate limited: ${retry.status}`);
    return (await retry.json()) as TMDBPaginated<TMDBDiscoverMovie>;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TMDB error ${res.status}: ${text}`);
  }
  return (await res.json()) as TMDBPaginated<TMDBDiscoverMovie>;
}

export async function getMovieDetails(id: string | number, opts?: { revalidate?: number }) {
  const key = getAuth();
  const isV4 = isV4Token(key);

  const url = new URL(`${TMDB_BASE}/movie/${id}`);
  url.searchParams.set('append_to_response', 'credits,videos,similar');
  if (!isV4) {
    url.searchParams.set('api_key', key);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    next: { revalidate: opts?.revalidate ?? 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TMDB error ${res.status}: ${text}`);
  }
  return (await res.json()) as TMDBMovieDetail;
}

export function tmdbImage(path: string, size: 'w185' | 'w342' | 'w500' | 'original' = 'w342') {
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function searchMovies(query: string, page: number = 1, opts?: { revalidate?: number }) {
  const key = getAuth();
  const isV4 = isV4Token(key);

  const url = new URL(`${TMDB_BASE}/search/movie`);
  if (!isV4) {
    url.searchParams.set('api_key', key);
  }
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    next: { revalidate: opts?.revalidate ?? 60 },
  });

  if (res.status === 429) {
    // simple backoff once
    await new Promise((r) => setTimeout(r, 500));
    const retry = await fetch(url.toString(), {
      method: 'GET',
      headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
      next: { revalidate: opts?.revalidate ?? 60 },
    });
    if (!retry.ok) throw new Error(`TMDB rate limited: ${retry.status}`);
    return (await retry.json()) as TMDBPaginated<TMDBDiscoverMovie>;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TMDB error ${res.status}: ${text}`);
  }
  return (await res.json()) as TMDBPaginated<TMDBDiscoverMovie>;
}


export async function getPersonDetails(id: string | number, opts?: { revalidate?: number }) {
  const key = getAuth();
  const isV4 = isV4Token(key);

  const url = new URL(`${TMDB_BASE}/person/${id}`);
  url.searchParams.set('append_to_response', 'movie_credits');
  if (!isV4) {
    url.searchParams.set('api_key', key);
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: isV4 ? { Authorization: `Bearer ${key}` } : undefined,
    next: { revalidate: opts?.revalidate ?? 300 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TMDB error: ${res.status} - ${text}`);
  }
  return (await res.json()) as any;
}
