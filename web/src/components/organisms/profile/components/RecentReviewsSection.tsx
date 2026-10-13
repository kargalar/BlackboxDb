import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPosterUrl } from '@/lib/image-utils';
import { Activity, MessageSquare, ThumbsUp } from 'lucide-react';
import { getCommentCountClass, getCommentCountWeight } from '@/lib/comment-count-utils';
import { formatRelativeTime } from '@/lib/date-utils';

interface RecentReviewsSectionProps {
  username: string;
  reviews: any[];
  showPrivate?: boolean;
}

export default function RecentReviewsSection({
  username,
  reviews,
  showPrivate = false,
}: RecentReviewsSectionProps) {
  if (!reviews || reviews.length === 0) {
    return null;
  }

  const visibleReviews = reviews.filter(
    (activity) =>
      activity?.review && (showPrivate || activity?.reviewDiscussion?.isPublic !== false)
  );

  if (visibleReviews.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 md:p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_35%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
                <Activity className="h-5 w-5 text-white/75" />
                Son İncelemeler
              </h3>
              <Link
                href={{
                  pathname: `/profile/${encodeURIComponent(username)}` as Route,
                  query: { tab: 'reviews' },
                }}
                onClick={() => {
                  console.log('🔗 [RecentReviewsSection] Navigating to all reviews tab:', username);
                }}
                className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
              >
                Tümünü Gör
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {visibleReviews.map((activity) => (
            <ReviewItem key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </section>
  );
}

const ReviewItem = ({ activity }: { activity: any }) => {
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  const contentType = activity.content?.contentTypeId;

  if (!activity.content || !activity.review) {
    return null;
  }

  const getImageUrl = () => {
    const posterPath = activity.content?.posterUrl || activity.content?.posterPath;
    if (!posterPath) return null;
    return getPosterUrl.original(posterPath);
  };

  const getContentLink = () => {
    const contentId = activity.content.id;
    switch (contentType) {
      case 1:
        return `/content/movie/${contentId}`;
      case 2:
        return `/content/tv/${contentId}`;
      case 3:
        return `/content/game/${contentId}`;
      case 4:
        return `/content/book/${contentId}`;
      case 5:
        return `/content/music/${contentId}`;
      default:
        return `/content/movie/${contentId}`;
    }
  };

  const contentLink = getContentLink();
  const imageUrl = getImageUrl();

  const reviewDiscussion = activity.reviewDiscussion;
  const discussionLink = reviewDiscussion?.id ? `/discussion/${reviewDiscussion.id}` : null;

  // Click on the card background → navigate to discussion page
  const handleCardClick = () => {
    if (discussionLink) {
      router.push(discussionLink as any);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-4 transition-all duration-300 flex items-start gap-4 shadow-lg shadow-black/20 hover:bg-white/[0.05] hover:border-white/15 ${discussionLink ? 'cursor-pointer' : ''}`}
    >
      {/* Date badge - Bottom Right */}
      <div className="absolute bottom-3 right-4 md:bottom-4 md:right-5">
        <span className="text-[10px] md:text-xs font-medium text-gray-500/50">
          {formatRelativeTime(activity.date || activity.createdAt)}
        </span>
      </div>

      {/* Poster - links to content page */}
      <Link
        href={contentLink as any}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0 relative overflow-hidden rounded-lg shadow-md w-16 md:w-20 aspect-[2/3] bg-zinc-800/80 ring-1 ring-white/5 hover:ring-white/10 transition-all z-10"
      >
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={activity.content.title}
            fill
            sizes="(max-width: 768px) 64px, 80px"
            className="object-cover hover:scale-105 transition-transform duration-500"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-2">
            <span className="text-[0.6rem] font-medium text-center text-gray-400 leading-tight line-clamp-3">
              {activity.content.title}
            </span>
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex flex-col justify-center flex-grow min-w-0 md:pt-1">
        {/* Title and minimal badges */}
        <Link
          href={contentLink as any}
          onClick={(e) => e.stopPropagation()}
          className="block w-fit max-w-[85%] pr-10 md:pr-14 mb-1"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm md:text-base font-bold text-gray-100 truncate hover:text-white transition-colors">
              {activity.content.title}
            </h3>
            {(activity.rating ||
              activity.isFavorite ||
              activity.reviewDiscussion?.authorIsFavorite) && (
              <div className="flex items-center gap-1 text-gray-500">
                {activity.rating && (
                  <span className="flex items-center text-xs font-medium" title="Puan">
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {activity.rating}
                  </span>
                )}
                {(activity.isFavorite || activity.reviewDiscussion?.authorIsFavorite) && (
                  <span className="flex items-center" title="Favori">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                )}
              </div>
            )}
          </div>
          {activity.content.releaseDate && (
            <p className="text-[10px] md:text-xs text-gray-500 font-medium mt-0.5">
              {new Date(activity.content.releaseDate).getFullYear()}
            </p>
          )}
        </Link>

        {/* Review Section */}
        <div className="mt-2 pl-3 relative pr-6">
          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-white/25 rounded-full" />
          <p className="text-xs md:text-sm text-gray-300 italic line-clamp-4 leading-relaxed group-hover:text-gray-200 transition-colors">
            &quot;{activity.review}&quot;
          </p>
        </div>

        {/* Discussion Stats */}
        {reviewDiscussion && (
          <div className="flex items-center gap-4 mt-3 pl-3 text-xs font-medium text-gray-500 group-hover:text-gray-400 transition-colors">
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{reviewDiscussion.upvoteCount - reviewDiscussion.downvoteCount} Oy</span>
            </div>
            <div
              className={`flex items-center gap-1.5 ${getCommentCountClass(reviewDiscussion.commentCount)} ${getCommentCountWeight(reviewDiscussion.commentCount)}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{reviewDiscussion.commentCount} Yorum</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
