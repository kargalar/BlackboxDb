import type { Route } from 'next';
import ContentCard from '@/components/atoms/ContentCard';
import ContentActionButtons from '@/components/atoms/shared/ContentActionButtons';
import ContentBadgesContainer from '@/components/atoms/shared/ContentBadges';
import { useContentActions } from '@/hooks/useContentActions';

type Music = {
  id: string | number;
  title: string;
  artist?: string;
  label?: string | null;
  releaseDate?: string | null;
  posterUrl?: string | null;
};

interface MusicCardProps {
  music: Music;
  size?: 'small' | 'medium' | 'large';
  className?: string;
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
  onWatch?: (musicId: string | number) => void;
  onToggleFavorite?: (musicId: string | number) => void;
  onToggleWatchlist?: (musicId: string | number) => void;
  onToggleContinuing?: (musicId: string | number) => void;
  onAddToList?: (musicId: string | number) => void;
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  subtitleOverride?: string | null;
  hasReview?: boolean;
}

export default function MusicCard({
  music,
  size = 'medium',
  className = '',
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
  showRating = false,
  rating,
  reviewCount,
  subtitleOverride = null,
  hasReview = false,
}: MusicCardProps) {
  const year = music.releaseDate?.match(/\d{4}/)?.[0] || '';
  const subtitle = [music.artist, music.label, year].filter(Boolean).join(' • ');
  const href = `/content/music/${music.id}` as Route;
  const { handleWatch, handleToggleFavorite, handleToggleWatchlist, handleToggleContinuing } =
    useContentActions({
      contentId: String(music.id),
      contentType: 'music',
      onWatch,
      onToggleFavorite,
      onToggleWatchlist,
      onToggleContinuing,
    });

  const handleAddToList = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onAddToList?.(music.id);
  };

  const overlay = showActions ? (
    <ContentActionButtons
      size={size}
      actionType="listen"
      contentType="music"
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

  return (
    <ContentCard
      href={href}
      title={music.title}
      subtitle={subtitleOverride ?? (subtitle || undefined)}
      posterSrc={music.posterUrl}
      size={size}
      className={className}
      overlay={overlay}
      rightTop={
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
      }
      useNextImage={false}
    />
  );
}
