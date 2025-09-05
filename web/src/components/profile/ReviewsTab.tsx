import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Review, updateReview } from '@/services/movieLogs';
import { tmdbImage } from '@/services/tmdb';

interface ReviewsTabProps {
  reviews: Review[];
  onReviewUpdate?: (reviewId: number, newText: string) => void;
}

export default function ReviewsTab({ reviews, onReviewUpdate }: ReviewsTabProps) {
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editText, setEditText] = useState('');

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditText(review.text);
  };

  const handleSave = async () => {
    if (!editingReview) return;

    try {
      const result = await updateReview(editingReview.id, editText);
      if (result.success) {
        // Update the review locally if callback is provided
        if (onReviewUpdate) {
          onReviewUpdate(editingReview.id, editText);
        }
        setEditingReview(null);
        setEditText('');
      } else {
        console.error('Failed to update review:', result.error);
        alert('İnceleme güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('İnceleme güncellenirken bir hata oluştu');
    }
  };

  const handleCancel = () => {
    setEditingReview(null);
    setEditText('');
  };
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
                {review.content?.poster_path ? (
                  <Image
                    src={tmdbImage(review.content.poster_path, 'w342')}
                    alt={review.content.title}
                    width={100}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-xs text-center px-2">{review.content?.title || 'Film'}</span>
                  </div>
                )}
              </div>
            </Link>
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                <Link href={`/content/movie/${review.content_id}`} className="hover:underline">
                  {review.content?.title || 'Film'}
                </Link>
              </h3>
              <button
                onClick={() => handleEdit(review)}
                className="text-gray-400 hover:text-white transition-colors"
                title="İncelemeyi düzenle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
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

      {/* Edit Review Modal */}
      {editingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">İncelemeyi Düzenle</h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                İncelemeniz
              </label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
                placeholder="İncelemenizi yazın..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
