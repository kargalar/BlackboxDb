'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getPersonDetails, tmdbImage } from '@/services/api/tmdb';
import { getUserPersonMoviesWatchStatus } from '@/services/database/movieLogs';
import MovieCard from '@/components/MovieCard';
import TvCard from '@/components/TvCard';
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
  const [activeTab, setActiveTab] = useState<'movies' | 'tv'>('movies');
  const [roleFilter, setRoleFilter] = useState<'cast' | 'crew' | 'all'>('cast');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

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
        
        // Get watch status for all person's movies
        if (personData.movie_credits?.cast) {
          const movieIds = personData.movie_credits.cast.map((movie: any) => movie.id);
          const status = await getUserPersonMoviesWatchStatus(parseInt(id), movieIds);
          setMovieWatchStatus(status);
          
          // Calculate watched percentage from movieWatchStatus
          const watchedCount = Object.values(status).filter(s => s.watched).length;
          const totalCount = movieIds.length;
          const percentage = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;
          setWatchedPercentage({ watchedCount, totalCount, percentage });
        }
        
      } catch (error) {
        console.error('Error fetching person data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPersonData();
  }, [id]);

  // Reset pagination when switching tab or role
  useEffect(() => {
    setPage(1);
  }, [activeTab, roleFilter]);

  // Prepare sorted lists for Movies/TV (must be declared before any early return to keep hooks order stable)
  const { sortedMovies, sortedTv } = useMemo(() => {
    type MovieCredit = { id: number; poster_path?: string | null; release_date?: string; title?: string; name?: string; character?: string };
    type TvCredit = { id: number; poster_path?: string | null; first_air_date?: string; name?: string; character?: string };

    const moviesCast = (person?.movie_credits?.cast ?? []) as MovieCredit[];
    const moviesCrewRaw = (person?.movie_credits?.crew ?? []) as (MovieCredit & { job?: string })[];
    const tvCast = (person?.tv_credits?.cast ?? []) as TvCredit[];
    const tvCrewRaw = (person?.tv_credits?.crew ?? []) as (TvCredit & { job?: string })[];

    // Map crew to include a display role
    const moviesCrew = moviesCrewRaw.map(m => ({ ...m, roleLabel: m.job || 'Crew' }));
    const tvCrew = tvCrewRaw.map(t => ({ ...t, roleLabel: t.job || 'Crew' }));

    const filterByRole = <T extends any>(cast: T[], crew: T[]) => {
      if (roleFilter === 'cast') return cast;
      if (roleFilter === 'crew') return crew;
      return [...cast, ...crew];
    };

    // Dedupe by id, prefer cast entry; if both exist, merge role labels like "Actor as X; Director"
    const dedupeWithRole = <T extends any>(items: any[], type: 'movie' | 'tv') => {
      const map = new Map<number, any>();
      for (const it of items) {
        if (!it.poster_path) continue;
        const prev = map.get(it.id);
        const castRole = it.character ? (type === 'movie' ? `Oyuncu: ${it.character}` : `Oyuncu: ${it.character}`) : null;
        const crewRole = (it as any).roleLabel ? (type === 'movie' ? `${(it as any).roleLabel}` : `${(it as any).roleLabel}`) : null;
        const roleText = castRole || crewRole;
        if (!prev) {
          map.set(it.id, { ...it, roleText });
        } else {
          // merge roles
          const merged = new Set<string>();
          if (prev.roleText) prev.roleText.split(' | ').forEach((r: string) => merged.add(r));
          if (roleText) merged.add(roleText);
          map.set(it.id, { ...prev, ...it, roleText: Array.from(merged).join(' | ') });
        }
      }
      return Array.from(map.values());
    };

    const moviesFiltered = filterByRole(moviesCast, moviesCrew);
    const tvFiltered = filterByRole(tvCast, tvCrew);

    const movies = dedupeWithRole(moviesFiltered, 'movie') as (MovieCredit & { roleText?: string })[];
    const tv = dedupeWithRole(tvFiltered, 'tv') as (TvCredit & { roleText?: string })[];

    const sortedMovies = movies.sort((a, b) => new Date(a?.release_date || '1970-01-01') < new Date(b?.release_date || '1970-01-01') ? 1 : -1);
    const sortedTv = tv.sort((a, b) => new Date(a?.first_air_date || '1970-01-01') < new Date(b?.first_air_date || '1970-01-01') ? 1 : -1);

    return { sortedMovies, sortedTv };
  }, [person, roleFilter]);

  const paginatedItems = useMemo(() => {
    const list = activeTab === 'movies' ? sortedMovies : sortedTv;
    const total = list.length;
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return { items: list.slice(start, end), total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  }, [sortedMovies, sortedTv, activeTab, page]);

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

            {/* Tabs and Filters */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <button
                    className={`pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'movies' ? 'border-gray-400 text-gray-200' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('movies')}
                  >
                    Movies
                  </button>
                  <button
                    className={`pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tv' ? 'border-gray-400 text-gray-200' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
                    onClick={() => setActiveTab('tv')}
                  >
                    TV
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Rol:</span>
                  <div className="flex rounded-md overflow-hidden border border-gray-700">
                    {(['cast','crew','all'] as const).map((r) => (
                      <button
                        key={r}
                        className={`px-3 py-1 ${roleFilter === r ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                        onClick={() => setRoleFilter(r)}
                        aria-pressed={roleFilter === r}
                      >
                        {r === 'cast' ? 'Cast' : r === 'crew' ? 'Crew' : 'Hepsi'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* List + Pagination */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {activeTab === 'movies' ? `Filmler (${sortedMovies.length})` : `Diziler (${sortedTv.length})`}
                </h2>
                {activeTab === 'movies' ? (
                  <div className="text-sm text-gray-400">
                    İzlenen: {watchedPercentage.watchedCount} | Kalan: {watchedPercentage.totalCount - watchedPercentage.watchedCount}
                  </div>
                ) : null}
              </div>

              {paginatedItems.items.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {activeTab === 'movies'
          ? paginatedItems.items.map((movie: any) => (
                          <MovieCard
                            key={movie.id}
                            movie={movie}
            subtitleOverride={movie.roleText ?? null}
                            isWatched={movieWatchStatus[movie.id]?.watched || false}
                            isFavorite={movieWatchStatus[movie.id]?.favorite || false}
                            rating={movieWatchStatus[movie.id]?.rating}
                            showActions={true}
                            size="large"
                            showRating={true}
                            onToggleFavorite={handleToggleFavorite}
                            onToggleWatchlist={handleToggleWatchlist}
                          />
                        ))
          : paginatedItems.items.map((tv: any) => (
          <TvCard key={tv.id} tv={tv} size="large" subtitleOverride={tv.roleText ?? null} />
                        ))}
                  </div>

                  {paginatedItems.totalPages > 1 ? (
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <button
                        className="px-3 py-1 rounded bg-gray-800 text-gray-200 disabled:opacity-40"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Önceki
                      </button>
                      <span className="text-sm text-gray-400">{page} / {paginatedItems.totalPages}</span>
                      <button
                        className="px-3 py-1 rounded bg-gray-800 text-gray-200 disabled:opacity-40"
                        onClick={() => setPage((p) => Math.min(paginatedItems.totalPages, p + 1))}
                        disabled={page >= paginatedItems.totalPages}
                      >
                        Sonraki
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="text-gray-400 text-center py-12">
                  {activeTab === 'movies' ? 'Bu kişi için film bulunamadı.' : 'Bu kişi için dizi bulunamadı.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
