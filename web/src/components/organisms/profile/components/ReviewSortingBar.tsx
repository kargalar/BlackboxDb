'use client';

import { ArrowDown, ArrowUp, Calendar, Star } from 'lucide-react';

export type ReviewSortField = 'date' | 'score';
export type ReviewSortOrder = 'asc' | 'desc' | 'none';

interface ReviewSortingBarProps {
  currentSort: ReviewSortField;
  currentOrder: ReviewSortOrder;
  onSortChange: (sortBy: ReviewSortField, order: ReviewSortOrder) => void;
}

const SORT_OPTIONS: { value: ReviewSortField; label: string; icon: React.ElementType }[] = [
  { value: 'date', label: 'Tarih', icon: Calendar },
  { value: 'score', label: 'Puan', icon: Star },
];

export default function ReviewSortingBar({
  currentSort,
  currentOrder,
  onSortChange,
}: ReviewSortingBarProps) {
  const handleSortClick = (sortBy: ReviewSortField) => {
    if (currentSort === sortBy) {
      let nextOrder: ReviewSortOrder;

      if (currentOrder === 'desc') {
        nextOrder = 'asc';
      } else if (currentOrder === 'asc') {
        nextOrder = 'none';
      } else {
        nextOrder = 'desc';
      }

      onSortChange(sortBy, nextOrder);
      return;
    }

    onSortChange(sortBy, 'desc');
  };

  const getOrderIcon = (sortBy: ReviewSortField) => {
    if (currentSort !== sortBy || currentOrder === 'none') {
      return null;
    }

    return currentOrder === 'desc' ? ArrowDown : ArrowUp;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {SORT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const OrderIcon = getOrderIcon(option.value);
        const isActive = currentSort === option.value && currentOrder !== 'none';

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSortClick(option.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
            aria-pressed={isActive}
            title={`${option.label} - Çoktan aza → Azdan çoka → Kapalı`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40'}`} />
            <span>{option.label}</span>
            {OrderIcon && <OrderIcon className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}
