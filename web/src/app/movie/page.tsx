'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getMovieDetails, tmdbImage } from '@/services/tmdb';
import { TMDBMovieDetail, TMDBCastMember } from '@/types/tmdb';
import { 
  saveContentFromTMDB, 
  getContentById, 
  logMovieWatch, 
  removeMovieWatch, 
  isMovieWatched,
  addMovieReview,
  getMovieReviews,
  getUserMovieReview,
  rateMovie,
  getUserRating,
  getUserFavoriteStatus,
  toggleFavorite,
  Content,
  Review
} from '@/services/movieLogs';
import { useAuth } from '@/contexts/AuthContext';

// Star Rating Component (Display Only)
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

// Interactive Star Rating Component for User Input
const StarRatingInput = ({ 
  rating, 
  onRatingChange, 
  size = "w-6 h-6" 
}: { 
  rating: number; 
  onRatingChange: (rating: number) => void;
  size?: string;
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const handleStarClick = (starValue: number) => {
    onRatingChange(starValue);
  };
  
  const handleStarHover = (starValue: number) => {
    setHoverRating(starValue);
  };
  
  const handleMouseLeave = () => {
    setHoverRating(0);
  };
  
  const displayRating = hoverRating || rating;
  
  return (
    <div className="flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((starValue) => (
        <button
          key={starValue}
          type="button"
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => handleStarHover(starValue)}
          className="focus:outline-none transition-colors"
        >
          <svg 
            className={`${size} cursor-pointer transition-colors ${
              starValue <= displayRating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-400 hover:text-yellow-300'
            }`} 
            viewBox="0 0 20 20"
          >
            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
          </svg>
        </button>
      ))}
    </div>
  );
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

// Comment Component
const Comment = ({ user, rating, comment, date }: {
  user: string;
  rating: number;
  comment: string;
  date: string;
}) => (
  <div className="border-b border-gray-700 pb-4 mb-4 last:border-b-0">
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
        <span className="text-sm font-medium">{user[0].toUpperCase()}</span>
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">{user}</h4>
          <span className="text-sm text-gray-400">{date}</span>
        </div>
        <div className="flex items-center space-x-2 mb-2">
          <StarRating rating={rating} />
          <span className="text-sm text-gray-400">{rating.toFixed(1)}</span>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{comment}</p>
      </div>
    </div>
  </div>
);

