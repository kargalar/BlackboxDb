import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
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

interface HomeTabProps {
  recentMovies: Content[];
  recentGames?: Content[];
  favoriteMovies: Content[];
  stats: {
    totalMovies: number;
    thisYearMovies: number;
    averageRating: number;
    reviewCount: number;
  };
  isOwnProfile?: boolean;
}

export default function HomeTab({ recentMovies, recentGames = [], favoriteMovies, stats, isOwnProfile = false }: HomeTabProps) {
  const [showFeaturedDialog, setShowFeaturedDialog] = useState(false);
  const [selectedFeaturedMovies, setSelectedFeaturedMovies] = useState<number[]>([]);
  const [allMovies, setAllMovies] = useState<Content[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const combinedMovies = [...recentMovies, ...favoriteMovies];
    const uniqueMovies = combinedMovies.filter((movie, index, self) =>
      index === self.findIndex(m => m.id === movie.id)
    );
    setAllMovies(uniqueMovies);
  }, [recentMovies, favoriteMovies]);

  const handleToggleWatch = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const allMoviesList = [...recentMovies, ...favoriteMovies];
      const movie = allMoviesList.find(m => m.id === movieId);
      if (!movie) return;

      // For profile pages, toggle watch status
      const newWatchedStatus = false; // Mark as unwatched since these are recent/favorite movies

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

  const handleToggleFavorite = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const allMoviesList = [...recentMovies, ...favoriteMovies];
      const movie = allMoviesList.find(m => m.id === movieId);
      if (!movie) return;

      const newFavoriteStatus = !movie.is_favorite;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_favorite: newFavoriteStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', movieId);

      if (error) throw error;

      console.log(`Movie ${movieId} favorite status updated to ${newFavoriteStatus}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleToggleWatchlist = async (movieId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const allMoviesList = [...recentMovies, ...favoriteMovies];
      const movie = allMoviesList.find(m => m.id === movieId);
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

  // Filter movies based on search query
  const filteredMovies = allMovies.filter(movie =>
    movie.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Left Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        {/* Recent Movies */}
        {!showFeaturedDialog && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Movies</h3>
            {recentMovies.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>Henüz film izlemediniz.</p>
                <Link href="/explore" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
                  Keşfetmeye başlayın
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {recentMovies.slice(0, 2).map((movie) => (
                  <Link key={movie.id} href={`/content/movie/${movie.id}`} className="relative group cursor-pointer">
                    <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative">
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

                      {/* Hover Overlay with Action Buttons */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Handle watch action
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                            title="İzle"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Handle favorite action
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                            title="Favori"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Handle watchlist action
                            }}
                            className="flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                            title="İzleme Listesi"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-8">
        {/* Son Aktiviteler - Film Aktiviteleri */}
        <div>
          <h3 className="text-xl font-bold mb-6">Film Aktiviteleri</h3>
          {recentMovies.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Henüz film izlemediniz.</p>
              <Link href="/explore" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
                Keşfetmeye başlayın
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isWatched={true}
                  isFavorite={movie.is_favorite || false}
                  rating={movie.user_rating}
                  showActions={true}
                  size="large"
                  showRating={true}
                  onWatch={handleToggleWatch}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              ))}
            </div>
          )}
        </div>

        {/* Oyun Aktiviteleri */}
        <div>
          <h3 className="text-xl font-bold mb-6">Oyun Aktiviteleri</h3>
          {recentGames.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Henüz oyun aktivitesi yok.</p>
              <Link href="/explore/games" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
                Oyun keşfet
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentGames.map((game) => (
                <div key={game.id} className="rounded-lg bg-gray-900 p-3 border border-gray-800">
                  <div className="text-sm font-medium line-clamp-2">{game.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

  {/* Öne Çıkarılan Filmler Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Öne Çıkarılan Filmler</h3>
            {isOwnProfile && (
              <button
                onClick={() => {
                  setShowFeaturedDialog(true);
                  setSearchQuery('');
                }}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Öne çıkarılan filmleri düzenle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
          {favoriteMovies.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Henüz film izlemediniz.</p>
              <Link href="/explore" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
                Keşfetmeye başlayın
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {favoriteMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isWatched={true}
                  isFavorite={movie.is_favorite || false}
                  rating={movie.user_rating}
                  showActions={true}
                  size="large"
                  showRating={true}
                  onWatch={handleToggleWatch}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleWatchlist={handleToggleWatchlist}
                />
              ))}
            </div>
          )}
        </div>

        {/* İncelemeler Section */}
        <div>
          <h3 className="text-xl font-bold mb-6">İncelemeler</h3>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="text-2xl font-bold">★ {stats.averageRating.toFixed(1)}</div>
              <div className="text-sm text-gray-400">Ortalama Puan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.reviewCount}</div>
              <div className="text-sm text-gray-400">İnceleme</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">Bu Yıl<br />{stats.thisYearMovies} Film</div>
              <div className="text-sm text-gray-400"></div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">Toplam<br />{stats.totalMovies} Film</div>
              <div className="text-sm text-gray-400"></div>
            </div>
          </div>

          {/* Category Stats */}
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-lg font-semibold">Favorite Genre</div>
              <div className="text-sm text-gray-400">Drama</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">Favorite Mood</div>
              <div className="text-sm text-gray-400">Thoughtful</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">Favorite Years</div>
              <div className="text-sm text-gray-400">2010s</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">Favorite Actors</div>
              <div className="text-sm text-gray-400">Various</div>
            </div>
          </div>

          {/* Personality Analysis */}
          <div className="mt-8 bg-gray-900 rounded-lg p-6">
            <h4 className="font-semibold mb-3">Personality Analya</h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              Film zevkinize dayanan kişilik analizi burada yer alacak. Bu analiz, izlediğiniz filmlerin türü, 
              beğeni oranınız ve yorum tarzınıza göre oluşturulan özel bir değerlendirmedir. 
              Genel olarak düşündürücü ve dram ağırlıklı filmleri tercih ettiğiniz görülüyor.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Movies Dialog */}
      {showFeaturedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Öne Çıkarılan Filmleri Seçin (4 adet)</h3>
              <button
                onClick={() => {
                  setShowFeaturedDialog(false);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Seçilen: {selectedFeaturedMovies.length}/4
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedFeaturedMovies.map(movieId => {
                  const movie = allMovies.find(m => m.id === movieId);
                  return movie ? (
                    <div key={movieId} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {movie.title}
                      <button
                        onClick={() => setSelectedFeaturedMovies(prev => prev.filter(id => id !== movieId))}
                        className="hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Film ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-2">
                  &quot;{searchQuery}&quot; için {filteredMovies.length} sonuç bulundu (toplam {allMovies.length} film)
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {filteredMovies.length === 0 ? (
                <div className="col-span-full text-center text-gray-400 py-8">
                  {allMovies.length === 0 ? (
                    <p>Henüz izlediğiniz film bulunmuyor.</p>
                  ) : searchQuery ? (
                    <p>&quot;{searchQuery}&quot; için sonuç bulunamadı.</p>
                  ) : (
                    <p>Film bulunamadı.</p>
                  )}
                </div>
              ) : (
                filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => {
                      if (selectedFeaturedMovies.includes(movie.id)) {
                        setSelectedFeaturedMovies(prev => prev.filter(id => id !== movie.id));
                      } else if (selectedFeaturedMovies.length < 4) {
                        setSelectedFeaturedMovies(prev => [...prev, movie.id]);
                      }
                    }}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedFeaturedMovies.includes(movie.id)
                        ? 'border-blue-500 bg-blue-500 bg-opacity-20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="aspect-[2/3] bg-gray-700">
                      {movie.poster_path ? (
                        <Image
                          src={tmdbImage(movie.poster_path, 'w342')}
                          alt={movie.title}
                          width={150}
                          height={225}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-center px-2">{movie.title}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h4 className="text-sm font-medium truncate">{movie.title}</h4>
                    </div>
                    {selectedFeaturedMovies.includes(movie.id) && (
                      <div className="absolute top-2 right-2 bg-blue-600 rounded-full p-1">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowFeaturedDialog(false);
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  // Here you would save the selected movies
                  console.log('Selected featured movies:', selectedFeaturedMovies);
                  setShowFeaturedDialog(false);
                  setSearchQuery('');
                }}
                disabled={selectedFeaturedMovies.length !== 4}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
