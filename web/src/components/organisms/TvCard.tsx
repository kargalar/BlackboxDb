/**
 * Component: TvCard
 *
 * TV dizi içerikleri için kart component'i.
 * Ortak UI component'lerini kullanarak kod tekrarını azaltır.
 */

import ContentCard from '@/components/atoms/ContentCard';
import type { PosterRatingData } from '@/lib/poster-rating';
import ContentActionButtons from '@/components/atoms/shared/ContentActionButtons';
import ContentBadgesContainer from '@/components/atoms/shared/ContentBadges';
import { useContentActions } from '@/hooks/useContentActions';
import type { Route } from 'next';

interface TvCardProps {
  tv: PosterRatingData & {
    id: string | number;
    name?: string;
    title?: string;
    posterUrl?: string | null;
    poster_path?: string | null; // Deprecated: use posterUrl
    first_air_date?: string;
    firstAirDate?: string;
  };
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showActions?: boolean;
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  watchLater?: boolean;
  isWatchLater?: boolean;
  isContinuing?: boolean;
  isAbandoned?: boolean;
  viewerIsConsumed?: boolean;
  viewerIsFavorite?: boolean;
  viewerIsConsumeLater?: boolean;
  viewerIsContinuing?: boolean;
  viewerIsAbandoned?: boolean;
  userConsumeCount?: number;
  onWatch?: (tvId: string | number) => void;
  onToggleFavorite?: (tvId: string | number) => void;
  onToggleWatchlist?: (tvId: string | number) => void;
  onToggleContinuing?: (tvId: string | number) => void;
  onAddToList?: (tvId: string | number) => void;
  subtitleOverride?: string | null;
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  hasReview?: boolean;
}

export default function TvCard({
  tv,
  size = 'medium',
  className = '',
  showActions = true,
  isConsumed = false,
  isFavorite = false,
  isConsumeLater = false,
  watchLater,
  isWatchLater,
  isContinuing = false,
  isAbandoned = false,
  viewerIsConsumed,
  viewerIsFavorite,
  viewerIsConsumeLater,
  viewerIsContinuing,
  viewerIsAbandoned,
  userConsumeCount,
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  onToggleContinuing,
  onAddToList,
  subtitleOverride = null,
  showRating = false,
  rating,
  reviewCount,
  hasReview = false,
}: TvCardProps) {
  const activeConsumeLater = Boolean(
    viewerIsConsumeLater || isConsumeLater || watchLater || isWatchLater
  );
  const title = tv.name || tv.title || 'Bilinmeyen Dizi';
  const firstAirDate = tv.firstAirDate || tv.first_air_date;
  const posterUrl = tv.posterUrl || tv.poster_path;

  console.log(`📺 [TvCard] ${title}:`, {
    posterUrl,
  });
  const href = `/content/tv/${tv.id}` as Route;

  // Ortak event handler'ları hook'tan al
  const { handleWatch, handleToggleFavorite, handleToggleWatchlist, handleToggleContinuing } =
    useContentActions({
      contentId: tv.id,
      contentType: 'tv',
      onWatch,
      onToggleFavorite,
      onToggleWatchlist,
      onToggleContinuing,
    });

  // Listeye ekle handler
  const handleAddToList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToList) onAddToList(tv.id);
  };

  // Action buttons overlay (hover'da gösterilir)
  const overlay = showActions ? (
    <ContentActionButtons
      size={size}
      actionType="watch"
      contentType="tv"
      isConsumed={viewerIsConsumed ?? isConsumed}
      isFavorite={viewerIsFavorite ?? isFavorite}
      isConsumeLater={activeConsumeLater}
      isContinuing={viewerIsContinuing ?? isContinuing}
      isAbandoned={viewerIsAbandoned ?? isAbandoned}
      onWatch={handleWatch}
      onToggleFavorite={handleToggleFavorite}
      onToggleWatchlist={handleToggleWatchlist}
      onToggleContinuing={handleToggleContinuing}
      onAddToList={onAddToList ? handleAddToList : undefined}
    />
  ) : null;

  // Rating ve status badge'leri
  const badges = (
    <ContentBadgesContainer
      showRating={showRating}
      rating={rating}
      reviewCount={reviewCount}
      size={size}
      isConsumed={isConsumed}
      isFavorite={isFavorite}
      isConsumeLater={activeConsumeLater}
      isContinuing={isContinuing}
      isAbandoned={isAbandoned}
      hasReview={hasReview}
      userConsumeCount={userConsumeCount}
    />
  );

  return (
    <ContentCard
      href={href}
      title={title}
      subtitle={
        subtitleOverride ??
        (firstAirDate ? String(new Date(firstAirDate).getFullYear()) : undefined)
      }
      posterSrc={posterUrl}
      size={size}
      className={className}
      overlay={overlay}
      rightTop={badges}
      communityRating={tv}
      useNextImage={false}
    />
  );
}
