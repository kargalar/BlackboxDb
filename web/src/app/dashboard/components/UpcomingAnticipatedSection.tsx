'use client';

import { useState, useEffect } from 'react';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import { SkeletonGrid, EmptyState } from './DashboardUI';
import { getPreciseTimeUntil } from '@/lib/date-utils';
import type { UnifiedContent } from '@/types/unified-content';
import type { ItemState, ContentType } from '../types';
import { DEFAULT_ITEM_STATE } from '../types';

interface UpcomingAnticipatedSectionProps {
  preferredContentTypes: number[];
  anticipatedMovies: UnifiedContent[];
  anticipatedTv: UnifiedContent[];
  anticipatedGames: UnifiedContent[];
  anticipatedBooks: UnifiedContent[];
  anticipatedMusic: UnifiedContent[];
  itemStates: Record<string | number, ItemState>;
  onWatchToggle: (item: UnifiedContent, contentType: ContentType) => void;
  onFavoriteToggle: (item: UnifiedContent, contentType: ContentType) => void;
  onWatchlistToggle: (item: UnifiedContent, contentType: ContentType) => void;
  onAddToList: (item: UnifiedContent, contentType: ContentType) => void;
  isLoading: boolean;
  splitByContentType?: boolean;
}

type TabType = 'movie' | 'tv' | 'game' | 'book' | 'music';

const TAB_MAPPING: Record<number, { type: TabType; label: string; emoji: string }> = {
  1: { type: 'movie', label: 'Movies', emoji: '🎬' },
  2: { type: 'tv', label: 'TV Shows', emoji: '📺' },
  3: { type: 'game', label: 'Games', emoji: '🎮' },
  4: { type: 'book', label: 'Books', emoji: '📚' },
  5: { type: 'music', label: 'Music', emoji: '🎵' },
};

const ALL_TAB = { type: 'all' as const, label: 'All', emoji: '✨' };

function getContentTypeFromItem(item: UnifiedContent): ContentType {
  if (item.contentTypeId === 2) return 'tv';
  if (item.contentTypeId === 3) return 'game';
  if (item.contentTypeId === 4) return 'book';
  if (item.contentTypeId === 5) return 'music';
  return 'movie';
}

function interleaveItems(
  groups: Array<Array<UnifiedContent & { dashboardContentType: ContentType }>>
) {
  const result: Array<UnifiedContent & { dashboardContentType: ContentType }> = [];
  const maxLength = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < maxLength; index += 1) {
    groups.forEach((group) => {
      if (group[index]) result.push(group[index]);
    });
  }

  return result;
}

