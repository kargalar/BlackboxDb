import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Content } from '@/services/database/movieLogs';
import { tmdbImage } from '@/services/api/tmdb';
import { supabase } from '@/lib/supabase';

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

  const handleToggleFavorite = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const movie = movies.find(m => m.id === movieId);
      if (!movie) return;

      const newFavoriteStatus = !movie.is_favorite;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_favorite: newFavoriteStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', movieId);

      if (error) throw error;

      // Update local state (you might want to pass an onUpdate callback from parent)
      console.log(`Movie ${movieId} favorite status updated to ${newFavoriteStatus}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleToggleWatch = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const movie = movies.find(m => m.id === movieId);
      if (!movie) return;

      // For profile pages, toggle watch status (mark as unwatched or vice versa)
      const newWatchedStatus = false; // Since these are watched movies, clicking watch should mark as unwatched

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ 
          is_watched: newWatchedStatus,
          date: newWatchedStatus ? new Date().toISOString() : null 
        })
        .eq('user_id', user.user.id)
        .eq('content_id', movieId);

      if (error) throw error;

      console.log(`Movie ${movieId} watch status updated to ${newWatchedStatus}`);
    } catch (error) {
      console.error('Error updating watch status:', error);
    }
  };

  const handleToggleWatchlist = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const movie = movies.find(m => m.id === movieId);
      if (!movie) return;

      const newWatchlistStatus = !movie.is_consume_later;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_consume_later: newWatchlistStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', movieId);

      if (error) throw error;

      console.log(`Movie ${movieId} watchlist status updated to ${newWatchlistStatus}`);
    } catch (error) {
      console.error('Error updating watchlist status:', error);
    }
  };

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
          <div key={movie.id} className="space-y-2">
            <Link href={`/content/movie/${movie.id}`} className="group relative">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative border border-gray-700">
                {movie.poster_path ? (
                  <Image
                    src={tmdbImage(movie.poster_path, 'w342')}
                    alt={movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      console.error('❌ Film poster yüklenemedi:', movie.title, movie.poster_path ? tmdbImage(movie.poster_path, 'w342') : 'null poster_path');
                      // Hide the image on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-xs text-center px-2 text-white">{movie.title}</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="text-xs font-medium line-clamp-2 text-white">{movie.title}</div>
            {(movie.user_rating ?? 0) > 0 && (
              <div className="flex items-center">
                <span className="text-xs text-yellow-400">★ {movie.user_rating}</span>
              </div>
            )}
            {movie.date && (
              <div className="text-xs text-gray-400">
                {new Date(movie.date).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
