'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Music,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { formatRelativeTime } from '@/lib/date-utils';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';

interface FriendsActivitySectionProps {
  activities: any[];
  itemStates?: Record<string, any>;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onWatchToggle?: (item: any, type: any) => void;
  onFavoriteToggle?: (item: any, type: any) => void;
  onWatchlistToggle?: (item: any, type: any) => void;
  onContinuingToggle?: (item: any, type: any) => void;
  onAddToList?: (item: any, type: any) => void;
  preferredContentTypes?: number[];
  layout?: 'carousel' | 'grid';
  maxItems?: number;
  showViewAll?: boolean;
  splitByContentType?: boolean;
}

function getContentTypeFromId(contentId: string, contentTypeId?: number) {
  if (contentTypeId) {
    switch (contentTypeId) {
      case 1:
        return 'movie';
      case 2:
        return 'tv';
      case 3:
        return 'game';
      case 4:
        return 'book';
      case 5:
        return 'music';
      default:
        return 'movie';
    }
  }
  if (!contentId) return 'movie';
  return 'movie';
}

function ActivityCard({
  act,
  userState = {},
  onWatchToggle,
  onFavoriteToggle,
  onWatchlistToggle,
  onContinuingToggle,
  onAddToList,
}: {
  act: any;
  userState?: any;
  onWatchToggle?: (item: any, type: any) => void;
  onFavoriteToggle?: (item: any, type: any) => void;
  onWatchlistToggle?: (item: any, type: any) => void;
  onContinuingToggle?: (item: any, type: any) => void;
  onAddToList?: (item: any, type: any) => void;
}) {
  const user = act.user;
  const contentType = getContentTypeFromId(act.contentId, act.content?.contentTypeId);
  const unifiedContent = {
    id: act.contentId,
    title: act.content?.title || '',
    name: act.content?.name || '',
    posterUrl: act.content?.posterUrl || null,
    releaseDate: act.content?.releaseDate || null,
  };

  return (
    <div className="flex flex-col gap-1.5 group w-[132px] min-w-[132px] sm:w-[142px] sm:min-w-[142px] lg:w-[152px] lg:min-w-[152px]">
      <InteractivePoster
        content={unifiedContent}
        contentType={contentType as any}
        showActions={true}
        size="small"
        useNextImage={false}
        isConsumed={act.isConsumed}
        isFavorite={act.isFavorite}
        isConsumeLater={act.isConsumeLater}
        isContinuing={act.isContinuing}
        userConsumeCount={act.userConsumeCount}
        rating={act.rating ?? null}
        viewerIsConsumed={userState?.isConsumed}
        viewerIsFavorite={userState?.isFavorite}
        viewerIsConsumeLater={userState?.isConsumeLater}
        viewerIsContinuing={userState?.isContinuing}
        onWatch={() => onWatchToggle?.(unifiedContent, contentType)}
        onToggleFavorite={() => onFavoriteToggle?.(unifiedContent, contentType)}
        onToggleWatchlist={() => onWatchlistToggle?.(unifiedContent, contentType)}
        onToggleContinuing={() => onContinuingToggle?.(unifiedContent, contentType)}
        onAddToList={() => onAddToList?.(unifiedContent, contentType)}
      />

      {user && (
        <div className="px-0.5">
          <div className="flex items-center gap-1.5">
            <Link
              href={user.username ? `/profile/${user.username}` : '#'}
              title={user.username || 'Unknown'}
              className="flex-shrink-0"
            >
              <div className="w-7 h-7 rounded-full bg-violet-500 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.7)] hover:scale-110 transition-transform">
                {user.picturePath ? (
                  <Image
                    src={user.picturePath}
                    alt={user.username || 'User'}
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white">
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </Link>
            <span className="text-[10px] text-white/40 truncate">
              {formatRelativeTime(act.date || act.createdAt)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewAllCard() {
  return (
    <Link
      href={'/dashboard/friends-activity' as any}
      draggable={false}
      className="w-[132px] min-w-[132px] sm:w-[142px] sm:min-w-[142px] lg:w-[152px] lg:min-w-[152px] flex-none"
    >
      <div className="flex h-full min-h-[250px] w-full flex-col items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-lg font-black">
          +
        </span>
        <span className="text-sm font-semibold leading-6">See All</span>
      </div>
    </Link>
  );
}

const CONTENT_TYPE_FILTERS = [
  { id: 0, label: 'All', icon: Globe },
  { id: 1, label: 'Movie', icon: Film },
  { id: 2, label: 'TV Show', icon: Tv },
  { id: 3, label: 'Game', icon: Gamepad2 },
  { id: 4, label: 'Book', icon: BookOpen },
  { id: 5, label: 'Music', icon: Music },
];

function getContentTypeIdFromContentId(act: any): number {
  if (act.content?.contentTypeId) return act.content.contentTypeId;
  return 0;
}

export default function FriendsActivitySection({
  activities,
  itemStates,
  loading,
  error,
  onRefresh,
  onWatchToggle,
  onFavoriteToggle,
  onWatchlistToggle,
  onContinuingToggle,
  onAddToList,
  preferredContentTypes,
  layout = 'carousel',
  maxItems,
  showViewAll = true,
  splitByContentType = false,
}: FriendsActivitySectionProps) {
  const [selectedFilterId, setSelectedFilterId] = useState(0);
  const { containerRef, dragScrollProps } = useHorizontalDragScroll();

  const scrollActivities = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    const amount = Math.max(container.clientWidth * 0.85, 240);
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  const availableFilters = CONTENT_TYPE_FILTERS.filter(
    (f) =>
      f.id === 0 ||
      !preferredContentTypes ||
      preferredContentTypes.length === 0 ||
      preferredContentTypes.length >= 5 ||
      preferredContentTypes.includes(f.id)
  );

  const selectedFilter =
    availableFilters.find((f) => f.id === selectedFilterId) || availableFilters[0];

  const filteredActivities = activities.filter((act) => {
    const typeId = getContentTypeIdFromContentId(act);
    if (
      preferredContentTypes &&
      preferredContentTypes.length > 0 &&
      preferredContentTypes.length < 5 &&
      !preferredContentTypes.includes(typeId)
    ) {
      return false;
    }
    if (selectedFilter.id !== 0 && typeId !== selectedFilter.id) return false;
    return true;
  });

  const displayActivities =
    typeof maxItems === 'number' ? filteredActivities.slice(0, maxItems) : filteredActivities;
  const splitFilters = availableFilters.filter((filter) => filter.id !== 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">Friends&apos; Activity</h2>
          <p className="text-sm text-white/50">Recent activity of people you follow</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {layout === 'carousel' && filteredActivities.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => scrollActivities('left')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Scroll left"
                title="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollActivities('right')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Scroll right"
                title="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
          {!splitByContentType &&
            availableFilters.map((f) => {
              const Icon = f.icon;
              const isActive = selectedFilter.id === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilterId(f.id)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors border ${
                    isActive
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/50'
                  }`}
                  title={f.label}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{f.label}</span>
                </button>
              );
            })}
          {showViewAll && (
            <Link
              href={'/dashboard/friends-activity' as any}
              className="btn-secondary px-4 py-2 text-sm"
            >
              See All
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Loading activities...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-6">
          <p className="text-red-300 font-medium">Failed to load activities</p>
          <p className="text-white/60 text-sm mt-1">{error}</p>
        </div>
      ) : splitByContentType ? (
        filteredActivities.length === 0 ? (
          <div className="glass-card p-6 text-center text-white/50">No friend activity yet.</div>
        ) : (
          <div className="space-y-6">
            {splitFilters.map((filter) => {
              const typeActivities = activities.filter(
                (act) => getContentTypeIdFromContentId(act) === filter.id
              );
              const displayTypeActivities =
                typeof maxItems === 'number' ? typeActivities.slice(0, maxItems) : typeActivities;
              if (displayTypeActivities.length === 0) return null;
              const Icon = filter.icon;
              return (
                <div key={filter.id} className="space-y-3">
                  <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Icon size={14} />
                    {filter.label}
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide">
                    {displayTypeActivities.map((act) => (
                      <div key={act.id} draggable={false} className="flex-none">
                        <ActivityCard
                          act={act}
                          userState={itemStates?.[act.contentId]}
                          onWatchToggle={onWatchToggle}
                          onFavoriteToggle={onFavoriteToggle}
                          onWatchlistToggle={onWatchlistToggle}
                          onContinuingToggle={onContinuingToggle}
                          onAddToList={onAddToList}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : filteredActivities.length === 0 ? (
        <div className="glass-card p-6 text-center text-white/50">
          {selectedFilter.id !== 0
            ? 'No friend activity in this content type.'
            : 'No friend activity yet.'}
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-[repeat(au,minmax(132px,1fr))] gap-3 sm:grid-cols-[repeat(au,minmax(142px,1fr))]">
          {displayActivities.map((act) => (
            <ActivityCard
              key={act.id}
              act={act}
              userState={itemStates?.[act.contentId]}
              onWatchToggle={onWatchToggle}
              onFavoriteToggle={onFavoriteToggle}
              onWatchlistToggle={onWatchlistToggle}
              onContinuingToggle={onContinuingToggle}
              onAddToList={onAddToList}
            />
          ))}
        </div>
      ) : (
        <div
          {...dragScrollProps}
          className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        >
          {displayActivities.map((act) => (
            <div key={act.id} draggable={false} className="flex-none">
              <ActivityCard
                act={act}
                userState={itemStates?.[act.contentId]}
                onWatchToggle={onWatchToggle}
                onFavoriteToggle={onFavoriteToggle}
                onWatchlistToggle={onWatchlistToggle}
                onContinuingToggle={onContinuingToggle}
                onAddToList={onAddToList}
              />
            </div>
          ))}
          {showViewAll && <ViewAllCard />}
        </div>
      )}
    </section>
  );
}
