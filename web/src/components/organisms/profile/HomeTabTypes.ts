import type { Content } from '@/types/content';
import type { PersonData } from '@/services/graphql/person';

/** State for a single content item's user-interaction flags */
export interface ItemState {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
}

/** All item states keyed by content ID */
export type ItemStatesMap = Record<string | number, ItemState>;

/** Default state for an item with no existing state */
export const DEFAULT_ITEM_STATE: ItemState = {
  isConsumed: false,
  isFavorite: false,
  isConsumeLater: false,
  isContinuing: false,
};

/** Content type strings used across HomeTab sub-components */
export type FeaturedType = 'movies' | 'tv' | 'games' | 'books';
export type ContentType = 'movie' | 'tv' | 'game' | 'book';

/** Handlers passed from the hook to interactive components */
export interface ContentActionHandlers {
  handleWatchToggle: (item: Content) => Promise<void>;
  handleFavoriteToggle: (item: Content) => Promise<void>;
  handleWatchlistToggle: (item: Content) => Promise<void>;
  handleContinuingToggle: (item: Content) => Promise<void>;
  handleAddToList: (item: Content, contentType: ContentType) => void;
}

export interface HomeTabProps {
  username: string;
  recentMovies: Content[];
  recentTv?: Content[];
  recentGames?: Content[];
  recentBooks?: Content[];
  featuredMovies: Content[];
  featuredTv?: Content[];
  featuredGames?: Content[];
  featuredBooks?: Content[];
  favoritePeople?: PersonData[];
  allConsumedMovies?: Content[];
  allConsumedTv?: Content[];
  allConsumedGames?: Content[];
  allConsumedBooks?: Content[];
  activityFeed?: any[];
  stats: {
    totalMovies: number;
    thisYearMovies: number;
    averageRating: number;
    discussionCount: number;
  };
  isOwnProfile?: boolean;
  onFeaturedUpdate?: () => void;
  onShowAll?: (tabName: 'Movies' | 'TV' | 'Games' | 'Books' | 'Stats') => void;
}
