'use client';

import { useEffect, useState } from 'react';
import { discoverMovies } from '@/services/tmdb';
import { getTrendingReviews } from '@/services/movieLogs';
import { TMDBDiscoverMovie } from '@/types/tmdb';
import { Review } from '@/services/movieLogs';
import Link from 'next/link';
import Countdown from '@/components/Countdown';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/MovieCard';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [trendingMovies, setTrendingMovies] = useState<TMDBDiscoverMovie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<TMDBDiscoverMovie[]>([]);
  const [trendingReviews, setTrendingReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        const [trending, upcoming, reviews] = await Promise.all([
          discoverMovies({ sort_by: 'popularity.desc' }),
          discoverMovies({ 'primary_release_date.gte': today, sort_by: 'popularity.desc' }),
          getTrendingReviews(5)
        ]);

        setTrendingMovies(trending.results);
        setUpcomingMovies(upcoming.results);
        setTrendingReviews(reviews.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleWatchMovie = async (movieId: number, movie: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Mark as watched
      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: movieId,
          is_watched: true,
          date: new Date().toISOString()
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) throw error;

      console.log(`Movie ${movieId} marked as watched`);
    } catch (error) {
      console.error('Error updating watch status:', error);
    }
  };

  const handleToggleFavorite = async (movieId: number, movie: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // First check if movie is already in user's log
      const { data: existingLog } = await supabase
        .from('user_content_log')
        .select('is_favorite')
        .eq('user_id', user.user.id)
        .eq('content_id', movieId)
        .single();

      const newFavoriteStatus = !existingLog?.is_favorite;

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: movieId,
          is_favorite: newFavoriteStatus
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) throw error;

      console.log(`Movie ${movieId} favorite status updated to ${newFavoriteStatus}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleToggleWatchlist = async (movieId: number, movie: any) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // First check if movie is already in user's log
      const { data: existingLog } = await supabase
        .from('user_content_log')
        .select('is_consume_later')
        .eq('user_id', user.user.id)
        .eq('content_id', movieId)
        .single();

      const newWatchlistStatus = !existingLog?.is_consume_later;

      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: movieId,
          is_consume_later: newWatchlistStatus
        }, {
          onConflict: 'user_id,content_id'
        });

      if (error) throw error;

      console.log(`Movie ${movieId} watchlist status updated to ${newWatchlistStatus}`);
    } catch (error) {
      console.error('Error updating watchlist status:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <section>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Trending Movies</h1>
              <Link href="/explore/movies?type=trending">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trendingMovies.slice(0, 5).map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  size="large"
                  showRating={false}
                  showActions={true}
                  onWatch={(movieId) => handleWatchMovie(movieId, movie)}
                  onToggleFavorite={(movieId) => handleToggleFavorite(movieId, movie)}
                  onToggleWatchlist={(movieId) => handleToggleWatchlist(movieId, movie)}
                />
              ))}
            </div>
          </section>

          <section>
            <h1 className="text-3xl font-bold mb-6">Trending Comments</h1>
            <div className="space-y-4">
              {trendingReviews.map((review) => (
                <div key={review.id} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                  <p>{review.text}</p>
                  <Link href={`/content/movie/${review.content_id}`}>
                    <p className="text-sm text-gray-500 mt-2 cursor-pointer">
                      Read more...
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Upcoming Movies</h1>
              <Link href="/explore/movies?type=upcoming">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {upcomingMovies.slice(0, 5).map((movie) => (
                <div key={movie.id} className="space-y-2">
                  <MovieCard
                    movie={movie}
                    size="large"
                    showRating={false}
                    showActions={true}
                    onWatch={(movieId) => handleWatchMovie(movieId, movie)}
                    onToggleFavorite={(movieId) => handleToggleFavorite(movieId, movie)}
                    onToggleWatchlist={(movieId) => handleToggleWatchlist(movieId, movie)}
                  />
                  {movie.release_date && <Countdown date={movie.release_date} />}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
