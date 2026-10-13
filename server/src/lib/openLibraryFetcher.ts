import { logger } from "./logger";

/**
 * Open Library API Fetcher
 * Kitap arama ve detay çekme işlemleri için Open Library API ile iletişim kurar.
 * API key gerekmez (tamamen açık API).
 *
 * Endpoints:
 *   - Search: https://openlibrary.org/search.json?q=...
 *   - Work details: https://openlibrary.org/works/{workId}.json
 *   - Author details: https://openlibrary.org/authors/{authorId}.json
 *   - Cover images: https://covers.openlibrary.org/b/olid/{olid}-{size}.jpg
 */

const OL_BASE = "https://openlibrary.org";
const OL_COVERS = "https://covers.openlibrary.org";

// Open Library requires a proper User-Agent header, otherwise requests are blocked with 403
const OL_USER_AGENT = "BlackboxDb/1.0 (book catalog; contact@blackboxdb.com)";

/**
 * Open Library API çağrıları için ortak fetch wrapper.
 * User-Agent header'ını otomatik ekler ve 429/5xx hatalarında retry yapar.
 */
async function olFetch(url: string, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": OL_USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (response.status === 429 || (response.status >= 500 && attempt < retries)) {
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      logger.warn(`[OpenLibraryFetcher] ${response.status} — retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    return response;
  }

  // Should never reach here, but TypeScript needs it
  throw new Error("Open Library API: max retries exceeded");
}

// ─── Raw Open Library API response interfaces ───

interface OLSearchDoc {
  key: string; // "/works/OL123W"
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  cover_i?: number; // Cover ID
  cover_edition_key?: string; // OLID for cover
  edition_count?: number;
  isbn?: string[];
  publisher?: string[];
  language?: string[];
  subject?: string[];
  number_of_pages_median?: number;
  ratings_average?: number;
  first_sentence?: string[];
}

interface OLSearchResponse {
  numFound: number;
  start: number;
  docs: OLSearchDoc[];
}

interface OLWorkResponse {
  key: string; // "/works/OL123W"
  title: string;
  description?: string | { type: string; value: string };
  covers?: number[];
  subjects?: string[];
  subject_places?: string[];
  subject_times?: string[];
  first_publish_date?: string;
  authors?: Array<{
    author: { key: string }; // "/authors/OL123A"
    type?: { key: string };
  }>;
}

interface OLAuthorResponse {
  key: string;
  name: string;
  bio?: string | { type: string; value: string };
  birth_date?: string;
  death_date?: string;
  photos?: number[];
}

interface OLEditionResponse {
  key: string;
  title: string;
  isbn_13?: string[];
  isbn_10?: string[];
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  languages?: Array<{ key: string }>; // "/languages/eng"
  covers?: number[];
}

// ─── Normalized result interfaces (same shape as googleBooksFetcher) ───

export interface BookSearchItem {
  sourceId: string; // Work key, e.g. "OL123W"
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
  authorDetails?: FetcherPersonDetail[];
  editions?: FetcherBookEdition[];
  previewLink?: string;
  infoLink?: string;
}

// ─── Helpers ───

/**
 * Work key'den temiz ID çıkarır: "/works/OL123W" → "OL123W"
 */
function cleanWorkKey(key: string): string {
  return key.replace("/works/", "");
}

/**
 * Cover ID'den en yüksek kaliteli kapak URL'si üretir
 */
function getCoverUrl(coverId?: number): string | undefined {
  if (!coverId) return undefined;
  return `${OL_COVERS}/b/id/${coverId}-L.jpg`;
}

/**
 * OLID'den kapak URL'si üretir
 */
function getCoverUrlByOlid(olid?: string): string | undefined {
  if (!olid) return undefined;
  return `${OL_COVERS}/b/olid/${olid}-L.jpg`;
}

/**
 * Open Library description alanını string'e dönüştürür
 * (bazen plain string, bazen { type, value } objesi olarak gelir)
 */
function normalizeDescription(
  desc?: string | { type: string; value: string },
): string | undefined {
  if (!desc) return undefined;
  if (typeof desc === "string") return desc;
  return desc.value;
}

/**
 * Yılı tarih formatına çevirir: 2001 → "2001-01-01"
 */
function yearToDate(year?: number): string | undefined {
  if (!year) return undefined;
  return `${year}-01-01`;
}

/**
 * Language key'den dil kodu çıkarır: "/languages/eng" → "eng"
 */
function extractLanguageCode(langKey: string): string {
  return langKey.replace("/languages/", "");
}

// ─── Public API ───

/**
 * Open Library'de kitap arar
 */
export async function searchOpenLibrary(
  query: string,
  offset = 0,
  limit = 20,
): Promise<BookSearchItem[]> {
  logger.info(
    `[OpenLibraryFetcher] Searching: query="${query}" (offset=${offset}, limit=${limit})`,
  );

  const params = new URLSearchParams({
    q: query,
    offset: String(Math.max(offset, 0)),
    limit: String(Math.min(Math.max(limit, 1), 100)),
    fields:
      "key,title,author_name,author_key,first_publish_year,cover_i,cover_edition_key,isbn,publisher,number_of_pages_median,ratings_average,first_sentence,language,subject",
    lang: "en",
  });

  try {
    const url = `${OL_BASE}/search.json?${params}`;
    logger.debug(`[OpenLibraryFetcher] Fetching: ${url}`);

    const response = await olFetch(url);
    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`);
    }

    const data = (await response.json()) as OLSearchResponse;
    const results: BookSearchItem[] = data.docs.map((doc) => {
      // Kapak görseli: cover_i (ID-based) > cover_edition_key (OLID-based)
      const posterPath =
        getCoverUrl(doc.cover_i) || getCoverUrlByOlid(doc.cover_edition_key);

      // İlk cümleyi overview olarak kullan (kısa özet)
      const overview = doc.first_sentence?.[0]?.slice(0, 300);

      return {
        sourceId: cleanWorkKey(doc.key),
        title: doc.title,
        overview,
        posterPath,
        releaseDate: yearToDate(doc.first_publish_year),
        voteAverage: doc.ratings_average
          ? Math.round(doc.ratings_average * 10) / 10
          : undefined,
        mediaType: "book" as const,
        authors: doc.author_name,
      };
    });

    logger.success(
      `[OpenLibraryFetcher] Search returned ${results.length} results for "${query}" (total: ${data.numFound})`,
    );
    return results;
  } catch (error) {
    logger.error(`[OpenLibraryFetcher] Search failed for "${query}"`, error);
    throw error;
  }
}

