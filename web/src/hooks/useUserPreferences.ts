'use client';

import { useAuth } from '@/contexts/AuthContext';

/** Default preferences for unauthenticated or new users */
const DEFAULTS = {
  preferredContentTypes: [1, 2, 3, 4, 5],
  gridColumns: 5,
  gridRows: 4,
  posterZoomEnabled: false,
  posterIconsBelow: true,
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
  const { user } = useAuth();

  const preferredContentTypes = user?.preferredContentTypes?.length
    ? user.preferredContentTypes.includes(5)
      ? user.preferredContentTypes
      : [...user.preferredContentTypes, 5]
    : DEFAULTS.preferredContentTypes;

  const gridColumns = user?.gridColumns || DEFAULTS.gridColumns;
  const gridRows = user?.gridRows || DEFAULTS.gridRows;
  const posterZoomEnabled = user?.posterZoomEnabled === true;
  const posterIconsBelow = user?.posterIconsBelow !== false;
  const showSensitiveContent = user?.showSensitiveContent === true;
  const preferredGamePlatformIds = user?.preferredGamePlatformIds?.length
    ? user.preferredGamePlatformIds
    : user?.preferredGamePlatformId
      ? [user.preferredGamePlatformId]
      : [];
  const splitHomePopularSections = user?.splitHomePopularSections === true;

  const gridClassName = GRID_CLASS_MAP[gridColumns] || GRID_CLASS_MAP[5];

  return {
    preferredContentTypes,
    gridColumns,
    gridRows,
    posterZoomEnabled,
    posterIconsBelow,
    posterRatingEnabled: user?.posterRatingEnabled ?? DEFAULTS.posterRatingEnabled,
    showSensitiveContent,
    preferredGamePlatformIds,
    splitHomePopularSections,
    /** Responsive Tailwind grid column classes based on user preference */
    gridClassName,
  };
}
