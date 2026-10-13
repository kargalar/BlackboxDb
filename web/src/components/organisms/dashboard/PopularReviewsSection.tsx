'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { ChevronUp, MessageSquare, Film, Tv, Gamepad2, BookOpen, Music, Globe } from 'lucide-react';
import { getPosterUrl } from '@/lib/image-utils';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/date-utils';

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
    case 5:
      return 'music';
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
    case 5:
      return <Music size={12} className="text-pink-400" />;
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
  { id: 5, label: 'Music', icon: Music },
];

const CONTENT_TYPE_META = [
  { id: 1, title: 'Movie Reviews', slug: 'movie', icon: Film },
  { id: 2, title: 'TV Show Reviews', slug: 'tv', icon: Tv },
  { id: 3, title: 'Game Reviews', slug: 'game', icon: Gamepad2 },
  { id: 4, title: 'Book Reviews', slug: 'book', icon: BookOpen },
  { id: 5, title: 'Music Reviews', slug: 'music', icon: Music },
];

export default function PopularReviewsSection({
  preferredContentTypes,
  splitByContentType = false,
}: {
  preferredContentTypes?: number[];
  splitByContentType?: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsByType, setReviewsByType] = useState<Record<number, Review[]>>({});
  const [loading, setLoading] = useState(true);
  const [timeRangeIndex, setTimeRangeIndex] = useState(4); // Default: 'all'
  const [selectedFilterId, setSelectedFilterId] = useState(0);

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
                  limit: 5,
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
        setReviews(allReviews.slice(0, 5));
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

  // Sadece hiç filtre yokken ve tüm zamanlar boşsa tamamen gizle
  if (splitByContentType) {
    const hasAnyReview = activeContentTypes.some(
      (type) => (reviewsByType[type.id] || []).length > 0
    );
    if (!loading && !hasAnyReview && timeRangeIndex === 4) return null;

    return (
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">⭐ Popular Reviews</h2>
            <p className="text-sm text-white/50">Most liked reviews by content types</p>
          </div>
          <button
            onClick={() => setTimeRangeIndex((prev) => (prev + 1) % TIME_RANGES.length)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/10"
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
                <div className="space-y-3">
                  {typeReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">⭐ Popular Reviews</h2>
          <p className="text-sm text-white/50">Most liked reviews</p>
        </div>
        <div className="flex items-center gap-2">
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
          <Link href="/discussions?type=reviews" className="btn-secondary text-sm px-4 py-2">
            See All
          </Link>
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
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const posterUrl = review.content?.posterUrl
    ? getPosterUrl.original(review.content.posterUrl)
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
      className="glass-card p-4 hover:bg-white/5 transition-colors block cursor-pointer"
    >
      <div className="flex gap-3">
        {/* Poster */}
        {contentLink && posterUrl && !imageError ? (
          <Link href={contentLink as any} className="flex-shrink-0">
            <div className="w-[84px] h-[126px] rounded-lg overflow-hidden bg-zinc-800 ring-1 ring-white/5 relative">
              <Image
                src={posterUrl}
                alt={review.content?.title || ''}
                fill
                sizes="84px"
                className="object-cover"
                unoptimized
                onError={() => setImageError(true)}
              />
            </div>
          </Link>
        ) : (
          <div className="w-[84px] h-[126px] rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 ring-1 ring-white/5">
            <ContentTypeIcon contentTypeId={review.content?.contentTypeId} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Content title */}
          {review.content && contentLink && (
            <Link
              href={contentLink as any}
              className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-violet-400 transition-colors truncate mb-1"
            >
              <ContentTypeIcon contentTypeId={review.content?.contentTypeId} />
              <span className="truncate">{review.content.title}</span>
            </Link>
          )}

          {/* Review text */}
          <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">
            &quot;{review.description}&quot;
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
            <Link
              href={`/profile/${review.author.username}` as any}
              className="flex items-center gap-1.5 hover:text-white/60 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-violet-500 overflow-hidden flex-shrink-0">
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
              <span>{review.author.username}</span>
            </Link>

            <span className="flex items-center gap-1">
              <ChevronUp size={12} />
              {review.score}
            </span>

            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {review.commentCount}
            </span>

            <span>{formatRelativeTime(review.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
