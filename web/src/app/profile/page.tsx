'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { getUserWatchedMovies, getUserStats, Content } from '@/services/movieLogs';
import { tmdbImage } from '@/services/tmdb';
import { supabase } from '@/lib/supabase';

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
    const loadUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Kullanıcının izlediği filmleri getir
        const { data: watchedMovies } = await getUserWatchedMovies();
        if (watchedMovies) {
          setRecentMovies(watchedMovies.slice(0, 4)); // Son 4 film
          setFavoriteMovies(watchedMovies.slice(0, 5)); // İlk 5 film (favoriler için)
        }

        // İstatistikleri getir
        const userStats = await getUserStats();
        setStats(userStats);
        
      } catch (error) {
        console.error('Profil verileri yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Supabase: aktif kullanıcının app_user kaydını çek
  useEffect(() => {
    const fetchAppUser = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('app_user')
        .select('username, email, picture_path, bio')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!error && data) {
        setAppUser({
          username: data.username,
          email: data.email,
          picture_path: data.picture_path,
          bio: data.bio,
        });
      }
    };
    fetchAppUser();
  }, [user]);

  const tabs = ['Home', 'Movies', 'Games', 'Books', 'Reviews', 'Lists', 'Network', 'Activity'];

  // Giriş yapmamış kullanıcı kontrolü
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profil sayfasını görüntülemek için giriş yapın</h2>
          <Link href="/auth/login" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors">
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
                      ? 'border-blue-500 text-blue-500'
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
                  <Link href="/explore" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Keşfetmeye başlayın
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {recentMovies.slice(0, 2).map((movie) => (
                    <Link key={movie.id} href={`/movie?id=${movie.id}`} className="relative group cursor-pointer">
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
                  <Link href="/explore" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Keşfetmeye başlayın
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {recentMovies.map((movie) => (
                    <Link key={movie.id} href={`/movie?id=${movie.id}`} className="relative group cursor-pointer">
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
                      {/* Rating and Date */}
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center space-x-1">
                          <span>★</span>
                          <span>{movie.fav_count > 0 ? '5.0' : '—'}</span>
                        </div>
                        <span>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
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
                  <Link href="/explore" className="text-blue-500 hover:text-blue-400 mt-2 inline-block">
                    Keşfetmeye başlayın
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {favoriteMovies.map((movie) => (
                    <Link key={movie.id} href={`/movie?id=${movie.id}`} className="relative group cursor-pointer">
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
