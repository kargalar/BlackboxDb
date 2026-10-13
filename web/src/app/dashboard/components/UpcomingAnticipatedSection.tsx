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
      <section className="dashboard-upcoming-section space-y-8">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <span className="gradient-text">Upcoming Releases</span>
        </h2>
        {activeTabs.map((tab) => {
          const typeItems = itemsByType[tab.type];
          if (!isLoading && typeItems.length === 0) return null;
          return (
            <div key={tab.type} className="space-y-4">
              <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <span>{tab.emoji}</span>
                {tab.label}
              </h3>
              {isLoading ? (
                <SkeletonGrid />
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 pr-1 scrollbar-hide">
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
                        className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none transition-transform duration-300 hover:scale-[1.02] flex flex-col"
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
                        <div className="mt-4 flex flex-col items-center justify-center gap-2 px-1">
                          {timeUntil && (
                            <span className="text-[10px] text-white/50">
                              {timeUntil.isReleased
                                ? 'Released'
                                : timeUntil.days === 0 && timeUntil.hours === 0
                                  ? `${timeUntil.minutes}m`
                                  : `${timeUntil.days}d ${timeUntil.hours}h`}
                            </span>
                          )}
                          {count > 0 && (
                            <span className="text-white/70 text-[10px] font-medium">
                              {count} waiting
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
    <section className="dashboard-upcoming-section space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-white/5">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="text-2xl">🚀</span>
          <span className="gradient-text">Upcoming Releases</span>
        </h2>

        {/* Premium Tab Selectors */}
        <div className="flex flex-wrap gap-2">
          {availableTabs.map(({ type, label, emoji }) => {
            const isActive = selectedTab === type;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 transform active:scale-95 border ${
                  isActive
                    ? 'bg-blue-500/20 text-white border-blue-500/50 shadow-md shadow-blue-500/10'
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
          className="flex gap-4 overflow-x-auto pb-4 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
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
                className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none transition-transform duration-300 hover:scale-[1.02] flex flex-col"
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

                <div className="mt-4 flex flex-col items-center justify-center gap-2 px-1">
                  {timeUntil && (
                    <div className="flex items-center gap-1.5">
                      {timeUntil.isReleased ? (
                        <div className="relative flex items-center justify-center bg-surface-panel rounded text-green-400 font-mono font-black text-xs px-4 h-9 shadow-lg border border-green-500/20">
                          <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-black/90 shadow-[0_1px_0_rgba(255,255,255,0.1)] z-10"></div>
                          <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-white/10 rounded-t"></div>
                          <span className="relative z-0 leading-none tracking-widest">
                            RELEASED
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col items-center gap-1">
                            <div className="relative flex items-center justify-center bg-surface-raised rounded text-white font-mono font-black text-xl px-2 min-w-[36px] h-9 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/5">
                              <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-black/90 shadow-[0_1px_0_rgba(255,255,255,0.05)] z-10"></div>
                              <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-white/5 rounded-t"></div>
                              <span className="relative z-0 leading-none">
                                {timeUntil.days.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-[9px] text-white/40 uppercase tracking-widest font-medium">
                              Days
                            </span>
                          </div>

                          <span className="text-white/20 font-bold text-lg -mt-4">:</span>

                          <div className="flex flex-col items-center gap-1">
                            <div className="relative flex items-center justify-center bg-surface-raised rounded text-white font-mono font-black text-xl px-2 min-w-[36px] h-9 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/5">
                              <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-black/90 shadow-[0_1px_0_rgba(255,255,255,0.05)] z-10"></div>
                              <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-white/5 rounded-t"></div>
                              <span className="relative z-0 leading-none">
                                {(timeUntil.days === 0 && timeUntil.hours === 0
                                  ? timeUntil.minutes
                                  : timeUntil.hours
                                )
                                  .toString()
                                  .padStart(2, '0')}
                              </span>
                            </div>
                            <span className="text-[9px] text-white/40 uppercase tracking-widest font-medium">
                              {timeUntil.days === 0 && timeUntil.hours === 0 ? 'Minutes' : 'Hours'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {count > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2.5 py-0.5 border border-white/10 mt-1">
                      <span className="text-[10px]">👤</span>
                      <span className="text-white/70 text-[10px] font-medium">
                        <span className="text-white font-bold">{count}</span> waiting
                      </span>
                    </div>
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
