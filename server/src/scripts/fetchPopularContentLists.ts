import "dotenv/config";
import path from "path";
import {
  PopularContentListItem,
  PopularContentMediaType,
  PopularContentSource,
  dedupePopularListItems,
  getDefaultPopularListDir,
  popularListFileName,
  writePopularList,
} from "../lib/popularContentList";

const DEFAULT_LIMIT = 2000;
const DEFAULT_SOURCES: PopularContentSource[] = ["letterboxd", "tmdb", "imdb"];
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const IGDB_BASE_URL = "https://api.igdb.com/v4";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";

type TmdbMediaType = Extract<PopularContentMediaType, "movie" | "tv">;

interface TmdbPopularResponse {
  page: number;
  total_pages?: number;
  results?: Array<{
    id: number;
    title?: string;
    name?: string;
    release_date?: string;
    first_air_date?: string;
    popularity?: number;
  }>;
}

interface IgdbPopularityPrimitive {
  game_id: number;
  value: number;
}

interface IgdbGameSummary {
  id: number;
  name: string;
  slug?: string;
  first_release_date?: number;
}

function getArg(name: string): string | null {
  const prefix = `${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

function getNumberArg(name: string, fallback: number): number {
  const value = getArg(name);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseSources(value: string | null): PopularContentSource[] {
  if (!value) return DEFAULT_SOURCES;

  const allowed = new Set<PopularContentSource>([
    "letterboxd",
    "tmdb",
    "imdb",
    "igdb",
  ]);

  return value
    .split(",")
    .map((source) => source.trim().toLowerCase())
    .filter((source): source is PopularContentSource =>
      allowed.has(source as PopularContentSource),
    );
}

function parseTmdbMediaTypes(value: string | null): TmdbMediaType[] {
  if (!value) return ["movie", "tv"];

  const allowed = new Set<TmdbMediaType>(["movie", "tv"]);
  const mediaTypes = value
    .split(",")
    .map((mediaType) => mediaType.trim().toLowerCase())
    .filter((mediaType): mediaType is TmdbMediaType =>
      allowed.has(mediaType as TmdbMediaType),
    );

  return mediaTypes.length > 0 ? mediaTypes : ["movie", "tv"];
}

function resolveOutputDir(value: string | null): string {
  if (!value) return getDefaultPopularListDir();
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractYear(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCharCode(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCharCode(parseInt(entity.slice(1), 10));
    }
    return named[entity] || `&${entity};`;
  });
}

function getHtmlAttr(tag: string, attr: string): string | null {
  const regex = new RegExp(`${attr}=["']([^"']*)["']`, "i");
  const match = tag.match(regex);
  return match ? decodeHtmlEntities(match[1]).trim() : null;
}

async function fetchText(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${text.slice(0, 160)}`);
  }

  return text;
}

function assertNotBlocked(source: string, html: string) {
  const blockedPatterns = [
    "Just a moment",
    "verify that you're not a robot",
    "Enable JavaScript and cookies",
    "__cf_chl_",
    "cf-challenge",
  ];

  if (blockedPatterns.some((pattern) => html.includes(pattern))) {
    throw new Error(
      `${source} blocked the request. Run with a valid browser cookie via ${source.toUpperCase()}_COOKIE, or fetch that source manually.`,
    );
  }
}

function tmdbCredential() {
  const value =
    process.env.TMDB_BEARER_TOKEN ||
    process.env.TMDB_ACCESS_TOKEN ||
    process.env.TMDB_API_KEY ||
    "";

  if (!value) {
    throw new Error("TMDB_BEARER_TOKEN or TMDB_API_KEY is required.");
  }

  const looksLikeJwt = value.split(".").length === 3 || value.startsWith("eyJ");
  return looksLikeJwt
    ? { bearerToken: value, apiKey: null as string | null }
    : { bearerToken: null as string | null, apiKey: value };
}

