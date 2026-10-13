import type { AddContentFormData, PersonItem, SimpleItem } from '../types';
import type { AutoFillBookDetailData } from '@/services/graphql/admin/adminAutoFill';

/**
 * Open Library → AddContentFormData Mapper
 * Open Library API'den gelen kitap verilerini form alanlarına dönüştürür.
 * bookMapper.ts ile aynı yapıyı kullanır (AutoFillBookDetailData ortak type).
 */

// ─── Helpers ───

/**
 * Author isimleri → PersonItem[] (author role)
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
 * Open Library subjects → SimpleItem[] (genres)
 * Open Library subjects genellikle düz string'ler olarak gelir
 */
function mapCategories(categories?: string[]): SimpleItem[] {
  if (!categories) return [];
  const unique = new Set<string>();
  for (const cat of categories) {
    // Slash'larla ayrılmış alt-kategorileri parçala
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
 * Open Library kitap verisini AddContentFormData formatına dönüştürür
 */
export function mapOpenLibraryToFormData(
  detail: AutoFillBookDetailData
): Partial<AddContentFormData> {
  console.log('[openLibraryMapper] Mapping book data:', detail.title);

  // HTML etiketlerini temizle (nadiren olsa da olabilir)
  const cleanDescription = detail.overview ? detail.overview.replace(/<[^>]*>/g, '').trim() : '';

  const mapped: Partial<AddContentFormData> = {
    title: detail.title,
    description: cleanDescription,
    releaseDate: detail.releaseDate || '',
    posterUrl: detail.posterPath || '',
    genres: mapCategories(detail.categories),
    // Legacy fields
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

  console.log('[openLibraryMapper] Book mapped:', {
    title: mapped.title,
    authors: mapped.authors?.length,
    genres: mapped.genres?.length,
    hasISBN: !!mapped.isbn,
    pageCount: mapped.pageCount,
    hasPoster: !!mapped.posterUrl,
  });

  return mapped;
}
