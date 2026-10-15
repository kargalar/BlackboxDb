'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import {
  ChevronUp,
  MessageSquare,
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getPosterUrl } from '@/lib/image-utils';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/date-utils';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';

const GET_POPULAR_REVIEWS = gql`
  query GetPopularReviews($sortBy: String, $limit: Int, $timeRange: String, $contentType: String) {
    allComments(sortBy: $sortBy, limit: $limit, timeRange: $timeRange, contentType: $contentType) {
      id
      contentId
      authorId
      description
      upvoteCount
      downvoteCount
      commentCount
      score
      createdAt
      author {
        id
        username
        picturePath
      }
      content {
        id
        title
        posterUrl
        contentTypeId
      }
    }
  }
`;

interface Review {
  id: number;
  contentId: string | null;
  authorId: string;
  description: string;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  score: number;
  createdAt: string;
  author: {
    id: string;
    username: string;
    picturePath: string | null;
  };
  content: {
    id: string;
    title: string;
    posterUrl?: string;
    contentTypeId?: number;
  } | null;
}

function getContentTypeFromId(contentTypeId?: number): string {
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

function ContentTypeIcon({ contentTypeId }: { contentTypeId?: number }) {
  switch (contentTypeId) {
    case 1:
      return <Film size={12} className="text-red-400" />;
    case 2:
      return <Tv size={12} className="text-blue-400" />;
    case 3:
      return <Gamepad2 size={12} className="text-purple-400" />;
    case 4:
      return <BookOpen size={12} className="text-amber-400" />;
    default:
      return <Globe size={12} className="text-emerald-400" />;
  }
}

const TIME_RANGES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'all', label: 'All Time' },
];

const CONTENT_TYPE_FILTERS = [
  { id: 0, label: 'All', icon: Globe },
  { id: 1, label: 'Movie', icon: Film },
  { id: 2, label: 'TV Show', icon: Tv },
  { id: 3, label: 'Game', icon: Gamepad2 },
  { id: 4, label: 'Book', icon: BookOpen },
];

const CONTENT_TYPE_META = [
  { id: 1, title: 'Movie Reviews', slug: 'movie', icon: Film },
  { id: 2, title: 'TV Show Reviews', slug: 'tv', icon: Tv },
  { id: 3, title: 'Game Reviews', slug: 'game', icon: Gamepad2 },
  { id: 4, title: 'Book Reviews', slug: 'book', icon: BookOpen },
];

interface PopularReviewsSectionProps {
  preferredContentTypes?: number[];
  splitByContentType?: boolean;
  layout?: 'carousel' | 'grid';
  showViewAll?: boolean;
}

