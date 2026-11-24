'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apolloClient } from '@/lib/apollo-client';
import { UPDATE_PREFERENCES } from '@/services/graphql/auth';

export type PosterIconsPosition = 'above' | 'below' | 'off';

export const GRID_COLUMN_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export const GRID_ROW_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const GUEST_GRID_STORAGE_KEY = 'blackbox_grid_preferences';

type GuestGridPrefs = {
  gridColumns?: number;
  gridRows?: number;
};

export function isValidGridColumns(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 3 && value <= 10;
}

export function isValidGridRows(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 2 && value <= 10;
}

function normalizeGridOption(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function parseGuestGridPrefs(raw: string | null): GuestGridPrefs | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const next: GuestGridPrefs = {};
    if (isValidGridColumns(parsed.gridColumns)) next.gridColumns = parsed.gridColumns;
    if (isValidGridRows(parsed.gridRows)) next.gridRows = parsed.gridRows;
    return next.gridColumns !== undefined || next.gridRows !== undefined ? next : null;
  } catch {
    return null;
  }
}

let cachedGuestGridPrefs: GuestGridPrefs | null = null;
let guestPrefsLoaded = false;
let latestGridMutationId = 0;
const guestGridListeners = new Set<() => void>();

function getGuestGridSnapshot(): GuestGridPrefs | null {
  if (typeof window === 'undefined') return null;
  if (!guestPrefsLoaded) {
    guestPrefsLoaded = true;
    try {
      cachedGuestGridPrefs = parseGuestGridPrefs(window.localStorage.getItem(GUEST_GRID_STORAGE_KEY));
    } catch {
      cachedGuestGridPrefs = null;
    }
  }
  return cachedGuestGridPrefs;
}

function getServerGuestGridSnapshot(): GuestGridPrefs | null {
  return null;
}

function subscribeGuestGridPrefs(listener: () => void): () => void {
  guestGridListeners.add(listener);
  if (typeof window === 'undefined') {
    return () => {
      guestGridListeners.delete(listener);
    };
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== GUEST_GRID_STORAGE_KEY) return;
    guestPrefsLoaded = true;
    cachedGuestGridPrefs = parseGuestGridPrefs(event.newValue);
    listener();
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    guestGridListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function setGuestGridPrefs(next: GuestGridPrefs) {
  guestPrefsLoaded = true;
  cachedGuestGridPrefs = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(GUEST_GRID_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota or privacy-mode errors; in-memory store still updates immediately.
    }
  }
  guestGridListeners.forEach((listener) => listener());
}

export function resetGuestGridPrefsForTest() {
  cachedGuestGridPrefs = null;
  guestPrefsLoaded = false;
  latestGridMutationId = 0;
}

/** Resolve the effective poster icons position from the tri-state field or legacy boolean. */
export function resolvePosterIconsPosition(
  posterIconsPosition?: string | null,
  posterIconsBelow?: boolean | null
): PosterIconsPosition {
  if (
    posterIconsPosition === 'above' ||
    posterIconsPosition === 'below' ||
    posterIconsPosition === 'off'
  ) {
    return posterIconsPosition;
  }
  return posterIconsBelow === false ? 'above' : 'below';
}

/** Default preferences for unauthenticated or new users */
const DEFAULTS = {
  preferredContentTypes: [1, 2, 3, 4, 5],
  gridColumns: 5,
  gridRows: 4,
  posterZoomEnabled: false,
  posterIconsBelow: true,
  posterIconsPosition: 'below' as PosterIconsPosition,
  posterRatingEnabled: false,
  showSensitiveContent: false,
  splitHomePopularSections: false,
};

/**
 * Tailwind grid column class mapping for responsive poster grids.
 * Maps user preference (3-7) to responsive breakpoint classes.
 * Uses explicit class names so Tailwind can detect them at build time.
 */
const GRID_CLASS_MAP: Record<number, string> = {
  3: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  7: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7',
  8: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
  9: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9',
  10: 'grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10',
};

/**
 * Hook to access user preferences with sensible defaults.
 * Returns preferences and grid utility classes.
 */
export function useUserPreferences() {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const updateUserPreferences = auth?.updateUserPreferences;
  const guestPrefs = useSyncExternalStore(
    subscribeGuestGridPrefs,
    getGuestGridSnapshot,
    getServerGuestGridSnapshot
  );

  const preferredContentTypes = user?.preferredContentTypes?.length
    ? user.preferredContentTypes.includes(5)
      ? user.preferredContentTypes
      : [...user.preferredContentTypes, 5]
    : DEFAULTS.preferredContentTypes;

  const gridColumns = user
    ? user.gridColumns || DEFAULTS.gridColumns
    : (guestPrefs?.gridColumns ?? DEFAULTS.gridColumns);
  const gridRows = user
    ? user.gridRows || DEFAULTS.gridRows
    : (guestPrefs?.gridRows ?? DEFAULTS.gridRows);
  const posterZoomEnabled = user?.posterZoomEnabled === true;
  const posterIconsPosition = resolvePosterIconsPosition(
    user?.posterIconsPosition,
    user?.posterIconsBelow
  );
  const posterIconsBelow = posterIconsPosition === 'below';
  const showSensitiveContent = user?.showSensitiveContent === true;
  const preferredGamePlatformIds = user?.preferredGamePlatformIds?.length
    ? user.preferredGamePlatformIds
    : user?.preferredGamePlatformId
      ? [user.preferredGamePlatformId]
      : [];
  const splitHomePopularSections = user?.splitHomePopularSections === true;

  const gridClassName = GRID_CLASS_MAP[gridColumns] || GRID_CLASS_MAP[5];

  const setGridLayout = useCallback(
    async ({
      gridColumns: nextColumnsInput,
      gridRows: nextRowsInput,
    }: {
      gridColumns?: number;
      gridRows?: number;
    }): Promise<boolean> => {
      const nextColumns = normalizeGridOption(nextColumnsInput, gridColumns, 3, 10);
      const nextRows = normalizeGridOption(nextRowsInput, gridRows, 2, 10);

      if (nextColumns === gridColumns && nextRows === gridRows) {
        return true;
      }

      if (!user) {
        setGuestGridPrefs({ gridColumns: nextColumns, gridRows: nextRows });
        return true;
      }

      const previous = { gridColumns, gridRows };
      updateUserPreferences?.({ gridColumns: nextColumns, gridRows: nextRows });
      const mutationId = ++latestGridMutationId;

      try {
        await apolloClient.mutate({
          mutation: UPDATE_PREFERENCES,
          variables: {
            gridColumns: nextColumns,
            gridRows: nextRows,
          },
        });
        return true;
      } catch (error) {
        if (latestGridMutationId === mutationId) {
          updateUserPreferences?.(previous);
        }
        console.error('Error saving grid layout preference:', error);
        return false;
      }
    },
    [user, gridColumns, gridRows, updateUserPreferences]
  );

  return {
    preferredContentTypes,
    gridColumns,
    gridRows,
    posterZoomEnabled,
    posterIconsBelow,
    posterIconsPosition,
    posterRatingEnabled: user?.posterRatingEnabled ?? DEFAULTS.posterRatingEnabled,
    showSensitiveContent,
    preferredGamePlatformIds,
    splitHomePopularSections,
    /** Responsive Tailwind grid column classes based on user preference */
    gridClassName,
    setGridLayout,
  };
}
