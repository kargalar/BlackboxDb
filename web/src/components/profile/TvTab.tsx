import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { tmdbImage } from '@/services/api/tmdb';
import type { Content } from '@/services/database/movieLogs';

interface TvTabProps {
  tvs: Content[];
}

export default function TvTab({ tvs }: TvTabProps) {
  const [showOnlyWatchlist, setShowOnlyWatchlist] = useState(false);

  const filtered = showOnlyWatchlist
    ? tvs.filter((t) => t.is_consume_later)
    : tvs.filter((t) => !t.is_consume_later);

  const handleToggleFavorite = async (contentId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const item = tvs.find((m) => m.id === contentId);
      if (!item) return;

      const { error } = await supabase
        .from('user_content_log')
        .update({ is_favorite: !item.is_favorite })
        .eq('user_id', user.user.id)
        .eq('content_id', contentId);

      if (error) throw error;
    } catch (err) {
      console.error('favorite toggle failed', err);
    }
  };

  const handleToggleWatch = async (contentId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('user_content_log')
        .update({ is_watched: false, date: null })
        .eq('user_id', user.user.id)
        .eq('content_id', contentId);

      if (error) throw error;
    } catch (err) {
      console.error('watch toggle failed', err);
    }
  };

  const handleToggleWatchlist = async (contentId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const item = tvs.find((m) => m.id === contentId);
      if (!item) return;

      const { error } = await supabase
        .from('user_content_log')
        .update({ is_consume_later: !item.is_consume_later })
        .eq('user_id', user.user.id)
        .eq('content_id', contentId);

      if (error) throw error;
    } catch (err) {
      console.error('watchlist toggle failed', err);
    }
  };

  if (tvs.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>Henüz dizi aktivitesi yok.</p>
        <Link href="/explore/tv" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
          Dizileri keşfet
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowOnlyWatchlist(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !showOnlyWatchlist ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          İzlenen Diziler ({tvs.filter((m) => !m.is_consume_later).length})
        </button>
        <button
          onClick={() => setShowOnlyWatchlist(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showOnlyWatchlist ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Watchlist ({tvs.filter((m) => m.is_consume_later).length})
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filtered.map((tv) => (
          <div key={tv.id} className="space-y-2">
            <Link href={`/content/tv/${tv.id}`} className="group relative">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative border border-gray-700">
                {tv.poster_path ? (
                  <Image
                    src={tmdbImage(tv.poster_path, 'w342')}
                    alt={tv.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      console.error('❌ Dizi poster yüklenemedi:', tv.title, tv.poster_path ? tmdbImage(tv.poster_path, 'w342') : 'null poster_path');
                      // Hide the image on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-xs text-center px-2 text-white">{tv.title}</span>
                  </div>
                )}
              </div>
            </Link>
            <div className="text-xs font-medium line-clamp-2 text-white">{tv.title}</div>
            {(tv.user_rating ?? 0) > 0 && (
              <div className="flex items-center">
                <span className="text-xs text-yellow-400">★ {tv.user_rating}</span>
              </div>
            )}
            {tv.date && (
              <div className="text-xs text-gray-400">
                {new Date(tv.date).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
