import type { UnifiedContent } from '@/types/unified-content';

// ─── Content type identifier ─────────────────────────────────
export type ContentType = 'movie' | 'tv' | 'game' | 'book';

// ─── Per-item interaction state ──────────────────────────────
export interface ItemState {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
  rating: number | null;
  hasReview?: boolean;
}

export const DEFAULT_ITEM_STATE: ItemState = {
  isConsumed: false,
  isFavorite: false,
  isConsumeLater: false,
  isContinuing: false,
  rating: null,
  hasReview: false,
};

// ─── ContentSection props ────────────────────────────────────
export interface ContentSectionProps {
  title: string;
  emoji: string;
  href: string;
  items: UnifiedContent[];
  contentType: ContentType;
  itemStates: Record<string | number, ItemState>;
  onWatchToggle: (item: UnifiedContent, contentType: string) => void;
  onFavoriteToggle: (item: UnifiedContent, contentType: string) => void;
  onWatchlistToggle: (item: UnifiedContent, contentType: string) => void;
  onAddToList: (item: UnifiedContent, contentType: ContentType) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  hideWhenEmpty?: boolean;
  subtitleFn?: (releaseDate?: string) => string | null;
  useNextImage?: boolean;
  maxItems?: number;
}
