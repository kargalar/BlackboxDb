import Link from 'next/link';
import Image from 'next/image';
import { tmdbImage } from '@/services/tmdb';

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
        <Link href={`/content/movie/${activity.content.id}`}>
          <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
            {activity.content.poster_path ? (
              <Image
                src={tmdbImage(activity.content.poster_path, 'w342')}
                alt={activity.content.title}
                width={64}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-xs text-center px-2">{activity.content.title}</span>
              </div>
            )}
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