async function tmdbFetch<T>(endpoint: string, params: Record<string, string>) {
  const credential = tmdbCredential();
  const query = new URLSearchParams(params);
  if (credential.apiKey) {
    query.set("api_key", credential.apiKey);
  }

  const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${query}`, {
    headers: credential.bearerToken
      ? {
          Authorization: `Bearer ${credential.bearerToken}`,
          "Content-Type": "application/json",
        }
      : { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TMDB API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

async function fetchTmdbPopularForMedia(
  mediaType: TmdbMediaType,
  candidateLimit: number,
): Promise<PopularContentListItem[]> {
  const endpoint = mediaType === "movie" ? "/movie/popular" : "/tv/popular";
  const pages = Math.ceil(candidateLimit / 20);
  const items: PopularContentListItem[] = [];

  for (let page = 1; page <= pages && items.length < candidateLimit; page++) {
    console.log(`[tmdb] ${mediaType} page ${page}/${pages}`);
    const data = await tmdbFetch<TmdbPopularResponse>(endpoint, {
      language: "en-US",
      page: String(page),
    });

    for (const item of data.results || []) {
      const title = mediaType === "movie" ? item.title : item.name;
      if (!title) continue;

      items.push({
        rank: items.length + 1,
        source: "tmdb",
        mediaType,
        title,
        year: extractYear(
          mediaType === "movie" ? item.release_date : item.first_air_date,
        ),
        sourceId: String(item.id),
        sourceUrl: `https://www.themoviedb.org/${mediaType}/${item.id}`,
        score: item.popularity ?? null,
      });
    }

    if (data.total_pages && page >= data.total_pages) break;
    await delay(100);
  }

  return items;
}

