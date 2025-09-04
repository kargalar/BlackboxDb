'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getPersonDetails, tmdbImage } from '@/services/tmdb';
import { getUserPersonWatchedPercentage, getUserPersonMoviesWatchStatus } from '@/services/movieLogs';

// Progress Ring Component
const ProgressRing = ({ percentage, size = 120 }: { percentage: number; size?: number }) => {
  const radius = (size - 10) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-green-500 transition-all duration-1000"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-white">{percentage}%</span>
      </div>
    </div>
  );
};

// Movie Card Component
const MovieCard = ({ movie, watchStatus }: { 
  movie: any; 
  watchStatus?: { watched: boolean; rating?: number; favorite: boolean } 
}) => (
  <Link href={`/content/movie/${movie.id}`} className="group relative">
    <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 group-hover:scale-105 transition-transform">
      {movie.poster_path ? (
        <Image
          src={tmdbImage(movie.poster_path, 'w342')}
          alt={movie.title}
          width={150}
          height={225}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {/* Watch Status Indicators */}
      {watchStatus && (
        <div className="absolute top-2 right-2 flex flex-col space-y-1">
          {watchStatus.watched && (
            <div className="bg-green-600 rounded-full p-1">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
            </div>
          )}
          {watchStatus.favorite && (
            <div className="bg-red-600 rounded-full p-1">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
              </svg>
            </div>
          )}
        </div>
      )}
    </div>
    <h3 className="text-sm font-medium truncate">{movie.title}</h3>
    <div className="flex items-center justify-between">
      <p className="text-xs text-gray-400">{movie.release_date?.split('-')[0]}</p>
      {watchStatus?.rating && (
        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
          <span className="text-xs text-gray-300">{watchStatus.rating}</span>
        </div>
      )}
    </div>
  </Link>
);

export default function PersonPage() {
  const params = useParams();
  const id = params.id as string;
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [watchedPercentage, setWatchedPercentage] = useState({ watchedCount: 0, totalCount: 0, percentage: 0 });
  const [movieWatchStatus, setMovieWatchStatus] = useState<{ [movieId: number]: { watched: boolean; rating?: number; favorite: boolean } }>({});

  useEffect(() => {
    const fetchPersonData = async () => {
      try {
        setLoading(true);
        
        // Get person details
        const personData = await getPersonDetails(id);
        setPerson(personData);
        
        // Get user's watched percentage for this person
        const percentage = await getUserPersonWatchedPercentage(parseInt(id));
        setWatchedPercentage(percentage);
        
        // Get watch status for all person's movies
        if (personData.movie_credits?.cast) {
          const movieIds = personData.movie_credits.cast.map((movie: any) => movie.id);
          const status = await getUserPersonMoviesWatchStatus(parseInt(id), movieIds);
          setMovieWatchStatus(status);
        }
        
      } catch (error) {
        console.error('Error fetching person data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Aktör bulunamadı</h1>
          <p className="text-gray-400">Aradığınız aktör mevcut değil.</p>
        </div>
      </div>
    );
  }

  const movies = person.movie_credits?.cast || [];
  const sortedMovies = movies
    .filter((movie: any) => movie.poster_path) // Only show movies with posters
    .sort((a: any, b: any) => {
      // Sort by release date, newest first
      return new Date(b.release_date || '1970-01-01').getTime() - new Date(a.release_date || '1970-01-01').getTime();
    });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Person Info */}
          <div className="lg:col-span-1">
            <div className="aspect-[2/3] rounded-lg overflow-hidden mb-6">
              {person.profile_path ? (
                <Image
                  src={tmdbImage(person.profile_path, 'w500')}
                  alt={person.name}
                  width={400}
                  height={600}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Watch Progress */}
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-4">İzleme İstatistiklerin</h3>
              <ProgressRing percentage={watchedPercentage.percentage} />
              <div className="mt-4 text-sm text-gray-400">
                <p>{watchedPercentage.watchedCount} / {watchedPercentage.totalCount} film izlendi</p>
              </div>
            </div>

            {/* Personal Info */}
            {person.birthday && (
              <div className="mt-6 bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Kişisel Bilgiler</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Doğum Tarihi:</span>
                    <p>{new Date(person.birthday).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {person.place_of_birth && (
                    <div>
                      <span className="text-gray-400">Doğum Yeri:</span>
                      <p>{person.place_of_birth}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Person Details */}
          <div className="lg:col-span-3">
            {/* Name and Bio */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">{person.name}</h1>
              {person.biography && (
                <div className="text-gray-300 leading-relaxed">
                  <h2 className="text-xl font-semibold mb-3">Biyografi</h2>
                  <p className="whitespace-pre-line">{person.biography}</p>
                </div>
              )}
            </div>

            {/* Movies Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Filmler ({sortedMovies.length})</h2>
                <div className="text-sm text-gray-400">
                  İzlenen: {watchedPercentage.watchedCount} | Kalan: {watchedPercentage.totalCount - watchedPercentage.watchedCount}
                </div>
              </div>

              {sortedMovies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sortedMovies.map((movie: any) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      watchStatus={movieWatchStatus[movie.id]}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">Bu aktör için film bulunamadı.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
