import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Content } from '@/services/database/movieLogs';
import { tmdbImage } from '@/services/api/tmdb';
import MovieCard from '@/components/MovieCard';
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
            <MovieCard
              movie={movie}
              size="large"
              showRating={true}
              rating={movie.user_rating}
              isWatched={true}
              isFavorite={movie.is_favorite}
              isInList={movie.is_consume_later}
              showActions={true}
              onWatch={handleToggleWatch}
              onToggleFavorite={handleToggleFavorite}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