export default function UpcomingAnticipatedSection({
  preferredContentTypes,
  anticipatedMovies,
  anticipatedTv,
  anticipatedGames,
  anticipatedBooks,
  anticipatedMusic,
  itemStates,
  onWatchToggle,
  onFavoriteToggle,
  onWatchlistToggle,
  onAddToList,
  isLoading,
  splitByContentType = false,
}: UpcomingAnticipatedSectionProps) {
  // Get active tabs based on user preferences
  const activeTabs = preferredContentTypes.map((id) => TAB_MAPPING[id]).filter(Boolean);
  const availableTabs = splitByContentType ? activeTabs : [ALL_TAB, ...activeTabs];

  // Default to first available tab
  const [activeTab, setActiveTab] = useState<TabType | 'all'>('all');
  const [now, setNow] = useState(() => new Date());
  const selectedTab =
    !splitByContentType &&
    activeTab !== 'all' &&
    activeTabs.length > 0 &&
    !activeTabs.some((tab) => tab.type === activeTab)
      ? 'all'
      : activeTab;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const { dragScrollProps } = useHorizontalDragScroll();

  if (activeTabs.length === 0) return null;

  // Select items list based on active tab
  let currentItems: UnifiedContent[] = [];
  if (selectedTab === 'movie') currentItems = anticipatedMovies;
  else if (selectedTab === 'tv') currentItems = anticipatedTv;
  else if (selectedTab === 'game') currentItems = anticipatedGames;
  else if (selectedTab === 'book') currentItems = anticipatedBooks;
  else if (selectedTab === 'music') currentItems = anticipatedMusic;

  // Sadece çıkış tarihi null olmayanları ve çıkışının üzerinden en fazla 2 gün geçenleri göster
  currentItems = currentItems.filter((item) => {
    if (!item.releaseDate) return false;

    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(item.releaseDate);
    const date = isDateOnly
      ? new Date(`${item.releaseDate}T00:00:00.000Z`)
      : new Date(item.releaseDate);

    if (Number.isNaN(date.getTime())) return false;

    const diffMs = date.getTime() - now.getTime();
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000; // 2 gün (milisaniye cinsinden)

    // Eğer gelecek bir tarihse veya üzerinden 2 günden az geçmişse göster
    return diffMs >= -twoDaysInMs;
  });

  const filterUpcomingItems = (items: UnifiedContent[]) =>
    items.filter((item) => {
      if (!item.releaseDate) return false;
      const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(item.releaseDate);
      const date = isDateOnly
        ? new Date(`${item.releaseDate}T00:00:00.000Z`)
        : new Date(item.releaseDate);
      if (Number.isNaN(date.getTime())) return false;
      return date.getTime() - now.getTime() >= -2 * 24 * 60 * 60 * 1000;
    });

  const itemsByType: Record<
    TabType,
    Array<UnifiedContent & { dashboardContentType: ContentType }>
  > = {
    movie: filterUpcomingItems(anticipatedMovies).map((item) => ({
      ...item,
      dashboardContentType: 'movie',
    })),
    tv: filterUpcomingItems(anticipatedTv).map((item) => ({ ...item, dashboardContentType: 'tv' })),
    game: filterUpcomingItems(anticipatedGames).map((item) => ({
      ...item,
      dashboardContentType: 'game',
    })),
    book: filterUpcomingItems(anticipatedBooks).map((item) => ({
      ...item,
      dashboardContentType: 'book',
    })),
    music: filterUpcomingItems(anticipatedMusic).map((item) => ({
      ...item,
      dashboardContentType: 'music',
    })),
  };

  const currentTypedItems =
    selectedTab === 'all'
      ? interleaveItems(activeTabs.map((tab) => itemsByType[tab.type]))
      : currentItems.map((item) => ({
          ...item,
          dashboardContentType: getContentTypeFromItem(item),
        }));

  if (splitByContentType) {
    return (
      <section className="dashboard-upcoming-section space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2.5">
          <span className="text-xl">🚀</span>
          <span className="gradient-text">Upcoming Releases</span>
        </h2>
        {activeTabs.map((tab) => {
          const typeItems = itemsByType[tab.type];
          if (!isLoading && typeItems.length === 0) return null;
          return (
            <div key={tab.type} className="space-y-3">
              <h3 className="text-xs font-semibold text-white/80 flex items-center gap-2">
                <span>{tab.emoji}</span>
                {tab.label}
              </h3>
              {isLoading ? (
                <SkeletonGrid />
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide">
                  {typeItems.map((item) => {
                    const state = itemStates[item.id] || DEFAULT_ITEM_STATE;
                    const timeUntil = item.releaseDate
                      ? getPreciseTimeUntil(item.releaseDate, now)
                      : null;
                    const count = item.consumeLaterCount || 0;
                    const contentType = item.dashboardContentType;
                    return (
                      <div
                        key={`${contentType}-${item.id}`}
                        draggable={false}
                        className="w-[120px] min-w-[120px] sm:w-[130px] sm:min-w-[130px] lg:w-[138px] lg:min-w-[138px] flex-none transition-transform duration-300 hover:scale-[1.02] flex flex-col"
                      >
                        <InteractivePoster
                          content={item}
                          contentType={contentType}
                          subtitleOverride={null}
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
                          useNextImage={contentType !== 'game'}
                        />
                        <div className="mt-2 flex items-center justify-between gap-1 px-1">
                          {timeUntil && (
                            <span
                              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                                timeUntil.isReleased
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-white/[0.07] text-white/85 border-white/10'
                              }`}
                            >
                              {timeUntil.isReleased
                                ? 'Released'
                                : timeUntil.days === 0 && timeUntil.hours === 0
                                  ? `${timeUntil.minutes}m`
                                  : `${timeUntil.days}d ${timeUntil.hours}h`}
                            </span>
                          )}
                          {count > 0 && (
                            <span
                              className="text-white/60 text-[10px] font-medium flex items-center gap-0.5 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5"
                              title={`${count} waiting`}
                            >
                              <span className="opacity-70">👤</span>
                              <span className="font-semibold text-white/80">{count}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className="dashboard-upcoming-section space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-white/5">
        <h2 className="text-xl font-bold flex items-center gap-2.5">
          <span className="text-xl">🚀</span>
          <span className="gradient-text">Upcoming Releases</span>
        </h2>

        {/* Premium Tab Selectors */}
        <div className="flex flex-wrap gap-1.5">
          {availableTabs.map(({ type, label, emoji }) => {
            const isActive = selectedTab === type;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 transform active:scale-95 border ${
                  isActive
                    ? 'bg-blue-500/20 text-white border-blue-500/50 shadow-sm shadow-blue-500/10'
                    : 'bg-white/[0.02] text-white/60 border-white/5 hover:bg-white/[0.06] hover:text-white/90 hover:border-white/10'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <SkeletonGrid />
      ) : currentTypedItems.length > 0 ? (
        <div
          {...dragScrollProps}
          className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        >
          {currentTypedItems.map((item) => {
            const state = itemStates[item.id] || DEFAULT_ITEM_STATE;
            const timeUntil = item.releaseDate ? getPreciseTimeUntil(item.releaseDate, now) : null;
            const count = item.consumeLaterCount || 0;
            const contentType = item.dashboardContentType;

            return (
              <div
                key={`${contentType}-${item.id}`}
                draggable={false}
                className="w-[120px] min-w-[120px] sm:w-[130px] sm:min-w-[130px] lg:w-[138px] lg:min-w-[138px] flex-none transition-transform duration-300 hover:scale-[1.02] flex flex-col"
              >
                <InteractivePoster
                  content={item}
                  contentType={contentType}
                  subtitleOverride={null}
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
                  useNextImage={contentType !== 'game'} // Match the main config
                />

                <div className="mt-2 flex items-center justify-between gap-1 px-1">
                  {timeUntil && (
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                        timeUntil.isReleased
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-white/[0.07] text-white/85 border-white/10'
                      }`}
                    >
                      {timeUntil.isReleased
                        ? 'Released'
                        : timeUntil.days === 0 && timeUntil.hours === 0
                          ? `${timeUntil.minutes}m`
                          : `${timeUntil.days}d ${timeUntil.hours}h`}
                    </span>
                  )}

                  {count > 0 && (
                    <span
                      className="text-white/60 text-[10px] font-medium flex items-center gap-0.5 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5"
                      title={`${count} waiting`}
                    >
                      <span className="opacity-70">👤</span>
                      <span className="font-semibold text-white/80">{count}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState message="No upcoming content found." />
      )}
    </section>
  );
}
