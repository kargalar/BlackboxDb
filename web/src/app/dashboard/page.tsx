'use client';

import { useEffect, useState } from 'react';
import { discoverMovies } from '@/services/tmdb';
import { getTrendingReviews } from '@/services/movieLogs';
import { TMDBDiscoverMovie } from '@/types/tmdb';
import { Review } from '@/services/movieLogs';
import Link from 'next/link';

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

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <section>
            <h1 className="text-3xl font-bold mb-6">Trending Movies</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trendingMovies.map((movie) => (
                <Link key={movie.id} href={`/content/movie/${movie.id}`}>
                  <div className="cursor-pointer">
                    <img
                      src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                      alt={movie.title}
                      className="rounded-lg"
                    />
                    <h3 className="font-semibold mt-2">{movie.title}</h3>
                  </div>
                </Link>
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
            <h1 className="text-3xl font-bold mb-6">Upcoming Movies</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {upcomingMovies.map((movie) => (
                <Link key={movie.id} href={`/content/movie/${movie.id}`}>
                  <div className="cursor-pointer">
                    <img
                      src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                      alt={movie.title}
                      className="rounded-lg"
                    />
                    <h3 className="font-semibold mt-2">{movie.title}</h3>
                    <p className="text-sm text-gray-500">{movie.release_date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
