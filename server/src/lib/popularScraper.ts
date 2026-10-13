import { PopularContentListItem } from "./popularContentList";
import { tmdbFetch } from "./tmdb/helpers";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export async function fetchLetterboxdWeeklyPopular(limit: number): Promise<PopularContentListItem[]> {
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
    const html = await fetchText(
      `https://letterboxd.com/films/popular/this/week/page/${page}/`,
      headers,
    );
    assertNotBlocked("letterboxd", html);

    const pageItems = parseLetterboxdItems(html);
    if (pageItems.length === 0) break;

    items.push(...pageItems);
    await delay(500);
  }

  return items.slice(0, limit);
}

function mapImdbMediaType(rawType: string | null): "movie" | "tv" {
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
      // Fall through
    }
  }

  if (items.length > 0) {
    return items;
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

  return items;
}

export async function fetchImdbWeeklyPopular(limit: number): Promise<PopularContentListItem[]> {
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
    const url =
      "https://www.imdb.com/search/title/?" +
      new URLSearchParams({
        title_type: "feature,tv_movie",
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

  return items.slice(0, limit);
}

interface TmdbTrendingMovieResult {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  popularity: number;
}

export async function fetchTmdbWeeklyPopular(limit: number): Promise<PopularContentListItem[]> {
  const pages = Math.ceil(limit / 20);
  const items: PopularContentListItem[] = [];

  for (let page = 1; page <= pages && items.length < limit; page++) {
    const data = await tmdbFetch<{ results: TmdbTrendingMovieResult[] }>(
      `/trending/movie/week?language=en-US&page=${page}`
    );

    for (const movie of data.results || []) {
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
      items.push({
        rank: items.length + 1,
        source: "tmdb",
        mediaType: "movie",
        title: movie.title,
        year,
        sourceId: String(movie.id),
        sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
        score: movie.popularity,
      });
    }
  }

  return items.slice(0, limit);
}
