'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getPersonDetails, tmdbImage } from '@/services/api/tmdb';
import { getUserPersonWatchedPercentage, getUserPersonMoviesWatchStatus } from '@/services/database/movieLogs';
import MovieCard from '@/components/MovieCard';
import { supabase } from '@/lib/supabase';

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

export default function PersonPage() {
  const params = useParams();
  const id = params.id as string;
  const [person, setPerson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [watchedPercentage, setWatchedPercentage] = useState({ watchedCount: 0, totalCount: 0, percentage: 0 });
  const [movieWatchStatus, setMovieWatchStatus] = useState<{ [movieId: number]: { watched: boolean; rating?: number; favorite: boolean } }>({});

  const handleToggleFavorite = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const currentStatus = movieWatchStatus[movieId] || { watched: false, favorite: false };
      const newFavoriteStatus = !currentStatus.favorite;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_favorite: newFavoriteStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', movieId);

      if (error) throw error;

      // Update local state
      setMovieWatchStatus(prev => ({
        ...prev,
        [movieId]: {
          ...currentStatus,
          favorite: newFavoriteStatus
        }
      }));

      console.log(`Movie ${movieId} favorite status updated to ${newFavoriteStatus}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleToggleWatchlist = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const currentStatus = movieWatchStatus[movieId] || { watched: false, favorite: false };
      const newWatchlistStatus = !currentStatus.watched; // Using watched as watchlist for simplicity

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_consume_later: newWatchlistStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', movieId);

      if (error) throw error;

      // Update local state
      setMovieWatchStatus(prev => ({
        ...prev,
        [movieId]: {
          ...currentStatus,
          watched: newWatchlistStatus
        }
      }));

      console.log(`Movie ${movieId} watchlist status updated to ${newWatchlistStatus}`);
    } catch (error) {
      console.error('Error updating watchlist status:', error);
    }
  };

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
                      isWatched={movieWatchStatus[movie.id]?.watched || false}
                      isFavorite={movieWatchStatus[movie.id]?.favorite || false}
                      rating={movieWatchStatus[movie.id]?.rating}
                      showActions={true}
                      size="large"
                      showRating={true}
                      onToggleFavorite={handleToggleFavorite}
                      onToggleWatchlist={handleToggleWatchlist}
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
