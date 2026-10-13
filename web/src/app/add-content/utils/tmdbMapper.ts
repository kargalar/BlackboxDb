import type { AddContentFormData, CompanyItem, PersonItem, SimpleItem, SeasonItem } from '../types';
import type { TmdbDetailResultData } from '@/services/graphql/admin/adminTmdb';
import { normalizeThemeName } from '@/lib/themeNormalizer';

/**
 * TMDB → AddContentFormData Mapper
 * TMDB API'den gelen verileri form alanlarına dönüştürür.
 *
 * Poster/backdrop URL'leri TMDB CDN linki olarak yazılır.
 * Kullanıcı formu kontrol edip gerekirse değiştirebilir.
 */

// ─── Helpers ───

/**
 * TMDB video listesinden en iyi trailer URL'ini seçer
 */
function findTrailerUrl(videos?: TmdbDetailResultData['videos']): string {
  if (!videos || videos.length === 0) return '';

  // Önce resmi trailer ara
  const officialTrailer = videos.find(
    (v) => v.type === 'Trailer' && v.official === true && v.site === 'YouTube'
  );
  if (officialTrailer) {
    return `https://www.youtube.com/watch?v=${officialTrailer.key}`;
  }

  // Sonra herhangi bir trailer
  const anyTrailer = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  if (anyTrailer) {
    return `https://www.youtube.com/watch?v=${anyTrailer.key}`;
  }

  // Son çare: herhangi bir YouTube video
  const anyVideo = videos.find((v) => v.site === 'YouTube');
  if (anyVideo) {
    return `https://www.youtube.com/watch?v=${anyVideo.key}`;
  }

  return '';
}

/**
 * TMDB cast → PersonItem[]
 */
function mapCast(cast?: TmdbDetailResultData['cast']): PersonItem[] {
  if (!cast) return [];
  return cast.map((c) => ({
    name: c.name,
    character: c.character || '',
    role: 'actor',
    profileUrl: c.profilePath || '',
    biography: c.biography || '',
    birthDate: c.birthday || '',
    deathDate: c.deathday || '',
    placeOfBirth: c.placeOfBirth || '',
  }));
}

/**
 * TMDB crew → PersonItem[]
 * Roller sunucu tarafında zaten birleştirildi (Director, Producer gibi)
 */
function mapCrew(crew?: TmdbDetailResultData['crew']): PersonItem[] {
  if (!crew) return [];
  return crew.map((c) => ({
    name: c.name,
    role: c.job || '',
    profileUrl: c.profilePath || '',
    biography: c.biography || '',
    birthDate: c.birthday || '',
    deathDate: c.deathday || '',
    placeOfBirth: c.placeOfBirth || '',
  }));
}

/**
 * TMDB genres → SimpleItem[]
 */
function mapGenres(genres?: TmdbDetailResultData['genres']): SimpleItem[] {
  if (!genres) return [];
  return genres.map((g) => ({ name: g.name }));
}

/**
 * TMDB spoken_languages → SimpleItem[]
 */
function mapLanguages(languages?: TmdbDetailResultData['spokenLanguages']): SimpleItem[] {
  if (!languages) return [];
  return languages
    .map((l) => ({ name: l.englishName || l.name || '' }))
    .filter((l) => l.name.length > 0);
}

/**
 * TMDB keywords → SimpleItem[] (themes)
 */
function mapKeywordsToThemes(keywords?: TmdbDetailResultData['keywords']): SimpleItem[] {
  if (!keywords) return [];
  return keywords.map((k) => ({ name: normalizeThemeName(k.name) }));
}

function mapProductionCompanies(
  companies?: TmdbDetailResultData['productionCompanies']
): CompanyItem[] {
  if (!companies) return [];
  return companies.map((company) => ({
    name: company.name,
    logoUrl: company.logoPath || '',
  }));
}

/**
 * TMDB seasons → SeasonItem[]
 */
function mapSeasons(seasons?: TmdbDetailResultData['seasons']): SeasonItem[] {
  if (!seasons) return [];
  return seasons.map((s) => ({
    seasonNumber: s.seasonNumber,
    name: s.name,
    airDate: s.airDate || '',
    overview: s.overview || '',
    posterUrl: s.posterPath || '',
    episodes: (s.episodes || []).map((ep) => ({
      episodeNumber: ep.episodeNumber,
      name: ep.name,
      airDate: ep.airDate || '',
      overview: ep.overview || '',
      runtime: ep.runtime,
      stillUrl: ep.stillPath || '',
    })),
  }));
}

