import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import TvCard from '@/components/TvCard';
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
            <TvCard
              tv={{ id: tv.id, title: tv.title, poster_path: tv.poster_path || undefined }}
              size="large"
            />
            {/* Action row to mirror movie UX (optional minimal) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleWatch(tv.id)}
                className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700"
              >
                İzlendi Kaldır
              </button>
              <button
                onClick={() => handleToggleFavorite(tv.id)}
                className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700"
              >
                {tv.is_favorite ? 'Favoriden Çıkar' : 'Favori'}
              </button>
              <button
                onClick={() => handleToggleWatchlist(tv.id)}
                className="px-2 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700"
              >
                {tv.is_consume_later ? 'Listeden Çıkar' : 'İzleme Listesi'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
