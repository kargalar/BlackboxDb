import Link from 'next/link';
import Image from 'next/image';
import { tmdbImage } from '@/services/tmdb';

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
                <svg className={`${sizeClass.actionIcons} text-white`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
              </div>
            )}
            {isFavorite && (
              <div className="bg-red-600 rounded-full p-1">
                <svg className={`${sizeClass.actionIcons} text-white`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                </svg>
              </div>
            )}
            {isInList && !isFavorite && (
              <div className="bg-blue-600 rounded-full p-1">
                <svg className={`${sizeClass.actionIcons} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
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
                  <svg className={`${sizeClass.actionIcons}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <svg className={`${sizeClass.actionIcons}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
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
                <svg className={`${sizeClass.actionIcons}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                </svg>
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
                <svg className={`${sizeClass.actionIcons}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
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
