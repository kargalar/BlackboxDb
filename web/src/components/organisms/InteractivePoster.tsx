/**
 * Component: InteractivePoster (Refactored)
 *
 * Bu component artık yeni refactor edilmiş card component'leri için bir wrapper.
 * MovieCard, TvCard, BookCard ve GameCard'ı content type'a göre kullanır.
 *
 * Geriye dönük uyumluluk için mevcut prop interface korunmuştur.
 * Artık tüm logic ortak component'lerde (ContentActionButtons, ContentBadges, useContentActions)
 */

import type { PosterRatingData } from '@/lib/poster-rating';
import MovieCard from '@/components/organisms/MovieCard';
import TvCard from '@/components/organisms/TvCard';
import BookCard from '@/components/organisms/BookCard';
import GameCard from '@/components/organisms/GameCard';

// Types for different content
type ContentType = 'movie' | 'tv' | 'game' | 'book' | string;

interface BaseContent extends PosterRatingData {
  id: number | string;
  title?: string;
  name?: string;
  posterUrl?: string | null;
  poster_path?: string | null; // Deprecated: use posterUrl
  cover?: { url?: string; id?: number; image_id?: string }; // Deprecated: IGDB format
  thumbnail?: string | null; // Deprecated: Google Books format
  volumeInfo?: {
    title: string;
    imageLinks?: { thumbnail: string };
  };
  first_release_date?: number;
  release_date?: string;
  releaseDate?: string;
  first_air_date?: string;
  firstAirDate?: string;
  authors?: string[];
  publishedDate?: string | null;
  artist?: string;
  label?: string | null;
}

interface InteractivePosterProps {
  content: BaseContent;
  contentType: ContentType;
  subtitleOverride?: string | null;
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
  rating?: number | null;
  onWatch?: () => void;
  onToggleFavorite?: () => void;
  onToggleWatchlist?: () => void;
  onToggleContinuing?: () => void;
  onAddToList?: () => void;
  showActions?: boolean;
  size?: 'small' | 'medium' | 'large';
  useNextImage?: boolean;
  context?: string; // Geriye dönük uyumluluk için (kullanılmıyor)
  hasReview?: boolean;
}

/**
 * InteractivePoster - Wrapper Component
 *
 * Content type'a göre uygun card component'ini render eder.
 * Eski kullanımlarla tam uyumludur.
 */
