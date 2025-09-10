import { IgdbGame } from '@/types/igdb';
import { logApiRequest } from '@/lib/requestLogger';

export function igdbImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'screenshot_med' | '720p' | '1080p' = 'cover_big') {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export async function igdbSearch(q: string, limit = 20) {
  const url = new URL('/api/igdb/search', typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    logApiRequest('/api/igdb/search', 'GET', false);
    let msg = `IGDB search failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += ` - ${j.error}`;
    } catch (_) {
      try {
        const t = await res.text();
        if (t) msg += ` - ${t}`;
      } catch {}
    }
    throw new Error(msg);
  }
  logApiRequest('/api/igdb/search', 'GET', true);
  const json = (await res.json()) as { data: IgdbGame[] };
  return json.data;
}

export async function igdbGetGame(id: number) {
  const url = new URL(`/api/igdb/games/${id}`, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    logApiRequest(`/api/igdb/games/${id}`, 'GET', false);
    let msg = `IGDB game failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += ` - ${j.error}`;
    } catch (_) {
      try {
        const t = await res.text();
        if (t) msg += ` - ${t}`;
      } catch {}
    }
    throw new Error(msg);
  }
  logApiRequest(`/api/igdb/games/${id}`, 'GET', true);
  const json = (await res.json()) as { data: IgdbGame };
  return json.data;
}

export async function igdbTrending() {
  const url = new URL('/api/igdb/trending', typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    logApiRequest('/api/igdb/trending', 'GET', false);
    let msg = `IGDB trending failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += ` - ${j.error}`;
    } catch (_) {
      try {
        const t = await res.text();
        if (t) msg += ` - ${t}`;
      } catch {}
    }
    throw new Error(msg);
  }
  logApiRequest('/api/igdb/trending', 'GET', true);
  const json = (await res.json()) as { data: IgdbGame[] };
  return json.data;
}

export async function igdbUpcoming() {
  const url = new URL('/api/igdb/upcoming', typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  const res = await fetch(url.toString(), { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    logApiRequest('/api/igdb/upcoming', 'GET', false);
    let msg = `IGDB upcoming failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg += ` - ${j.error}`;
    } catch (_) {
      try {
        const t = await res.text();
        if (t) msg += ` - ${t}`;
      } catch {}
    }
    throw new Error(msg);
  }
  logApiRequest('/api/igdb/upcoming', 'GET', true);
  const json = (await res.json()) as { data: IgdbGame[] };
  return json.data;
}
