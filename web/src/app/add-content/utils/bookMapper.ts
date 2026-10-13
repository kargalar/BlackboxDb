import type { AddContentFormData, PersonItem, SimpleItem } from '../types';
import type { AutoFillBookDetailData } from '@/services/graphql/admin/adminAutoFill';

/**
 * Google Books → AddContentFormData Mapper
 * Google Books API'den gelen kitap verilerini form alanlarına dönüştürür.
 */

// ─── Helpers ───

/**
 * Google Books authors → PersonItem[] (author role)
 */
function mapAuthors(
  authors?: string[],
  authorDetails?: AutoFillBookDetailData['authorDetails']
): PersonItem[] {
  if (authorDetails && authorDetails.length > 0) {
    return authorDetails.map((detail) => ({
      name: detail.name,
      role: 'author',
      biography: detail.biography,
      birthDate: detail.birthDate,
      deathDate: detail.deathDate,
      profileUrl: detail.profileUrl,
    }));
  }

  if (!authors) return [];
  return authors.map((name) => ({
    name,
    role: 'author',
  }));
}

/**
 * Google Books categories → SimpleItem[] (genres)
 */
function mapCategories(categories?: string[]): SimpleItem[] {
  if (!categories) return [];
  // Google Books categories can be like "Fiction / Fantasy / General"
  // Split by slashes and deduplicate
  const unique = new Set<string>();
  for (const cat of categories) {
    for (const part of cat.split('/')) {
      const trimmed = part.trim();
      if (trimmed && trimmed.toLowerCase() !== 'general') {
        unique.add(trimmed);
      }
    }
  }
  return Array.from(unique).map((name) => ({ name }));
}

// ─── Public Mapper ───

/**
 * Google Books kitap verisini AddContentFormData formatına dönüştürür
 */
export function mapBookToFormData(detail: AutoFillBookDetailData): Partial<AddContentFormData> {
  console.log('[bookMapper] Mapping book data:', detail.title);

  // HTML etiketlerini temizle (Google Books bazen HTML döner)
  const cleanDescription = detail.overview ? detail.overview.replace(/<[^>]*>/g, '').trim() : '';

  const mapped: Partial<AddContentFormData> = {
    title: detail.title,
    description: cleanDescription,
    releaseDate: detail.releaseDate || '',
    posterUrl: detail.posterPath || '',
    genres: mapCategories(detail.categories),
    // Legacy fields mirror the first publication for older paths.
    isbn: detail.isbn13 || detail.isbn || '',
    pageCount: detail.pageCount ? String(detail.pageCount) : '',
    authors: mapAuthors(detail.authors, detail.authorDetails),
    publisher: detail.publisher ? { name: detail.publisher } : null,
    languages: [],
    bookPublications:
      detail.editions && detail.editions.length > 0
        ? detail.editions
            .filter((ed) => !ed.isOriginal)
            .map((ed) => ({
              title: ed.title || detail.title,
              isbn: ed.isbn || '',
              pageCount: ed.pageCount ? String(ed.pageCount) : '',
              publisher: ed.publisher ? { name: ed.publisher } : null,
              language: ed.language ? ed.language.toUpperCase() : '',
              coverUrl: ed.coverUrl || '',
              publishedDate: ed.publishedDate || '',
              isOriginal: ed.isOriginal,
            }))
        : [],
    previewLink: detail.previewLink || '',
    infoLink: detail.infoLink || '',
  };

  console.log('[bookMapper] Book mapped:', {
    title: mapped.title,
    authors: mapped.authors?.length,
    genres: mapped.genres?.length,
    hasISBN: !!mapped.isbn,
    pageCount: mapped.pageCount,
    hasPoster: !!mapped.posterUrl,
  });

  return mapped;
}