export default function InteractivePoster({
  content,
  contentType,
  subtitleOverride = null,
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
  rating,
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  onToggleContinuing,
  onAddToList,
  showActions = true,
  size = 'large',
  useNextImage = true,
  context, // Ignore edilir, geriye dönük uyumluluk için
  hasReview = false,
}: InteractivePosterProps) {
  const activeConsumeLater = Boolean(
    viewerIsConsumeLater || isConsumeLater || watchLater || isWatchLater
  );

  // Content type'a göre doğru card component'ini kullan
  switch (contentType) {
    case 'movie': {
      // Movie için uygun formatı hazırla
      const movieContent = {
        ratingDistribution: content.ratingDistribution,
        tmdbRating: content.tmdbRating,
        id: String(content.id),
        title: content.title,
        name: content.name,
        posterUrl: content.posterUrl || content.poster_path,
        releaseDate: content.releaseDate || content.release_date,
      };

      return (
        <MovieCard
          movie={movieContent}
          size={size}
          subtitleOverride={subtitleOverride}
          isConsumed={isConsumed}
          isFavorite={isFavorite}
          isConsumeLater={activeConsumeLater}
          isContinuing={isContinuing}
          isAbandoned={isAbandoned}
          viewerIsConsumed={viewerIsConsumed}
          viewerIsFavorite={viewerIsFavorite}
          viewerIsConsumeLater={activeConsumeLater}
          viewerIsContinuing={viewerIsContinuing}
          viewerIsAbandoned={viewerIsAbandoned}
          userConsumeCount={userConsumeCount}
          showRating={rating !== undefined && rating !== null}
          rating={rating ?? undefined}
          onWatch={onWatch ? () => onWatch() : undefined}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite() : undefined}
          onToggleWatchlist={onToggleWatchlist ? () => onToggleWatchlist() : undefined}
          onToggleContinuing={onToggleContinuing ? () => onToggleContinuing() : undefined}
          onAddToList={onAddToList ? () => onAddToList() : undefined}
          showActions={showActions}
          hasReview={hasReview}
        />
      );
    }

    case 'tv': {
      // TV için uygun formatı hazırla
      const tvContent = {
        ratingDistribution: content.ratingDistribution,
        tmdbRating: content.tmdbRating,
        id: String(content.id),
        name: content.name,
        title: content.title,
        posterUrl: content.posterUrl || content.poster_path,
        firstAirDate:
          content.firstAirDate ||
          content.first_air_date ||
          content.releaseDate ||
          content.release_date,
      };

      return (
        <TvCard
          tv={tvContent}
          size={size}
          subtitleOverride={subtitleOverride}
          isConsumed={isConsumed}
          isFavorite={isFavorite}
          isConsumeLater={activeConsumeLater}
          isContinuing={isContinuing}
          isAbandoned={isAbandoned}
          viewerIsConsumed={viewerIsConsumed}
          viewerIsFavorite={viewerIsFavorite}
          viewerIsConsumeLater={activeConsumeLater}
          viewerIsContinuing={viewerIsContinuing}
          viewerIsAbandoned={viewerIsAbandoned}
          userConsumeCount={userConsumeCount}
          showRating={rating !== undefined && rating !== null}
          rating={rating ?? undefined}
          onWatch={onWatch ? () => onWatch() : undefined}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite() : undefined}
          onToggleWatchlist={onToggleWatchlist ? () => onToggleWatchlist() : undefined}
          onToggleContinuing={onToggleContinuing ? () => onToggleContinuing() : undefined}
          onAddToList={onAddToList ? () => onAddToList() : undefined}
          showActions={showActions}
          hasReview={hasReview}
        />
      );
    }

    case 'game': {
      // Game için uygun formatı hazırla
      const posterUrl = content.posterUrl || content.poster_path;

      // API'den gelen cover objesi varsa backward compatibility için kullan
      let coverData = content.cover?.image_id ? { image_id: content.cover.image_id } : undefined;

      // ID'yi string olarak koru - Number dönüşümü NaN'a yol açabilir
      const gameContent = {
        ratingDistribution: content.ratingDistribution,
        tmdbRating: content.tmdbRating,
        id: String(content.id),
        name: content.name || content.title || 'Unknown Game',
        posterUrl,
        cover: coverData,
        releaseDate: content.releaseDate || content.release_date,
        first_release_date: content.first_release_date,
      };

      return (
        <GameCard
          game={gameContent}
          size={size}
          subtitleOverride={subtitleOverride}
          isConsumed={isConsumed}
          isFavorite={isFavorite}
          isConsumeLater={activeConsumeLater}
          isContinuing={isContinuing}
          isAbandoned={isAbandoned}
          viewerIsConsumed={viewerIsConsumed}
          viewerIsFavorite={viewerIsFavorite}
          viewerIsConsumeLater={activeConsumeLater}
          viewerIsContinuing={viewerIsContinuing}
          viewerIsAbandoned={viewerIsAbandoned}
          userConsumeCount={userConsumeCount}
          showRating={rating !== undefined && rating !== null}
          rating={rating ?? undefined}
          onWatch={onWatch ? () => onWatch() : undefined}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite() : undefined}
          onToggleWatchlist={onToggleWatchlist ? () => onToggleWatchlist() : undefined}
          onToggleContinuing={onToggleContinuing ? () => onToggleContinuing() : undefined}
          onAddToList={onAddToList ? () => onAddToList() : undefined}
          showActions={showActions}
          hasReview={hasReview}
        />
      );
    }

    case 'book': {
      // Book için uygun formatı hazırla
      const posterUrl =
        content.posterUrl ||
        content.volumeInfo?.imageLinks?.thumbnail ||
        content.thumbnail ||
        content.poster_path;

      const bookContent = {
        ratingDistribution: content.ratingDistribution,
        tmdbRating: content.tmdbRating,
        id: String(content.id),
        title: content.volumeInfo?.title || content.title || content.name || 'Unknown Book',
        authors: content.authors,
        posterUrl,
        publishedDate: content.publishedDate,
        infoLink: null,
      };

      return (
        <BookCard
          book={bookContent}
          size={size}
          subtitleOverride={subtitleOverride}
          isConsumed={isConsumed}
          isFavorite={isFavorite}
          isConsumeLater={activeConsumeLater}
          isContinuing={isContinuing}
          isAbandoned={isAbandoned}
          viewerIsConsumed={viewerIsConsumed}
          viewerIsFavorite={viewerIsFavorite}
          viewerIsConsumeLater={activeConsumeLater}
          viewerIsContinuing={viewerIsContinuing}
          viewerIsAbandoned={viewerIsAbandoned}
          userConsumeCount={userConsumeCount}
          showRating={rating !== undefined && rating !== null}
          rating={rating ?? undefined}
          onWatch={onWatch ? () => onWatch() : undefined}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite() : undefined}
          onToggleWatchlist={onToggleWatchlist ? () => onToggleWatchlist() : undefined}
          onToggleContinuing={onToggleContinuing ? () => onToggleContinuing() : undefined}
          onAddToList={onAddToList ? () => onAddToList() : undefined}
          showActions={showActions}
          hasReview={hasReview}
        />
      );
    }

    default: {
      console.warn(`⚠️ Unknown content type: ${contentType}`);
      return null;
    }
  }
}
