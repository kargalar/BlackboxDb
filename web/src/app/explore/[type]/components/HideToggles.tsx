'use client';

import { Eye, Play, Heart, Ban, ListChecks } from 'lucide-react';
import { BookmarkIcon } from '@/components/atoms/icons/BookmarkIcon';
import type { HideOptions } from './SortingBar';
import { type FilterMode } from './FilterSidebar';
import { useTranslations } from 'next-intl';

interface HideTogglesProps {
  hideOptions: HideOptions;
  onHideChange: (key: keyof HideOptions, value: FilterMode) => void;
}

const TOGGLE_ITEMS: {
  key: keyof HideOptions;
  icon: React.ElementType;
}[] = [
  {
    key: 'hideWatched',
    icon: Eye,
  },
  {
    key: 'hideWatchlist',
    icon: BookmarkIcon,
  },
  {
    key: 'hideContinuing',
    icon: Play,
  },
  {
    key: 'hideFavorites',
    icon: Heart,
  },
  {
    key: 'hideAbandoned',
    icon: Ban,
  },
  {
    key: 'hideInAnyList',
    icon: ListChecks,
  },
];

export function HideToggles({ hideOptions, onHideChange }: HideTogglesProps) {
  const t = useTranslations('Explore.HideToggles');

  const handleToggle = (key: keyof HideOptions, currentState: FilterMode) => {
    let nextState: FilterMode;
    if (currentState === 'passive') nextState = 'show';
    else if (currentState === 'show') nextState = 'hide';
    else nextState = 'passive';

    onHideChange(key, nextState);
  };

  return (
    <div className="flex items-center gap-1.5">
      {TOGGLE_ITEMS.map(({ key, icon: Icon }) => {
        const state = hideOptions[key] || 'passive';
        const translationKey = key.replace('hide', '').toLowerCase();

        let buttonStyle = 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/35'; // passive
        let label = t(`${translationKey}.passive`);

        if (state === 'show') {
          buttonStyle = 'bg-white/30 text-white shadow-md';
          label = t(`${translationKey}.show`);
        } else if (state === 'hide') {
          buttonStyle =
            'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30';
          label = t(`${translationKey}.hide`);
        }

        return (
          <button
            key={key}
            onClick={() => handleToggle(key, state)}
            className={`p-2 rounded-lg transition-all duration-200 border border-transparent ${buttonStyle}`}
            aria-label={label}
            aria-pressed={state === 'show' ? true : state === 'hide' ? 'mixed' : false}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
