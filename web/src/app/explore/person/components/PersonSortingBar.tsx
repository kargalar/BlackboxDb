'use client';

import { ArrowUp, ArrowDown, Type, Briefcase } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type PersonSortOption = 'name' | 'roleCount';
export type SortOrder = 'asc' | 'desc' | 'none';

interface PersonSortingBarProps {
  onSortChange: (sortBy: PersonSortOption, order: SortOrder) => void;
  currentSort: PersonSortOption;
  currentOrder: SortOrder;
}

export function PersonSortingBar({
  onSortChange,
  currentSort,
  currentOrder,
}: PersonSortingBarProps) {
  const t = useTranslations('Explore.Person.sorting');
  const tSortingBar = useTranslations('Explore.SortingBar');

  const sortOptions: { value: PersonSortOption; label: string; icon: React.ElementType }[] = [
    { value: 'name', label: t('name'), icon: Type },
    { value: 'roleCount', label: t('roleCount'), icon: Briefcase },
  ];

  const handleSortClick = (sortBy: PersonSortOption) => {
    if (currentSort === sortBy) {
      let newOrder: SortOrder;
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

  const getOrderIcon = (sortOption: PersonSortOption) => {
    if (currentSort !== sortOption || currentOrder === 'none') {
      return null;
    }
    return currentOrder === 'desc' ? ArrowDown : ArrowUp;
  };

  return (
    <div className="glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
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
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
                title={tSortingBar('tooltip', { label: option.label })}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/40'}`} />
                {option.label}
                {OrderIcon && <OrderIcon className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