async function fetchTmdbPopular(
  limit: number,
  mediaTypes: TmdbMediaType[],
): Promise<PopularContentListItem[]> {
  const candidates: PopularContentListItem[] = [];

  for (const mediaType of mediaTypes) {
    candidates.push(...(await fetchTmdbPopularForMedia(mediaType, limit)));
  }

  return dedupePopularListItems(candidates)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function parseLetterboxdItems(html: string): PopularContentListItem[] {
  const items: PopularContentListItem[] = [];
  const tagRegex = /<div[^>]+class=["'][^"']*film-poster[^"']*["'][^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[0];
    const title = getHtmlAttr(tag, "data-film-name") || getHtmlAttr(tag, "data-item-name");
    const slug =
      getHtmlAttr(tag, "data-film-slug") ||
      getHtmlAttr(tag, "data-target-link") ||
      getHtmlAttr(tag, "data-film-link");

    if (!title || !slug) continue;

    const normalizedSlug = slug.startsWith("/") ? slug : `/film/${slug}/`;
    const sourceId = normalizedSlug
      .replace(/^\/film\//, "")
      .replace(/\/$/, "");

    items.push({
      rank: items.length + 1,
      source: "letterboxd",
      mediaType: "movie",
      title,
      year: Number(getHtmlAttr(tag, "data-film-release-year")) || null,
      sourceId,
      sourceUrl: `https://letterboxd.com${normalizedSlug}`,
      score: null,
    });
  }

  return items;
}

async function fetchLetterboxdPopular(limit: number): Promise<PopularContentListItem[]> {
  const items: PopularContentListItem[] = [];
  const headers: Record<string, string> = {
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      process.env.LETTERBOXD_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };

  if (process.env.LETTERBOXD_COOKIE) {
    headers.Cookie = process.env.LETTERBOXD_COOKIE;
  }

  for (let page = 1; items.length < limit; page++) {
    console.log(`[letterboxd] page ${page}`);
    const html = await fetchText(
      `https://letterboxd.com/films/popular/page/${page}/`,
      headers,
    );
    assertNotBlocked("letterboxd", html);

    const pageItems = parseLetterboxdItems(html);
    if (pageItems.length === 0) break;

    items.push(...pageItems);
    await delay(500);
  }

  return dedupePopularListItems(items.slice(0, limit));
}

function mapImdbMediaType(rawType: string | null): PopularContentMediaType {
  const value = (rawType || "").toLowerCase();
  return value.includes("series") || value.includes("tv") ? "tv" : "movie";
}

function collectImdbItemsFromJson(value: unknown, items: PopularContentListItem[]) {
  if (!value || typeof value !== "object") return;

  const node = value as Record<string, any>;
  const rawId = node.id || node.titleId || node.tconst;
  const rawTitle =
    node.titleText?.text ||
    node.originalTitleText?.text ||
    node.titleText ||
    node.title ||
    node.name;

  if (typeof rawId === "string" && /^tt\d+$/.test(rawId) && typeof rawTitle === "string") {
    const rawType =
      node.titleType?.id ||
      node.titleType?.text ||
      node.titleType ||
      node.titleTypeDisplayableProperty?.value?.plainText ||
      null;

    items.push({
      rank: items.length + 1,
      source: "imdb",
      mediaType: mapImdbMediaType(String(rawType || "")),
      title: rawTitle,
      year:
        Number(node.releaseYear?.year || node.releaseDate?.year || node.year) ||
        null,
      sourceId: rawId,
      sourceUrl: `https://www.imdb.com/title/${rawId}/`,
      score: null,
    });
  }

  for (const child of Object.values(node)) {
    if (child && typeof child === "object") {
      if (Array.isArray(child)) {
        for (const item of child) collectImdbItemsFromJson(item, items);
      } else {
        collectImdbItemsFromJson(child, items);
      }
    }
  }
}

function parseImdbItems(html: string): PopularContentListItem[] {
  const items: PopularContentListItem[] = [];
  const nextDataMatch = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );

  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1]);
      collectImdbItemsFromJson(data, items);
    } catch {
      // Fall through to HTML parsing.
    }
  }

  if (items.length > 0) {
    return dedupePopularListItems(items);
  }

  const blocks = html.split(/ipc-metadata-list-summary-item/gi);
  for (const block of blocks) {
    const id = block.match(/\/title\/(tt\d+)\//)?.[1];
    if (!id) continue;

    const heading =
      block.match(/<h3[^>]*>(?:\s*\d+\.\s*)?([^<]+)<\/h3>/i)?.[1] ||
      block.match(/aria-label=["']View title page for ([^"']+)["']/i)?.[1] ||
      "";
    const title = decodeHtmlEntities(heading).replace(/^\d+\.\s*/, "").trim();
    if (!title) continue;

    const year = Number(block.match(/>(\d{4})<\/span>/)?.[1]) || null;
    const rawType = block.match(/titleType[^>]+>([^<]+)/i)?.[1] || null;

    items.push({
      rank: items.length + 1,
      source: "imdb",
      mediaType: mapImdbMediaType(rawType),
      title,
      year,
      sourceId: id,
      sourceUrl: `https://www.imdb.com/title/${id}/`,
      score: null,
    });
  }

  return dedupePopularListItems(items);
}

async function fetchImdbPopular(limit: number): Promise<PopularContentListItem[]> {
  const items: PopularContentListItem[] = [];
  const pageSize = 250;
  const headers: Record<string, string> = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent":
      process.env.IMDB_USER_AGENT ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  };

  if (process.env.IMDB_COOKIE) {
    headers.Cookie = process.env.IMDB_COOKIE;
  }

  for (let start = 1; items.length < limit; start += pageSize) {
    console.log(`[imdb] start ${start}`);
    const url =
      "https://www.imdb.com/search/title/?" +
      new URLSearchParams({
        title_type: "feature,tv_movie,tv_series,tv_miniseries",
        sort: "moviemeter,asc",
        count: String(pageSize),
        start: String(start),
      });

    const html = await fetchText(url, headers);
    assertNotBlocked("imdb", html);

    const pageItems = parseImdbItems(html);
    if (pageItems.length === 0) break;

    items.push(...pageItems);
    await delay(600);
  }

  return dedupePopularListItems(items.slice(0, limit));
}

