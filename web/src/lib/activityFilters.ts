export type ActivityLike = {
  isConsumed?: unknown;
  isConsumeLater?: unknown;
  isFavorite?: unknown;
  rating?: unknown;
};

function normalizeBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    // Common truthy/falsey representations coming from DB layers
    if (
      trimmed === 'true' ||
      trimmed === '1' ||
      trimmed === 'yes' ||
      trimmed === 'y' ||
      trimmed === 't' ||
      trimmed === 'on'
    )
      return true;
    if (
      trimmed === 'false' ||
      trimmed === '0' ||
      trimmed === 'no' ||
      trimmed === 'n' ||
      trimmed === 'f' ||
      trimmed === 'off'
    )
      return false;

    // Unknown string → be conservative (treat as false)
    return false;
  }

  // Unknown non-string values: be conservative.
  // (We avoid `Boolean(value)` here because objects / unexpected values could become truthy.)
  return false;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * "Consumed" activity definition:
 * - explicitly consumed OR
 * - has a positive rating
 *
 * This intentionally excludes pure favorite/watchlater-only events.
 */
export function isConsumedActivity(activity: ActivityLike | null | undefined): boolean {
  if (!activity) return false;

  const isConsumed = normalizeBoolean(
    (activity as any).isConsumed ?? (activity as any).is_consumed
  );
  const rating = normalizeNumber((activity as any).rating);

  return isConsumed === true || rating > 0;
}

export function filterConsumedActivities<T extends ActivityLike>(
  activities: T[] | null | undefined
): {
  items: T[];
  originalCount: number;
  consumedCount: number;
} {
  const list = Array.isArray(activities) ? activities : [];
  const items = list.filter(isConsumedActivity);
  return {
    items,
    originalCount: list.length,
    consumedCount: items.length,
  };
}
