'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();

  // Debug logging
  console.log('🏠 HomePage render:', { 
    hasUser: !!user, 
    userEmail: user?.email, 
    loading 
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
            Film ve Oyun <br />
            <span className="text-gray-700 dark:text-gray-300">
              Deneyimini Kaydet
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            İzlediğin filmleri, oynadığın oyunları takip et. Puanla, not al ve keşfet.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="/explore">
            <Button size="lg" className="min-w-[160px]">
              Keşfetmeye Başla
            </Button>
          </a>
          
          {user ? (
            <a href="/profile">
              <Button variant="secondary" size="lg" className="min-w-[160px]">
                Profile Git
              </Button>
            </a>
          ) : loading ? (
            <div className="w-40 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          ) : (
            <a href="/auth/register">
              <Button variant="secondary" size="lg" className="min-w-[160px]">
                Hesap Oluştur
              </Button>
            </a>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="text-center space-y-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="w-12 h-12 mx-auto bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v10a2 2 0 002 2h8a2 2 0 002-2V7M9 7h6" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">İzleme Listesi</h3>
          <p className="text-gray-600 dark:text-gray-400">
            İzlemek istediğin filmleri ve oynamak istediğin oyunları listele.
          </p>
        </div>
        
        <div className="text-center space-y-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Puanlama</h3>
          <p className="text-gray-600 dark:text-gray-400">
            İzlediğin ve oynadığın içerikleri puanla, notlarını kaydet.
          </p>
        </div>
        
        <div className="text-center space-y-4 p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <div className="w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Keşfet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Yeni filmler ve oyunlar keşfet, önerileri incele.
          </p>
        </div>
      </section>
    </div>
  );
}
