import { AddContentFormData, INITIAL_FORM_DATA } from '@/app/add-content/types';
import { sortByCreditOrder } from '@/lib/array-utils';

export function mapContentToFormData(data: any): AddContentFormData {
  if (!data) return { ...INITIAL_FORM_DATA };

  const parsedCastRaw = data.cast ? JSON.parse(data.cast) : [];
  const parsedCast = sortByCreditOrder(parsedCastRaw);
  const parsedCrew = data.crew ? JSON.parse(data.crew) : [];
  const parsedSeasons = data.seasons ? JSON.parse(data.seasons) : [];

  const parsedAuthors = parsedCrew
    .filter((c: any) => c.role === 'author')
    .map((a: any) => ({
      id: a.id || a.personId,
      name: a.name || a.person?.name,
      role: 'author',
      profileUrl: a.profileUrl || a.person?.profileUrl,
    }));
  const parsedTranslators = parsedCrew
    .filter((c: any) => String(c.role || '').toLowerCase() === 'translator')
    .map((translator: any) => ({
      id: translator.id || translator.personId,
      name: translator.name || translator.person?.name,
      role: 'translator',
      profileUrl: translator.profileUrl || translator.person?.profileUrl,
      biography: translator.biography || translator.person?.biography,
      birthDate: translator.birthDate || translator.person?.birthDate,
      deathDate: translator.deathDate || translator.person?.deathDate,
      placeOfBirth: translator.placeOfBirth || translator.person?.placeOfBirth,
    }))
    .filter((translator: any) => translator.name);

  const parsedGenres = data.genres
    ? Array.isArray(data.genres)
      ? data.genres
      : JSON.parse(data.genres)
    : [];
  const rawBookPublications = Array.isArray(data.bookPublications)
    ? data.bookPublications
    : data.primaryBookPublication
      ? [data.primaryBookPublication]
      : [];
  const primaryBookPublication = data.primaryBookPublication || rawBookPublications[0] || null;
  const mapPublicationTranslators = (translators: any) => {
    const names = Array.isArray(translators)
      ? translators
      : typeof translators === 'string'
        ? translators
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean)
        : [];

    return names.map((name: string) => {
      const matched = parsedTranslators.find(
        (translator: any) => translator.name.toLowerCase() === name.toLowerCase()
      );
      return matched || { name, role: 'translator' };
    });
  };
  const bookPublications = rawBookPublications.map((publication: any) => ({
    id: publication.id,
    title: publication.title || '',
    subtitle: publication.subtitle || '',
    isbn: publication.isbn || '',
    publisher: publication.publisher
      ? {
          id: publication.publisher.id,
          name: publication.publisher.name,
          description: publication.publisher.description || '',
          headquarters: publication.publisher.headquarters || '',
          logoUrl: publication.publisher.logoUrl || '',
          website: publication.publisher.website || '',
          foundingYear: publication.publisher.foundingYear,
        }
      : null,
    translators: mapPublicationTranslators(publication.translators),
    language: publication.language || '',
    pageCount: publication.pageCount?.toString() || '',
    coverUrl: publication.coverUrl || '',
    publishedDate: publication.publishedDate || '',
    editionType: publication.editionType || '',
    format: publication.format || '',
    isOriginal: !!publication.isOriginal,
    isAbridged: !!publication.isAbridged,
  }));
  const legacyBookPublisher = Array.isArray(data.companies)
    ? (() => {
        const bookPublisher = data.companies.find((c: any) => c.companyRoleId === 3);
        return bookPublisher
          ? {
              id: bookPublisher.company?.id || bookPublisher.companyId,
              name: bookPublisher.company?.name || '',
            }
          : null;
      })()
    : null;

  return {
    // Ortak alanlar
    title: data.title || '',
    originalTitle: data.originalTitle || '',
    alternativeTitles: Array.isArray(data.alternativeTitles) ? data.alternativeTitles : [],
    contentTypeId: String(data.contentTypeId) || '',
    contentTypeSlug: data.contentType?.slug || '',
    tmdbId: data.tmdbId || undefined,
    igdbId: data.igdbId || undefined,
    description: data.description || '',
    releaseDate: data.releaseDate || '',
    runtime: data.runtime?.toString() || '',
    posterUrl: data.posterUrl || '',
    backdropUrl: data.backdropUrl || '',
    autoSelectHighestVotedMedia: data.autoSelectHighestVotedMedia ?? true,
    images: data.images || [],
    status: data.status || 'finished',
    isContinuing: data.isContinuing || false,
    genres: parsedGenres,
    franchise: data.franchiseId ? { id: data.franchiseId, name: data.franchiseName || '' } : null,
    languages: Array.isArray(data.languages)
      ? data.languages.map((code: string) => ({ name: code }))
      : [],

    // Film-spesifik
    budget: data.budget?.toString() || '',
    revenue: data.revenue?.toString() || '',
    cast: parsedCast,
    crew: parsedCrew,

    // averageDuration is automatically calculated by backend from episode runtimes
    tvType: data.tvType || 'series',
    inProduction: data.inProduction || false,
    firstAirDate: data.firstAirDate || '',
    lastAirDate: data.lastAirDate || '',
    seasons: parsedSeasons,

    // Kitap-spesifik
    isbn: primaryBookPublication?.isbn || data.isbn || '',
    pageCount: primaryBookPublication?.pageCount?.toString() || data.pageCount?.toString() || '',
    translators: mapPublicationTranslators(primaryBookPublication?.translators)
      .map((translator: any) => translator.name)
      .join(', '),
    authors: parsedAuthors,
    // Book publisher from companies array (companyRoleId = 3)
    publisher: bookPublications[0]?.publisher || legacyBookPublisher,
    bookPublications,

    // Oyun-spesifik - array olarak parse et
    gameModes: Array.isArray(data.gameModes) ? data.gameModes : [],
    gameEngines: Array.isArray(data.gameEngines) ? data.gameEngines : [],
    perspectives: Array.isArray(data.perspectives) ? data.perspectives : [],
    platforms: Array.isArray(data.platforms) ? data.platforms : [],
    fileSize: data.fileSize || '',
    // Game developer: companyRoleId = 5
    developerCompanies: Array.isArray(data.companies)
      ? data.companies
          .filter((d: any) => d.companyRoleId === 5)
          .map((d: any) => ({
            id: d.company?.id || d.id,
            name: d.company?.name || d.name,
            description: d.company?.description || d.description || '',
            headquarters: d.company?.headquarters || d.headquarters || '',
            logoUrl: d.company?.logoUrl || d.logoUrl || '',
            website: d.company?.website || d.website || '',
            foundingYear: d.company?.foundingYear || d.foundingYear,
          }))
      : [],
    // Game publisher: companyRoleId = 4
    publisherCompanies: Array.isArray(data.companies)
      ? data.companies
          .filter((d: any) => d.companyRoleId === 4)
          .map((d: any) => ({
            id: d.company?.id || d.id,
            name: d.company?.name || d.name,
            description: d.company?.description || d.description || '',
            headquarters: d.company?.headquarters || d.headquarters || '',
            logoUrl: d.company?.logoUrl || d.logoUrl || '',
            website: d.company?.website || d.website || '',
            foundingYear: d.company?.foundingYear || d.foundingYear,
          }))
      : [],
    expansions: Array.isArray(data.expansions)
      ? data.expansions.map((e: any) => ({
          id: e.id,
          name: e.name,
          description: e.description || '',
          posterUrl: e.posterUrl || '',
          releaseDate: e.releaseDate || '',
          type: (e.type || 'expansion') as 'expansion' | 'remake', // expansion veya remake - explicit cast
        }))
      : [],

    // Genel
    themes: Array.isArray(data.themes) ? data.themes : [],
    moods: Array.isArray(data.moods) ? data.moods : [],
    ageRating: data.ageRating || null,
    awards: Array.isArray(data.awards) ? data.awards : [],
    additionalRatingCategories: Array.isArray(data.additionalRatingCategories)
      ? data.additionalRatingCategories
      : [],

    // Ekran görüntüleri - isSpoiler ve isSensitive alanı ile birlikte
    explicit: data.explicit ?? false,
    label: data.label || '',
    totalTracks: data.totalTracks ?? undefined,
    spotifyUrl: data.spotifyUrl || '',
    musicReleaseType: data.musicReleaseType || '',

    screenshots: (data.screenshots || []).map((s: any) => ({
      ...s,
      isSpoiler: s.isSpoiler ?? false,
      isSensitive: s.isSensitive ?? false, // Backend'den gelmeyebilir, default false
    })),

    // Trailer
    trailerUrl: data.trailerUrl || '',
    reviewVideoUrl: data.reviewVideoUrl || '',
    gameplayVideoUrl: data.gameplayVideoUrl || '',

    // Soundtrack
    spotifyPlaylistUrl: data.spotifyPlaylistUrl || '',

    // Similar Contents
    similarContents: Array.isArray(data.similarContents)
      ? data.similarContents.map((c: any) => ({ ...c, name: c.name || c.title || '' }))
      : [],

    // Citations Received
    citationsReceived: Array.isArray(data.citationsReceived)
      ? data.citationsReceived.map((c: any) => ({
          id: c.citingContentId,
          name: c.citingContent ? c.citingContent.name || c.citingContent.title || '' : '',
          posterUrl: c.citingContent ? c.citingContent.posterUrl : null,
          note: c.note || '',
          imageUrl: c.imageUrl || '',
          releaseDate: c.citingContent ? c.citingContent.releaseDate : null,
          contentTypeId: c.citingContent ? c.citingContent.contentTypeId : null,
        }))
      : [],

    // Citations Made
    citationsMade: Array.isArray(data.citationsMade)
      ? data.citationsMade.map((c: any) => ({
          id: c.citedContentId,
          name: c.citingContent ? c.citingContent.name || c.citingContent.title || '' : '',
          posterUrl: c.citingContent ? c.citingContent.posterUrl : null,
          note: c.note || '',
          imageUrl: c.imageUrl || '',
          releaseDate: c.citingContent ? c.citingContent.releaseDate : null,
          contentTypeId: c.citingContent ? c.citingContent.contentTypeId : null,
        }))
      : [],

    // Au image metadata
    autoFillSourceId:
      String(data.contentTypeId) === '3' && data.igdbId
        ? String(data.igdbId)
        : data.tmdbId
          ? String(data.tmdbId)
          : '',
    autoFillSource:
      data.igdbId && String(data.contentTypeId) === '3'
        ? 'igdb'
        : data.tmdbId && String(data.contentTypeId) === '2'
          ? 'tmdb_tv'
          : data.tmdbId && String(data.contentTypeId) === '1'
            ? 'tmdb_movie'
            : '',
  };
}