async function getIgdbAccessToken(): Promise<string> {
  const clientId = process.env.IGDB_CLIENT_ID || "";
  const clientSecret = process.env.IGDB_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error("IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, {
    method: "POST",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twitch OAuth failed ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function igdbRequest<T>(
  endpoint: string,
  body: string,
  token: string,
): Promise<T> {
  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": process.env.IGDB_CLIENT_ID || "",
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`IGDB API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

async function fetchIgdbGameSummaries(
  gameIds: number[],
  token: string,
): Promise<Map<number, IgdbGameSummary>> {
  const summaries = new Map<number, IgdbGameSummary>();
  if (gameIds.length === 0) return summaries;

  for (let i = 0; i < gameIds.length; i += 500) {
    const chunk = gameIds.slice(i, i + 500);
    const games = await igdbRequest<IgdbGameSummary[]>(
      "games",
      `
        fields name, slug, first_release_date;
        where id = (${chunk.join(",")});
        limit 500;
      `,
      token,
    );

    for (const game of games) {
      summaries.set(game.id, game);
    }

    await delay(300);
  }

  return summaries;
}

async function fetchIgdbPopular(limit: number): Promise<PopularContentListItem[]> {
  const token = await getIgdbAccessToken();
  const primitives: IgdbPopularityPrimitive[] = [];

  for (let offset = 0; primitives.length < limit; offset += 500) {
    const batchLimit = Math.min(500, limit - primitives.length);
    console.log(`[igdb] popularity offset ${offset}`);
    const batch = await igdbRequest<IgdbPopularityPrimitive[]>(
      "popularity_primitives",
      `
        fields game_id, value;
        where popularity_type = 1;
        sort value desc;
        limit ${batchLimit};
        offset ${offset};
      `,
      token,
    );

    if (!batch.length) break;
    primitives.push(...batch);
    await delay(300);
  }

  const gameIds = primitives.map((item) => item.game_id);
  const games = await fetchIgdbGameSummaries(gameIds, token);

  return primitives
    .map((primitive, index) => {
      const game = games.get(primitive.game_id);
      if (!game?.name) return null;

      return {
        rank: index + 1,
        source: "igdb" as const,
        mediaType: "game" as const,
        title: game.name,
        year: game.first_release_date
          ? new Date(game.first_release_date * 1000).getFullYear()
          : null,
        sourceId: String(primitive.game_id),
        sourceUrl: game.slug
          ? `https://www.igdb.com/games/${game.slug}`
          : `https://www.igdb.com/games/${primitive.game_id}`,
        score: primitive.value,
      };
    })
    .filter(Boolean) as PopularContentListItem[];
}

async function fetchSource(
  source: PopularContentSource,
  limit: number,
  tmdbMediaTypes: TmdbMediaType[],
): Promise<PopularContentListItem[]> {
  switch (source) {
    case "letterboxd":
      return fetchLetterboxdPopular(limit);
    case "tmdb":
      return fetchTmdbPopular(limit, tmdbMediaTypes);
    case "imdb":
      return fetchImdbPopular(limit);
    case "igdb":
      return fetchIgdbPopular(limit);
    default:
      return [];
  }
}

async function main() {
  const limit = getNumberArg("--limit", DEFAULT_LIMIT);
  const sources = parseSources(getArg("--sources"));
  const outputDir = resolveOutputDir(getArg("--output-dir"));
  const tmdbMediaTypes = parseTmdbMediaTypes(getArg("--tmdb-media"));
  const failedSources: Array<{ source: PopularContentSource; error: string }> = [];

  if (sources.length === 0) {
    throw new Error("No valid sources selected.");
  }

  console.log(`Output directory: ${outputDir}`);
  console.log(`Limit per source: ${limit}`);
  console.log(`Sources: ${sources.join(", ")}`);

  for (const source of sources) {
    console.log(`\nFetching ${source} popular list...`);
    try {
      const items = await fetchSource(source, limit, tmdbMediaTypes);
      const filePath = path.join(outputDir, popularListFileName(source));
      writePopularList(filePath, items);
      console.log(`Saved ${items.length} items to ${filePath}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      failedSources.push({ source, error: message });
      console.error(`Failed to fetch ${source}: ${message}`);
    }
  }

  if (failedSources.length > 0) {
    console.error("\nSome sources failed:");
    for (const failure of failedSources) {
      console.error(`- ${failure.source}: ${failure.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
