'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getMovieDetails, tmdbImage } from '@/services/tmdb';
import { getContentById, logMovieWatch, toggleFavorite, rateMovie, getUserRating, getUserFavoriteStatus, getContentReviews, saveContentFromTMDB, addReview, toggleReviewLike, addReviewReply, getReviewReplies } from '@/services/movieLogs';
import { TMDBMovieDetail, TMDBCastMember } from '@/types/tmdb';
import { Button } from '@/components/ui/button';

// Star Rating Component
const StarRating = ({ rating }: { rating: number }) => {
  const stars = [];
  const fullStars = Math.floor(rating / 2);
  const hasHalfStar = rating % 2 >= 1;
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
        </svg>
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor"/>
              <stop offset="50%" stopColor="transparent"/>
            </linearGradient>
          </defs>
          <path fill="url(#half)" d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
        </svg>
      );
    } else {
      stars.push(
        <svg key={i} className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 20 20">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
        </svg>
      );
    }
  }
  
  return <div className="flex items-center space-x-1">{stars}</div>;
};

// Action Button Component
const ActionButton = ({ icon, label, active = false, onClick }: { 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  onClick?: () => void;
}) => (
  <button 
    onClick={onClick}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
      active 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

// Cast Member Component
const CastMember = ({ member }: { member: TMDBCastMember }) => (
  <div className="flex flex-col items-center min-w-[120px]">
    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 mb-2">
      {member.profile_path ? (
        <Image
          src={tmdbImage(member.profile_path, 'w185')}
          alt={member.name}
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
    <p className="text-sm font-medium text-center">{member.name}</p>
    <p className="text-xs text-gray-400 text-center">{member.character}</p>
  </div>
);

// Comment Component with likes and replies
const Comment = ({ 
  review, 
  onLike, 
  onReply, 
  onToggleReplies, 
  showReplies = false,
  replies = []
}: {
  review: {
    id: number;
    user_name: string;
    rating: number | null;
    review_text: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    is_liked_by_current_user: boolean;
  };
  onLike: (reviewId: number) => void;
  onReply: (reviewId: number, text: string) => void;
  onToggleReplies: (reviewId: number) => void;
  showReplies?: boolean;
  replies?: Array<{
    id: number;
    user_name: string;
    text: string;
    created_at: string;
    like_count: number;
    is_liked_by_current_user: boolean;
  }>;
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onReply(review.id, replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  return (
    <div className="border-b border-gray-700 pb-4 mb-4 last:border-b-0">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
          <span className="text-sm font-medium">{review.user_name[0].toUpperCase()}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">{review.user_name}</h4>
            <span className="text-sm text-gray-400">{formatDate(review.created_at)}</span>
          </div>
          {review.rating && (
            <div className="flex items-center space-x-2 mb-2">
              <StarRating rating={review.rating * 2} />
              <span className="text-sm text-gray-400">{review.rating.toFixed(1)}</span>
            </div>
          )}
          <p className="text-gray-300 text-sm leading-relaxed mb-3">{review.review_text}</p>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onLike(review.id)}
              className={`flex items-center space-x-1 text-sm ${
                review.is_liked_by_current_user 
                  ? 'text-red-500' 
                  : 'text-gray-400 hover:text-red-500'
              } transition-colors`}
            >
              <svg className="w-4 h-4" fill={review.is_liked_by_current_user ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{review.like_count}</span>
            </button>
            
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Reply</span>
            </button>

            {review.reply_count > 0 && (
              <button
                onClick={() => onToggleReplies(review.id)}
                className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>{showReplies ? 'Hide' : 'Show'} {review.reply_count} replies</span>
              </button>
            )}
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full p-2 bg-gray-700 text-white rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                maxLength={200}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">{replyText.length}/200</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText('');
                    }}
                    className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim()}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {showReplies && replies.length > 0 && (
            <div className="mt-4 pl-4 border-l border-gray-700">
              {replies.map((reply) => (
                <div key={reply.id} className="mb-3 last:mb-0">
                  <div className="flex items-start space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-xs font-medium">{reply.user_name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="text-sm font-medium">{reply.user_name}</h5>
                        <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{reply.text}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <button className={`flex items-center space-x-1 text-xs ${reply.is_liked_by_current_user ? 'text-red-500' : 'text-gray-400 hover:text-red-500'} transition-colors`}>
                          <svg className="w-3 h-3" fill={reply.is_liked_by_current_user ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{reply.like_count}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Movie Card Component for Similar Movies
const MovieCard = ({ movie }: { movie: any }) => (
  <Link href={`/content/movie/${movie.id}`} className="min-w-[150px] cursor-pointer group">
    <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2 group-hover:scale-105 transition-transform">
      {movie.poster_path ? (
        <Image
          src={tmdbImage(movie.poster_path, 'w342')}
          alt={movie.title}
          width={150}
          height={225}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
    <h3 className="text-sm font-medium truncate">{movie.title}</h3>
    <p className="text-xs text-gray-400">{movie.release_date?.split('-')[0]}</p>
  </Link>
);

export default function MoviePage() {
  const params = useParams();
  const id = params.id as string;
  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cast' | 'details' | 'platform'>('cast');
  const [mostPopular, setMostPopular] = useState(true);

  // Database-driven states
  const [contentStats, setContentStats] = useState({
    consume_count: 0,
    favorite_count: 0,
    review_count: 0,
    average_rating: 0
  });
  const [userRating, setUserRating] = useState<number>(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [reviews, setReviews] = useState<Array<{
    id: number;
    user_name: string;
    rating: number | null;
    review_text: string;
    created_at: string;
    like_count: number;
    reply_count: number;
    is_liked_by_current_user: boolean;
  }>>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [reviewReplies, setReviewReplies] = useState<Record<number, Array<{
    id: number;
    user_name: string;
    text: string;
    created_at: string;
    like_count: number;
    is_liked_by_current_user: boolean;
  }>>>({});
  
  // Handler functions
  const handleLikeReview = async (reviewId: number) => {
    try {
      const result = await toggleReviewLike(reviewId);
      if (result.data) {
        // Refresh reviews to get updated like counts
        loadDatabaseStats();
      }
    } catch (error) {
      console.error('Error liking review:', error);
    }
  };

  const handleReplyToReview = async (reviewId: number, text: string) => {
    try {
      const result = await addReviewReply(reviewId, text);
      if (result.data) {
        // Add reply to local state or refresh
        loadReplies(reviewId);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const loadReplies = async (reviewId: number) => {
    try {
      const { data: replies } = await getReviewReplies(reviewId);
      const mappedReplies = replies.map(reply => ({
        id: reply.id,
        user_name: reply.user_name,
        text: reply.text,
        created_at: reply.created_at,
        like_count: reply.like_count || 0,
        is_liked_by_current_user: reply.is_liked_by_current_user || false
      }));
      setReviewReplies(prev => ({
        ...prev,
        [reviewId]: mappedReplies
      }));
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const toggleRepliesVisibility = async (reviewId: number) => {
    const isExpanded = expandedReplies.has(reviewId);
    const newExpanded = new Set(expandedReplies);
    
    if (isExpanded) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
      // Load replies if not loaded yet
      if (!reviewReplies[reviewId]) {
        await loadReplies(reviewId);
      }
    }
    
    setExpandedReplies(newExpanded);
  };
  
  // Handler functions

  const loadDatabaseStats = useCallback(async () => {
    if (!id) return;
    
    try {
      // Get content statistics from database
      const { data: content } = await getContentById(Number(id));
      if (content) {
        setContentStats({
          consume_count: content.consume_count || 0,
          favorite_count: content.favorite_count || 0,
          review_count: content.review_count || 0,
          average_rating: content.average_rating || 0
        });
      }

      // Get user's rating for this content
      const { rating } = await getUserRating(Number(id));
      setUserRating(rating);

      // Get user's favorite status
      const { isFavorite } = await getUserFavoriteStatus(Number(id));
      setIsFavorited(isFavorite);

      // Get reviews for this content
      const { data: reviewsData } = await getContentReviews(Number(id));
      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      // Load movie details from TMDB
      getMovieDetails(id)
        .then(async (movieData) => {
          setMovie(movieData)
          
          // Save movie to database if it doesn't exist
          if (movieData) {
            await saveContentFromTMDB(movieData)
            // After saving to database, load database stats
            loadDatabaseStats()
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
        
      // Initial load of database stats
      loadDatabaseStats()
    }
  }, [id, loadDatabaseStats]);

  const handleWatchClick = async () => {
    if (!isWatched) {
      const result = await logMovieWatch(Number(id));
      if (result.data) {
        setIsWatched(true);
        // Refresh stats after logging watch
        loadDatabaseStats();
      }
    }
  };

  const handleFavoriteClick = async () => {
    const result = await toggleFavorite(Number(id));
    if (result.data) {
      setIsFavorited(result.isFavorite);
      // Refresh stats after toggling favorite
      loadDatabaseStats();
    }
  };

  const handleRating = async (rating: number) => {
    const result = await rateMovie(Number(id), rating);
    if (result.data) {
      setUserRating(rating);
      // Refresh stats after rating
      loadDatabaseStats();
    }
  };

  const handleAddReview = async () => {
    if (!reviewText.trim()) return;
    
    const result = await addReview(Number(id), reviewText.trim());
    if (result.data) {
      setReviewText('');
      setShowReviewForm(false);
      // Refresh reviews and stats after adding review
      loadDatabaseStats();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Film bulunamadı</h1>
          <p className="text-gray-400">Aradığınız film mevcut değil.</p>
        </div>
      </div>
    );
  }

  const mainCast = movie.credits?.cast?.slice(0, 8) || [];
  const similarMovies = movie.similar?.results?.slice(0, 10) || [];

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Movie Poster */}
          <div className="lg:col-span-1">
            <div className="aspect-[2/3] rounded-lg overflow-hidden">
              {movie.poster_path ? (
                <Image
                  src={tmdbImage(movie.poster_path, 'w500')}
                  alt={movie.title}
                  width={400}
                  height={600}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <svg className="w-24 h-24 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Movie Details */}
          <div className="lg:col-span-2">
            {/* Title and Year */}
            <div className="mb-4">
              <h1 className="text-3xl font-bold mb-2">{movie.title}</h1>
              <p className="text-gray-400 text-lg">{movie.release_date?.split('-')[0]}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-4 mb-6">
              <StarRating rating={contentStats.average_rating * 2} />
              <span className="text-2xl font-bold">{contentStats.average_rating.toFixed(1)}</span>
              <span className="text-gray-400">({contentStats.review_count} reviews)</span>
            </div>

            {/* Description */}
            <p className="text-gray-300 mb-6 leading-relaxed">{movie.overview}</p>

            {/* Stats */}
            <div className="flex items-center space-x-8 mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-400">{contentStats.consume_count}</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-400">{contentStats.favorite_count}</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-400">{contentStats.review_count}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <ActionButton
                icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>}
                label="Watch"
                active={isWatched}
                onClick={handleWatchClick}
              />
              <ActionButton
                icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/></svg>}
                label="Favorite"
                active={isFavorited}
                onClick={handleFavoriteClick}
              />
              <ActionButton
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>}
                label="Add to List"
                active={isInList}
                onClick={() => setIsInList(!isInList)}
              />
              <ActionButton
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>}
                label="Add Review"
                active={showReviewForm}
                onClick={() => setShowReviewForm(!showReviewForm)}
              />
            </div>

            {/* User Rating */}
            <div className="mb-8">
              <h3 className="font-medium mb-3">Your Rating</h3>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    className="hover:scale-110 transition-transform"
                  >
                    <svg 
                      className={`w-8 h-8 ${
                        star <= userRating 
                          ? 'text-yellow-400 fill-current' 
                          : 'text-gray-400'
                      }`} 
                      fill={star <= userRating ? 'currentColor' : 'none'}
                      stroke="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1} 
                        d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"
                      />
                    </svg>
                  </button>
                ))}
                <span className="ml-4 text-gray-400">
                  {userRating > 0 ? `${userRating}/5` : 'Not rated yet'}
                </span>
              </div>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="mb-8 p-4 bg-gray-800 rounded-lg">
                <h3 className="font-medium mb-3">Add Your Review</h3>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your thoughts about this movie..."
                  className="w-full p-3 bg-gray-700 text-white rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-400">
                    {reviewText.length}/500 characters
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewText('');
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddReview}
                      disabled={!reviewText.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Submit Review
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-700 mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('cast')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'cast'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Cast
                </button>
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('platform')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'platform'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Platform
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'cast' && (
              <div className="mb-8">
                <div className="flex space-x-4 overflow-x-auto pb-4">
                  {mainCast.map((member) => (
                    <CastMember key={member.id} member={member} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Runtime</h3>
                    <p className="text-gray-400">{movie.runtime ? `${movie.runtime} minutes` : 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Genres</h3>
                    <p className="text-gray-400">{movie.genres.map(g => g.name).join(', ')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Language</h3>
                    <p className="text-gray-400">{movie.original_language.toUpperCase()}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Budget</h3>
                    <p className="text-gray-400">{movie.budget ? `$${movie.budget.toLocaleString()}` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'platform' && (
              <div className="mb-8">
                <p className="text-gray-400">Platform information not available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Comments</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setMostPopular(true)}
                className={`text-sm ${mostPopular ? 'text-white font-medium' : 'text-gray-400'}`}
              >
                Most Popular
              </button>
              <button
                onClick={() => setMostPopular(false)}
                className={`text-sm ${!mostPopular ? 'text-white font-medium' : 'text-gray-400'}`}
              >
                Most Recent
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <Comment 
                  key={review.id}
                  review={review}
                  onLike={handleLikeReview}
                  onReply={handleReplyToReview}
                  onToggleReplies={toggleRepliesVisibility}
                  showReplies={expandedReplies.has(review.id)}
                  replies={reviewReplies[review.id] || []}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No reviews yet. Be the first to review this movie!</p>
            )}
          </div>
        </div>

        {/* Similar Movies Section */}
        {similarMovies.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Similar Movies</h2>
            <div className="flex space-x-4 overflow-x-auto pb-4">
              {similarMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
