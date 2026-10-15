'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Globe,
  ChevronLeft,
  ChevronRight,
  Star,
  Heart,
  CircleCheck,
  Bookmark,
  Play,
  XCircle,
  MessageSquare,
  ListPlus,
} from 'lucide-react';
import { getPosterUrl } from '@/lib/image-utils';
import { formatRelativeTime } from '@/lib/date-utils';
import { formatRating } from '@/lib/formatRating';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import InteractivePoster from '@/components/organisms/InteractivePoster';

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

function getContentTypeIcon(contentTypeId?: number) {
  switch (contentTypeId) {
    case 1:
      return <Film size={14} className="text-red-400" />;
    case 2:
      return <Tv size={14} className="text-blue-400" />;
    case 3:
      return <Gamepad2 size={14} className="text-purple-400" />;
    case 4:
      return <BookOpen size={14} className="text-amber-400" />;
    default:
      return <Globe size={14} className="text-emerald-400" />;
  }
}

function getContentTypeSlug(contentTypeId?: number): string {
  switch (contentTypeId) {
    case 1:
      return 'movie';
    case 2:
      return 'tv';
    case 3:
      return 'game';
    case 4:
      return 'book';
    default:
      return 'movie';
  }
}

function getConsumedLabel(contentTypeId?: number): string {
  switch (contentTypeId) {
    case 1:
    case 2:
      return 'Watched';
    case 3:
      return 'Played';
    case 4:
      return 'Read';
    case 5:
      return 'Listened';
    default:
      return 'Consumed';
  }
}

function getContinuingLabel(contentTypeId?: number): string {
  switch (contentTypeId) {
    case 1:
    case 2:
      return 'Watching';
    case 3:
      return 'Playing';
    case 4:
      return 'Reading';
    case 5:
      return 'Listening';
    default:
      return 'Continuing';
  }
}

