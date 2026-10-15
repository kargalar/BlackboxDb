import type { Route } from 'next';

export function getProfileContentTypeLabel(
  contentTypeId?: number,
  contentId?: string,
  typeSlug?: string
) {
  if (typeSlug) {
    const labels: Record<string, string> = {
      movie: 'Film',
      tv: 'Dizi',
      game: 'Oyun',
      book: 'Kitap',
    };
    return labels[typeSlug] || typeSlug;
  }
  if (contentTypeId) {
    switch (contentTypeId) {
      case 1:
        return 'Film';
      case 2:
        return 'Dizi';
      case 3:
        return 'Oyun';
      case 4:
        return 'Kitap';
    }
  }

  if (contentId) {
    const typeFromId = parseInt(contentId.split('-')[0], 10);

    switch (typeFromId) {
      case 1:
        return 'Film';
      case 2:
        return 'Dizi';
      case 3:
        return 'Oyun';
      case 4:
        return 'Kitap';
    }
  }

  return 'Genel';
}

export function getProfileContentRoute(
  contentId: string,
  contentTypeId?: number,
  typeSlug?: string
): Route {
  if (typeSlug) return `/content/${typeSlug}/${contentId}` as Route;
  if (contentTypeId) {
    switch (contentTypeId) {
      case 1:
        return `/content/movie/${contentId}` as Route;
      case 2:
        return `/content/tv/${contentId}` as Route;
      case 3:
        return `/content/game/${contentId}` as Route;
      case 4:
        return `/content/book/${contentId}` as Route;
    }
  }

  const typeFromId = parseInt(contentId.split('-')[0], 10);

  switch (typeFromId) {
    case 1:
      return `/content/movie/${contentId}` as Route;
    case 2:
      return `/content/tv/${contentId}` as Route;
    case 3:
      return `/content/game/${contentId}` as Route;
    case 4:
      return `/content/book/${contentId}` as Route;
    default:
      return '/discussions' as Route;
  }
}
