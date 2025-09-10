import type { Route } from 'next';
import { igdbImageUrl } from '@/lib/igdb-client';
import ContentCard from '@/components/ui/ContentCard';
import { EyeIconSolid } from '@/components/icons/EyeIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { BookmarkIcon } from '@/components/icons/BookmarkIcon';

type Game = {
  id: number;
  name: string;
  cover?: { image_id: string };
  first_release_date?: number;
};

interface GameCardProps {
  game: Game;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showActions?: boolean;
  isWatched?: boolean;
  isFavorite?: boolean;
  isInList?: boolean;
  onWatch?: (gameId: number) => void;
  onToggleFavorite?: (gameId: number) => void;
  onToggleWatchlist?: (gameId: number) => void;
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  subtitleOverride?: string | null;
}

const sizeClasses = {
  small: { actionButtons: 'w-5 h-5', actionIcons: 'w-3 h-3', text: 'text-xs' },
  medium: { actionButtons: 'w-6 h-6', actionIcons: 'w-3 h-3', text: 'text-xs' },
  large: { actionButtons: 'w-8 h-8', actionIcons: 'w-4 h-4', text: 'text-sm' },
};

export default function GameCard({
  game,
  size = 'medium',
  className = '',
  showActions = true,
  isWatched = false,
  isFavorite = false,
  isInList = false,
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  showRating = false,
  rating,
  reviewCount,
  subtitleOverride = null
}: GameCardProps) {
  const sizeClass = sizeClasses[size];
  const year = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : undefined;
  const href = (`/content/game/${game.id}`) as Route;

  const handleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWatch?.(game.id);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(game.id);
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWatchlist?.(game.id);
  };

  const ratingBadge = showRating && rating && rating > 0 ? (
    <div className="rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
      ⭐ {rating.toFixed(1)}{reviewCount && reviewCount > 0 ? <span className="ml-1 opacity-75">({reviewCount})</span> : null}
    </div>
  ) : null;

  const statusBadges = (isWatched || isFavorite || isInList) ? (
    <div className="flex flex-col space-y-1">
      {isWatched ? (
        <div className="bg-green-600 rounded-full p-1"><EyeIconSolid className={`${sizeClass.actionIcons} text-white`} /></div>
      ) : null}
      {isFavorite ? (
        <div className="bg-red-600 rounded-full p-1"><HeartIcon className={`${sizeClass.actionIcons} text-white`} /></div>
      ) : null}
      {isInList && !isFavorite ? (
        <div className="bg-blue-600 rounded-full p-1"><BookmarkIcon className={`${sizeClass.actionIcons} text-white`} /></div>
      ) : null}
    </div>
  ) : null;

  const overlay = showActions ? (
    <div className="flex gap-2">
      <button onClick={handleWatch} className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${isWatched ? 'bg-green-600 hover:bg-green-700' : 'bg-white/20 hover:bg-white/30'} transition-colors`} title={isWatched ? 'Oynandı' : 'Oyna'}>
        {isWatched ? <CheckIcon className={`${sizeClass.actionIcons}`} /> : <EyeIconSolid className={`${sizeClass.actionIcons}`} />}
      </button>
      <button onClick={handleToggleFavorite} className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${isFavorite ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30'} transition-colors`} title={isFavorite ? 'Favoriden Çıkar' : 'Favori'}>
        <HeartIcon className={`${sizeClass.actionIcons}`} />
      </button>
      <button onClick={handleToggleWatchlist} className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${isInList ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/20 hover:bg-white/30'} transition-colors`} title={isInList ? 'Listeden Çıkar' : 'Oynama Listesi'}>
        <BookmarkIcon className={`${sizeClass.actionIcons}`} />
      </button>
    </div>
  ) : null;

  return (
    <ContentCard
      href={href}
      title={game.name}
      subtitle={subtitleOverride ?? (year ? String(year) : undefined)}
      posterSrc={game.cover?.image_id ? igdbImageUrl(game.cover.image_id, 'cover_big') : null}
      size={size}
      className={className}
      overlay={overlay}
      rightTop={(ratingBadge || statusBadges) ? (
        <div className="flex flex-col items-end space-y-1">
          {ratingBadge}
          {statusBadges}
        </div>
      ) : undefined}
      useNextImage
    />
  );
}
