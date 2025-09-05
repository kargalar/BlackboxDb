import Link from 'next/link';
import Image from 'next/image';
import { Review } from '@/services/movieLogs';
import { tmdbImage } from '@/services/tmdb';

interface ReviewsTabProps {
  reviews: Review[];
}

export default function ReviewsTab({ reviews }: ReviewsTabProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>Henüz hiç yorum yapmadınız.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="bg-gray-900 rounded-lg p-4 flex space-x-4">
          <div className="w-24 flex-shrink-0">
            <Link href={`/content/movie/${review.content_id}`}>
              <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
                {review.content.poster_path ? (
                  <Image
                    src={tmdbImage(review.content.poster_path, 'w342')}
                    alt={review.content.title}
                    width={100}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-xs text-center px-2">{review.content.title}</span>
                  </div>
                )}
              </div>
            </Link>
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-bold">
              <Link href={`/content/movie/${review.content_id}`} className="hover:underline">
                {review.content.title}
              </Link>
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(review.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="mt-4 text-gray-300">{review.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
