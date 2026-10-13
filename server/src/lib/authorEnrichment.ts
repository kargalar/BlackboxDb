import { logger } from "./logger";

export interface EnrichedAuthorDetail {
  name: string;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
  profileUrl?: string;
}

const OL_USER_AGENT = "BlackboxDb/1.0 (book catalog; contact@blackboxdb.com)";

/**
 * Open Library üzerinden yazar arar ve detaylarını getirir.
 */
export async function enrichAuthorWithOpenLibrary(authorName: string): Promise<EnrichedAuthorDetail | null> {
  try {
    const searchUrl = `https://openlibrary.org/search/authors.json?q=${encodeURIComponent(authorName)}&limit=1`;
    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": OL_USER_AGENT, "Accept": "application/json" },
    });
    
    if (!searchRes.ok) return null;
    
    const searchData: any = await searchRes.json();
    if (!searchData.docs || searchData.docs.length === 0) return null;
    
    const authorKey = searchData.docs[0].key; // e.g. OL12345A
    
    const detailUrl = `https://openlibrary.org/authors/${authorKey}.json`;
    const detailRes = await fetch(detailUrl, {
      headers: { "User-Agent": OL_USER_AGENT, "Accept": "application/json" },
    });
    
    if (!detailRes.ok) return null;
    
    const detailData: any = await detailRes.json();
    
    // Bio
    let biography = undefined;
    if (detailData.bio) {
      biography = typeof detailData.bio === "string" ? detailData.bio : detailData.bio.value;
    }
    
    // Photo
    let profileUrl = undefined;
    if (detailData.photos && detailData.photos.length > 0) {
      profileUrl = `https://covers.openlibrary.org/a/id/${detailData.photos[0]}-L.jpg`;
    }

    return {
      name: detailData.name || authorName,
      biography,
      birthDate: detailData.birth_date,
      deathDate: detailData.death_date,
      profileUrl,
    };
  } catch (error) {
    logger.warn(`[authorEnrichment] Failed to enrich author "${authorName}" from Open Library:`, error);
    return null;
  }
}

/**
 * Birden fazla yazar ismi verildiğinde, paralel olarak bilgilerini çekip döndürür.
 */
export async function enrichAuthors(authorNames: string[]): Promise<EnrichedAuthorDetail[]> {
  if (!authorNames || authorNames.length === 0) return [];
  
  const results = await Promise.all(
    authorNames.map(async (name) => {
      const enriched = await enrichAuthorWithOpenLibrary(name);
      return enriched || { name }; // Bulunamazsa sadece isim döner
    })
  );
  
  return results;
}