// Movie Card Component for Similar Movies
const MovieCard = ({ movie }: { movie: any }) => (
  <Link href={`/movie?id=${movie.id}`} className="min-w-[150px] cursor-pointer group">
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

function MovieDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { user } = useAuth();
  
  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cast' | 'details' | 'platform'>('cast');
  const [mostPopular, setMostPopular] = useState(true);

  // User interaction states
  const [isWatched, setIsWatched] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInList, setIsInList] = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  
  // Rating states
  const [userRating, setUserRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  
  // Review states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<Review | null>(null);

  // Check if movie is watched when component mounts
  useEffect(() => {
    if (user && id) {
      const checkUserData = async () => {
        const movieId = Number(id);
        
        // Check watch status
        const { isWatched: watched } = await isMovieWatched(movieId);
        setIsWatched(watched);
        
        // Get user review
        const { data: review } = await getUserMovieReview(movieId);
        setUserReview(review);
        
        // Get user rating
        const { rating } = await getUserRating(movieId);
        setUserRating(rating);
        
        // Get favorite status
        const { isFavorite } = await getUserFavoriteStatus(movieId);
        setIsFavorite(isFavorite);
        
        // Get all reviews
        const { data: allReviews } = await getMovieReviews(movieId);
        setReviews(allReviews || []);
      };
      checkUserData();
    }
  }, [user, id]);

  useEffect(() => {
    if (!id) {
      router.push('/explore');
      return;
    }

    const fetchMovie = async () => {
      try {
        setLoading(true);
        
        // Önce Supabase'den kontrol et
        const { data: existingContent } = await getContentById(Number(id));
        
        if (existingContent) {
          // Supabase'de mevcut, direkt kullan
          setContent(existingContent);
          // TMDB'den cast ve ek bilgileri al
          const movieData = await getMovieDetails(id);
          setMovie(movieData);
        } else {
          // TMDB'den al ve Supabase'e kaydet
          const movieData = await getMovieDetails(id);
          setMovie(movieData);
          
          // Supabase'e kaydet
          const { data: savedContent } = await saveContentFromTMDB(movieData);
          setContent(savedContent);
        }
      } catch (error) {
        console.error('Film yüklenemedi:', error);
        router.push('/explore');
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id, router]);

  // Toggle watch status
  const toggleWatchStatus = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!id) return;

    setWatchLoading(true);
    try {
      if (isWatched) {
        const { success } = await removeMovieWatch(Number(id));
        if (success) {
          setIsWatched(false);
        }
      } else {
        const { data, error } = await logMovieWatch(Number(id));
        if (data && !error) {
          setIsWatched(true);
        }
      }
    } catch (error) {
      console.error('Watch status update failed:', error);
    } finally {
      setWatchLoading(false);
    }
  };

  // Handle rating change
  const handleRatingChange = async (newRating: number) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!id) return;

    setRatingLoading(true);
    try {
      const { data, error } = await rateMovie(Number(id), newRating);
      if (data && !error) {
        setUserRating(newRating);
      }
    } catch (error) {
      console.error('Rating error:', error);
    } finally {
      setRatingLoading(false);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!id) return;

    setFavoriteLoading(true);
    try {
      const { data, isFavorite: newFavoriteStatus, error } = await toggleFavorite(Number(id));
      if (data && !error) {
        setIsFavorite(newFavoriteStatus);
      }
    } catch (error) {
      console.error('Favorite toggle error:', error);
    } finally {
      setFavoriteLoading(false);
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

  // Mock data for comments
  const comments = [
    {
      user: "ballamyus",
      rating: 8.0,
      comment: "great galaxy road trip. cool movie",
      date: "3 months ago"
    },
    {
      user: "J",
      rating: 9.0,
      comment: "A family road trip movie in which we never quite know where this film is heading and are often led to doubt why. 'Hit the Road' may be set amidst the unfolding desert highways and gorgeous cinematic visions of mountainous Iran, but it both literally and figuratively pushes boundaries like 'Little Miss Sunshine'. Sure, there might not have been a major 'detour' away from our mortal coil at some point along the way. 'Where are we?' The story behind most Kurdish Palestinian exile into the caverns and mountains of their ancestral homeland. While the elder son, well-played, first takes place. 'We're dead, socializes this youngster at her two sons though Royan Ghorishi from his back seat. 'Hi six year-old boy.'",
      date: "1 year ago"
    },
    {
      user: "metallcad",
      rating: 6.0,
      comment: "Four one of my fav films. Layer one of the best songs of all time. This little dry, hits my heart. About the way film weaves the outer films involves. All is good except one think of my parents journey.",
      date: "2 years ago"
    }
  ];

  const mainCast = movie.credits?.cast?.slice(0, 8) || [];
  const similarMovies = movie.similar?.results?.slice(0, 10) || [];

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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <StarRating rating={movie.vote_average} />
                <span className="text-2xl font-bold">{movie.vote_average.toFixed(1)}</span>
                <span className="text-gray-400">TMDB</span>
              </div>
            </div>

            {/* User Rating */}
            {user && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Puanın</h3>
                <div className="flex items-center space-x-3">
                  {ratingLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-400">Kaydediliyor...</span>
                    </div>
                  ) : (
                    <>
                      <StarRatingInput 
                        rating={userRating} 
                        onRatingChange={handleRatingChange}
                        size="w-8 h-8"
                      />
                      {userRating > 0 && (
                        <span className="text-yellow-400 font-semibold">
                          {userRating}/5
                        </span>
                      )}
                      <span className="text-gray-400 text-sm">
                        {userRating > 0 ? 'Puanın kaydedildi' : 'Puan vermek için yıldızlara tıkla'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <p className="text-gray-300 mb-6 leading-relaxed">{movie.overview}</p>

            {/* Stats */}
            <div className="flex items-center space-x-8 mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-400">{Math.floor(movie.popularity)}k</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-400">{movie.vote_count}</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                </svg>
                <span className="text-gray-400">{comments.length}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <ActionButton
                icon={watchLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                )}
                label={isWatched ? "İzlendi ✓" : "İzlendi olarak işaretle"}
                active={isWatched}
                onClick={toggleWatchStatus}
              />
              <ActionButton
                icon={favoriteLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 20 20">
                    <path strokeWidth={isFavorite ? 0 : 2} fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                  </svg>
                )}
                label={isFavorite ? "Favorilerden Çıkar" : "Favoriye Ekle"}
                active={isFavorite}
                onClick={handleToggleFavorite}
              />
              <ActionButton
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>}
                label="Listeye Ekle"
                active={isInList}
                onClick={() => setIsInList(!isInList)}
              />
            </div>

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
            {comments.map((comment, index) => (
              <Comment key={index} {...comment} />
            ))}
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

export default function MoviePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <MovieDetailContent />
    </div>
  );
}
