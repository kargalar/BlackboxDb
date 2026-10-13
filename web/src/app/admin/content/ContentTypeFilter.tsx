'use client';

import { useTranslations } from 'next-intl';

interface ContentTypeFilterProps {
  activeType: number;
  onTypeChange: (typeId: number) => void;
  counts?: Record<number, number>;
  contentTypes: Array<{ id: number; name: string; slug: string }>;
}

const ICONS: Record<string, string> = {
  movie: '🎬',
  tv: '📺',
  game: '🎮',
  book: '📚',
  music: '🎵',
  podcast: '🎙️',
  theater: '🎭',
  concert: '🎤',
};

const LABEL_KEYS: Record<string, string> = {
  movie: 'types.movie',
  tv: 'types.tv',
  game: 'types.game',
  book: 'types.book',
  music: 'types.music',
};

export default function ContentTypeFilter({
  activeType,
  onTypeChange,
  counts,
  contentTypes,
}: ContentTypeFilterProps) {
  const t = useTranslations('AdminContentPage');
  const types = [
    { id: 0, label: t('types.all'), icon: '📋' },
    ...contentTypes.map((type) => ({
      id: type.id,
      label: LABEL_KEYS[type.slug] ? t(LABEL_KEYS[type.slug]) : type.name,
      icon: ICONS[type.slug] || '📄',
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onTypeChange(type.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
            activeType === type.id
              ? 'bg-white/15 text-white border border-white/20'
              : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white/70'
          }`}
        >
          <span>{type.icon}</span>
          <span>{type.label}</span>
          {counts && type.id > 0 && counts[type.id] !== undefined && (
            <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-md">{counts[type.id]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
