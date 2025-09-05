import Link from 'next/link';
import Image from 'next/image';
import { tmdbImage } from '@/services/api/tmdb';
import { EyeIconSolid } from '@/components/icons/EyeIcon';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { BookmarkIcon } from '@/components/icons/BookmarkIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';

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
  small: {
    container: 'w-16',
    aspect: 'aspect-[2/3]',
    image: 'w-full h-full',
    actionButtons: 'w-5 h-5',
    actionIcons: 'w-3 h-3',
    rating: 'text-xs'
  },
  medium: {
    container: 'w-24',
    aspect: 'aspect-[2/3]',
    image: 'w-full h-full',
    actionButtons: 'w-6 h-6',
    actionIcons: 'w-3 h-3',
    rating: 'text-xs'
  },
  large: {
    container: 'w-full',
    aspect: 'aspect-[2/3]',
    image: 'w-full h-full',
    actionButtons: 'w-8 h-8',
    actionIcons: 'w-4 h-4',
    rating: 'text-sm'
  }
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

  return (
    <Link href={`/content/movie/${movie.id}`} className={`group relative cursor-pointer ${className}`}>
      <div className={`${sizeClass.container} ${sizeClass.aspect} rounded-lg overflow-hidden relative bg-gray-800`}>
        {movie.poster_path ? (
          <Image
            src={tmdbImage(movie.poster_path, 'w342')}
            alt={movieTitle}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
            <span className="text-xs text-center px-2 text-white">{movie.title}</span>
          </div>
        )}

        {/* Rating Badge */}
        {showRating && rating && rating > 0 && (
          <div className="absolute top-2 right-2">
            <div className="rounded-full bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              ⭐ {rating.toFixed(1)}
              {reviewCount && reviewCount > 0 && (
                <span className="ml-1 opacity-75">({reviewCount})</span>
              )}
            </div>
          </div>
        )}

        {/* Status Badges */}
        {(isWatched || isFavorite || isInList) && (
          <div className="absolute top-2 right-2 flex flex-col space-y-1">
            {isWatched && (
              <div className="bg-green-600 rounded-full p-1">
                <EyeIconSolid className={`${sizeClass.actionIcons} text-white`} />
              </div>
            )}
            {isFavorite && (
              <div className="bg-red-600 rounded-full p-1">
                <HeartIcon className={`${sizeClass.actionIcons} text-white`} />
              </div>
            )}
            {isInList && !isFavorite && (
              <div className="bg-blue-600 rounded-full p-1">
                <BookmarkIcon className={`${sizeClass.actionIcons} text-white`} />
              </div>
            )}
          </div>
        )}

        {/* Hover Overlay with Action Buttons */}
        {showActions && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="flex gap-2">
              <button
                onClick={handleWatch}
                className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${
                  isWatched 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-white/20 hover:bg-white/30'
                } transition-colors`}
                title={isWatched ? "İzlendi" : "İzle"}
              >
                {isWatched ? (
                  <CheckIcon className={`${sizeClass.actionIcons}`} />
                ) : (
                  <EyeIconSolid className={`${sizeClass.actionIcons}`} />
                )}
              </button>
              <button
                onClick={handleToggleFavorite}
                className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${
                  isFavorite 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-white/20 hover:bg-white/30'
                } transition-colors`}
                title={isFavorite ? "Favoriden Çıkar" : "Favori"}
              >
                <HeartIcon className={`${sizeClass.actionIcons}`} />
              </button>
              <button
                onClick={handleToggleWatchlist}
                className={`${sizeClass.actionButtons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${
                  isInList 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-white/20 hover:bg-white/30'
                } transition-colors`}
                title={isInList ? "Listeden Çıkar" : "İzleme Listesi"}
              >
                <BookmarkIcon className={`${sizeClass.actionIcons}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="mt-2 space-y-1">
        <h3 className={`font-medium line-clamp-2 text-white group-hover:text-gray-300 transition-colors ${sizeClass.rating}`}>
          {movie.title}
        </h3>
        {movie.release_date && (
          <p className={`text-gray-400 ${sizeClass.rating}`}>
            {new Date(movie.release_date).getFullYear()}
          </p>
        )}
      </div>
    </Link>
  );
}
