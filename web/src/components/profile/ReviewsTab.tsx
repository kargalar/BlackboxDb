import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Review, updateReview } from '@/services/database/movieLogs';
import type { ReviewReply } from '@/services/database/movieLogs';
import { tmdbImage } from '@/services/api/tmdb';
import { igdbImageUrl } from '@/lib/igdb-client';
import { CONTENT_TYPE } from '@/lib/constants';
import { getReviewReplies, testReviewReplyTable } from '@/services/database/reviewReplies';
import { EyeIconSolid } from '@/components/icons/EyeIcon';
import { HeartIcon } from '@/components/icons/HeartIcon';
import { BookmarkIcon } from '@/components/icons/BookmarkIcon';

interface ReviewsTabProps {
  reviews: Review[];
  onReviewUpdate?: (reviewId: number, newText: string) => void;
  isOwnProfile?: boolean;
}

function getContentImageUrl(review: Review): string | null {
  if (!review.content?.poster_path) {
    console.log('⚠️ Poster path yok:', review.content?.title);
    return null;
  }
  
  const contentTypeId = review.content.content_type_id;
  console.log('🔍 Content türü kontrolü:', review.content.title, 'Type ID:', contentTypeId, 'Poster path:', review.content.poster_path);
  
  // If poster_path is already a full URL, use it directly
  if (review.content.poster_path.startsWith('http')) {
    console.log('🌐 Tam URL kullanılıyor:', review.content.poster_path);
    return review.content.poster_path;
  }
  
  switch (contentTypeId) {
    case CONTENT_TYPE.MOVIE:
    case CONTENT_TYPE.TV:
      const tmdbUrl = tmdbImage(review.content.poster_path, 'w342');
      console.log('🎬 TMDB URL:', tmdbUrl);
      return tmdbUrl;
    case CONTENT_TYPE.GAME:
      // IGDB images use image_id format, not full path
      const igdbUrl = igdbImageUrl(review.content.poster_path, 'cover_big');
      console.log('🎮 IGDB URL:', igdbUrl);
      return igdbUrl;
    case CONTENT_TYPE.BOOK:
      // For books, poster_path might be a Google Books thumbnail URL
      console.log('📚 Kitap URL (fallback):', review.content.poster_path);
      return review.content.poster_path;
    default:
      const defaultUrl = tmdbImage(review.content.poster_path, 'w342');
      console.log('❓ Varsayılan URL:', defaultUrl);
      return defaultUrl;
  }
}

function getContentLink(review: Review): string {
  const contentTypeId = review.content?.content_type_id;
  
  switch (contentTypeId) {
    case CONTENT_TYPE.MOVIE:
      return `/content/movie/${review.content_id}`;
    case CONTENT_TYPE.TV:
      return `/content/tv/${review.content_id}`;
    case CONTENT_TYPE.GAME:
      return `/content/game/${review.content_id}`;
    case CONTENT_TYPE.BOOK:
      return `/content/book/${review.content_id}`;
    default:
      return `/content/movie/${review.content_id}`;
  }
}

export default function ReviewsTab({ reviews, onReviewUpdate, isOwnProfile = false }: ReviewsTabProps) {
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editText, setEditText] = useState('');
  const [replies, setReplies] = useState<{ [key: number]: ReviewReply[] }>({});

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

  useEffect(() => {
    console.log('📝 ReviewsTab yüklendi, reviews sayısı:', reviews.length);
    reviews.forEach((review, index) => {
      console.log(`📝 Review ${index + 1}:`, {
        id: review.id,
        content_id: review.content_id,
        title: review.content?.title,
        poster_path: review.content?.poster_path,
        content_type_id: review.content?.content_type_id
      });
    });
    
    // Test if review_reply table exists
    testReviewReplyTable();

    // Fetch replies for all reviews
    async function fetchReplies() {
      const replyMap: { [key: number]: ReviewReply[] } = {};
      for (const review of reviews) {
        const res = await getReviewReplies(review.id);
        replyMap[review.id] = res.data;
      }
      setReplies(replyMap);
    }
    if (reviews.length > 0) fetchReplies();
  }, [reviews]);

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
            <Link href={getContentLink(review) as any} className="group relative">
              <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden relative">
                {review.content?.poster_path ? (
                  <Image
                    src={getContentImageUrl(review) || ''}
                    alt={review.content.title}
                    width={100}
                    height={150}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      console.error('❌ Poster görüntü yüklenemedi:', review.content?.title, 'URL:', getContentImageUrl(review));
                      console.error('❌ Review data:', review);
                      // Hide the image on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : null}
                {!review.content?.poster_path && (
                  <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-xs text-center px-2">{review.content?.title || 'İçerik'}</span>
                  </div>
                )}

                {/* Hover Overlay with Action Buttons */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Handle watch action
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                      title="İzle"
                    >
                      <EyeIconSolid className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Handle favorite action
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                      title="Favori"
                    >
                      <HeartIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Handle watchlist action
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm text-white bg-white/20 hover:bg-white/30 transition-colors"
                      title="İzleme Listesi"
                    >
                      <BookmarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
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
              {isOwnProfile && (
                <button
                  onClick={() => handleEdit(review)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="İncelemeyi düzenle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {new Date(review.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="mt-4 text-gray-300">{review.text}</p>

            {/* Review Replies */}
            {replies[review.id] && replies[review.id].length > 0 && (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Yorumlar ({replies[review.id].length})</h4>
                <div className="space-y-2">
                  {replies[review.id].map(reply => (
                    <div key={reply.id} className="bg-gray-800 rounded px-3 py-2 text-sm text-gray-200">
                      <span className="font-bold text-blue-400">{reply.user_name}:</span> {reply.text}
                      <span className="ml-2 text-xs text-gray-400">{new Date(reply.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
