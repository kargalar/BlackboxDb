'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Film, Gamepad2, Globe, Music, Tv } from 'lucide-react';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import type { UnifiedContent } from '@/types/unified-content';
import type { ContentType, ItemState } from '../types';
import { DEFAULT_ITEM_STATE } from '../types';
import { EmptyState, SkeletonGrid } from './DashboardUI';

const CONTENT_TYPE_OPTIONS = [
  {
    id: 0,
    label: 'All',
    title: 'Popular Content',
    type: 'all',
    href: '/explore',
    emoji: '✨',
    icon: Globe,
  },
  {
    id: 1,
    label: 'Movie',
    title: 'Popular Movies',
    type: 'movie',
    href: '/explore/movie',
    emoji: '🎬',
    icon: Film,
  },
  {
    id: 2,
    label: 'TV Show',
    title: 'Popular TV Shows',
    type: 'tv',
    href: '/explore/tv',
    emoji: '📺',
    icon: Tv,
  },
  {
    id: 3,
    label: 'Game',
    title: 'Popular Games',
    type: 'game',
    href: '/explore/game',
    emoji: '🎮',
    icon: Gamepad2,
  },
  {
    id: 4,
    label: 'Book',
    title: 'Popular Books',
    type: 'book',
    href: '/explore/book',
    emoji: '📚',
    icon: BookOpen,
  },
  {
    id: 5,
    label: 'Music',
    title: 'Popular Music',
    type: 'music',
    href: '/explore/music',
    emoji: '🎵',
    icon: Music,
  },
] as const;

const TIME_RANGE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  all: 'All Time',
};

const TIME_RANGE_ORDER = ['daily', 'weekly', 'monthly', 'yearly', 'all'];

type ContentTypeOption = (typeof CONTENT_TYPE_OPTIONS)[number];
type TypedItem = UnifiedContent & { dashboardContentType: ContentType };

function getContentTypeFromId(contentTypeId?: number): ContentType {
  if (contentTypeId === 2) return 'tv';
  if (contentTypeId === 3) return 'game';
  if (contentTypeId === 4) return 'book';
  if (contentTypeId === 5) return 'music';
  return 'movie';
}

function interleaveTypedItems(groups: TypedItem[][], limit: number): TypedItem[] {
  const result: TypedItem[] = [];
  const maxLength = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < maxLength && result.length < limit; index += 1) {
    for (const group of groups) {
      const item = group[index];
      if (item) result.push(item);
      if (result.length >= limit) break;
    }
  }

  return result;
}

function toTypedItems(items: UnifiedContent[], contentType: ContentType): TypedItem[] {
  return items.map((item) => ({
    ...item,
    dashboardContentType: getContentTypeFromId(item.contentTypeId) || contentType,
  }));
}

function ContentRail({
  items,
  itemStates,
  title,
  href,
  isLoading,
  onWatchToggle,
  onFavoriteToggle,
  onWatchlistToggle,
  onAddToList,
  useNextImageForGames = false,
}: {
  items: TypedItem[];
  itemStates: Record<string | number, ItemState>;
  title: string;
  href: string;
  isLoading: boolean;
  onWatchToggle: (item: UnifiedContent, contentType: string) => void;
  onFavoriteToggle: (item: UnifiedContent, contentType: string) => void;
  onWatchlistToggle: (item: UnifiedContent, contentType: string) => void;
  onAddToList: (item: UnifiedContent, contentType: ContentType) => void;
  useNextImageForGames?: boolean;
}) {
  const { dragScrollProps } = useHorizontalDragScroll();

  if (isLoading) return <SkeletonGrid />;
  if (items.length === 0) return <EmptyState message="No popular content found in this filter." />;

  return (
    <div
      {...dragScrollProps}
      className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
    >
      {items.map((item) => {
        const state = itemStates[item.id] || DEFAULT_ITEM_STATE;
        const contentType = item.dashboardContentType;
        return (
          <div
            key={`${contentType}-${item.id}`}
            draggable={false}
            className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none"
          >
            <InteractivePoster
              content={item}
              contentType={contentType}
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
              showActions
              context="dashboard"
              useNextImage={useNextImageForGames || contentType !== 'game'}
            />
          </div>
        );
      })}

      <Link
        href={href as any}
        draggable={false}
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
  );
}

