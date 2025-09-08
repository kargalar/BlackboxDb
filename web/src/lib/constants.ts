export const CONTENT_TYPE = {
  MOVIE: 1,
  GAME: 2,
  TV: 3,
  BOOK: 4,
} as const;

export type ContentTypeId = typeof CONTENT_TYPE[keyof typeof CONTENT_TYPE];
