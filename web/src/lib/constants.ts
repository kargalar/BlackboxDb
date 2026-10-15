export const CONTENT_TYPE = {
  MOVIE: 1,
  TV: 2,
  GAME: 3,
  BOOK: 4,
} as const;

export type ContentTypeId = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE];
