export function parseValidDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isFutureDate(value?: string | Date | null): boolean {
  const parsed = parseValidDate(value);
  return !!parsed && parsed.getTime() > Date.now();
}

export function isUpcomingStatus(status?: string | null): boolean {
  return status === 'upcoming';
}

export function isUpcomingContent({
  status,
  releaseDate,
}: {
  status?: string | null;
  releaseDate?: string | Date | null;
}): boolean {
  const parsedDate = parseValidDate(releaseDate);
  if (parsedDate) {
    return parsedDate.getTime() > Date.now();
  }
  return isUpcomingStatus(status);
}
