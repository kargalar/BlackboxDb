'use client';

import Link from 'next/link';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { SectionHeader, SkeletonGrid, EmptyState } from './DashboardUI';
import type { ContentSectionProps } from '../types';
import { DEFAULT_ITEM_STATE } from '../types';

/**
 * Reusable content grid section for the dashboard.
 * Renders a header, a grid of InteractivePoster cards,
 * and handles loading / empty states.
 */
export default function ContentSection({
  title,
  emoji,
  href,
  items,
  contentType,
  itemStates,
  onWatchToggle,
  onFavoriteToggle,
  onWatchlistToggle,
  onAddToList,
  isLoading = false,
  emptyMessage,
  hideWhenEmpty = false,
  subtitleFn,
  useNextImage = true,
  maxItems = 20,
  timeRange,
  onTimeRangeChange,
}: ContentSectionProps & {
  timeRange?: string;
  onTimeRangeChange?: (newRange: string) => void;
}) {
  const { dragScrollProps } = useHorizontalDragScroll();
  const displayItems = items.slice(0, maxItems);

  // Hide section entirely when there are no items and hideWhenEmpty is set
  if (hideWhenEmpty && !isLoading && displayItems.length === 0) {
    console.log(`🔇 ContentSection: "${title}" hidden — no items`);
    return null;
  }

  console.log(`📦 ContentSection: Rendering "${title}" with ${displayItems.length} items`);

  return (
    <section className="dashboard-content-rail-section">
      <SectionHeader
        title={title}
        href={href}
        emoji={emoji}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
      />

      {isLoading ? (
        <SkeletonGrid />
      ) : displayItems.length > 0 ? (
        <div
          {...dragScrollProps}
          className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        >
          {displayItems.map((item) => {
            const state = itemStates[item.id] || DEFAULT_ITEM_STATE;
            return (
              <div
                key={item.id}
                draggable={false}
                className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none"
              >
                <InteractivePoster
                  content={item}
                  contentType={contentType}
                  subtitleOverride={subtitleFn?.(item.releaseDate)}
                  isConsumed={state.isConsumed}
                  isFavorite={state.isFavorite}
                  isConsumeLater={state.isConsumeLater}
                  isContinuing={state.isContinuing}
                  rating={state.rating}
                  hasReview={state.hasReview}
                  onWatch={() => onWatchToggle(item, contentType)}
                  onToggleFavorite={() => onFavoriteToggle(item, contentType)}
                  onToggleWatchlist={() => onWatchlistToggle(item, contentType)}
                  onAddToList={() => onAddToList(item, contentType)}
                  showActions={true}
                  context="dashboard"
                  useNextImage={useNextImage}
                />
              </div>
            );
          })}

          <Link
            href={href as any}
            draggable={false}
            onClick={() => {
              console.log(`🔗 [DashboardContentSection:${title}] Navigating to all content:`, href);
            }}
            className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none"
          >
            <div className="flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-lg font-black">
                +
              </span>
              <span className="text-sm font-semibold leading-6">Show All</span>
            </div>
          </Link>
        </div>
      ) : emptyMessage ? (
        <EmptyState message={emptyMessage} />
      ) : null}
    </section>
  );
}
