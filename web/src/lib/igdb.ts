// Server-only IGDB/Twitch helper: obtains and caches an app access token and performs IGDB requests
import 'server-only';

type TokenCache = {
  accessToken: string;
  expiresAt: number; // epoch ms
};

declare global {
  // eslint-disable-next-line no-var
  var __IGDB_TOKEN_CACHE__: TokenCache | undefined;
}

const TWITCH_OAUTH_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_BASE_URL = 'https://api.igdb.com/v4';

function getEnvAny(names: string[]): string {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`${names[0]} is not set. Add it to web/.env.local and restart the dev server.`);
}

async function fetchNewToken(): Promise<TokenCache> {
  const clientId = getEnvAny(['IGDB_TWITCH_CLIENT_ID', 'IGDB_CLIENT_ID']);
  const clientSecret = getEnvAny(['IGDB_TWITCH_CLIENT_SECRET', 'IGDB_CLIENT_SECRET']);

  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'client_credentials');

  const res = await fetch(TWITCH_OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  });
  if (!res.ok) {
    let msg = '';
    try {
      const j = await res.json();
      msg = JSON.stringify(j);
    } catch {
      msg = await res.text().catch(() => '');
    }
    throw new Error(`Failed to fetch IGDB token: ${res.status} ${msg}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const now = Date.now();
  // Apply a small safety margin (10%) so we refresh slightly before expiry
  const expiresAt = now + Math.max(30_000, Math.floor(json.expires_in * 1000 * 0.9));
  return { accessToken: json.access_token, expiresAt };
}

export async function getIgdbToken(): Promise<string> {
  const cache = global.__IGDB_TOKEN_CACHE__;
  if (cache && cache.expiresAt > Date.now() + 5_000) {
    return cache.accessToken;
  }
  const next = await fetchNewToken();
  global.__IGDB_TOKEN_CACHE__ = next;
  return next.accessToken;
}

export type IgdbQueryOptions = {
  /** Override revalidate seconds for ISR caching in Next.js */
  revalidate?: number;
};

export async function igdbRequest<T = unknown>(path: string, body: string, opts?: IgdbQueryOptions): Promise<T> {
  const clientId = getEnvAny(['IGDB_TWITCH_CLIENT_ID', 'IGDB_CLIENT_ID']);
  const token = await getIgdbToken();

  const url = `${IGDB_BASE_URL}/${path.replace(/^\/+/, '')}`;

  const doFetch = async () =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
        Accept: 'application/json',
      },
      body,
      // Cache on the server if desired; routes can also override
      next: opts?.revalidate ? { revalidate: opts.revalidate } : undefined,
    });

  let res = await doFetch();
  if (res.status === 401) {
    // Token likely expired; refresh once
    global.__IGDB_TOKEN_CACHE__ = undefined;
    const _ = await getIgdbToken();
    res = await doFetch();
  }
  if (res.status === 429) {
    // Basic backoff and retry once
    await new Promise((r) => setTimeout(r, 500));
    res = await doFetch();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`IGDB error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export type IgdbGame = {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  first_release_date?: number;
  rating?: number;
  total_rating?: number;
  genres?: { id: number; name: string }[];
  platforms?: { id: number; name: string }[];
  cover?: { id: number; image_id: string; url?: string };
};

export function igdbImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'screenshot_med' | '720p' | '1080p' = 'cover_big') {
  // https://api-docs.igdb.com/#images
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export async function searchGames(q: string, limit = 20) {
  const sanitized = q.trim().slice(0, 120).replace(/[\n\r\t\";]/g, ' ').trim();
  const body = [
    `search "${sanitized}";`,
    'fields id,name,slug,summary,first_release_date,rating,total_rating,genres.name,platforms.name,cover.image_id;',
    'where version_parent = null & category = (0,8);', // main games and remasters
    `limit ${Math.max(1, Math.min(limit, 50))};`,
  ].join('\n');

  return igdbRequest<IgdbGame[]>('games', body, { revalidate: 60 });
}

export async function getGameById(id: number) {
  const body = [
    'fields id,name,slug,summary,first_release_date,rating,total_rating,genres.name,platforms.name,cover.image_id;'
    , `where id = ${id};`,
    'limit 1;',
  ].join('\n');
  const res = await igdbRequest<IgdbGame[]>('games', body, { revalidate: 300 });
  return res[0] ?? null;
}
