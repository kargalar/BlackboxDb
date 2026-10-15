import { AddContentFormData } from '../types';

/**
 * Checks whether a given tab has any data filled in.
 * Returns true if at least one relevant field for that tab has data.
 */
export function isTabFilled(tabId: string, formData: AddContentFormData): boolean {
  switch (tabId) {
    case 'basic':
      if (formData.contentTypeId === '4') {
        return !!(
          formData.title?.trim() ||
          formData.description?.trim() ||
          formData.ageRating ||
          formData.franchise ||
          (formData.genres?.length ?? 0) > 0 ||
          (formData.themes?.length ?? 0) > 0 ||
          (formData.moods?.length ?? 0) > 0
        );
      }

      return !!(
        formData.title?.trim() ||
        formData.originalTitle?.trim() ||
        formData.description?.trim() ||
        formData.releaseDate?.trim() ||
        formData.firstAirDate?.trim() ||
        formData.lastAirDate?.trim() ||
        formData.posterUrl?.trim() ||
        formData.backdropUrl?.trim() ||
        formData.ageRating ||
        formData.franchise ||
        (formData.genres?.length ?? 0) > 0 ||
        (formData.themes?.length ?? 0) > 0 ||
        (formData.moods?.length ?? 0) > 0 ||
        (formData.languages?.length ?? 0) > 0
      );

    case 'movie-info':
      return !!(
        formData.runtime?.trim() ||
        formData.budget?.trim() ||
        formData.revenue?.trim() ||
        (formData.studios?.length ?? 0) > 0
      );

    case 'tv-info':
      return !!((formData.studios?.length ?? 0) > 0);

    case 'tv-seasons':
      return (formData.seasons?.length ?? 0) > 0;

    case 'cast-crew':
      return (formData.cast?.length ?? 0) > 0 || (formData.crew?.length ?? 0) > 0;

    case 'game-info':
      return !!(
        (formData.gameModes?.length ?? 0) > 0 ||
        (formData.gameEngines?.length ?? 0) > 0 ||
        (formData.perspectives?.length ?? 0) > 0 ||
        (formData.platforms?.length ?? 0) > 0 ||
        (formData.developerCompanies?.length ?? 0) > 0 ||
        (formData.publisherCompanies?.length ?? 0) > 0
      );

    case 'game-expansions':
      return (formData.expansions?.length ?? 0) > 0;

    case 'media':
      return !!(formData.posterUrl?.trim() || formData.backdropUrl?.trim());

    case 'videos':
      return !!(
        formData.trailerUrl?.trim() ||
        formData.reviewVideoUrl?.trim() ||
        formData.gameplayVideoUrl?.trim()
      );

    case 'book-info': {
      const hasBookPublication = (formData.bookPublications || []).some(
        (publication) =>
          publication.title?.trim() ||
          publication.subtitle?.trim() ||
          publication.isbn?.trim() ||
          publication.pageCount?.trim() ||
          (Array.isArray(publication.translators)
            ? publication.translators.length > 0
            : publication.translators?.trim()) ||
          publication.language?.trim() ||
          publication.coverUrl?.trim() ||
          publication.publishedDate?.trim() ||
          publication.editionType?.trim() ||
          publication.format?.trim() ||
          publication.publisher ||
          publication.isAbridged
      );
      return !!((formData.authors?.length ?? 0) > 0 || hasBookPublication);
    }

    case 'screenshots':
      return (formData.screenshots?.length ?? 0) > 0;

    case 'soundtrack':
      return !!formData.spotifyPlaylistUrl?.trim();

    case 'similar-contents':
      return (formData.similarContents?.length ?? 0) > 0;

    case 'citations':
      return (
        (formData.citationsReceived?.length ?? 0) > 0 || (formData.citationsMade?.length ?? 0) > 0
      );

    default:
      return false;
  }
}
