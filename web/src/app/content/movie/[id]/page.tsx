'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getMovieDetails, tmdbImage } from '@/services/tmdb';
import { getContentById, logMovieWatch, toggleFavorite, rateMovie, getContentReviews, saveContentFromTMDB, addReview, toggleReviewLike, addReviewReply, getReviewReplies, getUserContentLogs, updateUserContentLogById, deleteUserContentLogById, getUserContentLog, updateUserContentLog } from '@/services/movieLogs';
import { supabase } from '@/lib/supabase';
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
  <Link href={`/person/${member.id}`} className="flex flex-col items-center min-w-[120px] hover:scale-105 transition-transform cursor-pointer">
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
    <p className="text-sm font-medium text-center hover:text-blue-400 transition-colors">{member.name}</p>
    <p className="text-xs text-gray-400 text-center">{member.character}</p>
  </Link>
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
  
  // Edit log modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [userLogs, setUserLogs] = useState<Array<{
    id: number;
    user_id: string;
    content_id: number;
    content_status_id: number;
    rating: number | null;
    is_favorite: boolean;
    is_consume_later: boolean;
    review_id: number | null;
    date: string;
    updated_at: string;
  }>>([]);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [editLogData, setEditLogData] = useState({
    rating: 0,
    isFavorite: false,
    isConsumeLater: false,
    watchDate: '',
    hasWatched: false
  });
  const [showLogForm, setShowLogForm] = useState(false);
  const [newLogReviewText, setNewLogReviewText] = useState('');
  
  const handleWatchlistClick = async () => {
    try {
      // Optimistic toggle consume_later status
      const { data: currentLog } = await getUserContentLog(Number(id));
      const prev = !!currentLog?.is_consume_later;
      const next = !prev;
      setIsInList(next);

      const result = await updateUserContentLog(Number(id), {
        is_consume_later: next,
        content_status_id: 2, // CONSUME_LATER
        date: new Date().toISOString()
      });
      
      if (!result.data) {
        // rollback
        setIsInList(prev);
      }
      // refresh in background
      loadDatabaseStats();
    } catch (error) {
      console.error('Error toggling watchlist:', error);
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

  const handleLikeReview = async (reviewId: number) => {
    try {
      // Optimistic like toggle on local reviews state
      setReviews((prev) => prev.map(r => {
        if (r.id !== reviewId) return r;
        const nextLiked = !r.is_liked_by_current_user;
        return {
          ...r,
          is_liked_by_current_user: nextLiked,
          like_count: Math.max(0, (r.like_count || 0) + (nextLiked ? 1 : -1))
        };
      }));

      const result = await toggleReviewLike(reviewId);
      if (!result.data) {
        // rollback
        setReviews((prev) => prev.map(r => {
          if (r.id !== reviewId) return r;
          const prevLiked = r.is_liked_by_current_user;
          const nextLiked = !prevLiked;
          return {
            ...r,
            is_liked_by_current_user: nextLiked,
            like_count: Math.max(0, (r.like_count || 0) + (nextLiked ? 1 : -1))
          };
        }));
      }
    } catch (error) {
      console.error('Error liking review:', error);
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

  // Edit log handlers
  const handleOpenEditModal = async () => {
    try {
      const { data: logs } = await getUserContentLogs(Number(id));
      setUserLogs(logs);
      
      // Always start with log selection view, never auto-open the form
      setShowLogForm(false);
      setSelectedLogId(null);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading user logs:', error);
    }
  };

  const handleSelectLog = (log: any) => {
    setSelectedLogId(log.id);
    setEditLogData({
      rating: log.rating || 0,
      isFavorite: log.is_favorite || false,
      isConsumeLater: log.is_consume_later || false,
      watchDate: log.date ? new Date(log.date).toISOString().split('T')[0] : '',
      hasWatched: log.content_status_id === 1
    });
  setNewLogReviewText('');
    setShowLogForm(true);
  };

  const handleCreateNewLog = () => {
    setSelectedLogId(null);
    setEditLogData({
      rating: 0,
      isFavorite: false,
      isConsumeLater: false,
      watchDate: new Date().toISOString().split('T')[0],
      hasWatched: false
    });
  setNewLogReviewText('');
    setShowLogForm(true);
  };

  const handleSaveEditLog = async () => {
    try {
      const updates = {
        rating: editLogData.rating || null,
        is_favorite: editLogData.isFavorite,
        is_consume_later: editLogData.isConsumeLater,
        content_status_id: editLogData.hasWatched ? 1 : 2, // 1 = CONSUMED, 2 = CONSUME_LATER
        date: editLogData.watchDate ? new Date(editLogData.watchDate).toISOString() : new Date().toISOString()
      };

      let result;
      if (selectedLogId) {
        // Update existing log
        result = await updateUserContentLogById(selectedLogId, updates);
      } else {
        // Create new log (optionally with a review) as a single snapshot
        const { data: userRes } = await supabase.auth.getUser();
        if (userRes.user?.id) {
          let reviewId: number | null = null;
          const reviewTextToSave = newLogReviewText.trim();
          if (reviewTextToSave) {
            // Create review first
            const { data: reviewIns, error: reviewErr } = await supabase
              .from('review')
              .insert({
                user_id: userRes.user.id,
                content_id: Number(id),
                text: reviewTextToSave,
                created_at: new Date().toISOString()
              })
              .select('id')
              .single();
            if (reviewErr) {
              result = { data: false, error: reviewErr };
            } else {
              reviewId = reviewIns?.id ?? null;
            }
          }

          if (result?.data === false && result.error) {
            // review insert failed; stop here
          } else {
            const { error } = await supabase
              .from('user_content_log')
              .insert({
                user_id: userRes.user.id,
                content_id: Number(id),
                review_id: reviewId,
                ...updates
              });
            result = { data: !error, error };
          }
        } else {
          result = { data: false, error: 'not_authenticated' };
        }
      }
      
      if (result.data) {
  setShowEditModal(false);
  setShowLogForm(false);
  setNewLogReviewText('');
        // Refresh UI state with latest log data
        const { data: logs } = await getUserContentLogs(Number(id));
        if (logs.length > 0) {
          const latestLog = logs[0]; // Most recent log
          setUserRating(latestLog.rating || 0);
          setIsFavorited(latestLog.is_favorite || false);
          setIsWatched(latestLog.content_status_id === 1);
        }
        // Refresh database stats
        loadDatabaseStats();
      }
    } catch (error) {
      console.error('Error saving log:', error);
    }
  };

  const handleDeleteLog = async () => {
    try {
      if (!selectedLogId) return;
      
      const result = await deleteUserContentLogById(selectedLogId);
      
      if (result.data) {
        setShowEditModal(false);
        setShowLogForm(false);
        // Refresh UI state - check remaining logs
        const { data: logs } = await getUserContentLogs(Number(id));
        if (logs.length > 0) {
          const latestLog = logs[0];
          setUserRating(latestLog.rating || 0);
          setIsFavorited(latestLog.is_favorite || false);
          setIsWatched(latestLog.content_status_id === 1);
        } else {
          // No logs remaining, reset state
          setUserRating(0);
          setIsFavorited(false);
          setIsWatched(false);
        }
        // Refresh database stats
        loadDatabaseStats();
      }
    } catch (error) {
      console.error('Error deleting log:', error);
    }
  };
  
  // Handler functions

  const loadDatabaseStats = useCallback(async () => {
    if (!id) return;
    
    try {
      const contentId = Number(id);
      // Fetch content stats, user latest log, and reviews in parallel
      const [{ data: content }, { data: currentLog }, { data: reviewsData }] = await Promise.all([
        getContentById(contentId),
        getUserContentLog(contentId),
        getContentReviews(contentId),
      ]);

      if (content) {
        setContentStats({
          consume_count: content.consume_count || 0,
          favorite_count: content.favorite_count || 0,
          review_count: content.review_count || 0,
          average_rating: content.average_rating || 0,
        });
      }

      if (currentLog) {
        setIsWatched(currentLog.content_status_id === 1);
        setIsInList(!!currentLog.is_consume_later);
        setIsFavorited(!!currentLog.is_favorite);
        setUserRating(currentLog.rating || 0);
      } else {
        setIsWatched(false);
        setIsInList(false);
        setIsFavorited(false);
        setUserRating(0);
      }

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let canceled = false;

    (async () => {
      try {
        setLoading(true);
        const movieData = await getMovieDetails(id);
        if (canceled) return;
        setMovie(movieData);
        if (movieData) {
          // Save content, then load DB stats once
          await saveContentFromTMDB(movieData);
        }
        if (!canceled) {
          await loadDatabaseStats();
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [id, loadDatabaseStats]);

  const handleWatchClick = async () => {
    try {
      const contentId = Number(id);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) return;

      const prevWatched = isWatched;
      const prevRating = userRating;
      const prevConsume = contentStats.consume_count;
      const prevInList = isInList;

      if (!prevWatched) {
        // Optimistic: mark as watched immediately
        setIsWatched(true);
        setIsInList(false);
        setContentStats((s) => ({ ...s, consume_count: (s.consume_count || 0) + 1 }));

        const { error } = await supabase.from('user_content_log').insert({
          user_id: userRes.user.id,
          content_id: contentId,
          content_status_id: 1,
          rating: prevRating || null,
          is_favorite: isFavorited,
          is_consume_later: false, // marking watched clears watchlist
          date: new Date().toISOString(),
        });
        if (error) {
          // Rollback
          setIsWatched(prevWatched);
          setIsInList(prevInList);
          setContentStats((s) => ({ ...s, consume_count: prevConsume }));
        }
      } else {
        // Optimistic: unwatch immediately; keep watchlist as-is and clear rating
        setIsWatched(false);
        setUserRating(0);
        setContentStats((s) => ({ ...s, consume_count: Math.max(0, (s.consume_count || 0) - 1) }));

        const { error } = await supabase.from('user_content_log').insert({
          user_id: userRes.user.id,
          content_id: contentId,
          content_status_id: 2,
          rating: null,
          is_favorite: isFavorited,
          is_consume_later: prevInList, // do not auto-add to watchlist
          date: new Date().toISOString(),
        });
        if (error) {
          // Rollback
          setIsWatched(prevWatched);
          setUserRating(prevRating);
          setContentStats((s) => ({ ...s, consume_count: prevConsume }));
        }
      }

      // Fire and forget refresh
      loadDatabaseStats();
    } catch (e) {
      console.error('Error toggling watch:', e);
    }
  };

  const handleFavoriteClick = async () => {
    // Optimistic update
    const prevFav = isFavorited;
    const prevFavCount = contentStats.favorite_count;
    const nextFav = !prevFav;
    setIsFavorited(nextFav);
    setContentStats((s) => ({
      ...s,
      favorite_count: Math.max(0, (s.favorite_count || 0) + (nextFav ? 1 : -1)),
    }));
    try {
      const contentId = Number(id);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) throw new Error('not_authenticated');
      // Write snapshot using current UI state (no prefetch)
      const { error } = await supabase.from('user_content_log').insert({
        user_id: userRes.user.id,
        content_id: contentId,
        content_status_id: isWatched ? 1 : 2,
        rating: isWatched ? (userRating || null) : null,
        is_favorite: nextFav,
        is_consume_later: !isWatched ? isInList : false,
        date: new Date().toISOString(),
      });
      if (error) {
        setIsFavorited(prevFav);
        setContentStats((s) => ({ ...s, favorite_count: prevFavCount }));
      }
      loadDatabaseStats();
    } catch (e) {
      setIsFavorited(prevFav);
      setContentStats((s) => ({ ...s, favorite_count: prevFavCount }));
    }
  };

  const handleRating = async (rating: number) => {
    // Optimistic update
    const prev = userRating;
    const wasWatched = isWatched;
    const prevConsume = contentStats.consume_count;
    setUserRating(rating);
    setIsWatched(true);
    setIsInList(false);
    if (!wasWatched) {
      setContentStats((s) => ({ ...s, consume_count: (s.consume_count || 0) + 1 }));
    }
    try {
      const result = await rateMovie(Number(id), rating);
      if (!result.data) {
        setUserRating(prev);
        setIsWatched(wasWatched);
        if (!wasWatched) setContentStats((s) => ({ ...s, consume_count: prevConsume }));
      }
      loadDatabaseStats();
    } catch (e) {
      setUserRating(prev);
      setIsWatched(wasWatched);
      if (!wasWatched) setContentStats((s) => ({ ...s, consume_count: prevConsume }));
    }
  };

  const handleAddReview = async () => {
    if (!reviewText.trim()) return;
    const prevCount = contentStats.review_count;
    setContentStats((s) => ({ ...s, review_count: (s.review_count || 0) + 1 }));
    const result = await addReview(Number(id), reviewText.trim());
    if (result.data) {
      setReviewText('');
      setShowReviewForm(false);
      loadDatabaseStats();
    } else {
      setContentStats((s) => ({ ...s, review_count: prevCount }));
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
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>}
                label="Add to Watchlist"
                active={isInList}
                onClick={handleWatchlistClick}
              />
              <ActionButton
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>}
                label="Add to List"
                active={false}
                onClick={() => {/* Future feature */}}
              />
              <ActionButton
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>}
                label="Add Review"
                active={showReviewForm}
                onClick={() => setShowReviewForm(!showReviewForm)}
              />
              <ActionButton
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>}
                label="Edit Log"
                active={false}
                onClick={handleOpenEditModal}
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

      {/* Edit Log Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {showLogForm ? 'Edit Log' : 'Select a Log to Edit'}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setShowLogForm(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!showLogForm ? (
              /* Log Selection View */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-300">You have {userLogs.length} log(s) for this movie:</p>
                  <button
                    onClick={handleCreateNewLog}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    Add New Log
                  </button>
                </div>
                
                {userLogs.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No logs found. Click "Add New Log" to create one.</p>
                ) : (
                  <div className="space-y-2">
                    {userLogs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => handleSelectLog(log)}
                        className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm text-gray-400">
                                {new Date(log.date).toLocaleDateString()}
                              </span>
                              {log.content_status_id === 1 ? (
                                <span className="px-2 py-1 bg-green-600 text-xs rounded">Watched</span>
                              ) : (
                                <span className="px-2 py-1 bg-blue-600 text-xs rounded">Want to Watch</span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm">
                              {log.rating && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                  </svg>
                                  <span className="text-gray-300">{log.rating}</span>
                                </div>
                              )}
                              
                              {log.is_favorite && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                                  </svg>
                                  <span className="text-gray-300">Favorite</span>
                                </div>
                              )}
                              
                              {log.review_id && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                                  </svg>
                                  <span className="text-gray-300">Review</span>
                                </div>
                              )}
                              
                              {log.is_consume_later && (
                                <div className="flex items-center space-x-1">
                                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                                  </svg>
                                  <span className="text-gray-300">Watchlist</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Log Edit Form */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowLogForm(false)}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                    </svg>
                    <span>Back to logs</span>
                  </button>
                  
                  {selectedLogId && (
                    <span className="text-sm text-gray-400">
                      Editing log from {userLogs.find(l => l.id === selectedLogId)?.date ? 
                        new Date(userLogs.find(l => l.id === selectedLogId)!.date).toLocaleDateString() : ''}
                    </span>
                  )}
                </div>

        {/* Watch Status */}
                <div>
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={editLogData.hasWatched}
          onChange={(e) => setEditLogData(prev => ({ ...prev, hasWatched: e.target.checked, rating: e.target.checked ? prev.rating : 0 }))}
                      className="mr-2"
                    />
                    Watched this movie
                  </label>
                </div>

                {/* Watch Date */}
                {editLogData.hasWatched && (
                  <div>
                    <label className="block text-white mb-2">Watch Date</label>
                    <input
                      type="date"
                      value={editLogData.watchDate}
                      onChange={(e) => setEditLogData(prev => ({ ...prev, watchDate: e.target.value }))}
                      className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Rating */}
                {editLogData.hasWatched && (
                  <div>
                    <label className="block text-white mb-2">Your Rating (1-5 stars)</label>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setEditLogData(prev => ({ ...prev, rating: star }))}
                          className={`w-8 h-8 ${
                            star <= editLogData.rating
                              ? 'text-yellow-400'
                              : 'text-gray-400 hover:text-yellow-200'
                          } transition-colors`}
                        >
                          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        </button>
                      ))}
                      {editLogData.rating > 0 && (
                        <button
                          onClick={() => setEditLogData(prev => ({ ...prev, rating: 0 }))}
                          className="ml-2 text-sm text-gray-400 hover:text-white"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Favorite */}
                <div>
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={editLogData.isFavorite}
                      onChange={(e) => setEditLogData(prev => ({ ...prev, isFavorite: e.target.checked }))}
                      className="mr-2"
                    />
                    Add to favorites
                  </label>
                </div>

                {/* Consume Later */}
                <div>
                  <label className="flex items-center text-white">
                    <input
                      type="checkbox"
                      checked={editLogData.isConsumeLater}
                      onChange={(e) => setEditLogData(prev => ({ ...prev, isConsumeLater: e.target.checked }))}
                      className="mr-2"
                    />
                    Watch later
                  </label>
                </div>

                {/* Review (only when creating a new log) */}
                {!selectedLogId && (
                  <div>
                    <label className="block text-white mb-2">Review (optional)</label>
                    <textarea
                      value={newLogReviewText}
                      onChange={(e) => setNewLogReviewText(e.target.value)}
                      placeholder="Share your thoughts..."
                      className="w-full p-3 bg-gray-700 text-white rounded-lg resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={500}
                    />
                    <div className="text-xs text-gray-400 text-right">{newLogReviewText.length}/500</div>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-between mt-6">
                  {selectedLogId && (
                    <button
                      onClick={handleDeleteLog}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Delete Log
                    </button>
                  )}
                  <div className="flex space-x-3 ml-auto">
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setShowLogForm(false);
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEditLog}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      {selectedLogId ? 'Save Changes' : 'Create Log'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