export default function PopularContentSection({
  preferredContentTypes,
  splitByContentType,
  trendingMovies,
  trendingTv,
  trendingGames,
  popularBooks,
  popularMusic,

  itemStates,
  loading,
  tvLoading,
  booksLoading,

  contentTimeRanges,
  onTimeRangeChange,
  onWatchToggle,
  onFavoriteToggle,
  onWatchlistToggle,
  onAddToList,
}: {
  preferredContentTypes: number[];
  splitByContentType: boolean;
  trendingMovies: UnifiedContent[];
  trendingTv: UnifiedContent[];
  trendingGames: UnifiedContent[];
  popularBooks: UnifiedContent[];
  popularMusic: UnifiedContent[];

  itemStates: Record<string | number, ItemState>;
  loading: boolean;
  tvLoading: boolean;
  booksLoading: boolean;

  contentTimeRanges: Record<string, string>;
  onTimeRangeChange: (type: string, range: string) => void;
  onWatchToggle: (item: UnifiedContent, contentType: string) => void;
  onFavoriteToggle: (item: UnifiedContent, contentType: string) => void;
  onWatchlistToggle: (item: UnifiedContent, contentType: string) => void;
  onAddToList: (item: UnifiedContent, contentType: ContentType) => void;
}) {
  const [selectedFilterId, setSelectedFilterId] = useState(0);

  const availableTypes = CONTENT_TYPE_OPTIONS.filter(
    (option) =>
      option.id === 0 ||
      preferredContentTypes.length === 0 ||
      preferredContentTypes.includes(option.id)
  );

  const typedById = useMemo(
    () => ({
      1: toTypedItems(trendingMovies, 'movie'),
      2: toTypedItems(trendingTv, 'tv'),
      3: toTypedItems(trendingGames, 'game'),
      4: toTypedItems(popularBooks, 'book'),
      5: toTypedItems(popularMusic, 'music'),
    }),
    [popularBooks, popularMusic, trendingGames, trendingMovies, trendingTv]
  );

  const selectedFilter =
    availableTypes.find((option) => option.id === selectedFilterId) || availableTypes[0];
  const visibleTypeOptions = CONTENT_TYPE_OPTIONS.filter(
    (option) => option.id !== 0 && availableTypes.some((available) => available.id === option.id)
  );
  const currentRange =
    selectedFilter.id === 0
      ? 'all'
      : contentTimeRanges[selectedFilter.type as ContentType] || 'all';

  const cycleTimeRange = () => {
    const currentIndex = TIME_RANGE_ORDER.indexOf(currentRange);
    const nextRange = TIME_RANGE_ORDER[(currentIndex + 1) % TIME_RANGE_ORDER.length];
    const targets =
      selectedFilter.id === 0
        ? visibleTypeOptions
        : visibleTypeOptions.filter((option) => option.id === selectedFilter.id);
    targets.forEach((option) => onTimeRangeChange(option.type, nextRange));
  };

  if (splitByContentType) {
    return (
      <section className="dashboard-popular-content-section space-y-8">
        {visibleTypeOptions.map((option) => {
          const items = typedById[option.id as 1 | 2 | 3 | 4 | 5].slice(0, 20);
          const range = contentTimeRanges[option.type as ContentType] || 'all';
          const isSectionLoading =
            loading ||
            (option.type === 'tv' && tvLoading) ||
            (option.type === 'book' && booksLoading);
          if (!isSectionLoading && items.length === 0) return null;

          return (
            <div key={option.id} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="gradient-text">{option.title}</span>
                </h2>
                <button
                  onClick={() => {
                    const currentIndex = TIME_RANGE_ORDER.indexOf(range);
                    onTimeRangeChange(
                      option.type,
                      TIME_RANGE_ORDER[(currentIndex + 1) % TIME_RANGE_ORDER.length]
                    );
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/10"
                >
                  {TIME_RANGE_LABELS[range] || range}
                </button>
              </div>
              <ContentRail
                items={items}
                itemStates={itemStates}
                title={option.title}
                href={option.href}
                isLoading={isSectionLoading}
                onWatchToggle={onWatchToggle}
                onFavoriteToggle={onFavoriteToggle}
                onWatchlistToggle={onWatchlistToggle}
                onAddToList={onAddToList}
              />
            </div>
          );
        })}
      </section>
    );
  }

  const mixedItems =
    selectedFilter.id === 0
      ? interleaveTypedItems(
          visibleTypeOptions.map((option) => typedById[option.id as 1 | 2 | 3 | 4 | 5]),
          20
        )
      : typedById[selectedFilter.id as 1 | 2 | 3 | 4 | 5].slice(0, 20);

  return (
    <section className="dashboard-popular-content-section space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <span className="text-2xl">{selectedFilter.emoji}</span>
            <span className="gradient-text">{selectedFilter.title}</span>
          </h2>
          <p className="text-sm text-white/50">Popular content from all content types</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableTypes.map((option: ContentTypeOption) => {
            const Icon = option.icon;
            const isActive = selectedFilter.id === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSelectedFilterId(option.id)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors border ${
                  isActive
                    ? 'bg-violet-500/20 border-violet-500/50 text-white'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/50'
                }`}
                title={option.label}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            );
          })}
          <button
            onClick={cycleTimeRange}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/10"
          >
            {TIME_RANGE_LABELS[currentRange] || currentRange}
          </button>
        </div>
      </div>

      <ContentRail
        items={mixedItems}
        itemStates={itemStates}
        title={selectedFilter.title}
        href={selectedFilter.href}
        isLoading={loading}
        onWatchToggle={onWatchToggle}
        onFavoriteToggle={onFavoriteToggle}
        onWatchlistToggle={onWatchlistToggle}
        onAddToList={onAddToList}
      />
    </section>
  );
}
