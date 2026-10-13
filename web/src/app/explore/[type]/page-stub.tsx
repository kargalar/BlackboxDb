'use client';

/**
 * Explore Page Stub
 *
 * Temporary stub provided to maintain routing while the search feature
 * is being redesigned for the internal database.
 */

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const CONTENT_CONFIG = {
  movie: { title: 'Filmler', subtitle: 'En popüler filmleri keşfedin' },
  tv: { title: 'TV Dizileri', subtitle: 'En popüler dizileri keşfedin' },
  book: { title: 'Kitaplar', subtitle: 'En popüler kitapları keşfedin' },
  game: { title: 'Oyunlar', subtitle: 'En popüler oyunları keşfedin' },
};

function ExploreContent() {
  const params = useParams();
  const type = params.type as keyof typeof CONTENT_CONFIG;
  const config = CONTENT_CONFIG[type] || CONTENT_CONFIG.movie;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">{config.title}</h1>
        <p className="text-gray-400 mb-8">{config.subtitle}</p>
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-2">🚧 Feature Under Reconstruction</h2>
          <p className="text-gray-300 mb-4">
            The explore/search feature is being redesigned to work with our new unified database
            structure. This page will be available soon with improved search and filtering
            capabilities.
          </p>
          <p className="text-gray-400">
            In the meantime, you can browse content from the{' '}
            <Link href="/dashboard" className="text-blue-400 hover:underline">
              Dashboard
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8 text-center">Loading...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