function ActivityBadges({ act }: { act: any }) {
  const typeId = act.content?.contentTypeId;
  const hasRating = typeof act.rating === 'number' && act.rating > 0;
  const badges: {
    key: string;
    label: string;
    icon: any;
    className: string;
    isFill?: boolean;
  }[] = [];

  if (act.isContinuing) {
    badges.push({
      key: 'continuing',
      label: getContinuingLabel(typeId),
      icon: Play,
      className: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
      isFill: true,
    });
  } else if (act.isConsumed) {
    badges.push({
      key: 'consumed',
      label: getConsumedLabel(typeId),
      icon: CircleCheck,
      className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    });
  } else if (act.isConsumeLater) {
    badges.push({
      key: 'later',
      label: 'Watchlist',
      icon: Bookmark,
      className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
    });
  } else if (act.isAbandoned) {
    badges.push({
      key: 'abandoned',
      label: 'Dropped',
      icon: XCircle,
      className: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
    });
  } else if (act.review || act.isStandaloneReview) {
    badges.push({
      key: 'reviewed',
      label: 'Reviewed',
      icon: MessageSquare,
      className: 'border-violet-500/20 bg-violet-500/10 text-violet-200',
    });
  }

  if (hasRating) {
    badges.push({
      key: 'rating',
      label: `${formatRating(act.rating)}/10`,
      icon: Star,
      className: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
      isFill: true,
    });
  }

  if (act.isFavorite) {
    badges.push({
      key: 'favorite',
      label: 'Favorite',
      icon: Heart,
      className: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
      isFill: true,
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <span
            key={b.key}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${b.className}`}
            title={b.label}
          >
            <Icon size={11} className={b.isFill ? 'fill-current' : ''} />
            <span>{b.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function ActivityPosterColumn({
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
  const contentType = getContentTypeSlug(act.content?.contentTypeId);
  const unifiedContent = {
    id: act.contentId,
    title: act.content?.title || '',
    name: act.content?.name || '',
    posterUrl: act.content?.posterUrl || null,
    releaseDate: act.content?.releaseDate || null,
  };

  const hasReview = Boolean(act.review || act.reviewDiscussion?.description || act.isStandaloneReview);

  const statusLabel = act.isContinuing
    ? getContinuingLabel(act.content?.contentTypeId)
    : hasReview
    ? 'Reviewed'
    : act.isConsumed
    ? getConsumedLabel(act.content?.contentTypeId)
    : act.isConsumeLater
    ? 'Watchlist'
    : act.isAbandoned
    ? 'Dropped'
    : null;

  return (
    <div className="flex flex-col gap-1.5 group w-[136px] min-w-[136px] sm:w-[146px] sm:min-w-[146px] lg:w-[156px] lg:min-w-[156px] flex-none">
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
        hasReview={hasReview}
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
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              href={user.username ? `/profile/${user.username}` : '#'}
              title={user.username || 'Unknown'}
              className="shrink-0"
            >
              <div className="w-6 h-6 rounded-full bg-violet-500 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.7)] hover:scale-110 transition-transform">
                {user.picturePath ? (
                  <Image
                    src={user.picturePath}
                    alt={user.username || 'User'}
                    width={24}
                    height={24}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white">
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <Link
                  href={user.username ? `/profile/${user.username}` : '#'}
                  className="text-xs font-semibold text-white/90 hover:text-white truncate block leading-tight"
                >
                  {user.username}
                </Link>
                <span className="text-[10px] text-white/40 shrink-0">
                  {formatRelativeTime(act.date || act.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] leading-tight mt-0.5">
                {statusLabel && (
                  <span
                    className={`font-medium ${
                      act.isContinuing
                        ? 'text-blue-400'
                        : hasReview
                        ? 'text-violet-400'
                        : act.isConsumed
                        ? 'text-emerald-400'
                        : act.isConsumeLater
                        ? 'text-cyan-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {statusLabel}
                  </span>
                )}
                {typeof act.rating === 'number' && act.rating > 0 && (
                  <span className="text-amber-300 font-medium ml-auto flex items-center gap-0.5">
                    <Star size={10} className="fill-current" />
                    {formatRating(act.rating)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PosterActivityCard(props: {
  act: any;
  userState?: any;
  onWatchToggle?: (item: any, type: any) => void;
  onFavoriteToggle?: (item: any, type: any) => void;
  onWatchlistToggle?: (item: any, type: any) => void;
  onContinuingToggle?: (item: any, type: any) => void;
  onAddToList?: (item: any, type: any) => void;
}) {
  return <ActivityPosterColumn {...props} />;
}

function ReviewActivityCard(props: {
  act: any;
  userState?: any;
  onWatchToggle?: (item: any, type: any) => void;
  onFavoriteToggle?: (item: any, type: any) => void;
  onWatchlistToggle?: (item: any, type: any) => void;
  onContinuingToggle?: (item: any, type: any) => void;
  onAddToList?: (item: any, type: any) => void;
}) {
  const { act } = props;
  const rawReview = act.review || act.reviewDiscussion?.description || '';
  const cleanedReview = rawReview.replace(/^["'“‘\s]+|["'”’\s]+$/g, '').trim() || rawReview;
  const discussionHref = act.reviewDiscussion?.id ? `/discussion/${act.reviewDiscussion.id}` : null;

  return (
    <div className="glass-card p-3 rounded-2xl border border-white/10 hover:border-white/20 transition-all flex items-start gap-3.5 flex-none w-[340px] min-w-[340px] sm:w-[380px] sm:min-w-[380px] lg:w-[410px] lg:min-w-[410px]">
      {/* Sol: Normal afiş ve kullanıcı gösterimi */}
      <ActivityPosterColumn {...props} />

      {/* Sağ: Sadece inceleme metni */}
      <div className="flex-1 min-w-0 self-stretch py-1 px-0.5">
        {discussionHref ? (
          <Link
            href={discussionHref as any}
            className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors italic line-clamp-8 leading-relaxed block"
          >
            &ldquo;{cleanedReview}&rdquo;
          </Link>
        ) : (
          <p className="text-xs sm:text-sm text-white/80 italic line-clamp-8 leading-relaxed">
            &ldquo;{cleanedReview}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

function ActivityCardItem({
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
  const hasReview = Boolean(act.review || act.reviewDiscussion?.description);

  if (hasReview) {
    return (
      <ReviewActivityCard
        act={act}
        userState={userState}
        onWatchToggle={onWatchToggle}
        onFavoriteToggle={onFavoriteToggle}
        onWatchlistToggle={onWatchlistToggle}
        onContinuingToggle={onContinuingToggle}
        onAddToList={onAddToList}
      />
    );
  }

  return (
    <PosterActivityCard
      act={act}
      userState={userState}
      onWatchToggle={onWatchToggle}
      onFavoriteToggle={onFavoriteToggle}
      onWatchlistToggle={onWatchlistToggle}
      onContinuingToggle={onContinuingToggle}
      onAddToList={onAddToList}
    />
  );
}

function ViewAllCard() {
  return (
    <Link
      href={'/dashboard/friends-activity' as any}
      draggable={false}
      className="w-[136px] min-w-[136px] sm:w-[146px] sm:min-w-[146px] lg:w-[156px] lg:min-w-[156px] flex-none"
    >
      <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
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
      preferredContentTypes.length >= 4 ||
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
          <p className="text-sm text-white/50">Recent activity and reviews of people you follow</p>
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
                  <div className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide items-start">
                    {displayTypeActivities.map((act) => (
                      <ActivityCardItem
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
        <div className="flex flex-wrap gap-4 items-start">
          {displayActivities.map((act) => (
            <ActivityCardItem
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
          className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none items-start"
        >
          {displayActivities.map((act) => (
            <ActivityCardItem
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
          {showViewAll && <ViewAllCard />}
        </div>
      )}
    </section>
  );
}
