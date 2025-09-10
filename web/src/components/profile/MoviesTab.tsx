import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';
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
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterYear, setFilterYear] = useState<number | null>(null);

  // Filter and sort movies
  const filteredAndSortedMovies = useMemo(() => {
    let filtered = showOnlyWatchlist
      ? movies.filter(movie => movie.is_consume_later)
      : movies.filter(movie => !movie.is_consume_later);

    // Apply rating filter
    if (filterRating !== null) {
      filtered = filtered.filter(movie => movie.user_rating && movie.user_rating >= filterRating);
    }

    // Apply year filter
    if (filterYear !== null) {
      filtered = filtered.filter(movie => {
        const movieYear = movie.date ? new Date(movie.date).getFullYear() : null;
        return movieYear && movieYear >= filterYear;
      });
    }

    // Sort movies
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date || '1900-01-01');
          bValue = new Date(b.date || '1900-01-01');
          break;
        case 'rating':
          aValue = a.user_rating || 0;
          bValue = b.user_rating || 0;
          break;
        case 'title':
          aValue = a.title || '';
          bValue = b.title || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [movies, showOnlyWatchlist, sortBy, sortOrder, filterRating, filterYear]);

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

      if (error) {
        console.error('Error updating favorite status:', error);
        return;
      }

      console.log(`Movie ${movieId} favorite status updated to ${newFavoriteStatus}`);
    } catch (err) {
      console.error('Error in handleToggleFavorite:', err);
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
    <div className="space-y-6">
      {/* Filters and Sorting */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Watchlist Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtre</label>
            <select
              value={showOnlyWatchlist ? 'watchlist' : 'all'}
              onChange={(e) => setShowOnlyWatchlist(e.target.value === 'watchlist')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="all">Tüm Filmler</option>
              <option value="watchlist">İzleme Listesi</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sırala</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'rating' | 'title')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="date">Tarih</option>
              <option value="rating">Puan</option>
              <option value="title">Başlık</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sıralama</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Min Puan</label>
            <select
              value={filterRating || ''}
              onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
            >
              <option value="">Tümü</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
          </div>
        </div>

        {/* Year Filter */}
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Yıl (ve sonrası)</label>
          <input
            type="number"
            value={filterYear || ''}
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : null)}
            placeholder="örn: 2020"
            className="ml-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
          />
        </div>
      </div>

      {/* Movies Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredAndSortedMovies.map((movie) => (
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