/**
 * Open Library'den kitap detaylarını getirir (Work + Editions + Authors)
 */
export async function fetchOpenLibraryDetails(
  workKey: string,
): Promise<BookDetailData> {
  logger.info(
    `[OpenLibraryFetcher] Fetching details for workKey=${workKey}`,
  );

  try {
    // 1. Work detaylarını çek
    const workUrl = `${OL_BASE}/works/${workKey}.json`;
    logger.debug(`[OpenLibraryFetcher] Fetching work: ${workUrl}`);

    const workResponse = await olFetch(workUrl);
    if (!workResponse.ok) {
      throw new Error(`Open Library Work API error: ${workResponse.status}`);
    }
    const work = (await workResponse.json()) as OLWorkResponse;

    // 2. Editions'ı çek (ilk birkaç basım — ISBN, publisher, sayfa vb.)
    const editionsUrl = `${OL_BASE}/works/${workKey}/editions.json?limit=10`;
    logger.debug(`[OpenLibraryFetcher] Fetching editions: ${editionsUrl}`);

    let isbn: string | undefined;
    let isbn13: string | undefined;
    let publisher: string | undefined;
    let pageCount: number | undefined;
    let language: string | undefined;
    let editionCover: number | undefined;
    let publishDate: string | undefined;

    const allEditions: FetcherBookEdition[] = [];

    try {
      const editionsResponse = await olFetch(editionsUrl);
      if (editionsResponse.ok) {
        const editionsData = (await editionsResponse.json()) as {
          entries: OLEditionResponse[];
        };
        const editions = editionsData.entries || [];

        // İlk edition'dan genel bilgileri çek ve edition'ları listeye ekle
        for (const [index, ed] of editions.entries()) {
          const edIsbn13 = ed.isbn_13?.length ? ed.isbn_13[0] : undefined;
          const edIsbn10 = ed.isbn_10?.length ? ed.isbn_10[0] : undefined;
          const edPublisher = ed.publishers?.length ? ed.publishers[0] : undefined;
          const edPageCount = ed.number_of_pages;
          const edLanguage = ed.languages?.length ? extractLanguageCode(ed.languages[0].key) : undefined;
          const edCoverId = ed.covers?.length && ed.covers[0] > 0 ? ed.covers[0] : undefined;

          // Ana verileri ilk edition'dan al (Eğer hala boşsa)
          if (!isbn13 && edIsbn13) isbn13 = edIsbn13;
          if (!isbn && edIsbn10) isbn = edIsbn10;
          if (!publisher && edPublisher) publisher = edPublisher;
          if (!pageCount && edPageCount) pageCount = edPageCount;
          if (!language && edLanguage) language = edLanguage;
          if (!editionCover && edCoverId) editionCover = edCoverId;
          if (!publishDate && ed.publish_date) publishDate = ed.publish_date;

          // Edition objesini oluştur
          if (edIsbn13 || edIsbn10) { // Sadece ISBN'i olanları valid edition sayalım
            allEditions.push({
              title: ed.title,
              isbn: edIsbn13 || edIsbn10,
              publisher: edPublisher,
              publishedDate: ed.publish_date,
              pageCount: edPageCount,
              language: edLanguage,
              coverUrl: getCoverUrl(edCoverId),
              isOriginal: index === 0, // İlk sıradakini "orijinal" kabul edebiliriz, DB'de ayrı tutmak için
            });
          }
        }
      }
    } catch (edErr) {
      logger.warn(`[OpenLibraryFetcher] Could not fetch editions for ${workKey}`, edErr);
    }

    // 3. Author isimlerini ve detaylarını çek
    const authorNames: string[] = [];
    const authorDetails: FetcherPersonDetail[] = [];

    if (work.authors?.length) {
      const authorPromises = work.authors
        .slice(0, 5) // En fazla 5 yazar
        .map(async (a) => {
          try {
            const authorUrl = `${OL_BASE}${a.author.key}.json`;
            const res = await olFetch(authorUrl);
            if (!res.ok) return null;
            const author = (await res.json()) as OLAuthorResponse;
            return author;
          } catch {
            return null;
          }
        });

      const authors = await Promise.all(authorPromises);
      for (const author of authors) {
        if (author) {
          authorNames.push(author.name);
          authorDetails.push({
            name: author.name,
            biography: normalizeDescription(author.bio),
            profileUrl: author.photos?.length && author.photos[0] > 0 ? getCoverUrl(author.photos[0]) : undefined,
            birthDate: author.birth_date,
            deathDate: author.death_date,
          });
        }
      }
    }

    // 4. Kapak görseli: work covers > edition covers
    const coverId = work.covers?.find((c) => c > 0) || editionCover;
    const posterPath = getCoverUrl(coverId);

    // 5. Description
    const overview = normalizeDescription(work.description);

    // 6. Subjects → categories
    const categories = work.subjects?.slice(0, 10);

    // 7. Tarih: first_publish_date > edition publish_date
    let releaseDate: string | undefined;
    if (work.first_publish_date) {
      // "1997" veya "March 1, 1997" gibi formatlar olabilir
      const yearMatch = work.first_publish_date.match(/\d{4}/);
      if (yearMatch) {
        releaseDate = yearToDate(parseInt(yearMatch[0], 10));
      }
    } else if (publishDate) {
      const yearMatch = publishDate.match(/\d{4}/);
      if (yearMatch) {
        releaseDate = yearToDate(parseInt(yearMatch[0], 10));
      }
    }

    const detail: BookDetailData = {
      sourceId: workKey,
      title: work.title,
      overview,
      posterPath,
      releaseDate,
      mediaType: "book",
      authors: authorNames.length > 0 ? authorNames : undefined,
      publisher,
      isbn,
      isbn13,
      pageCount,
      categories,
      language,
      authorDetails,
      editions: allEditions,
    };

    logger.success(
      `[OpenLibraryFetcher] Details fetched: "${detail.title}" (authors: ${detail.authors?.length || 0}, pages: ${detail.pageCount || "N/A"})`,
    );
    return detail;
  } catch (error) {
    logger.error(
      `[OpenLibraryFetcher] Detail fetch failed for workKey=${workKey}`,
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
 * Open Library'den kitap kapak görsellerini çeker.
 * Work covers'dan tüm boyutları listeler.
 */
export async function fetchOpenLibraryImages(
  workKey: string,
): Promise<ContentImagesResult> {
  logger.info(
    `[OpenLibraryFetcher] Fetching images for workKey=${workKey}`,
  );

  try {
    const workUrl = `${OL_BASE}/works/${workKey}.json`;
    const response = await olFetch(workUrl);
    if (!response.ok)
      throw new Error(`Open Library API error: ${response.status}`);

    const work = (await response.json()) as OLWorkResponse;
    const posters: ContentImageItem[] = [];

    if (work.covers?.length) {
      // Her cover ID için L (büyük) boyut ekle
      for (const coverId of work.covers) {
        if (coverId <= 0) continue; // Negatif ID'ler geçersiz
        posters.push({
          url: `${OL_COVERS}/b/id/${coverId}-L.jpg`,
          width: 600,
          height: 900,
        });
      }
    }

    logger.success(
      `[OpenLibraryFetcher] Images fetched: ${posters.length} posters`,
    );
    return { posters, backdrops: [] };
  } catch (error) {
    logger.error(
      `[OpenLibraryFetcher] Image fetch failed for workKey=${workKey}`,
      error,
    );
    throw error;
  }
}
