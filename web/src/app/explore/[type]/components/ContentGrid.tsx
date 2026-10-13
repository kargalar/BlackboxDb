'use client';

import Link from 'next/link';
import type { UnifiedContent } from '@/types/unified-content';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTranslations } from 'next-intl';

type ContentType = 'movie' | 'tv' | 'game' | 'book' | 'music' | 'podcast' | 'theater';

interface ContentGridProps {
  items: UnifiedContent[];
  contentType: ContentType;
  itemStates: Record<
    string,
    {
      isConsumed: boolean;
      isFavorite: boolean;
      isConsumeLater: boolean;
      isContinuing?: boolean;
      isAbandoned?: boolean;
      rating?: number | null;
      hasReview?: boolean;
    }
  >;
  onWatch: (item: UnifiedContent) => void;
  onToggleFavorite: (item: UnifiedContent) => void;
  onToggleWatchlist: (item: UnifiedContent) => void;
  onToggleContinuing?: (item: UnifiedContent) => void;
  onAddToList?: (item: UnifiedContent) => void;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function ContentGrid({
  items,
  contentType,
  itemStates,
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  onToggleContinuing,
  onAddToList,
  loading = false,
  error = null,
  onRetry,
}: ContentGridProps) {
  const { gridClassName } = useUserPreferences();
  const t = useTranslations('Explore.ContentGrid');

  if (loading) {
    return (
      <div className={`grid ${gridClassName} gap-4`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="text-center py-12 px-4">
        <div className="text-red-300 text-lg mb-2">{t('loadError')}</div>
        <p className="text-gray-500 text-sm mb-4">{t('loadErrorDesc')}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('retry')}
          </button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg mb-2">{t('notFound')}</div>
        <p className="text-gray-500 text-sm mb-4">{t('notFoundDesc')}</p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/content-request"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('requestContent')}
          </Link>
          <Link
            href="/add-content"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            {t('addContent')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClassName} gap-4`}>
      {items.map((item) => {
        const state = itemStates[item.id] || {
          isConsumed: false,
          isFavorite: false,
          isConsumeLater: false,
          isContinuing: false,
          isAbandoned: false,
          rating: null,
          hasReview: false,
        };
        return (
          <InteractivePoster
            key={item.id}
            content={item}
            contentType={contentType}
            isConsumed={state.isConsumed}
            isFavorite={state.isFavorite}
            isConsumeLater={state.isConsumeLater}
            isContinuing={state.isContinuing}
            isAbandoned={state.isAbandoned}
            rating={state.rating}
            hasReview={state.hasReview}
            onWatch={() => onWatch(item)}
            onToggleFavorite={() => onToggleFavorite(item)}
            onToggleWatchlist={() => onToggleWatchlist(item)}
            onToggleContinuing={onToggleContinuing ? () => onToggleContinuing(item) : undefined}
            onAddToList={onAddToList ? () => onAddToList(item) : undefined}
            showActions={true}
            context="explore"
            useNextImage={false}
          />
        );
      })}
    </div>
  );
}
