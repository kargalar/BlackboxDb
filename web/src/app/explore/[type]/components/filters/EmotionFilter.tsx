'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FilterSection } from './FilterSection';
import { CONTENT_EMOTIONS } from '@/services/graphql/emotions';

interface EmotionFilterProps {
  selectedEmotions: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleEmotion: (emotionId: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
}

/** Compact emoji filter section for community emotion reactions in Explore. */
export function EmotionFilter({
  selectedEmotions,
  isExpanded,
  onToggleSection,
  onToggleEmotion,
  onClear,
  filterCounts,
}: EmotionFilterProps) {
  const tFilter = useTranslations('Explore.FilterSidebar');
  const tEmotions = useTranslations('EmotionReactions');

  return (
    <FilterSection
      title={tFilter('labels.emotion')}
      icon={<Sparkles className="w-4 h-4 text-amber-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedEmotions.length}
      totalCount={CONTENT_EMOTIONS.length}
      onClear={onClear}
      colorClass="text-amber-400"
    >
      <div className="grid grid-cols-2 gap-1.5">
        {CONTENT_EMOTIONS.map(({ id, emoji }) => {
          const selected = selectedEmotions.includes(id);
          const count = filterCounts?.[id] ?? 0;
          const label = tEmotions(`emotions.${id}`);

          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggleEmotion(id)}
              title={tEmotions(`descriptions.${id}`)}
              className={`flex min-w-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                selected
                  ? 'border-amber-400/60 bg-amber-500/15 text-white'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="shrink-0 text-sm leading-none" aria-hidden="true">
                {emoji}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{label}</span>
              {count > 0 && (
                <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-white/60">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </FilterSection>
  );
}
