'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { discoverMovies } from '@/services/api/tmdb';
import { TMDBDiscoverMovie } from '@/types/tmdb';
import Link from 'next/link';
import Image from 'next/image';

export default function ExploreMoviesPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const [movies, setMovies] = useState<TMDBDiscoverMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true);
        let response;
        if (type === 'trending') {
          setTitle('Trending Movies');
          response = await discoverMovies({ sort_by: 'popularity.desc' });
        } else if (type === 'upcoming') {
          setTitle('Upcoming Movies');
          const today = new Date().toISOString().split('T')[0];
          response = await discoverMovies({ 'primary_release_date.gte': today, sort_by: 'popularity.desc' });
        }
        if (response) {
          setMovies(response.results);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        console.error("Failed to fetch movies:", err);
      } finally {
        setLoading(false);
      }
    }

    if (type) {
      fetchMovies();
    }
  }, [type]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((movie) => (
            <Link key={movie.id} href={`/content/movie/${movie.id}`}>
              <div className="cursor-pointer">
                <Image
                  src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                  alt={movie.title || 'Movie poster'}
                  width={200}
                  height={300}
                  className="rounded-lg"
                />
                <h3 className="font-semibold mt-2">{movie.title}</h3>
                <p className="text-sm text-gray-500">{movie.release_date}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