export default function PopularReviewsSection({
  preferredContentTypes,
  splitByContentType = false,
  layout = 'carousel',
  showViewAll = true,
}: PopularReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsByType, setReviewsByType] = useState<Record<number, Review[]>>({});
  const [loading, setLoading] = useState(true);
  const [timeRangeIndex, setTimeRangeIndex] = useState(4); // Default: 'all'
  const [selectedFilterId, setSelectedFilterId] = useState(0);
  const { containerRef, dragScrollProps } = useHorizontalDragScroll();

  const scrollReviews = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    const amount = Math.max(container.clientWidth * 0.85, 280);
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  // Build available filters based on preferred content types
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
  const preferredContentTypeKey = (preferredContentTypes ?? []).join(',');
  const preferredContentTypeIds = preferredContentTypeKey
    ? preferredContentTypeKey.split(',').map(Number)
    : [];
  const activeContentTypes = CONTENT_TYPE_META.filter(
    (type) =>
      preferredContentTypeIds.length === 0 || preferredContentTypeIds.includes(type.id)
  );

  useEffect(() => {
    let cancelled = false;
    const preferredTypeIds = preferredContentTypeKey
      ? preferredContentTypeKey.split(',').map(Number)
      : [];

    async function load() {
      setLoading(true);
      try {
        if (splitByContentType) {
          const entries = await Promise.all(
            CONTENT_TYPE_META.filter(
              (type) => preferredTypeIds.length === 0 || preferredTypeIds.includes(type.id)
            ).map(async (type) => {
              const { data } = await apolloClient.query({
                query: GET_POPULAR_REVIEWS,
                variables: {
                  sortBy: 'top',
                  limit: 10,
                  timeRange: TIME_RANGES[timeRangeIndex].id,
                  contentType: type.slug,
                },
                fetchPolicy: 'network-only',
              });
              return [type.id, ((data as any)?.allComments || []) as Review[]] as const;
            })
          );
          if (cancelled) return;
          setReviewsByType(Object.fromEntries(entries));
          setReviews([]);
          return;
        }

        const { data } = await apolloClient.query({
          query: GET_POPULAR_REVIEWS,
          variables: {
            sortBy: 'top',
            limit: 20,
            timeRange: TIME_RANGES[timeRangeIndex].id,
            contentType: 'all',
          },
          fetchPolicy: 'network-only',
        });
        if (cancelled) return;
        let allReviews = (data as any)?.allComments || [];
        // Filter by preferred content types
        if (
          preferredTypeIds.length > 0 &&
          preferredTypeIds.length < CONTENT_TYPE_META.length
        ) {
          allReviews = allReviews.filter((r: Review) => {
            if (!r.content) return true;
            return preferredTypeIds.includes(r.content.contentTypeId || 0);
          });
        }
        // Apply user-selected content type filter
        if (selectedFilter.id !== 0) {
          allReviews = allReviews.filter((r: Review) => {
            if (!r.content) return false;
            return (r.content.contentTypeId || 0) === selectedFilter.id;
          });
        }
        setReviews(allReviews.slice(0, 12));
      } catch (e) {
        if (!cancelled) console.error('Error loading popular reviews:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [timeRangeIndex, preferredContentTypeKey, selectedFilter.id, splitByContentType]);

  if (splitByContentType) {
    const hasAnyReview = activeContentTypes.some(
      (type) => (reviewsByType[type.id] || []).length > 0
    );
    if (!loading && !hasAnyReview && timeRangeIndex === 4) return null;

    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">⭐ Popular Reviews</h2>
            <p className="text-sm text-white/50">Most liked reviews by content types</p>
          </div>
          <button
            onClick={() => setTimeRangeIndex((prev) => (prev + 1) % TIME_RANGES.length)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/10 self-start lg:self-auto"
          >
            {TIME_RANGES[timeRangeIndex].label}
          </button>
        </div>

        {activeContentTypes.map((type) => {
          const typeReviews = reviewsByType[type.id] || [];
          if (!loading && typeReviews.length === 0) return null;
          const Icon = type.icon;
          return (
            <div key={type.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Icon size={14} />
                  {type.title}
                </h3>
                <Link
                  href={`/discussions?type=reviews&contentType=${type.slug}` as any}
                  className="text-xs text-white/40 hover:text-white/70"
                >
                  See All
                </Link>
              </div>
              {loading ? (
                <div className="glass-card p-4 text-sm text-white/60">Loading reviews...</div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide">
                  {typeReviews.map((review) => (
                    <div
                      key={review.id}
                      draggable={false}
                      className="w-[280px] min-w-[280px] sm:w-[320px] sm:min-w-[320px] lg:w-[calc((100%-48px)/4)] lg:min-w-[270px] flex-none"
                    >
                      <ReviewCard review={review} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  if (!loading && reviews.length === 0 && timeRangeIndex === 4 && selectedFilter.id === 0)
    return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">⭐ Popular Reviews</h2>
          <p className="text-sm text-white/50">Most liked reviews</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {layout === 'carousel' && reviews.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => scrollReviews('left')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Scroll left"
                title="Scroll left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollReviews('right')}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Scroll right"
                title="Scroll right"
              >
                <ChevronRight size={16} />
              </button>
            </>
          )}
          {availableFilters.map((f) => {
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
          <button
            onClick={() => setTimeRangeIndex((prev) => (prev + 1) % TIME_RANGES.length)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/10"
          >
            {TIME_RANGES[timeRangeIndex].label}
          </button>
          {showViewAll && (
            <Link href="/discussions?type=reviews" className="btn-secondary text-sm px-4 py-2">
              See All
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/60">Loading reviews...</p>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-card p-6 text-center text-white/50">
          {selectedFilter.id !== 0
            ? `No reviews found in this content type.`
            : `No reviews found in this time period.`}
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div
          {...dragScrollProps}
          className="flex gap-4 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
        >
          {reviews.map((review) => (
            <div
              key={review.id}
              draggable={false}
              className="w-[280px] min-w-[280px] sm:w-[320px] sm:min-w-[320px] lg:w-[calc((100%-48px)/4)] lg:min-w-[270px] flex-none"
            >
              <ReviewCard review={review} />
            </div>
          ))}
          {showViewAll && <ReviewViewAllCard />}
        </div>
      )}
    </section>
  );
}

function ReviewViewAllCard() {
  return (
    <Link
      href={'/discussions?type=reviews' as any}
      draggable={false}
      className="w-[280px] min-w-[280px] sm:w-[320px] sm:min-w-[320px] lg:w-[calc((100%-48px)/4)] lg:min-w-[270px] flex-none"
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

function ReviewCard({ review }: { review: Review }) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const posterUrl = review.content?.posterUrl
    ? getPosterUrl.card(review.content.posterUrl)
    : null;
  const contentLink =
    review.contentId && review.content
      ? `/content/${getContentTypeFromId(review.content?.contentTypeId)}/${review.contentId}`
      : null;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on an inner link
    if ((e.target as HTMLElement).closest('a')) {
      return;
    }
    router.push(`/discussion/${review.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="glass-card p-4 hover:bg-white/5 transition-colors flex flex-col justify-between min-h-[184px] h-full cursor-pointer gap-3"
    >
      <div className="flex gap-4">
        {/* Poster */}
        {contentLink && posterUrl && !imageError ? (
          <Link href={contentLink as any} className="flex-shrink-0">
            <div className="w-16 h-24 rounded-lg overflow-hidden relative ring-1 ring-white/10">
              <Image
                src={posterUrl}
                alt={review.content?.title || ''}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
                onError={() => setImageError(true)}
              />
            </div>
          </Link>
        ) : (
          <div className="w-16 h-24 rounded-lg bg-zinc-800/80 flex items-center justify-center ring-1 ring-white/10 flex-shrink-0">
            <ContentTypeIcon contentTypeId={review.content?.contentTypeId} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
          {/* Author Header */}
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${review.author.username}` as any}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="w-6 h-6 rounded-full bg-violet-500 overflow-hidden flex-shrink-0 border border-white/10">
                {review.author.picturePath ? (
                  <Image
                    src={review.author.picturePath}
                    alt={review.author.username}
                    width={24}
                    height={24}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-white text-[10px] font-bold">
                    {review.author.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-white/90 truncate">
                {review.author.username}
              </span>
            </Link>
            <span className="text-xs text-white/40 shrink-0">&bull;</span>
            <span className="text-xs text-white/40 shrink-0">
              {formatRelativeTime(review.createdAt)}
            </span>
          </div>

          {/* Content title */}
          {review.content && contentLink && (
            <Link
              href={contentLink as any}
              className="text-base font-bold text-white hover:text-violet-400 transition-colors line-clamp-1"
            >
              {review.content.title}
            </Link>
          )}

          {/* Review text */}
          <div className="flex gap-2 text-xs text-white/70 italic mt-auto">
            <MessageSquare size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed">&quot;{review.description}&quot;</p>
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-3 pt-1.5 border-t border-white/5 text-xs text-white/40">
        <span className="flex items-center gap-1 text-violet-300 font-medium">
          <ChevronUp size={12} />
          {review.score}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={12} />
          {review.commentCount}
        </span>
      </div>
    </div>
  );
}
