'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Content } from '@/services/database/movieLogs';
import { supabase } from '@/lib/supabase';

interface GamesTabProps {
  games: Content[];
}

export default function GamesTab({ games }: GamesTabProps) {
  const [showOnlyWishlist, setShowOnlyWishlist] = useState(false);

  const filteredGames = games.filter(game => {
    if (showOnlyWishlist) return game.is_consume_later;
    return !game.is_consume_later; // show played games
  });

  const handleTogglePlay = async (gameId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const newPlayedStatus = !(!game.is_consume_later && game.date); // if not in wishlist and has date, then it's played

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ 
          content_status_id: newPlayedStatus ? 1 : 2,
          date: newPlayedStatus ? new Date().toISOString() : null 
        })
        .eq('user_id', user.user.id)
        .eq('content_id', gameId);

      if (error) throw error;

      console.log(`Game ${gameId} play status updated to ${newPlayedStatus}`);
    } catch (error) {
      console.error('Error updating play status:', error);
    }
  };

  const handleToggleFavorite = async (gameId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const newFavoriteStatus = !game.is_favorite;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_favorite: newFavoriteStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', gameId);

      if (error) throw error;

      console.log(`Game ${gameId} favorite status updated to ${newFavoriteStatus}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleToggleWishlist = async (gameId: number) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const newWishlistStatus = !game.is_consume_later;

      // Update in database
      const { error } = await supabase
        .from('user_content_log')
        .update({ is_consume_later: newWishlistStatus })
        .eq('user_id', user.user.id)
        .eq('content_id', gameId);

      if (error) throw error;

      console.log(`Game ${gameId} wishlist status updated to ${newWishlistStatus}`);
    } catch (error) {
      console.error('Error updating wishlist status:', error);
    }
  };

  if (games.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>Henüz oyun oynamadınız.</p>
        <Link href="/explore/games" className="text-gray-400 hover:text-gray-300 mt-2 inline-block">
          Oyun keşfetmeye başlayın
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowOnlyWishlist(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !showOnlyWishlist 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Oynanan Oyunlar ({games.filter(g => !g.is_consume_later).length})
          </button>
          <button
            onClick={() => setShowOnlyWishlist(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOnlyWishlist 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            İstek Listesi ({games.filter(g => g.is_consume_later).length})
          </button>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredGames.map((game) => (
          <div key={game.id} className="space-y-2">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="text-sm font-medium line-clamp-2 text-white">{game.title}</div>
              {(game.user_rating ?? 0) > 0 && (
                <div className="flex items-center mt-2">
                  <span className="text-xs text-yellow-400">★ {game.user_rating}</span>
                </div>
              )}
              {game.date && (
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(game.date).toLocaleDateString('tr-TR')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
