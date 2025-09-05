import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Content } from '@/services/movieLogs';
import { tmdbImage } from '@/services/tmdb';

// Star Rating Component
const StarRating = ({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <svg
        key={i}
        className={`${size} ${i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
        viewBox="0 0 20 20"
      >
        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
      </svg>
    );
  }
  return <div className="flex items-center space-x-0.5">{stars}</div>;
};

interface MoviesTabProps {
  movies: Content[];
}

export default function MoviesTab({ movies }: MoviesTabProps) {
  const [showOnlyWatchlist, setShowOnlyWatchlist] = useState(false);
  
  // Filter movies based on watchlist status
  const filteredMovies = showOnlyWatchlist 
    ? movies.filter(movie => movie.is_consume_later)
    : movies.filter(movie => !movie.is_consume_later);
  if (movies.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>Henüz film izlemediniz.</p>
        <Link href="/explore" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
          Keşfetmeye başlayın
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowOnlyWatchlist(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showOnlyWatchlist 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            İzlenen Filmler ({movies.filter(m => !m.is_consume_later).length})
          </button>
          <button
            onClick={() => setShowOnlyWatchlist(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOnlyWatchlist 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Watchlist ({movies.filter(m => m.is_consume_later).length})
          </button>
        </div>
      </div>

      {/* Movies Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredMovies.map((movie) => (
        <Link key={movie.id} href={`/content/movie/${movie.id}`} className="relative group cursor-pointer">
          <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative">
            {movie.poster_path ? (
              <Image
                src={tmdbImage(movie.poster_path, 'w342')}
                alt={movie.title}
                width={150}
                height={225}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-xs text-center px-2">{movie.title}</span>
              </div>
            )}
            
            {/* Favorite Badge */}
            {movie.is_favorite && (
              <div className="absolute top-2 right-2 bg-red-600 rounded-full p-1">
                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                </svg>
              </div>
            )}

            {/* Watchlist Badge */}
            {movie.is_consume_later && !movie.is_favorite && (
              <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1">
                <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                </svg>
              </div>
            )}

            {/* Both Badges - Favorite takes priority */}
            {movie.is_favorite && movie.is_consume_later && (
              <div className="absolute top-2 right-2 flex space-x-1">
                <div className="bg-red-600 rounded-full p-1">
                  <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="bg-blue-600 rounded-full p-1">
                  <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {/* Rating and Title */}
          <div className="mt-2 space-y-1">
            {/* Movie Title */}
            <h4 className="text-xs font-medium line-clamp-2 text-white">{movie.title}</h4>
            
            {/* User Rating */}
            {movie.user_rating && movie.user_rating > 0 ? (
              <div className="flex items-center justify-between">
                <StarRating rating={movie.user_rating} size="w-3 h-3" />
                <span className="text-xs text-yellow-400">{movie.user_rating}/5</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Puanlanmamış</span>
                <span className="text-xs text-gray-500">—</span>
              </div>
            )}
            
            {/* Date */}
            <div className="text-xs text-gray-400">
              {movie.date 
                ? new Date(movie.date).toLocaleDateString('tr-TR', { 
                    day: 'numeric', 
                    month: 'short',
                    year: 'numeric'
                  })
                : 'Yakın zamanda'
              }
            </div>
          </div>
        </Link>
      ))}
      </div>
    </div>
  );
}
