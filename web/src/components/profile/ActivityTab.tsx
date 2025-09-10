import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { tmdbImage } from '@/services/api/tmdb';
import { igdbImageUrl } from '@/services/api/igdb';
import { supabase } from '@/lib/supabase';

interface ActivityTabProps {
  activities: any[];
}

export default function ActivityTab({ activities }: ActivityTabProps) {
  console.log('ActivityTab received activities:', activities);
  
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>Henüz aktivite yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

const ActivityItem = ({ activity }: { activity: any }) => {
  const [userStatus, setUserStatus] = useState({
    isWatched: activity.content_status_id === 1 || (activity.rating ?? 0) > 0,
    isFavorite: activity.is_favorite || false,
    isLater: activity.is_consume_later || false
  });

  let actionText = '';
  if (activity.rating) {
    actionText = `rated ${activity.rating}/5`;
  } else if (activity.is_favorite) {
    actionText = 'favorited';
  } else if (activity.content_status_id === 1) {
    // Content type check: 1=MOVIE, 2=GAME, 3=TV, 4=BOOK
    const contentType = activity.content?.content_type_id;
    if (contentType === 4) {
      actionText = 'read';
    } else {
      actionText = 'watched';
    }
  }

  // Content type check: 1=MOVIE, 2=GAME, 3=TV, 4=BOOK
  const contentType = activity.content?.content_type_id;
  const isGame = contentType === 2;
  const isBook = contentType === 4;
  
  // Get proper image URL based on content type
  const getImageUrl = () => {
    if (!activity.content?.poster_path) return null;
    
    if (isGame) {
      // For games, poster_path is already a full URL from IGDB
      return activity.content.poster_path;
    } else if (isBook) {
      // For books, poster_path is already a full URL from Google Books
      return activity.content.poster_path;
    } else {
      // For movies/TV, use TMDB
      return tmdbImage(activity.content.poster_path, 'w342');
    }
  };

  // Get proper content link based on content type
  const getContentLink = () => {
    const contentId = activity.content.id;
    switch (contentType) {
      case 1: return `/content/movie/${contentId}`;
      case 2: return `/content/game/${contentId}`;
      case 3: return `/content/tv/${contentId}`;
      case 4: return `/content/book/${contentId}`;
      default: return `/content/movie/${contentId}`;
    }
  };

  const handleWatchToggle = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newWatchedStatus = !userStatus.isWatched;
      
      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: activity.content.id,
          content_status_id: newWatchedStatus ? 1 : 2,
          rating: activity.rating || null,
          is_favorite: userStatus.isFavorite,
          is_consume_later: userStatus.isLater,
          date: new Date().toISOString()
        });

      if (error) throw error;
      
      setUserStatus(prev => ({ ...prev, isWatched: newWatchedStatus }));
      console.log(`Activity item watch status updated: ${newWatchedStatus}`);
    } catch (error) {
      console.error('Error updating watch status:', error);
    }
  };

  const handleFavoriteToggle = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newFavoriteStatus = !userStatus.isFavorite;
      
      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: activity.content.id,
          content_status_id: userStatus.isWatched ? 1 : 2,
          rating: activity.rating || null,
          is_favorite: newFavoriteStatus,
          is_consume_later: userStatus.isLater,
          date: new Date().toISOString()
        });

      if (error) throw error;
      
      setUserStatus(prev => ({ ...prev, isFavorite: newFavoriteStatus }));
      console.log(`Activity item favorite status updated: ${newFavoriteStatus}`);
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const handleLaterToggle = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newLaterStatus = !userStatus.isLater;
      
      const { error } = await supabase
        .from('user_content_log')
        .upsert({
          user_id: user.user.id,
          content_id: activity.content.id,
          content_status_id: userStatus.isWatched ? 1 : 2,
          rating: activity.rating || null,
          is_favorite: userStatus.isFavorite,
          is_consume_later: newLaterStatus,
          date: new Date().toISOString()
        });

      if (error) throw error;
      
      setUserStatus(prev => ({ ...prev, isLater: newLaterStatus }));
      console.log(`Activity item later status updated: ${newLaterStatus}`);
    } catch (error) {
      console.error('Error updating later status:', error);
    }
  };

  const contentLink = getContentLink();
  const imageUrl = getImageUrl();

  return (
    <div className="bg-gray-900 rounded-lg p-4 flex items-center space-x-4">
      <div className="w-16 flex-shrink-0">
        <Link href={contentLink as any} className="group relative">
          <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={activity.content.title}
                width={64}
                height={96}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-xs text-center px-2">{activity.content.title}</span>
              </div>
            )}

            {/* Hover Overlay with Action Buttons */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleWatchToggle();
                  }}
                  className={`flex items-center justify-center w-5 h-5 rounded-full backdrop-blur-sm text-white transition-colors ${
                    userStatus.isWatched 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                  title={userStatus.isWatched ? 'İzlendi' : 'İzle'}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFavoriteToggle();
                  }}
                  className={`flex items-center justify-center w-5 h-5 rounded-full backdrop-blur-sm text-white transition-colors ${
                    userStatus.isFavorite 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                  title={userStatus.isFavorite ? 'Favorilerden Çıkar' : 'Favori'}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLaterToggle();
                  }}
                  className={`flex items-center justify-center w-5 h-5 rounded-full backdrop-blur-sm text-white transition-colors ${
                    userStatus.isLater 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                  title={userStatus.isLater ? 'İzleme Listesinden Çıkar' : 'İzleme Listesi'}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Link>
      </div>
      <div className="flex-grow">
        <p className="text-gray-300">
          You {actionText}{' '}
          <Link href={contentLink as any} className="font-bold text-white hover:underline">
            {activity.content.title}
          </Link>
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {new Date(activity.date).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
};
