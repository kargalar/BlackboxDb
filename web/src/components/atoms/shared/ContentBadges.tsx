/**
 * Shared Component: ContentBadges
 *
 * İçerik kartları için ortak badge component'leri:
 * - Rating badge (yıldız ve puan gösterimi)
 * - Status badges (izlendi, favori, listede)
 *
 * Kod tekrarını önlemek için tüm content card'larda kullanılır.
 */

import React from 'react';
import { EyeIconSolid } from '@/components/atoms/icons/EyeIcon';
import { HeartIcon } from '@/components/atoms/icons/HeartIcon';
import { BookmarkIcon } from '@/components/atoms/icons/BookmarkIcon';
import { formatRating } from '@/lib/formatRating';
import { useUserPreferences } from '@/hooks/useUserPreferences';

type SizeVariant = 'small' | 'medium' | 'large';

interface RatingBadgeProps {
  rating: number;
  reviewCount?: number;
  transparent?: boolean;
}

/**
 * RatingBadge Component
 * İçerik puanını ve yorum sayısını gösterir
 */
export function RatingBadge({ rating, reviewCount, transparent = false }: RatingBadgeProps) {
  if (!rating || rating <= 0) return null;

  return (
    <div
      className={`rounded-full text-xs font-medium flex items-center gap-1 ${transparent ? 'text-gray-300' : 'bg-black/70 px-2 py-1 text-white backdrop-blur-sm'}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-3 h-3 ${transparent ? 'text-gray-400' : 'text-white'}`}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {formatRating(rating)}
      {reviewCount && reviewCount > 0 && <span className="ml-1 opacity-75">({reviewCount})</span>}
    </div>
  );
}

interface StatusBadgesProps {
  size?: SizeVariant;
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  isContinuing?: boolean;
  isAbandoned?: boolean;
  hasReview?: boolean;
  userConsumeCount?: number;
  transparent?: boolean;
}

// Size class mapping
const iconSizeClasses: Record<SizeVariant, string> = {
  small: 'w-3 h-3',
  medium: 'w-3 h-3',
  large: 'w-4 h-4',
};

/**
 * StatusBadges Component
 * İçerik durumunu gösteren badge'leri render eder
 * (izlendi, favori, listede)
 */
export function StatusBadges({
  size = 'medium',
  isConsumed = false,
  isFavorite = false,
  isConsumeLater = false,
  isContinuing = false,
  isAbandoned = false,
  hasReview = false,
  userConsumeCount,
  transparent = false,
}: StatusBadgesProps) {
  // Hiç badge yoksa null döndür
  if (!isConsumed && !isFavorite && !isConsumeLater && !isContinuing && !isAbandoned && !hasReview)
    return null;

  const iconSize = iconSizeClasses[size];
  const bgClass = transparent ? '' : 'bg-black/60 backdrop-blur-sm p-1';
  const textClass = transparent ? 'text-gray-400' : 'text-white/90';

  return (
    <div className="flex flex-row gap-1">
      {/* Continuing Badge */}
      {isContinuing && (
        <div className={`rounded-full flex items-center justify-center ${bgClass}`}>
          <svg
            className={`${iconSize} ${textClass}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      )}

      {/* Abandoned Badge */}
      {isAbandoned && (
        <div className={`rounded-full flex items-center justify-center ${bgClass}`}>
          <svg
            className={`${iconSize} ${textClass}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
      )}

      {/* Watched/Read/Played Badge */}
      {isConsumed && (
        <div className={`rounded-full flex items-center justify-center ${bgClass}`}>
          <EyeIconSolid className={`${iconSize} ${textClass}`} />
          {userConsumeCount && userConsumeCount > 1 ? (
            <span
              className={`text-[10px] ml-0.5 font-bold pr-0.5 leading-none ${transparent ? 'text-gray-400' : 'text-white/90'}`}
            >
              x{userConsumeCount}
            </span>
          ) : null}
        </div>
      )}

      {/* Favorite Badge */}
      {isFavorite && (
        <div className={`rounded-full flex items-center justify-center ${bgClass}`}>
          <HeartIcon className={`${iconSize} ${textClass}`} />
        </div>
      )}

      {/* Watchlist Badge */}
      {isConsumeLater && (
        <div className={`rounded-full flex items-center justify-center ${bgClass}`}>
          <BookmarkIcon className={`${iconSize} ${textClass}`} />
        </div>
      )}

      {/* Review Badge */}
      {hasReview && (
        <div className={`rounded-full flex items-center justify-center ${bgClass}`}>
          <svg className={`${iconSize} text-amber-400`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        </div>
      )}
    </div>
  );
}

interface ContentBadgesContainerProps {
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  size?: SizeVariant;
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  isContinuing?: boolean;
  isAbandoned?: boolean;
  hasReview?: boolean;
  userConsumeCount?: number;
}

/**
 * ContentBadgesContainer
 * Rating ve status badge'lerini birlikte gösterir
 * ContentCard'ın rightTop prop'una geçilebilir
 */
export function ContentBadgesContainer({
  showRating = false,
  rating,
  reviewCount,
  size = 'medium',
  isConsumed = false,
  isFavorite = false,
  isConsumeLater = false,
  isContinuing = false,
  isAbandoned = false,
  hasReview = false,
  userConsumeCount,
}: ContentBadgesContainerProps) {
  const { posterIconsBelow } = useUserPreferences();

  const ratingBadge =
    showRating && rating ? (
      <RatingBadge rating={rating} reviewCount={reviewCount} transparent={posterIconsBelow} />
    ) : null;

  const statusBadges = (
    <StatusBadges
      size={size}
      isConsumed={isConsumed}
      isFavorite={isFavorite}
      isConsumeLater={isConsumeLater}
      isContinuing={isContinuing}
      isAbandoned={isAbandoned}
      hasReview={hasReview}
      userConsumeCount={userConsumeCount}
      transparent={posterIconsBelow}
    />
  );

  // Hiçbir badge yoksa null döndür
  if (!ratingBadge && !statusBadges) return null;

  return (
    <div
      className={`flex flex-row flex-wrap items-center ${posterIconsBelow ? 'gap-2 mt-1' : 'gap-1'}`}
    >
      {ratingBadge}
      {statusBadges}
    </div>
  );
}

export default ContentBadgesContainer;
