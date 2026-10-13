export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_CONTENT_LIST_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const MAX_PAGE_OFFSET = 100_000;

export function normalizePageSize(
  value: number | null | undefined,
  defaultValue = DEFAULT_PAGE_SIZE,
  maximum = MAX_PAGE_SIZE,
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return defaultValue;
  }

  return Math.min(Math.max(Math.trunc(value), 1), maximum);
}

export function normalizePageOffset(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), MAX_PAGE_OFFSET);
}
