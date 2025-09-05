import Link from 'next/link';
import Image from 'next/image';
import { Content } from '@/services/movieLogs';
import { tmdbImage } from '@/services/tmdb';

interface MoviesTabProps {
  movies: Content[];
}

export default function MoviesTab({ movies }: MoviesTabProps) {
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {movies.map((movie) => (
        <Link key={movie.id} href={`/content/movie/${movie.id}`} className="relative group cursor-pointer">
          <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
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
          </div>
        </Link>
      ))}
    </div>
  );
}
