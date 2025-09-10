'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { Route } from 'next';

export default function ExplorePage() {
  const router = useRouter();

  const contentTypes = [
    {
      id: 'movies',
      title: 'Filmler',
      description: 'TMDB üzerinden binlerce film keşfedin',
      href: '/explore/movies' as Route,
      emoji: '🎬'
    },
    {
      id: 'tv',
      title: 'TV Dizileri',
      description: 'Popüler dizileri ve şovları keşfedin',
      href: '/explore/tv' as Route,
      emoji: '📺'
    },
    {
      id: 'games',
      title: 'Oyunlar',
      description: 'IGDB üzerinden oyunları keşfedin',
      href: '/explore/games' as Route,
      emoji: '🎮'
    },
    {
      id: 'books',
      title: 'Kitaplar',
      description: 'Google Books üzerinden kitapları keşfedin',
      href: '/explore/books' as Route,
      emoji: '📚'
    }
  ];

  const handleExploreClick = (type: string, href: Route) => {
    console.log('🏠 Explore: Navigating to', type, 'at', href);
    router.push(href);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          İçerik Keşfet
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Film, dizi, oyun ve kitaplar arasından seçim yapın ve keşfetmeye başlayın
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {contentTypes.map((type) => (
          <div
            key={type.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleExploreClick(type.title, type.href)}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">{type.emoji}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {type.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {type.description}
              </p>
              <Button className="w-full">
                Keşfet
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
