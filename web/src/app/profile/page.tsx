'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { getUserWatchedMovies, getUserStats, Content } from '@/services/movieLogs';
import { tmdbImage } from '@/services/tmdb';
import { getCurrentUserProfile } from '@/services/userService';
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

export default function ProfilePage() {
  const { user } = useAuth();
  const [recentMovies, setRecentMovies] = useState<Content[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<Content[]>([]);
  const [activeTab, setActiveTab] = useState('Son Aktiviteler');
  const [stats, setStats] = useState({
    totalMovies: 0,
    thisYearMovies: 0,
    averageRating: 0,
    reviewCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [appUser, setAppUser] = useState<{ username: string; email: string; picture_path: string | null; bio: string | null } | null>(null);

  // Gerçek verileri yükle
  useEffect(() => {
    let isMounted = true
    
    const loadUserData = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) setLoading(true);
        
        // Timeout ile veri yükleme (maximum 10 saniye)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data loading timeout')), 10000)
        );
        
        // Paralel olarak tüm verileri yükle
        const dataPromise = Promise.all([
          getCurrentUserProfile(),
          getUserWatchedMovies(), 
          getUserStats()
        ]);

        const [userProfileResult, watchedMoviesResult, userStats] = await Promise.race([
          dataPromise,
          timeoutPromise
        ]) as any;

        if (!isMounted) return;

        // App user bilgilerini set et
        if (userProfileResult?.data) {
          setAppUser(userProfileResult.data);
        }
        
        // Kullanıcının izlediği filmleri set et
        if (watchedMoviesResult?.data) {
          // Ensure we have latest-per-content list already sorted desc by date
          const latestPerMovie = [...watchedMoviesResult.data].sort((a, b) => {
            const ta = a.date ? new Date(a.date).getTime() : 0
            const tb = b.date ? new Date(b.date).getTime() : 0
            return tb - ta
          })
          setRecentMovies(latestPerMovie.slice(0, 4)); // Son 4 film (tek film, son log)
          setFavoriteMovies(latestPerMovie.filter(m => m.is_favorite).slice(0, 5)); // Öne çıkarılanlar: favoriler
        }

        // İstatistikleri set et
        setStats(userStats);
        
      } catch (error) {
        console.error('Profil verileri yüklenemedi:', error);
        // Fallback user data from auth user
        if (isMounted && user) {
          setAppUser({
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'Kullanıcı',
            email: user.email || '',
            picture_path: null,
            bio: null
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  const tabs = ['Home', 'Movies', 'Games', 'Books', 'Reviews', 'Lists', 'Network', 'Activity'];

  // Giriş yapmamış kullanıcı kontrolü
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profil sayfasını görüntülemek için giriş yapın</h2>
          <Link href="/auth/login" className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  // Loading durumu
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {appUser?.picture_path ? (
                  <Image 
                    src={appUser.picture_path}
                    alt="Profile" 
                    width={48} 
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : user?.user_metadata?.avatar_url ? (
                  <Image 
                    src={user.user_metadata.avatar_url}
                    alt="Profile" 
                    width={48} 
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {(appUser?.username?.charAt(0) || user?.email?.charAt(0) || 'K').toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{appUser?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'kargalar'}</h2>
                <p className="text-gray-400 text-sm">{appUser?.bio || ' '}</p>
              </div>
              <button className="ml-2">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-gray-400 text-gray-300'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recent Movies */}
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
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Son Aktiviteler Section */}
            <div>
              <h3 className="text-xl font-bold mb-6">Son Aktiviteler</h3>
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
                        
                        {/* Favorite Badge */}
                        {movie.is_favorite && (
                          <div className="absolute top-2 right-2 bg-red-600 rounded-full p-1">
                            <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Rating and Date */}
                      <div className="mt-2 space-y-1">
                        {/* User Rating */}
                        {movie.user_rating && movie.user_rating > 0 ? (
                          <div className="flex items-center justify-between">
                            <StarRating rating={movie.user_rating} size="w-3 h-3" />
                            <span className="text-xs text-yellow-400">{movie.user_rating}/5</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Puanlanmamış</span>
                            <span className="text-xs text-gray-500">—</span>
                          </div>
                        )}
                        
                        {/* Date */}
                        <div className="text-xs text-gray-400">
                          {movie.date 
                            ? new Date(movie.date).toLocaleDateString('tr-TR', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'Yakın zamanda'
                          }
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Öne Çıkarılan Filmler Section */}
            <div>
              <h3 className="text-xl font-bold mb-6">Öne Çıkarılan Filmler</h3>
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
              )}
            </div>

            {/* İncelemeler Section */}
            <div>
              <h3 className="text-xl font-bold mb-6">İncelemeler</h3>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">★ {stats.averageRating}</div>
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
        </div>
      </div>
    </div>
  );
}
