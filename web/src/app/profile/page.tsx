'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { getUserWatchedMovies, getUserStats, Content, Review } from '@/services/movieLogs';
import { 
  getCurrentUserProfile, 
  AppUser, 
  getFollowData, 
  followUser, 
  unfollowUser,
  getFollowers,
  getFollowing,
} from '@/services/userService';
import { getReviewsByUserId, getActivityFeed } from '@/services/movieLogs';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabs from '@/components/profile/ProfileTabs';
import HomeTab from '@/components/profile/HomeTab';
import MoviesTab from '@/components/profile/MoviesTab';
import ReviewsTab from '@/components/profile/ReviewsTab';
import NetworkTab from '@/components/profile/NetworkTab';
import ActivityTab from '@/components/profile/ActivityTab';

export default function ProfilePage() {
  const { user } = useAuth();
  const [recentMovies, setRecentMovies] = useState<Content[]>([]);
  const [allWatchedMovies, setAllWatchedMovies] = useState<Content[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<Content[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [followers, setFollowers] = useState<AppUser[]>([]);
  const [following, setFollowing] = useState<AppUser[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Home');
  const [stats, setStats] = useState({
    totalMovies: 0,
    thisYearMovies: 0,
    averageRating: 0,
    reviewCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadUserData = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      // For now, we assume it's the user's own profile.
      // In a real app, you'd get the profile user's ID from the URL.
      const profileUserId = user.id;
      setIsOwnProfile(true); 

      try {
        if (isMounted) setLoading(true);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data loading timeout')), 10000)
        );
        
        const dataPromise = Promise.all([
          getCurrentUserProfile(),
          getUserWatchedMovies(), 
          getUserStats(),
          getFollowData(profileUserId),
          getReviewsByUserId(profileUserId),
          getFollowers(profileUserId),
          getFollowing(profileUserId),
          getActivityFeed(profileUserId)
        ]);

        const [
          userProfileResult, 
          watchedMoviesResult, 
          userStats,
          followData,
          reviewsResult,
          followersResult,
          followingResult,
          activityFeedResult
        ] = await Promise.race([dataPromise, timeoutPromise]) as any;

        if (!isMounted) return;

        if (userProfileResult?.data) {
          setAppUser(userProfileResult.data);
        }
        
        if (watchedMoviesResult?.data) {
          const latestPerMovie = [...watchedMoviesResult.data].sort((a, b) => {
            const ta = a.date ? new Date(a.date).getTime() : 0
            const tb = b.date ? new Date(b.date).getTime() : 0
            return tb - ta
          })
          setAllWatchedMovies(latestPerMovie);
          setRecentMovies(latestPerMovie.slice(0, 4));
          setFavoriteMovies(latestPerMovie.filter(m => m.is_favorite).slice(0, 5));
        }

        setStats(userStats);
        setFollowersCount(followData.followersCount);
        setFollowingCount(followData.followingCount);
        setIsFollowing(followData.isFollowing);
        setReviews(reviewsResult.data || []);
        setFollowers(followersResult.data || []);
        setFollowing(followingResult.data || []);
        setActivityFeed(activityFeedResult.data || []);
        
      } catch (error) {
        console.error('Profil verileri yüklenemedi:', error);
        if (isMounted && user) {
          setAppUser({
            auth_user_id: user.id,
            username: user.user_metadata?.username || user.email?.split('@')[0] || 'Kullanıcı',
            email: user.email || '',
            picture_path: null,
            bio: null,
            personality_analyze: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleFollow = async () => {
    if (!appUser) return;
    const { success } = await followUser(appUser.auth_user_id);
    if (success) {
      setIsFollowing(true);
      setFollowersCount(followersCount + 1);
    }
  };

  const handleUnfollow = async () => {
    if (!appUser) return;
    const { success } = await unfollowUser(appUser.auth_user_id);
    if (success) {
      setIsFollowing(false);
      setFollowersCount(followersCount - 1);
    }
  };

  const tabs = ['Home', 'Movies', 'Games', 'Books', 'Reviews', 'Lists', 'Network', 'Activity'];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profil sayfasını görüntülemek için giriş yapın</h2>
          <Link href="/auth/login" className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeTab recentMovies={recentMovies} favoriteMovies={favoriteMovies} stats={stats} />;
      case 'Movies':
        return <MoviesTab movies={allWatchedMovies} />;
      case 'Reviews':
        return <ReviewsTab reviews={reviews} />;
      case 'Network':
        return <NetworkTab followers={followers} following={following} />;
      case 'Activity':
        return <ActivityTab activities={activityFeed} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {user && appUser && (
        <ProfileHeader 
          user={user} 
          appUser={appUser}
          followersCount={followersCount}
          followingCount={followingCount}
          isFollowing={isFollowing}
          handleFollow={handleFollow}
          handleUnfollow={handleUnfollow}
          isOwnProfile={isOwnProfile}
        />
      )}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <ProfileTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}
