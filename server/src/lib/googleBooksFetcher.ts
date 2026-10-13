import { logger } from "./logger";
import { enrichAuthors, EnrichedAuthorDetail } from "./authorEnrichment";
import { searchOpenLibrary, fetchOpenLibraryDetails } from "./openLibraryFetcher";

/**
 * Google Books API Fetcher
 * Kitap arama ve detay çekme işlemleri için Google Books API ile iletişim kurar.
 * API key gerekmez (ücretsiz tier yeterlidir).
 */

const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1";

/**
 * Google Books API çağrıları için ortak fetch wrapper.
 * 429 (rate limit) ve 5xx hatalarında exponential backoff ile retry yapar.
 */
async function gbFetch(url: string, retries = 3): Promise<Response> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  let finalUrl = url;
  if (apiKey) {
    const separator = url.includes("?") ? "&" : "?";
    finalUrl = `${url}${separator}key=${apiKey}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(finalUrl);

    // Retry only if we have remaining attempts
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s
      logger.warn(
        `[GoogleBooksFetcher] ${response.status} — retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`,
      );
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    return response;
  }

  throw new Error("Google Books API: max retries exceeded");
}

// ─── Raw Google Books API response interfaces ───

interface GoogleBooksRawVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string; // "ISBN_10" | "ISBN_13" | "OTHER"
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    maturityRating?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    language?: string;
    mainCategory?: string;
    previewLink?: string;
    infoLink?: string;
  };
}

interface GoogleBooksSearchResponse {
  totalItems: number;
  items?: GoogleBooksRawVolume[];
}

// ─── Normalized result interfaces ───

export interface BookSearchItem {
  sourceId: string; // Google Books volume ID
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType: "book";
  authors?: string[];
}

export interface FetcherPersonDetail {
  name: string;
  biography?: string;
  profileUrl?: string;
  birthDate?: string;
  deathDate?: string;
}

export interface FetcherBookEdition {
  title?: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  language?: string;
  coverUrl?: string;
  isOriginal: boolean;
}

export interface BookDetailData {
  sourceId: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType: "book";
  // Book-specific
  authors?: string[];
  publisher?: string;
  isbn?: string;
  isbn13?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;

  // New Enhanced Fields
  authorDetails?: EnrichedAuthorDetail[];
  editions?: FetcherBookEdition[];
  previewLink?: string;
  infoLink?: string;
}

// ─── Helpers ───

/**
 * Google Books'tan en yüksek kaliteli kapak resmini seçer
 */
function getBestCoverUrl(
  imageLinks?: GoogleBooksRawVolume["volumeInfo"]["imageLinks"],
): string | undefined {
  if (!imageLinks) return undefined;

  // En yüksek kaliteden başla
  const url =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail;

  if (!url) return undefined;

  // HTTP → HTTPS ve zoom parametresini kaldır (daha temiz görsel)
  return url.replace("http://", "https://").replace("&edge=curl", "");
}

/**
 * ISBN-13 veya ISBN-10 değerini çıkarır
 */
function extractIsbn(
  identifiers?: GoogleBooksRawVolume["volumeInfo"]["industryIdentifiers"],
): { isbn?: string; isbn13?: string } {
  if (!identifiers) return {};

  const isbn13 = identifiers.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = identifiers.find((i) => i.type === "ISBN_10")?.identifier;

  return {
    isbn: isbn10,
    isbn13: isbn13 || isbn10,
  };
}

/**
 * Arama sonuçlarını daha sağlıklı karşılaştırmak için metni normalize eder (küçük harf, Türkçe karakter temizleme, noktalama temizleme).
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Diakritikleri kaldır
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s]/g, "") // Noktalamaları kaldır
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Public API ───

/**
 * Google Books'ta kitap arar
 */
export async function searchBooks(
  query: string,
  startIndex = 0,
  maxResults = 20,
): Promise<BookSearchItem[]> {
  logger.info(
    `[GoogleBooksFetcher] Searching: query="${query}" (startIndex=${startIndex}, maxResults=${maxResults})`,
  );

  const params = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(Math.max(maxResults, 1), 40)),
    startIndex: String(Math.max(startIndex, 0)),
    printType: "books",
    langRestrict: "en",
    orderBy: "relevance",
  });

  try {
    const url = `${GOOGLE_BOOKS_BASE}/volumes?${params}`;
    logger.debug(`[GoogleBooksFetcher] Fetching: ${url}`);

    const response = await gbFetch(url);

    // Rate limit: return empty instead of crashing — user can use Open Library
    if (response.status === 429) {
      logger.warn(
        `[GoogleBooksFetcher] Rate limited for "${query}" — returning empty results`,
      );
      return [];
    }

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }

    const data = (await response.json()) as GoogleBooksSearchResponse;
    const results: BookSearchItem[] = (data.items || []).map((item) => {
      const info = item.volumeInfo;
      return {
        sourceId: item.id,
        title: info.title + (info.subtitle ? `: ${info.subtitle}` : ""),
        overview: info.description?.slice(0, 300),
        posterPath: getBestCoverUrl(info.imageLinks),
        releaseDate: info.publishedDate,
        voteAverage: info.averageRating,
        mediaType: "book" as const,
        authors: info.authors,
      };
    });

    logger.success(
      `[GoogleBooksFetcher] Search returned ${results.length} results for "${query}"`,
    );
    return results;
  } catch (error) {
    logger.error(`[GoogleBooksFetcher] Search failed for "${query}"`, error);
    throw error;
  }
}

/**
 * Google Books'tan kitap detaylarını getirir
 */
export async function fetchBookDetails(
  volumeId: string,
): Promise<BookDetailData> {
  logger.info(
    `[GoogleBooksFetcher] Fetching book details for volumeId=${volumeId}`,
  );

  try {
    const url = `${GOOGLE_BOOKS_BASE}/volumes/${volumeId}`;
    logger.debug(`[GoogleBooksFetcher] Fetching: ${url}`);

    const response = await gbFetch(url);
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }

    const item = (await response.json()) as GoogleBooksRawVolume;
    const info = item.volumeInfo;
    const { isbn, isbn13 } = extractIsbn(info.industryIdentifiers);

    const detail: BookDetailData = {
      sourceId: item.id,
      title: info.title + (info.subtitle ? `: ${info.subtitle}` : ""),
      overview: info.description,
      posterPath: getBestCoverUrl(info.imageLinks),
      releaseDate: info.publishedDate,
      voteAverage: info.averageRating,
      mediaType: "book",
      authors: info.authors,
      publisher: info.publisher,
      isbn,
      isbn13,
      pageCount: info.pageCount,
      categories: info.categories,
      language: info.language,
      previewLink: info.previewLink,
      infoLink: info.infoLink,
    };

    // Yazar zenginleştirme (Open Library'den biografi vb.)
    if (detail.authors && detail.authors.length > 0) {
      const enrichedAuthors = await enrichAuthors(detail.authors);
      detail.authorDetails = enrichedAuthors;
    }

    // Diğer edisyonları Google Books'tan bul
    try {
      const cleanTitle = info.title.split(":")[0].trim();
      const author = detail.authors && detail.authors.length > 0 ? detail.authors[0] : "";
      
      if (cleanTitle) {
        // Space-separated terms to avoid double-encoding issues (+ is encoded as %2B in encodeURIComponent)
        let q = `intitle:"${cleanTitle}"`;
        if (author) {
          q += ` inauthor:"${author}"`;
        }
        const searchUrl = `${GOOGLE_BOOKS_BASE}/volumes?q=${encodeURIComponent(q)}&printType=books&maxResults=20`;
        logger.debug(`[GoogleBooksFetcher] Fetching other editions from Google Books: ${searchUrl}`);
        
        const searchRes = await gbFetch(searchUrl);
        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as GoogleBooksSearchResponse;
          const items = searchData.items || [];
          
          const editions: FetcherBookEdition[] = [];
          const seenIsbns = new Set<string>();
          const seenUniqueKeys = new Set<string>();

          // Ensure the primary edition itself is always included and marked as original
          const hasPrimaryInItems = items.some(item => item.id === volumeId);
          if (!hasPrimaryInItems) {
            editions.push({
              title: detail.title,
              isbn: detail.isbn13 || detail.isbn || undefined,
              publisher: detail.publisher || undefined,
              publishedDate: detail.releaseDate || undefined,
              pageCount: detail.pageCount || undefined,
              language: detail.language || undefined,
              coverUrl: detail.posterPath || undefined,
              isOriginal: true,
            });
            if (detail.isbn13) seenIsbns.add(detail.isbn13);
            if (detail.isbn) seenIsbns.add(detail.isbn);
            seenUniqueKeys.add(`${normalizeForComparison(cleanTitle)}_${normalizeForComparison(detail.publisher || "")}_${detail.releaseDate || ""}`);
          }
          
          for (const item of items) {
            const edInfo = item.volumeInfo;
            const { isbn: edIsbn, isbn13: edIsbn13 } = extractIsbn(edInfo.industryIdentifiers);
            const isbnToUse = edIsbn13 || edIsbn;
            const isThisOriginal = item.id === volumeId;

            // Check if title is matching (locale and accent insensitive)
            const normalizedEdTitle = normalizeForComparison(edInfo.title || "");
            const normalizedCleanTitle = normalizeForComparison(cleanTitle);

            if (edInfo.title && normalizedEdTitle.includes(normalizedCleanTitle)) {
              // Deduplicate by ISBN
              if (isbnToUse) {
                if (seenIsbns.has(isbnToUse)) {
                  // If this is the original but we already saw its ISBN, mark the saw one as original or update it
                  if (isThisOriginal) {
                    const existing = editions.find(e => e.isbn === isbnToUse);
                    if (existing) existing.isOriginal = true;
                  }
                  continue;
                }
                seenIsbns.add(isbnToUse);
              } else {
                // If no ISBN, deduplicate by normalized title + publisher + date
                const uniqueKey = `${normalizedEdTitle}_${normalizeForComparison(edInfo.publisher || "")}_${edInfo.publishedDate || ""}`;
                if (seenUniqueKeys.has(uniqueKey)) {
                  if (isThisOriginal) {
                    const existing = editions.find(e => `${normalizeForComparison(e.title || "")}_${normalizeForComparison(e.publisher || "")}_${e.publishedDate || ""}` === uniqueKey);
                    if (existing) existing.isOriginal = true;
                  }
                  continue;
                }
                seenUniqueKeys.add(uniqueKey);
              }

              editions.push({
                title: edInfo.title + (edInfo.subtitle ? `: ${edInfo.subtitle}` : ""),
                isbn: isbnToUse || undefined,
                publisher: edInfo.publisher || undefined,
                publishedDate: edInfo.publishedDate || undefined,
                pageCount: edInfo.pageCount || undefined,
                language: edInfo.language || undefined,
                coverUrl: getBestCoverUrl(edInfo.imageLinks) || undefined,
                isOriginal: isThisOriginal,
              });
            }
          }
          
          if (editions.length > 0) {
            detail.editions = editions;
            
            // Edisyonların içinden en erken yayın tarihini bul ve detail.releaseDate olarak ata
            let earliestDateStr = detail.releaseDate;
            let earliestTime = earliestDateStr ? new Date(earliestDateStr).getTime() : Infinity;
            
            for (const ed of editions) {
              if (ed.publishedDate) {
                const edTime = new Date(ed.publishedDate).getTime();
                if (!Number.isNaN(edTime) && edTime < earliestTime) {
                  earliestTime = edTime;
                  earliestDateStr = ed.publishedDate;
                }
              }
            }
            
            if (earliestDateStr) {
              detail.releaseDate = earliestDateStr;
            }
          }
        }
      }
    } catch (e) {
      logger.warn(`[GoogleBooksFetcher] Failed to fetch other editions for "${info.title}" from Google Books`, e);
    }

    logger.success(
      `[GoogleBooksFetcher] Book details fetched: "${detail.title}" (authors: ${detail.authors?.length || 0}, pages: ${detail.pageCount || "N/A"})`,
    );
    return detail;
  } catch (error) {
    logger.error(
      `[GoogleBooksFetcher] Book detail fetch failed for volumeId=${volumeId}`,
      error,
    );
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
 * Google Books'tan kitap kapağını çeker.
 * Google Books tek kapak sağlar, tüm kalite boyutlarını listeleriz.
 */
export async function fetchBookImages(
  volumeId: string,
): Promise<ContentImagesResult> {
  logger.info(`[GoogleBooksFetcher] Fetching images for volumeId=${volumeId}`);

  try {
    const response = await gbFetch(`${GOOGLE_BOOKS_BASE}/volumes/${volumeId}`);
    if (!response.ok)
      throw new Error(`Google Books API error: ${response.status}`);
    const data = (await response.json()) as GoogleBooksRawVolume;
    const links = data.volumeInfo?.imageLinks;

    const posters: ContentImageItem[] = [];

    // Tüm kalite seçeneklerini listele
    const sizes: Array<{
      key: keyof NonNullable<typeof links>;
      w: number;
      h: number;
    }> = [
      { key: "extraLarge", w: 800, h: 1200 },
      { key: "large", w: 600, h: 900 },
      { key: "medium", w: 400, h: 600 },
      { key: "small", w: 300, h: 450 },
      { key: "thumbnail", w: 128, h: 192 },
    ];

    for (const size of sizes) {
      const url = links?.[size.key];
      if (url) {
        posters.push({
          url: url.replace("http://", "https://").replace("&edge=curl", ""),
          width: size.w,
          height: size.h,
        });
      }
    }

    logger.success(
      `[GoogleBooksFetcher] Images fetched: ${posters.length} posters`,
    );
    return { posters, backdrops: [] };
  } catch (error) {
    logger.error(
      `[GoogleBooksFetcher] Image fetch failed for volumeId=${volumeId}`,
      error,
    );
    throw error;
  }
}
