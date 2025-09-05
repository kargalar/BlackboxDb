import Link from 'next/link';
import Image from 'next/image';
import { tmdbImage } from '@/services/api/tmdb';

interface ActivityTabProps {
  activities: any[];
}

const ActivityItem = ({ activity }: { activity: any }) => {
  let actionText = '';
  if (activity.rating) {
    actionText = `rated ${activity.rating}/5`;
  } else if (activity.is_favorite) {
    actionText = 'favorited';
  } else if (activity.content_status_id === 1) {
    actionText = 'watched';
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 flex items-center space-x-4">
      <div className="w-16 flex-shrink-0">
        <Link href={`/content/movie/${activity.content.id}`} className="group relative">
          <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative">
            {activity.content.poster_path ? (
              <Image
                src={tmdbImage(activity.content.poster_path, 'w342')}
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
                    // Handle watch action
                  }}
                  className="flex items-center justify-center w-5 h-5 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                  title="İzle"
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
                    // Handle favorite action
                  }}
                  className="flex items-center justify-center w-5 h-5 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                  title="Favori"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Handle watchlist action
                  }}
                  className="flex items-center justify-center w-5 h-5 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                  title="İzleme Listesi"
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
          <Link href={`/content/movie/${activity.content.id}`} className="font-bold text-white hover:underline">
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

export default function ActivityTab({ activities }: ActivityTabProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No activity yet.</p>
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
