import { logger } from "./logger";
import { normalizeThemeName } from "./themeNormalizer";

/**
 * IGDB API Fetcher
 * Oyun arama ve detay çekme işlemleri için IGDB (Twitch) API ile iletişim kurar.
 * Twitch Client ID ve Client Secret gerektirir.
 *
 * Auth: Twitch OAuth2 Client Credentials
 * API:  POST https://api.igdb.com/v4/{endpoint} (Apicalypse query body)
 */

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID || "";
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET || "";
const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE_URL = "https://api.igdb.com/v4";

// ─── OAuth Token Cache ───

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Twitch OAuth2 token al (cache'li)
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error(
      "IGDB_CLIENT_ID ve IGDB_CLIENT_SECRET env değişkenleri gerekli",
    );
  }

  logger.debug("[IgdbFetcher] Requesting new Twitch OAuth token");

  const params = new URLSearchParams({
    client_id: IGDB_CLIENT_ID,
    client_secret: IGDB_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const response = await fetch(`${TWITCH_TOKEN_URL}?${params}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Twitch OAuth failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;

  logger.info("[IgdbFetcher] Twitch OAuth token acquired");
  return cachedToken;
}

/**
 * IGDB API'ye POST isteği gönder (Apicalypse query body)
 */
async function igdbRequest<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": IGDB_CLIENT_ID,
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

// ─── Raw IGDB Response Types ───

interface IgdbRawGame {
  id: number;
  name: string;
  slug?: string;
  summary?: string;
  storyline?: string;
  first_release_date?: number; // Unix timestamp (seconds)
  rating?: number; // 0-100
  total_rating?: number;
  total_rating_count?: number;
  aggregated_rating?: number;
  category?: number; // 0=Main Game, 3=Bundle, etc.
  cover?: { id: number; image_id: string; width?: number; height?: number };
  screenshots?: Array<{
    id: number;
    image_id: string;
    width?: number;
    height?: number;
  }>;
  genres?: Array<{ id: number; name: string }>;
  themes?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string; abbreviation?: string }>;
  game_engines?: Array<{ id: number; name: string }>;
  involved_companies?: Array<{
    id: number;
    company: { id: number; name: string };
    developer: boolean;
    publisher: boolean;
  }>;
  age_ratings?: Array<{
    id: number;
    category: number; // 1=ESRB, 2=PEGI
    rating: number;
  }>;
  videos?: Array<{ id: number; video_id: string; name?: string }>;
  websites?: Array<{ id: number; category: number; url: string }>;
  artworks?: Array<{
    id: number;
    image_id: string;
    width?: number;
    height?: number;
  }>;
  player_perspectives?: Array<{ id: number; name: string }>;
  game_modes?: Array<{ id: number; name: string }>;
  collection?: { id: number; name: string };
  collections?: Array<{ id: number; name: string }>;
  franchises?: Array<{ id: number; name: string }>;
  expansions?: Array<{
    id: number;
    name: string;
    summary?: string;
    cover?: { id: number; image_id: string };
    first_release_date?: number;
  }>;
  remakes?: Array<{
    id: number;
    name: string;
    summary?: string;
    cover?: { id: number; image_id: string };
    first_release_date?: number;
  }>;
}

// ─── ESRB rating mapping ───

const ESRB_RATING_MAP: Record<number, string> = {
  6: "RP",
  7: "EC",
  8: "E",
  9: "E10+",
  10: "T",
  11: "M",
  12: "AO",
};

const PEGI_RATING_MAP: Record<number, string> = {
  1: "PEGI 3",
  2: "PEGI 7",
  3: "PEGI 12",
  4: "PEGI 16",
  5: "PEGI 18",
};

// ─── Normalized Result Interfaces ───

export interface IgdbSearchItem {
  sourceId: number;
  title: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  platforms?: string[];
}

export interface IgdbGameDetailData {
  sourceId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  metacritic?: number;
  genres?: Array<{ id: number; name: string }>;
  tags?: Array<{ id: number; name: string }>; // themes
  platforms?: Array<{ id: number; name: string }>;
  gameEngines?: Array<{ id: number; name: string }>;
  developers?: Array<{ id: number; name: string }>;
  publishers?: Array<{ id: number; name: string }>;
  esrbRating?: string;
  website?: string;
  trailerUrl?: string;
  screenshots?: string[];
  playerPerspectives?: Array<{ id: number; name: string }>;
  gameModes?: Array<{ id: number; name: string }>;
  franchise?: { name: string };
  expansions?: Array<{
    name: string;
    description?: string;
    posterUrl?: string;
    releaseDate?: string;
    type: "expansion" | "remake";
  }>;
}

// ─── Helpers ───

function unixToDate(unix?: number): string | undefined {
  if (!unix) return undefined;
  return new Date(unix * 1000).toISOString().split("T")[0];
}

function normalizeRating(rating?: number): number | undefined {
  if (!rating) return undefined;
  return Math.round(rating) / 10;
}

function igdbImageUrl(imageId: string, size: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

function youtubeUrl(videoId?: string): string | undefined {
  if (!videoId) return undefined;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

const GAME_MODE_NAMES = [
  "Single player",
  "Multiplayer",
  "Co-operative",
  "Split screen",
  "Massively Multiplayer Online (MMO)",
  "Battle Royale",
];

const IGDB_MAIN_GAME_CATEGORY = 0;

// ─── Public API ───

/**
 * IGDB'de oyun arar
 */
export async function searchIgdbGames(
  query: string,
  limit = 20,
  offset = 0,
): Promise<IgdbSearchItem[]> {
  logger.info(`[IgdbFetcher] Searching games: "${query}" (limit=${limit}, offset=${offset})`);

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error("IGDB credentials not configured");
  }

  try {
    const body = `
      search "${query}";
      fields name, summary, first_release_date, total_rating, cover.image_id, platforms.name;
      where category = (0, 8, 9, 11);
      limit ${Math.min(Math.max(limit, 1), 50)};
      offset ${Math.max(offset, 0)};
    `;

    const results = await igdbRequest<IgdbRawGame[]>("games", body);

    return results.map((g) => ({
      sourceId: g.id,
      title: g.name,
      overview: g.summary,
      posterPath: g.cover?.image_id
        ? igdbImageUrl(g.cover.image_id, "cover_big")
        : undefined,
      releaseDate: unixToDate(g.first_release_date),
      voteAverage: normalizeRating(g.total_rating),
      platforms: g.platforms?.map((p) => p.name),
    }));
  } catch (error) {
    logger.error("[IgdbFetcher] searchIgdbGames failed", error);
    throw error;
  }
}

/**
 * IGDB'den oyun detayı çeker
 */
export async function fetchIgdbGameDetails(
  gameId: number,
): Promise<IgdbGameDetailData> {
  logger.info(`[IgdbFetcher] Fetching game details: gameId=${gameId}`);

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error(
      "IGDB_CLIENT_ID ve IGDB_CLIENT_SECRET env değişkenleri gerekli",
    );
  }

  try {
    // Ana oyun bilgileri
    const body = `
      fields name, summary, storyline, first_release_date, rating, total_rating,
             aggregated_rating, cover.image_id,
             screenshots.image_id, artworks.image_id,
             genres.name, themes.name,
             platforms.name, platforms.abbreviation,
             game_engines.name,
             involved_companies.company.name,
             involved_companies.developer, involved_companies.publisher,
             age_ratings.category, age_ratings.rating,
             videos.video_id, videos.name,
             websites.category, websites.url,
             player_perspectives.name,
             game_modes.name,
             collection.name,
             collections.name,
             franchises.name,
             expansions.name, expansions.summary, expansions.cover.image_id, expansions.first_release_date,
             remakes.name, remakes.summary, remakes.cover.image_id, remakes.first_release_date;
      where id = ${gameId};
    `;

    const results = await igdbRequest<IgdbRawGame[]>("games", body);
    const game = results[0];

    if (!game) {
      throw new Error(`IGDB game not found: ${gameId}`);
    }

    // Find developers & publishers from involved_companies
    const developers: Array<{ id: number; name: string }> = [];
    const publishers: Array<{ id: number; name: string }> = [];

    if (game.involved_companies) {
      for (const ic of game.involved_companies) {
        if (ic.developer) {
          developers.push({ id: ic.company.id, name: ic.company.name });
        }
        if (ic.publisher) {
          publishers.push({ id: ic.company.id, name: ic.company.name });
        }
      }
    }

    // ESRB rating
    let esrbRating: string | undefined;
    if (game.age_ratings) {
      const esrb = game.age_ratings.find((ar) => ar.category === 1);
      if (esrb) {
        esrbRating = ESRB_RATING_MAP[esrb.rating] || undefined;
      } else {
        const pegi = game.age_ratings.find((ar) => ar.category === 2);
        if (pegi) {
          esrbRating = PEGI_RATING_MAP[pegi.rating] || undefined;
        }
      }
    }

    // Official website (category 1 = official)
    let website: string | undefined;
    if (game.websites) {
      const official = game.websites.find((w) => w.category === 1);
      website = official?.url;
    }

    // First YouTube trailer
    let trailerUrl: string | undefined;
    if (game.videos && game.videos.length > 0) {
      trailerUrl = youtubeUrl(game.videos[0].video_id);
    }

    // Screenshots
    const screenshots: string[] = [];
    if (game.screenshots) {
      for (const ss of game.screenshots.slice(0, 10)) {
        screenshots.push(igdbImageUrl(ss.image_id, "screenshot_big"));
      }
    }

    // Backdrop from artworks or first screenshot
    let backdropPath: string | undefined;
    if (game.artworks && game.artworks.length > 0) {
      backdropPath = igdbImageUrl(game.artworks[0].image_id, "720p");
    } else if (screenshots.length > 0) {
      backdropPath = screenshots[0];
    }

    const isGameMode = (name: string) => {
      const normalized = name.toLowerCase().trim();
      return GAME_MODE_NAMES.some(
        (gm) => gm.toLowerCase().trim() === normalized || normalized === "singleplayer" || normalized === "multiplayer"
      );
    };

    const genres = game.genres?.map((g) => ({ id: g.id, name: g.name }));
    const tags = game.themes
      ?.filter((t) => !isGameMode(t.name))
      .map((t) => ({
        id: t.id,
        name: normalizeThemeName(t.name),
      }));

    // Build expansions: expansions → 'expansion', remakes → 'remake'
    const mapExpansionItem = (
      item: {
        name: string;
        summary?: string;
        cover?: { id: number; image_id: string };
        first_release_date?: number;
      },
      type: "expansion" | "remake",
    ) => ({
      name: item.name,
      description: item.summary,
      posterUrl: item.cover?.image_id
        ? igdbImageUrl(item.cover.image_id, "cover_big")
        : undefined,
      releaseDate: unixToDate(item.first_release_date),
      type,
    });

    const allExpansions = [
      ...(game.expansions || []).map((e) => mapExpansionItem(e, "expansion")),
      ...(game.remakes || []).map((r) => mapExpansionItem(r, "remake")),
    ];

    const detail: IgdbGameDetailData = {
      sourceId: game.id,
      title: game.name,
      overview: game.summary || game.storyline,
      posterPath: game.cover?.image_id
        ? igdbImageUrl(game.cover.image_id, "cover_big")
        : undefined,
      backdropPath,
      releaseDate: unixToDate(game.first_release_date),
      voteAverage: normalizeRating(
        game.total_rating || game.aggregated_rating || game.rating,
      ),
      genres: genres && genres.length > 0 ? genres : undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
      platforms: game.platforms?.map((p) => {
        let name = p.name;
        if (name === "PC (Microsoft Windows)") name = "PC";
        if (name === "Mac") name = "macOS";
        return { id: p.id, name };
      }),
      gameEngines: game.game_engines?.map((engine) => ({
        id: engine.id,
        name: engine.name,
      })),
      developers,
      publishers,
      esrbRating,
      website,
      trailerUrl,
      screenshots,
      playerPerspectives: game.player_perspectives
        ?.filter((pp) => !isGameMode(pp.name))
        .map((pp) => ({
          id: pp.id,
          name: pp.name,
        })),
      gameModes: game.game_modes?.map((gm) => ({
        id: gm.id,
        name: gm.name,
      })),
      franchise: game.collection
        ? { name: game.collection.name }
        : game.collections && game.collections.length > 0
          ? { name: game.collections[0].name }
          : game.franchises && game.franchises.length > 0
            ? { name: game.franchises[0].name }
            : undefined,
      expansions: allExpansions.length > 0 ? allExpansions : undefined,
    };

    logger.success(`[IgdbFetcher] Game details fetched: "${detail.title}"`);
    return detail;
  } catch (error) {
    logger.error("[IgdbFetcher] fetchIgdbGameDetails failed", error);
    throw error;
  }
}

/**
 * IGDB'den sadece oyunun franchise bilgisini getirir.
 */
export async function fetchIgdbGameFranchise(
  gameId: number,
): Promise<{ name: string } | undefined> {
  logger.info(`[IgdbFetcher] Fetching game franchise: gameId=${gameId}`);

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error(
      "IGDB_CLIENT_ID ve IGDB_CLIENT_SECRET env değişkenleri gerekli",
    );
  }

  try {
    const body = `
      fields collection.name, collections.name, franchises.name;
      where id = ${gameId};
    `;

    const results = await igdbRequest<IgdbRawGame[]>("games", body);
    const game = results[0];

    if (!game) {
      throw new Error(`IGDB game not found: ${gameId}`);
    }

    return game.collection
      ? { name: game.collection.name }
      : game.collections && game.collections.length > 0
        ? { name: game.collections[0].name }
        : game.franchises && game.franchises.length > 0
          ? { name: game.franchises[0].name }
          : undefined;
  } catch (error) {
    logger.error("[IgdbFetcher] fetchIgdbGameFranchise failed", error);
    throw error;
  }
}

/**
 * IGDB'den sadece oyunun game engine bilgisini getirir.
 * Backfill scriptleri gibi hafif kullanım senaryoları için uygundur.
 */
export async function fetchIgdbGameEngines(
  gameId: number,
): Promise<Array<{ id: number; name: string }>> {
  logger.info(`[IgdbFetcher] Fetching game engines: gameId=${gameId}`);

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error(
      "IGDB_CLIENT_ID ve IGDB_CLIENT_SECRET env değişkenleri gerekli",
    );
  }

  try {
    const body = `
      fields game_engines.name;
      where id = ${gameId};
    `;

    const results = await igdbRequest<IgdbRawGame[]>("games", body);
    const game = results[0];

    if (!game) {
      throw new Error(`IGDB game not found: ${gameId}`);
    }

    return (game.game_engines || []).map((engine) => ({
      id: engine.id,
      name: engine.name,
    }));
  } catch (error) {
    logger.error("[IgdbFetcher] fetchIgdbGameEngines failed", error);
    throw error;
  }
}

// ─── Image browsing ───

export interface ContentImageItem {
  url: string;
  width: number;
  height: number;
  voteAverage?: number;
  language?: string;
}

export interface ContentImagesResult {
  posters: ContentImageItem[];
  backdrops: ContentImageItem[];
}

/**
 * IGDB'den oyun için tüm cover, artwork ve screenshot görselleri çeker.
 * cover + screenshots → posters, artworks → backdrops
 */
export async function fetchIgdbImages(
  gameId: number,
): Promise<ContentImagesResult> {
  logger.info(`[IgdbFetcher] Fetching images for gameId=${gameId}`);

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error("IGDB credentials not configured");
  }

  try {
    const body = `
      fields name,
             cover.image_id, cover.width, cover.height,
             screenshots.image_id, screenshots.width, screenshots.height,
             artworks.image_id, artworks.width, artworks.height;
      where id = ${gameId};
    `;

    const results = await igdbRequest<IgdbRawGame[]>("games", body);
    const game = results[0];
    if (!game) throw new Error(`Game not found: ${gameId}`);

    // Cover → poster (tek ama yüksek çözünürlük ile)
    const posters: ContentImageItem[] = [];
    if (game.cover?.image_id) {
      posters.push({
        url: igdbImageUrl(game.cover.image_id, "cover_big"),
        width: game.cover.width || 264,
        height: game.cover.height || 374,
      });
    }

    // Screenshots → ek poster seçeneği olarak
    for (const ss of game.screenshots || []) {
      posters.push({
        url: igdbImageUrl(ss.image_id, "screenshot_big"),
        width: ss.width || 1280,
        height: ss.height || 720,
      });
    }

    // Artworks → backdrop seçenekleri
    const backdrops: ContentImageItem[] = [];
    for (const aw of game.artworks || []) {
      backdrops.push({
        url: igdbImageUrl(aw.image_id, "720p"),
        width: aw.width || 1280,
        height: aw.height || 720,
      });
    }

    // Screenshots → backdrop olarak da kullanılabilir
    for (const ss of game.screenshots || []) {
      backdrops.push({
        url: igdbImageUrl(ss.image_id, "720p"),
        width: ss.width || 1280,
        height: ss.height || 720,
      });
    }

    logger.success(
      `[IgdbFetcher] Images fetched: ${posters.length} posters, ${backdrops.length} backdrops`,
    );
    return { posters, backdrops };
  } catch (error) {
    logger.error(`[IgdbFetcher] Image fetch failed for game ${gameId}`, error);
    throw error;
  }
}
