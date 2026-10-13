'use client';

import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Star,
  Type,
  Calendar,
  Clock,
} from 'lucide-react';
import { HideToggles } from '@/app/explore/[type]/components/HideToggles';
import type { HideOptions } from '@/app/explore/[type]/components/SortingBar';
import type { FilterMode } from '@/app/explore/[type]/components/FilterSidebar';

interface ProfileSortingBarProps {
  onSortChange: (sortBy: ProfileSortOption, order: 'asc' | 'desc' | 'none') => void;
  currentSort: ProfileSortOption;
  currentOrder: 'asc' | 'desc' | 'none';
  hideOptions?: HideOptions;
  onHideChange?: (key: keyof HideOptions, value: FilterMode) => void;
}

export type ProfileSortOption = 'popularity' | 'rating' | 'title' | 'releaseDate' | 'userDate';

export function ProfileSortingBar({
  onSortChange,
  currentSort,
  currentOrder,
  hideOptions,
  onHideChange,
}: ProfileSortingBarProps) {
  const hasActiveShowFilter = Object.values(hideOptions ?? {}).some((value) => value === 'show');
  const userDateLabel = hasActiveShowFilter ? 'Eklenme Tarihi' : 'İzlenme Tarihi';

  const sortOptions: { value: ProfileSortOption; label: string; icon: React.ElementType }[] = [
    { value: 'rating', label: 'Puan', icon: Star },
    { value: 'releaseDate', label: 'Yayınlanma Tarihi', icon: Calendar },
    { value: 'title', label: 'İsim', icon: Type },
    { value: 'popularity', label: 'Popülerlik', icon: TrendingUp },
    { value: 'userDate', label: userDateLabel, icon: Clock },
  ];

  const handleSortClick = (sortBy: ProfileSortOption) => {
    console.log(
      '[ProfileSortingBar] Sort clicked:',
      sortBy,
      'Current sort:',
      currentSort,
      'Current order:',
      currentOrder
    );

    if (currentSort === sortBy) {
      // Same sort option clicked - cycle through orders: desc -> asc -> none
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
      // Different sort option - start with desc
      onSortChange(sortBy, 'desc');
    }
  };

  const getOrderIcon = (sortOption: ProfileSortOption) => {
    if (currentSort !== sortOption || currentOrder === 'none') {
      return null;
    }
    return currentOrder === 'desc' ? ArrowDown : ArrowUp;
  };

  return (
    <div className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
      {/* Sort Options */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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
                title={`${option.label} - Çoktan Aza → Azdan Çoka → Kapalı`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40'}`} />
                {option.label}
                {OrderIcon && <OrderIcon className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hide Toggle Icons - same as explore page */}
      {hideOptions && onHideChange && (
        <HideToggles hideOptions={hideOptions} onHideChange={onHideChange} />
      )}
    </div>
  );
}
