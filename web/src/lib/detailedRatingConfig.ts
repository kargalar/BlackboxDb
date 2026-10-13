export const BASE_RATING_CATEGORIES = ['story', 'originality'] as const;

const TYPE_RATING_CATEGORIES: Record<string, readonly string[]> = {
  movie: ['acting', 'cinematography'],
  tv: ['acting', 'cinematography'],
  game: ['graphics', 'gameplay'],
  book: ['writing', 'character'],
  music: ['vocals', 'lyrics', 'production'],
};

export const ADDITIONAL_RATING_CATEGORIES = [
  'hitFeel',
  'soundtrack',
  'worldBuilding',
  'pacing',
  'emotionalImpact',
  'replayability',
  'voiceActing',
  'difficulty',
  'levelDesign',
] as const;

export function getBaseRatingCategories(type: string): string[] {
  return [...BASE_RATING_CATEGORIES, ...(TYPE_RATING_CATEGORIES[type] || [])];
}

export function getRatingCategories(type: string, additionalCategories: string[] = []): string[] {
  return [...new Set([...getBaseRatingCategories(type), ...additionalCategories])];
}
