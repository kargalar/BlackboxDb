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
  MessageSquare,
  Star,
  Heart,
  CircleCheck,
} from 'lucide-react';
import { getPosterUrl } from '@/lib/image-utils';
import { formatRelativeTime } from '@/lib/date-utils';
import { formatRating } from '@/lib/formatRating';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';

interface FriendsReviewsSectionProps {
  reviews: any[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  preferredContentTypes?: number[];
  splitByContentType?: boolean;
  layout?: 'carousel' | 'grid';
  showViewAll?: boolean;
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

function getContentTypeSlug(contentTypeId?: number) {
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

const CONTENT_TYPE_FILTERS = [
  { id: 0, label: 'All', title: 'All Reviews', icon: Globe },
  { id: 1, label: 'Movie', title: 'Movie Reviews', icon: Film },
  { id: 2, label: 'TV Show', title: 'TV Show Reviews', icon: Tv },
  { id: 3, label: 'Game', title: 'Game Reviews', icon: Gamepad2 },
  { id: 4, label: 'Book', title: 'Book Reviews', icon: BookOpen },
];

function getActivityContentTypeId(act: any): number {
  return act.content?.contentTypeId || 0;
}

function ReviewMeta({ act }: { act: any }) {
  const hasRating = typeof act.rating === 'number' && act.rating > 0;
  const badges = [];

  if (hasRating) {
    badges.push({
      key: 'rating',
      label: formatRating(act.rating),
      className: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    });
  }

  if (act.isFavorite) {
    badges.push({
      key: 'favorite',
      label: 'Favorite',
      className: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
    });
  }

  if (act.isConsumed) {
    badges.push({
      key: 'consumed',
      label: 'Consumed',
      className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-medium ${badge.className}`}
          title={badge.label}
        >
          {badge.key === 'rating' && <Star size={11} className="fill-current" />}
          {badge.key === 'favorite' && <Heart size={11} className="fill-current" />}
          {badge.key === 'consumed' && <CircleCheck size={11} />}
          <span>{badge.label}</span>
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ act }: { act: any }) {
  const [imgError, setImgError] = useState(false);
  const posterUrl = act.content?.posterUrl ? getPosterUrl.card(act.content.posterUrl) : null;
  const contentLink = act.contentId
    ? `/content/${getContentTypeSlug(act.content?.contentTypeId)}/${act.contentId}`
    : '#';
  const user = act.user;
  const reviewText = act.review || act.reviewDiscussion?.description || 'Wrote a review';

  return (
    <div className="glass-card p-4 hover:bg-white/5 transition-colors flex gap-4 min-h-[184px]">
      <Link href={contentLink as any} className="flex-shrink-0">
        {posterUrl && !imgError ? (
          <div className="w-16 h-24 rounded-lg overflow-hidden relative ring-1 ring-white/10">
            <Image
              src={posterUrl}
              alt={act.content?.title || ''}
              fill
              sizes="64px"
              className="object-cover"
              onError={() => setImgError(true)}
              unoptimized
            />
          </div>
        ) : (
          <div className="w-16 h-24 rounded-lg bg-zinc-800/80 flex items-center justify-center ring-1 ring-white/10">
            {getContentTypeIcon(act.content?.contentTypeId)}
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 py-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={user?.username ? `/profile/${user.username}` : '#'}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 rounded-full bg-violet-500 overflow-hidden flex-shrink-0 border border-white/10">
              {user?.picturePath ? (
                <Image
                  src={user.picturePath}
                  alt={user.username || 'User'}
                  width={24}
                  height={24}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-white/90">
              {user?.username || 'Unknown User'}
            </span>
          </Link>
          <span className="text-xs text-white/40">&bull;</span>
          <span className="text-xs text-white/40">
            {formatRelativeTime(act.date || act.createdAt)}
          </span>
        </div>

        <Link
          href={contentLink as any}
          className="text-base font-bold text-white hover:text-violet-400 transition-colors line-clamp-1"
        >
          {act.content?.title || 'Unknown Content'}
        </Link>

        <ReviewMeta act={act} />

        <div className="flex gap-2 mt-auto">
          <MessageSquare size={14} className="text-white/40 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-white/60 line-clamp-2 italic">&quot;{reviewText}&quot;</p>
        </div>
      </div>
    </div>
  );
}

function ReviewViewAllCard() {
  return (
    <Link
      href={'/dashboard/friends-reviews' as any}
      draggable={false}
      className="w-[320px] min-w-[320px] md:w-[360px] md:min-w-[360px] flex-none"
    >
      <div className="flex h-full min-h-[184px] w-full flex-col items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-lg font-black">
          +
        </span>
        <span className="text-sm font-semibold leading-6">See All</span>
      </div>
    </Link>
  );
}

export default function FriendsReviewsSection({
  reviews,
  loading,
  error,
  onRefresh,
  preferredContentTypes,
  splitByContentType = false,
  layout = 'carousel',
  showViewAll = true,
}: FriendsReviewsSectionProps) {
  const [selectedFilterId, setSelectedFilterId] = useState(0);
  const { dragScrollProps } = useHorizontalDragScroll();
  const availableFilters = CONTENT_TYPE_FILTERS.filter(
    (filter) =>
      filter.id === 0 ||
      !preferredContentTypes ||
      preferredContentTypes.length === 0 ||
      preferredContentTypes.includes(filter.id)
  );
  const selectedFilter =
    availableFilters.find((filter) => filter.id === selectedFilterId) || availableFilters[0];
  const filteredReviews = reviews.filter((review) => {
    const typeId = getActivityContentTypeId(review);
    if (
      preferredContentTypes &&
      preferredContentTypes.length > 0 &&
      !preferredContentTypes.includes(typeId)
    ) {
      return false;
    }
    if (selectedFilter.id !== 0 && typeId !== selectedFilter.id) return false;
    return true;
  });
  const splitFilters = availableFilters.filter((filter) => filter.id !== 0);

  if (!loading && !error && filteredReviews.length === 0 && selectedFilter.id === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">Friends&apos; Reviews</h2>
          <p className="text-sm text-white/50">Recent reviews and ratings of people you follow</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!splitByContentType &&
            availableFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = selectedFilter.id === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilterId(filter.id)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full transition-colors border ${
                    isActive
                      ? 'bg-violet-500/20 border-violet-500/50 text-white'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/50'
                  }`}
                  title={filter.label}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{filter.label}</span>
                </button>
              );
            })}
          {showViewAll && (
            <Link
              href={'/dashboard/friends-reviews' as any}
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
          <p className="text-white/60">Loading reviews...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-6">
          <p className="text-red-300 font-medium">Failed to load reviews</p>
          <p className="text-white/60 text-sm mt-1">{error}</p>
        </div>
      ) : splitByContentType ? (
        <div className="space-y-6">
          {splitFilters.map((filter) => {
            const typeReviews = reviews.filter(
              (review) => getActivityContentTypeId(review) === filter.id
            );
            if (typeReviews.length === 0) return null;
            const Icon = filter.icon;
            return (
              <div key={filter.id} className="space-y-3">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Icon size={14} />
                  {filter.title}
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide">
                  {typeReviews.map((act) => (
                    <div
                      key={act.id}
                      draggable={false}
                      className="w-[320px] min-w-[320px] md:w-[360px] md:min-w-[360px] flex-none"
                    >
                      <ReviewCard act={act} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="glass-card p-6 text-center text-white/50">
          {selectedFilter.id !== 0
            ? 'No friend reviews in this content type.'
            : 'No friend reviews yet.'}
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReviews.map((act) => (
            <ReviewCard key={act.id} act={act} />
          ))}
        </div>
      ) : (
        <div
          {...dragScrollProps}
          className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        >
          {filteredReviews.map((act) => (
            <div
              key={act.id}
              draggable={false}
              className="w-[320px] min-w-[320px] md:w-[360px] md:min-w-[360px] flex-none"
            >
              <ReviewCard act={act} />
            </div>
          ))}
          {showViewAll && <ReviewViewAllCard />}
        </div>
      )}
    </section>
  );
}
