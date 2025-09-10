'use client';

import { useEffect, useState } from 'react';
import { discoverMovies, discoverTV, tmdbImage } from '@/services/api/tmdb';
import { igdbTrending, igdbUpcoming } from '@/services/api/igdb';
import { getTrendingReviews } from '@/services/database/movieLogs';
import { booksSearch } from '@/services/api/books';
import { TMDBDiscoverMovie } from '@/types/tmdb';
import { Review } from '@/services/database/movieLogs';
import Link from 'next/link';
import Countdown from '@/components/Countdown';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/MovieCard';
import GameCard from '@/components/GameCard';
import TvCard from '@/components/TvCard';
import BookCard from '@/components/BookCard';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [trendingMovies, setTrendingMovies] = useState<TMDBDiscoverMovie[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<TMDBDiscoverMovie[]>([]);
  const [trendingTv, setTrendingTv] = useState<any[]>([]);
  const [upcomingTv, setUpcomingTv] = useState<any[]>([]);
  const [popularBooks, setPopularBooks] = useState<any[]>([]);
  const [trendingIgdb, setTrendingIgdb] = useState<any[]>([]);
  const [upcomingIgdb, setUpcomingIgdb] = useState<any[]>([]);
  const [trendingReviews, setTrendingReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tvLoading, setTvLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setTvLoading(true);
        setBooksLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // Fetch movies and games first (core content)
        const [trending, upcoming, reviews, tGames, uGames] = await Promise.all([
          discoverMovies({ sort_by: 'popularity.desc' }),
          discoverMovies({ 'primary_release_date.gte': today, sort_by: 'popularity.desc' }),
          getTrendingReviews(5),
          igdbTrending(),
          igdbUpcoming(),
        ]);

        setTrendingMovies(trending.results);
        setUpcomingMovies(upcoming.results);
        setTrendingReviews(reviews.data);
        setTrendingIgdb(tGames);
        setUpcomingIgdb(uGames);
        setLoading(false);

        // Fetch TV shows separately
        Promise.all([
          discoverTV({ sort_by: 'popularity.desc' }),
          discoverTV({ 'first_air_date.gte': today, sort_by: 'popularity.desc' }),
        ]).then(([trendingTvShows, upcomingTvShows]) => {
          setTrendingTv(trendingTvShows.results);
          setUpcomingTv(upcomingTvShows.results);
          setTvLoading(false);
        }).catch((err) => {
          console.error('TV data fetch failed:', err);
          setTvLoading(false);
        });

        // Fetch books separately
        booksSearch('bestseller', 10)
          .then((books) => {
            setPopularBooks(books.data);
            setBooksLoading(false);
          })
          .catch((err) => {
            console.error('Books data fetch failed:', err);
            setBooksLoading(false);
          });

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
        <div className="space-y-12">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          {/* Trending Games */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Trending Games</h1>
              <Link href="/explore/games">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trendingIgdb.slice(0, 5).map((g) => (
                <GameCard key={g.id} game={g} size="large" />
              ))}
            </div>
          </section>

          {/* Trending TV */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Trending TV Shows</h1>
              <Link href="/explore/tv">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            {tvLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : trendingTv.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {trendingTv.slice(0, 5).map((tv) => (
                  <TvCard key={tv.id} tv={tv} size="large" showActions={true} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No trending TV shows available</p>
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Trending Movies</h1>
              <Link href="/explore/movies?type=trending">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trendingMovies.slice(0, 5).map((movie) => (
                <MovieCard key={movie.id} movie={movie} size="large" showActions={true} />
              ))}
            </div>
          </section>

          {/* Popular Books */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Popular Books</h1>
              <Link href="/explore/books">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            {booksLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : popularBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {popularBooks.slice(0, 5).map((book) => (
                  <BookCard key={book.id} book={book} size="large" />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No popular books available</p>
              </div>
            )}
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
              <h1 className="text-3xl font-bold">Upcoming Games</h1>
              <Link href="/explore/games">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {upcomingIgdb.slice(0, 5).map((g) => (
                <GameCard key={g.id} game={g} size="large" />
              ))}
            </div>
          </section>

          {/* Upcoming TV */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Upcoming TV Shows</h1>
              <Link href="/explore/tv">
                <Button variant="secondary">More</Button>
              </Link>
            </div>
            {tvLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : upcomingTv.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {upcomingTv.slice(0, 5).map((tv) => (
                  <TvCard key={tv.id} tv={tv} size="large" showActions={true} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <p>No upcoming TV shows available</p>
              </div>
            )}
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
                <MovieCard key={movie.id} movie={movie} size="large" showActions={true} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
