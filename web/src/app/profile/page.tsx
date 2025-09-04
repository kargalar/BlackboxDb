'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<Movie[]>([]);
  const [activeTab, setActiveTab] = useState('Son Aktiviteler');

  // Mock data for demonstration
  useEffect(() => {
    // Bu veriler normalde API'den gelir
    setRecentMovies([
      { id: 1, title: 'Into The Wild', poster_path: '/sample1.jpg', vote_average: 8.2, release_date: '2023-01-01' },
      { id: 2, title: 'The Lighthouse', poster_path: '/sample2.jpg', vote_average: 7.8, release_date: '2023-02-01' },
      { id: 3, title: 'Okuz Atav', poster_path: '/sample3.jpg', vote_average: 7.5, release_date: '2023-03-01' },
    ]);

    setFavoriteMovies([
      { id: 4, title: 'Into The Wild', poster_path: '/sample4.jpg', vote_average: 8.2, release_date: '2023-01-01' },
      { id: 5, title: 'The Lighthouse', poster_path: '/sample5.jpg', vote_average: 7.8, release_date: '2023-02-01' },
      { id: 6, title: 'Sound of Metal', poster_path: '/sample6.jpg', vote_average: 7.9, release_date: '2023-03-01' },
      { id: 7, title: 'Midsommar', poster_path: '/sample7.jpg', vote_average: 7.0, release_date: '2023-04-01' },
      { id: 8, title: 'Hit the Road', poster_path: '/sample8.jpg', vote_average: 7.3, release_date: '2023-05-01' },
    ]);
  }, []);

  const tabs = ['Home', 'Movies', 'Games', 'Books', 'Reviews', 'Lists', 'Network', 'Activity'];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <Image 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    width={48} 
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {user?.email?.charAt(0).toUpperCase() || 'K'}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.user_metadata?.username || user?.email?.split('@')[0] || 'kargalar'}</h2>
                <p className="text-gray-400 text-sm">Very useful info</p>
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
              <div className="grid grid-cols-2 gap-3">
                {recentMovies.slice(0, 2).map((movie) => (
                  <div key={movie.id} className="relative group cursor-pointer">
                    <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                        <span className="text-xs text-center px-2">{movie.title}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Son Aktiviteler Section */}
            <div>
              <h3 className="text-xl font-bold mb-6">Son Aktiviteler</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recentMovies.map((movie) => (
                  <div key={movie.id} className="relative group cursor-pointer">
                    <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                        <span className="text-xs text-center px-2">{movie.title}</span>
                      </div>
                    </div>
                    {/* Rating and Date */}
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center space-x-1">
                        <span>★</span>
                        <span>{movie.vote_average}</span>
                      </div>
                      <span>17 Oct</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Öne Çıkarılan Filmler Section */}
            <div>
              <h3 className="text-xl font-bold mb-6">Öne Çıkarılan Filmler</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {favoriteMovies.map((movie) => (
                  <div key={movie.id} className="relative group cursor-pointer">
                    <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                        <span className="text-xs text-center px-2">{movie.title}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* İncelemeler Section */}
            <div>
              <h3 className="text-xl font-bold mb-6">İncelemeler</h3>
              
              {/* Stats */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold">★ 3.8</div>
                  <div className="text-sm text-gray-400">Average Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-sm text-gray-400">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">This Year<br />625 Movie</div>
                  <div className="text-sm text-gray-400"></div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">All Time<br />897 Movie</div>
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
