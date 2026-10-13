'use client';

import { useSyncExternalStore } from 'react';
import {
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Star,
  Type,
  Calendar,
  Eye,
  Clock,
  Timer,
  Play,
  Heart,
  LayoutGrid,
  Database,
} from 'lucide-react';
import { HideToggles } from './HideToggles';
import { type FilterMode } from './FilterSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';

export interface HideOptions {
  hideWatched: FilterMode;
  hideWatchlist: FilterMode;
  hideContinuing: FilterMode;
  hideFavorites: FilterMode;
  hideAbandoned: FilterMode;
  hideInAnyList: FilterMode;
}

interface SortingBarProps {
  onSortChange: (sortBy: SortOption, order: 'asc' | 'desc' | 'none') => void;
  currentSort: SortOption;
  currentOrder: 'asc' | 'desc' | 'none';
  searchQuery?: string;
  hideOptions: HideOptions;
  onHideChange: (key: keyof HideOptions, value: FilterMode) => void;
  showCustomSort?: boolean;
  lengthSortLabel?: string;
}

export type SortOption =
  | 'popularity'
  | 'rating'
  | 'title'
  | 'releaseDate'
  | 'duration'
  | 'custom'
  | 'userDate'
  | 'createdAt';

const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function SortingBar({
  onSortChange,
  currentSort,
  currentOrder,
  searchQuery,
  hideOptions,
  onHideChange,
  showCustomSort = false,
  lengthSortLabel,
}: SortingBarProps) {
  const { isPrivileged } = useAuth();
  const isMounted = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot
  );

  const t = useTranslations('Explore.SortingBar');
  const hasActiveShowFilter = Object.values(hideOptions).some((value) => value === 'show');
  const showUserDateSort = hasActiveShowFilter || currentSort === 'userDate';

  const sortOptions: { value: SortOption; label: string; icon: React.ElementType }[] = [
    ...(showCustomSort
      ? [{ value: 'custom' as SortOption, label: t('options.custom'), icon: LayoutGrid }]
      : []),
    { value: 'popularity', label: t('options.popularity'), icon: TrendingUp },
    { value: 'rating', label: t('options.rating'), icon: Star },
    { value: 'title', label: t('options.title'), icon: Type },
    { value: 'releaseDate', label: t('options.releaseDate'), icon: Calendar },
    { value: 'duration', label: lengthSortLabel || '', icon: Timer },
    ...(showUserDateSort
      ? [{ value: 'userDate' as SortOption, label: t('options.userDate'), icon: Clock }]
      : []),
    ...(isMounted && isPrivileged
      ? [{ value: 'createdAt' as SortOption, label: t('options.createdAt'), icon: Database }]
      : []),
  ];

  const handleSortClick = (sortBy: SortOption) => {
    if (currentSort === sortBy) {
      let newOrder: 'asc' | 'desc' | 'none';
      if (currentOrder === 'desc') {
        newOrder = 'asc';
      } else if (currentOrder === 'asc') {
        newOrder = 'none';
      } else {
        newOrder = 'desc';
      }
      onSortChange(sortBy, newOrder);
    } else {
      onSortChange(sortBy, 'desc');
    }
  };

  const getOrderIcon = (sortOption: SortOption) => {
    if (currentSort !== sortOption || currentOrder === 'none') {
      return null;
    }
    return currentOrder === 'desc' ? ArrowDown : ArrowUp;
  };

  return (
    <div className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
      {/* Sort Options */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            const isActive = currentSort === option.value && currentOrder !== 'none';
            const OrderIcon = getOrderIcon(option.value);
            return (
              <button
                key={option.value}
                onClick={() => handleSortClick(option.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
                aria-pressed={isActive}
                title={t('tooltip', { label: option.label })}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40'}`} />
                {option.label}
                {OrderIcon && <OrderIcon className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hide Toggle Icons */}
      <HideToggles hideOptions={hideOptions} onHideChange={onHideChange} />
    </div>
  );
}
