type InferContentStatusParams = {
  contentTypeId: number;
  releaseDate?: string | Date | null;
  firstAirDate?: string | Date | null;
  lastAirDate?: string | Date | null;
  inProduction?: boolean | null;
};

function toValidDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isFutureDate(value?: string | Date | null): boolean {
  const parsed = toValidDate(value);
  return !!parsed && parsed.getTime() > Date.now();
}

export function isUpcomingStatus(status?: string | null): boolean {
  return status === "upcoming";
}

export function inferNormalizedContentStatus({
  contentTypeId,
  releaseDate,
  firstAirDate,
  lastAirDate,
  inProduction,
}: InferContentStatusParams): "upcoming" | "ongoing" | "finished" {
  if (contentTypeId === 2) {
    if (!toValidDate(firstAirDate)) {
      return "upcoming";
    }

    if (isFutureDate(firstAirDate)) {
      return "upcoming";
    }

    if (inProduction || !toValidDate(lastAirDate)) {
      return "ongoing";
    }

    return "finished";
  }

  if (!toValidDate(releaseDate)) {
    return "upcoming";
  }

  if (isFutureDate(releaseDate)) {
    return "upcoming";
  }

  return "finished";
}
