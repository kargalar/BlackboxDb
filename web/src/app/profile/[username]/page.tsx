'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getUserWatchedMovies, getUserStats, Content, Review } from '@/services/movieLogs';
import { 
  getCurrentUserProfile, 
  getUserByUsername,
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

export default function UserProfilePage() {
  const { user } = useAuth();
  const params = useParams();
  const username = params.username as string;
  
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
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [profileNotFound, setProfileNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadUserData = async () => {
      if (!username) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) setLoading(true);
        setProfileNotFound(false);
        
        // Get the profile user by username
        const userProfileResult = await getUserByUsername(username);
        
        if (!userProfileResult.data) {
          setProfileNotFound(true);
          if (isMounted) setLoading(false);
          return;
        }

        const profileUser = userProfileResult.data;
        setAppUser(profileUser);
        
        // Get current user's profile if logged in
        let currentProfile = null;
        if (user) {
          const currentUserResult = await getCurrentUserProfile();
          if (currentUserResult.data) {
            currentProfile = currentUserResult.data;
            setCurrentUserProfile(currentProfile);
            setIsOwnProfile(currentProfile.auth_user_id === profileUser.auth_user_id);
          }
        }

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data loading timeout')), 10000)
        );
        
        const dataPromise = Promise.all([
          getUserWatchedMovies(profileUser.auth_user_id), 
          getUserStats(profileUser.auth_user_id),
          user ? getFollowData(profileUser.auth_user_id) : Promise.resolve({ followersCount: 0, followingCount: 0, isFollowing: false }),
          getReviewsByUserId(profileUser.auth_user_id),
          getFollowers(profileUser.auth_user_id),
          getFollowing(profileUser.auth_user_id),
          getActivityFeed(profileUser.auth_user_id)
        ]);

        const [
          watchedMoviesResult, 
          userStats,
          followData,
          reviewsResult,
          followersResult,
          followingResult,
          activityFeedResult
        ] = await Promise.race([dataPromise, timeoutPromise]) as any;

        if (!isMounted) return;
        
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
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();
    
    return () => {
      isMounted = false;
    };
  }, [user, username]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
      </div>
    );
  }

  if (profileNotFound) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Kullanıcı bulunamadı</h2>
          <p className="text-gray-400 mb-6">"{username}" kullanıcı adına sahip bir profil bulunamadı.</p>
          <Link href="/explore" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
            Keşfet'e Dön
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwnProfile && !user) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Profilleri görüntülemek için giriş yapın</h2>
          <Link href="/auth/login" className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors">
            Giriş Yap
          </Link>
        </div>
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
      {appUser && (
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
