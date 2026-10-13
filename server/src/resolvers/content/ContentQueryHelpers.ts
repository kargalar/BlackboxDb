export const CONTENT_TYPE_IDS = {
  movie: 1,
  tv: 2,
  game: 3,
  book: 4,
  music: 5,
} as const;

export function isMissingBookPublicationTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const prismaError = error as { code?: string; message?: string };
  if (prismaError.code === "P2021") {
    return (prismaError.message || "").includes("book_publication");
  }

  return (prismaError.message || "").includes("book_publication");
}

export function getLengthFieldForContentType(
  contentTypeId?: number,
): "runtime" | "averageDuration" | "pageCount" | undefined {
  if (contentTypeId === CONTENT_TYPE_IDS.game) return "averageDuration";
  if (contentTypeId === CONTENT_TYPE_IDS.tv) return "averageDuration";
  if (contentTypeId === CONTENT_TYPE_IDS.movie) return "runtime";
  if (contentTypeId === CONTENT_TYPE_IDS.book) return "pageCount";
  return undefined;
}

export function buildLengthWhere(
  min: number | undefined,
  max: number | undefined,
  contentTypeId?: number,
) {
  const condition: any = {};
  if (min !== undefined) condition.gte = min;
  if (max !== undefined) condition.lte = max;

  const lengthField = getLengthFieldForContentType(contentTypeId);
  if (lengthField) return { [lengthField]: condition };

  return {
    OR: [
      { runtime: condition },
      { averageDuration: condition },
      { pageCount: condition },
    ],
  };
}
