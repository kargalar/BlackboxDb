import type { AddContentFormData } from '../types';

const FORM_TO_INPUT_KEYS: Record<string, string[]> = {
  title: ['title'],
  originalTitle: ['originalTitle'],
  alternativeTitles: ['alternativeTitles'],
  description: ['description'],
  releaseDate: ['releaseDate'],
  runtime: ['runtime'],
  posterUrl: ['posterUrl'],
  backdropUrl: ['backdropUrl'],
  genres: ['genres'],
  franchise: ['franchiseId', 'franchiseName'],
  languages: ['languages'],
  themes: ['themes'],
  moods: ['moods'],
  ageRating: ['ageRatingId', 'ageRatingName'],
  awards: ['awards'],
  additionalRatingCategories: ['additionalRatingCategories'],
  budget: ['budget'],
  revenue: ['revenue'],
  cast: ['cast'],
  crew: ['crew'],
  tvType: ['tvType'],
  inProduction: ['inProduction'],
  firstAirDate: ['firstAirDate'],
  lastAirDate: ['lastAirDate', 'inProduction'],
  seasons: ['seasons'],
  isbn: ['isbn', 'bookPublications'],
  pageCount: ['pageCount', 'bookPublications'],
  translators: ['bookPublications', 'crew'],
  bookPublications: ['bookPublications', 'companies', 'crew', 'isbn', 'pageCount'],
  authors: ['crew'],
  publisher: ['companies', 'bookPublications'],
  previewLink: ['previewLink'],
  infoLink: ['infoLink'],
  gameModes: ['gameModes'],
  gameEngines: ['gameEngines'],
  perspectives: ['perspectives'],
  platforms: ['platforms'],
  fileSize: ['fileSize'],
  developerCompanies: ['companies'],
  publisherCompanies: ['companies'],
  studios: ['companies'],
  expansions: ['expansions'],
  screenshots: ['screenshots'],
  trailerUrl: ['trailerUrl'],
  reviewVideoUrl: ['reviewVideoUrl'],
  gameplayVideoUrl: ['gameplayVideoUrl'],
  spotifyPlaylistUrl: ['spotifyPlaylistUrl'],
  similarContents: ['similarContentIds'],
  numberOfEpisodes: ['numberOfEpisodes'],
  numberOfSeasons: ['numberOfSeasons'],
  averageDuration: ['averageDuration'],
  autoSelectHighestVotedMedia: ['autoSelectHighestVotedMedia'],
};

const ARRAY_INPUT_KEYS = new Set([
  'alternativeTitles',
  'genres',
  'languages',
  'themes',
  'moods',
  'awards',
  'additionalRatingCategories',
  'gameModes',
  'gameEngines',
  'perspectives',
  'platforms',
  'companies',
  'screenshots',
  'expansions',
  'bookPublications',
  'similarContentIds',
]);

const JSON_ARRAY_STRING_INPUT_KEYS = new Set(['cast', 'crew', 'seasons']);

const NULLABLE_SCALAR_INPUT_KEYS = new Set([
  'originalTitle',
  'description',
  'releaseDate',
  'runtime',
  'posterUrl',
  'backdropUrl',
  'franchiseId',
  'franchiseName',
  'ageRatingId',
  'ageRatingName',
  'budget',
  'revenue',
  'status',
  'isContinuing',
  'tvType',
  'inProduction',
  'firstAirDate',
  'lastAirDate',
  'isbn',
  'pageCount',
  'previewLink',
  'infoLink',
  'trailerUrl',
  'reviewVideoUrl',
  'gameplayVideoUrl',
  'spotifyPlaylistUrl',
  'fileSize',
  'autoSelectHighestVotedMedia',
]);

function getFallbackPatchValue(inputKey: string) {
  if (ARRAY_INPUT_KEYS.has(inputKey)) return [];
  if (JSON_ARRAY_STRING_INPUT_KEYS.has(inputKey)) return '[]';
  if (NULLABLE_SCALAR_INPUT_KEYS.has(inputKey)) return null;
  return undefined;
}

export function buildPatchInput(fullInput: Record<string, any>, changedKeys: string[]) {
  const patch: Record<string, any> = {};
  const inputKeys = new Set<string>();

  for (const changedKey of changedKeys) {
    for (const inputKey of FORM_TO_INPUT_KEYS[changedKey] || [changedKey]) {
      inputKeys.add(inputKey);
    }
  }

  for (const inputKey of inputKeys) {
    if (
      Object.prototype.hasOwnProperty.call(fullInput, inputKey) &&
      fullInput[inputKey] !== undefined
    ) {
      patch[inputKey] = fullInput[inputKey];
      continue;
    }

    const fallbackValue = getFallbackPatchValue(inputKey);
    if (fallbackValue !== undefined) {
      patch[inputKey] = fallbackValue;
    }
  }

  return patch;
}

export function buildChangedFormPayload(formData: AddContentFormData, changedKeys: string[]) {
  if (changedKeys.length === 0) return {};
  const payload: Record<string, any> = {};
  for (const key of changedKeys) {
    payload[key] = (formData as any)[key];
  }
  if (formData.contentTypeId) payload.contentTypeId = formData.contentTypeId;
  return payload;
}
