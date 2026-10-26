/**
 * Component: GameCard
 *
 * Oyun içerikleri için kart component'i.
 * Ortak UI component'lerini kullanarak kod tekrarını azaltır.
 */

import type { Route } from 'next';
import ContentCard from '@/components/atoms/ContentCard';
import type { PosterRatingData } from '@/lib/poster-rating';
import ContentActionButtons from '@/components/atoms/shared/ContentActionButtons';
import ContentBadgesContainer from '@/components/atoms/shared/ContentBadges';
import { useContentActions } from '@/hooks/useContentActions';

type Game = PosterRatingData & {
  id: string | number;
  name: string;
  title?: string;
  posterUrl?: string | null;
  cover?: { image_id: string }; // Deprecated: for IGDB format
  first_release_date?: number;
  releaseDate?: string;
};

interface GameCardProps {
  game: Game;
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
  onWatch?: (gameId: string | number) => void;
  onToggleFavorite?: (gameId: string | number) => void;
  onToggleWatchlist?: (gameId: string | number) => void;
  onToggleContinuing?: (gameId: string | number) => void;
  onAddToList?: (gameId: string | number) => void;
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  subtitleOverride?: string | null;
  hasReview?: boolean;
}

export default function GameCard({
  game,
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
  showRating = false,
  rating,
  reviewCount,
  subtitleOverride = null,
  hasReview = false,
}: GameCardProps) {
  const activeConsumeLater = Boolean(
    viewerIsConsumeLater || isConsumeLater || watchLater || isWatchLater
  );
  const gameName = game.name || game.title || 'Bilinmeyen Oyun';

  // Handle date formatting - support both IGDB timestamp and ISO string
  let year: number | undefined;
  if (game.first_release_date) {
    year = new Date(game.first_release_date * 1000).getFullYear();
  } else if (game.releaseDate) {
    year = new Date(game.releaseDate).getFullYear();
  }

  // Handle poster URL - support both new posterUrl and old IGDB format
  const posterUrl =
    game.posterUrl ||
    (game.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`
      : null);

  console.log(`🎮 [GameCard] ${gameName}:`, {
    posterUrl,
    gameId: game.id,
    gameIdType: typeof game.id,
  });

  // Ensure ID is valid - handle both string and number input
  const gameId = typeof game.id === 'string' ? game.id : String(game.id);
  if (!gameId || gameId === 'NaN' || gameId === 'undefined' || gameId === 'null') {
    console.error(`❌ [GameCard] Invalid game ID for "${gameName}":`, game.id);
  }

  const href = `/content/game/${gameId}` as Route;

  // Ortak event handler'ları hook'tan al
  const { handleWatch, handleToggleFavorite, handleToggleWatchlist, handleToggleContinuing } =
    useContentActions({
      contentId: game.id,
      contentType: 'game',
      onWatch,
      onToggleFavorite,
      onToggleWatchlist,
      onToggleContinuing,
    });

  // Listeye ekle handler
  const handleAddToList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToList) onAddToList(game.id);
  };

  // Action buttons overlay (hover'da gösterilir)
  const overlay = showActions ? (
    <ContentActionButtons
      size={size}
      actionType="play"
      contentType="game"
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
      title={gameName}
      subtitle={subtitleOverride ?? (year ? String(year) : undefined)}
      posterSrc={posterUrl}
      size={size}
      className={className}
      overlay={overlay}
      rightTop={badges}
      communityRating={game}
      useNextImage={false}
    />
  );
}