// ─── Public Mappers ───

/**
 * TMDB film verisini AddContentFormData formatına dönüştürür
 */
export function mapTmdbMovieToFormData(detail: TmdbDetailResultData): Partial<AddContentFormData> {
  console.log('[tmdbMapper] Mapping movie data:', detail.title);

  const mapped: Partial<AddContentFormData> = {
    title: detail.title,
    originalTitle: detail.originalTitle || '',
    tmdbId: detail.tmdbId,
    description: detail.overview || '',
    releaseDate: detail.releaseDate || '',
    runtime: detail.runtime ? String(detail.runtime) : '',
    posterUrl: detail.posterPath || '',
    backdropUrl: detail.backdropPath || '',
    budget: detail.budget ? String(detail.budget) : '',
    revenue: detail.revenue ? String(detail.revenue) : '',
    genres: mapGenres(detail.genres),
    languages: mapLanguages(detail.spokenLanguages),
    cast: mapCast(detail.cast),
    crew: mapCrew(detail.crew),
    studios: mapProductionCompanies(detail.productionCompanies),
    themes: mapKeywordsToThemes(detail.keywords),
    franchise: detail.franchise
      ? {
          id: String(detail.franchise.tmdbCollectionId),
          name: detail.franchise.name,
          description: '',
        }
      : null,
    ageRating: detail.ageRating ? { name: detail.ageRating } : null,
    trailerUrl: findTrailerUrl(detail.videos),
  };

  console.log('[tmdbMapper] Movie mapped:', {
    title: mapped.title,
    genres: mapped.genres?.length,
    cast: mapped.cast?.length,
    crew: mapped.crew?.length,
    themes: mapped.themes?.length,
    hasTrailer: !!mapped.trailerUrl,
    hasPoster: !!mapped.posterUrl,
    hasBackdrop: !!mapped.backdropUrl,
  });

  return mapped;
}

/**
 * TMDB dizi verisini AddContentFormData formatına dönüştürür
 */
export function mapTmdbTvToFormData(detail: TmdbDetailResultData): Partial<AddContentFormData> {
  console.log('[tmdbMapper] Mapping TV data:', detail.title);

  const mapped: Partial<AddContentFormData> = {
    title: detail.title,
    originalTitle: detail.originalTitle || '',
    tmdbId: detail.tmdbId,
    description: detail.overview || '',
    runtime: detail.runtime ? String(detail.runtime) : '',
    posterUrl: detail.posterPath || '',
    backdropUrl: detail.backdropPath || '',
    genres: mapGenres(detail.genres),
    languages: mapLanguages(detail.spokenLanguages),
    cast: mapCast(detail.cast),
    crew: mapCrew(detail.crew),
    studios: mapProductionCompanies(detail.productionCompanies),
    themes: mapKeywordsToThemes(detail.keywords),
    ageRating: detail.ageRating ? { name: detail.ageRating } : null,
    trailerUrl: findTrailerUrl(detail.videos),
    // TV-specific
    firstAirDate: detail.firstAirDate || '',
    lastAirDate: detail.lastAirDate || '',
    inProduction: detail.inProduction ?? false,
    seasons: mapSeasons(detail.seasons),
  };

  console.log('[tmdbMapper] TV mapped:', {
    title: mapped.title,
    genres: mapped.genres?.length,
    cast: mapped.cast?.length,
    crew: mapped.crew?.length,
    themes: mapped.themes?.length,
    seasons: mapped.seasons?.length,
    hasTrailer: !!mapped.trailerUrl,
    hasPoster: !!mapped.posterUrl,
  });

  return mapped;
}

/**
 * Content type ID'sine göre doğru mapper'ı seçer
 */
export function mapTmdbToFormData(
  detail: TmdbDetailResultData,
  contentTypeId: string
): Partial<AddContentFormData> {
  if (contentTypeId === '2' || detail.mediaType === 'tv') {
    return mapTmdbTvToFormData(detail);
  }
  return mapTmdbMovieToFormData(detail);
}
