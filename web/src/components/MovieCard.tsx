import { tmdbImage } from '@/services/api/tmdb';
import { EyeIconSolid } from '@/components/icons/EyeIcon';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { BookmarkIcon } from '@/components/icons/BookmarkIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';
import ContentCard from '@/components/ui/ContentCard';
import type { Route } from 'next';

interface MovieCardProps {
  movie: {
    id: number;
    title?: string;
    name?: string;
    poster_path?: string | null;
    release_date?: string;
  };
  size?: 'small' | 'medium' | 'large';
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  showActions?: boolean;
  isWatched?: boolean;
  isFavorite?: boolean;
  isInList?: boolean;
  onWatch?: (movieId: number) => void;
  onToggleFavorite?: (movieId: number) => void;
  onToggleWatchlist?: (movieId: number) => void;
  className?: string;
}

const sizeClasses = {
  small: { actionButtons: 'w-5 h-5', actionIcons: 'w-3 h-3', text: 'text-xs' },
  medium: { actionButtons: 'w-6 h-6', actionIcons: 'w-3 h-3', text: 'text-xs' },
  large: { actionButtons: 'w-8 h-8', actionIcons: 'w-4 h-4', text: 'text-sm' },
};

export default function MovieCard({
  movie,
  size = 'medium',
  showRating = false,
  rating,
  reviewCount,
  showActions = true,
  isWatched = false,
  isFavorite = false,
  isInList = false,
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  className = ''
}: MovieCardProps) {
  const sizeClass = sizeClasses[size];
  const movieTitle = movie.title || movie.name || 'Unknown Title';

  const handleWatch = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWatch?.(movie.id);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(movie.id);
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleWatchlist?.(movie.id);
  };

  const href = (`/content/movie/${movie.id}`) as Route;
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
      <button onClick={handleWatch} className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${isWatched ? 'bg-green-600 hover:bg-green-700' : 'bg-white/20 hover:bg-white/30'} transition-colors`} title={isWatched ? 'İzlendi' : 'İzle'}>
        {isWatched ? <CheckIcon className={`${sizeClass.actionIcons}`} /> : <EyeIconSolid className={`${sizeClass.actionIcons}`} />}
      </button>
      <button onClick={handleToggleFavorite} className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${isFavorite ? 'bg-red-600 hover:bg-red-700' : 'bg-white/20 hover:bg-white/30'} transition-colors`} title={isFavorite ? 'Favoriden Çıkar' : 'Favori'}>
        <HeartIcon className={`${sizeClass.actionIcons}`} />
      </button>
      <button onClick={handleToggleWatchlist} className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${isInList ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/20 hover:bg-white/30'} transition-colors`} title={isInList ? 'Listeden Çıkar' : 'İzleme Listesi'}>
        <BookmarkIcon className={`${sizeClass.actionIcons}`} />
      </button>
    </div>
  ) : null;

  return (
    <ContentCard
      href={href}
      title={movieTitle}
      subtitle={movie.release_date ? String(new Date(movie.release_date).getFullYear()) : undefined}
      posterSrc={movie.poster_path ? tmdbImage(movie.poster_path, 'w342') : null}
      size={size}
      className={className}
      overlay={overlay}
      rightTop={(ratingBadge || statusBadges) ? (
        <div className="flex flex-col items-end space-y-1">
          {ratingBadge}
          {statusBadges}
        </div>
      ) : undefined}
    />
  );
}
