import type { AddContentFormData, SimpleItem, CompanyItem } from '../types';
import type {
  AutoFillGameDetailData,
  AutoFillSimpleItemData,
} from '@/services/graphql/admin/adminAutoFill';
import { normalizeThemeName } from '@/lib/themeNormalizer';

/**
 * IGDB → AddContentFormData Mapper
 * IGDB API'den gelen oyun verilerini form alanlarına dönüştürür.
 */

// ─── Helpers ───

/**
 * AutoFillSimpleItemData[] → SimpleItem[]
 */
function mapSimpleItems(items?: AutoFillSimpleItemData[]): SimpleItem[] {
  if (!items) return [];
  return items.map((i) => ({ name: i.name }));
}

/**
 * AutoFillSimpleItemData[] → CompanyItem[]
 */
function mapCompanies(items?: AutoFillSimpleItemData[]): CompanyItem[] {
  if (!items) return [];
  return items.map((i) => ({ name: i.name }));
}

/**
 * ESRB Rating → SimpleItem (ageRating)
 */
function mapEsrbRating(esrb?: string): { name: string } | null {
  if (!esrb) return null;
  return { name: esrb };
}

// ─── Public Mapper ───

/**
 * IGDB oyun verisini AddContentFormData formatına dönüştürür
 */
export function mapGameToFormData(detail: AutoFillGameDetailData): Partial<AddContentFormData> {
  console.log('[gameMapper] Mapping game data:', detail.title);

  const cleanDescription = detail.overview ? detail.overview.trim() : '';

  const mapped: Partial<AddContentFormData> = {
    title: detail.title,
    originalTitle: detail.originalTitle || '',
    description: cleanDescription,
    releaseDate: detail.releaseDate || '',
    posterUrl: detail.posterPath || '',
    backdropUrl: detail.backdropPath || '',
    trailerUrl: detail.trailerUrl || '',

    // Genres
    genres: mapSimpleItems(detail.genres),

    // Themes
    themes: detail.tags ? detail.tags.map((item) => ({ name: normalizeThemeName(item.name) })) : [],

    // Franchise
    franchise: detail.franchise ? { name: detail.franchise } : null,

    // Game-specific
    platforms: mapSimpleItems(detail.platforms),
    gameEngines: mapSimpleItems(detail.gameEngines),
    developerCompanies: mapCompanies(detail.developers),
    publisherCompanies: mapCompanies(detail.publishers),
    ageRating: mapEsrbRating(detail.esrbRating),
    perspectives: mapSimpleItems(detail.playerPerspectives),
    gameModes: mapSimpleItems(detail.gameModes),

    // Expansions (DLC + Remake)
    expansions: detail.expansions
      ? detail.expansions.map((exp) => ({
          name: exp.name,
          description: exp.description || '',
          posterUrl: exp.posterUrl || '',
          releaseDate: exp.releaseDate || '',
          type: exp.type as 'expansion' | 'remake',
        }))
      : [],

    // Screenshots (default quiz/spoiler/sensitive values ile)
    screenshots: detail.screenshots
      ? detail.screenshots.map((url, index) => ({
          imageUrl: url,
          description: '',
          difficulty: 1,
          order: index,
          isEnabledForQuiz: false,
          isSpoiler: false,
          isSensitive: false,
        }))
      : [],
  };

  console.log('[gameMapper] Game mapped:', {
    title: mapped.title,
    genres: mapped.genres?.length,
    platforms: mapped.platforms?.length,
    gameEngines: mapped.gameEngines?.length,
    developers: mapped.developerCompanies?.length,
    publishers: mapped.publisherCompanies?.length,
    franchise: mapped.franchise?.name,
    perspectives: mapped.perspectives?.length,
    gameModes: mapped.gameModes?.length,
    expansions: mapped.expansions?.length,
    screenshots: mapped.screenshots?.length,
    hasPoster: !!mapped.posterUrl,
    hasTrailer: !!mapped.trailerUrl,
  });

  return mapped;
}
