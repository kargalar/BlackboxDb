/**
 * Component: MovieCard
 *
 * Film içerikleri için kart component'i.
 * Ortak UI component'lerini kullanarak kod tekrarını azaltır.
 */

import ContentCard from '@/components/atoms/ContentCard';
import ContentActionButtons from '@/components/atoms/shared/ContentActionButtons';
import ContentBadgesContainer from '@/components/atoms/shared/ContentBadges';
import { useContentActions } from '@/hooks/useContentActions';
import type { Route } from 'next';

interface MovieCardProps {
  movie: {
    id: string | number;
    title?: string;
    name?: string;
    posterUrl?: string | null;
    poster_path?: string | null; // Deprecated: use posterUrl
    release_date?: string;
    releaseDate?: string;
  };
  size?: 'small' | 'medium' | 'large';
  subtitleOverride?: string | null;
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  showActions?: boolean;
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  isContinuing?: boolean;
  isAbandoned?: boolean;
  viewerIsConsumed?: boolean;
  viewerIsFavorite?: boolean;
  viewerIsConsumeLater?: boolean;
  viewerIsContinuing?: boolean;
  viewerIsAbandoned?: boolean;
  userConsumeCount?: number;
  onWatch?: (movieId: string | number) => void;
  onToggleFavorite?: (movieId: string | number) => void;
  onToggleWatchlist?: (movieId: string | number) => void;
  onToggleContinuing?: (movieId: string | number) => void;
  onAddToList?: (movieId: string | number) => void;
  className?: string;
  hasReview?: boolean;
}

export default function MovieCard({
  movie,
  size = 'medium',
  subtitleOverride = null,
  showRating = false,
  rating,
  reviewCount,
  showActions = true,
  isConsumed = false,
  isFavorite = false,
  isConsumeLater = false,
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
  className = '',
  hasReview = false,
}: MovieCardProps) {
  const movieTitle = movie.title || movie.name || 'Bilinmeyen Film';
  const releaseDate = movie.releaseDate || movie.release_date;
  const posterUrl = movie.posterUrl || movie.poster_path;

  console.log(`🎬 [MovieCard] ${movieTitle}:`, {
    posterUrl,
  });

  // Ortak event handler'ları hook'tan al
  const { handleWatch, handleToggleFavorite, handleToggleWatchlist, handleToggleContinuing } =
    useContentActions({
      contentId: movie.id,
      contentType: 'movie',
      onWatch,
      onToggleFavorite,
      onToggleWatchlist,
      onToggleContinuing,
    });

  // Listeye ekle handler
  const handleAddToList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToList) onAddToList(movie.id);
  };

  const href = `/content/movie/${movie.id}` as Route;

  // Action buttons overlay (hover'da gösterilir)
  const overlay = showActions ? (
    <ContentActionButtons
      size={size}
      actionType="watch"
      contentType="movie"
      isConsumed={viewerIsConsumed ?? isConsumed}
      isFavorite={viewerIsFavorite ?? isFavorite}
      isConsumeLater={viewerIsConsumeLater ?? isConsumeLater}
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
      isConsumeLater={isConsumeLater}
      isContinuing={isContinuing}
      isAbandoned={isAbandoned}
      hasReview={hasReview}
      userConsumeCount={userConsumeCount}
    />
  );

  return (
    <ContentCard
      href={href}
      title={movieTitle}
      subtitle={
        subtitleOverride ?? (releaseDate ? String(new Date(releaseDate).getFullYear()) : undefined)
      }
      posterSrc={posterUrl}
      size={size}
      className={className}
      overlay={overlay}
      rightTop={badges}
      useNextImage={false}
    />
  );
}
