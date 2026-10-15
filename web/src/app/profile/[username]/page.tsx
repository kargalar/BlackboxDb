'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileCache } from '@/contexts/ProfileCacheContext';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePageTitle } from '@/hooks/usePageTitle';
import { buildProfilePageTitle } from '@/lib/page-title';
import {
  getUserWatchedContent,
  getUserFavoriteContent,
  getUserFeaturedContent,
  getUserStats,
} from '@/services/database/contentService';
import { fetchUserFavoritePeople, PersonData } from '@/services/graphql/person';
import { UserStats, Content } from '@/services/graphql/content';
import {
  getCurrentUserProfile,
  getUserByUsername,
  AppUser,
  getFollowData,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '@/services/database/userService';
import { getActivityFeed, getIncomingActivityFeed } from '@/services/userContentService';
import ProfileHeader from '@/components/organisms/profile/ProfileHeader';
import ProfileTabs from '@/components/organisms/profile/ProfileTabs';
import HomeTab from '@/components/organisms/profile/HomeTab';
import ContentTab from '@/components/organisms/profile/ContentTab';
import NetworkTab from '@/components/organisms/profile/NetworkTab';
import ActivityTab from '@/components/organisms/profile/ActivityTab';
import ListsTab from '@/components/organisms/profile/ListsTab';
import StatsTab from '@/components/organisms/profile/StatsTab';
import DiscussionsTab from '@/components/organisms/profile/DiscussionsTab';
import ReviewsTab from '@/components/organisms/profile/ReviewsTab';
import ContributionsTab from '@/components/organisms/profile/ContributionsTab';
import { logApiRequest } from '@/lib/requestLogger';
import { useTranslations } from 'next-intl';

const VALID_TABS = [
  'Home',
  'Movies',
  'TV',
  'Games',
  'Books',
  'Stats',
  'Lists',
  'Reviews',
  'Discussions',
  'Network',
  'Activity',
  'Contributions',
];
const TAB_SLUG_MAP: Record<string, string> = Object.fromEntries(
  VALID_TABS.map((t) => [t.toLowerCase(), t])
);
const HOME_ACTIVITY_ITEMS_PER_TYPE = 10;
const HOME_MOVIE_ACTIVITY_ITEMS = 15;
const HOME_ACTIVITY_FEED_LIMIT = 60;
const ACTIVITY_TAB_FEED_LIMIT = 500;
const WIDE_CONTENT_TABS = new Set(['Movies', 'TV', 'Games', 'Books']);

export default function UserProfilePage() {
  const t = useTranslations('ProfilePage');
  const tTabs = useTranslations('ProfileTabs');
  const { user } = useAuth();
  const { settings } = useGlobalSettings();
  const { getProfileData, setProfileData, isDataFresh } = useProfileCache();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const username = decodeURIComponent(params.username as string);

  // State - Using 'any' for content arrays because adapter adds snake_case fields
  const [allWatchedMovies, setAllWatchedMovies] = useState<any[]>([]);
  const [allWatchedTV, setAllWatchedTV] = useState<any[]>([]);
  const [allWatchedGames, setAllWatchedGames] = useState<any[]>([]);
  const [allWatchedBooks, setAllWatchedBooks] = useState<any[]>([]);
  const [favoriteMovies, setFavoriteMovies] = useState<any[]>([]);
  const [favoriteTV, setFavoriteTV] = useState<any[]>([]);
  const [favoriteGames, setFavoriteGames] = useState<any[]>([]);
  const [favoriteBooks, setFavoriteBooks] = useState<any[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<any[]>([]);
  const [featuredTV, setFeaturedTV] = useState<any[]>([]);
  const [featuredGames, setFeaturedGames] = useState<any[]>([]);
  const [featuredBooks, setFeaturedBooks] = useState<any[]>([]);
  const [favoritePeople, setFavoritePeople] = useState<PersonData[]>([]);
  const [followers, setFollowers] = useState<AppUser[]>([]);
  const [following, setFollowing] = useState<AppUser[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [incomingActivityFeed, setIncomingActivityFeed] = useState<any[]>([]);
  const [activityFeedLimit, setActivityFeedLimit] = useState(0);
  const [incomingActivityFeedLimit, setIncomingActivityFeedLimit] = useState(0);
  const [activitySubTab, setActivitySubTab] = useState<'user' | 'others'>('user');

  // Helper to check if an item qualifies for the "recent" section
  // (consumed, has rating, or currently continuing)
  const isRecentItem = (item: any) => {
    const isConsumed = Boolean(item?.isConsumed ?? item?.is_consumed);
    const rating = Number(item?.userRating ?? item?.user_rating ?? item?.rating ?? 0);
    const isContinuing = Boolean(item?.isContinuing ?? item?.is_continuing);
    return isConsumed || rating > 0 || isContinuing;
  };

  // Derived arrays for recent content — each type from its own watched array
  // (avoids the shared 60-item activity feed limit that starved less-active types)
  const recentMovies = allWatchedMovies.filter(isRecentItem).slice(0, HOME_MOVIE_ACTIVITY_ITEMS);
  const recentTv = allWatchedTV.filter(isRecentItem).slice(0, HOME_ACTIVITY_ITEMS_PER_TYPE);
  const recentGames = allWatchedGames.filter(isRecentItem).slice(0, HOME_ACTIVITY_ITEMS_PER_TYPE);
  const recentBooks = allWatchedBooks.filter(isRecentItem).slice(0, HOME_ACTIVITY_ITEMS_PER_TYPE);

  // Sync active tab with URL search params
  const tabFromUrl = searchParams.get('tab');
  const resolvedTab = tabFromUrl ? TAB_SLUG_MAP[tabFromUrl.toLowerCase()] || 'Home' : 'Home';
  const [activeTab, setActiveTabState] = useState(resolvedTab);

  // Update activeTab when URL changes (e.g. browser back/forward)
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const resolved = urlTab ? TAB_SLUG_MAP[urlTab.toLowerCase()] || 'Home' : 'Home';
    setActiveTabState(resolved);
  }, [searchParams]);

  // Wrapper that updates both state and URL
  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      const newParams = new URLSearchParams(searchParams.toString());
      if (tab === 'Home') {
        newParams.delete('tab');
      } else {
        newParams.set('tab', tab.toLowerCase());
      }
      const paramString = newParams.toString();
      router.replace(
        `/profile/${encodeURIComponent(username)}${paramString ? `?${paramString}` : ''}`,
        { scroll: false }
      );
    },
    [searchParams, router, username]
  );
  const [stats, setStats] = useState({
    totalMovies: 0,
    thisYearMovies: 0,
    averageRating: 0,
    discussionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<AppUser | null>(null);
  const [tabLoading, setTabLoading] = useState<{ [key: string]: boolean }>({
    Home: false,
    Movies: false,
    TV: false,
    Games: false,
    Books: false,
    Stats: false,
    Network: false,
    Activity: false,
    Interactions: false,
  });

  const handleMovieUpdate = useCallback((movieId: number, updates: Partial<Content>) => {
    console.log('🎬 Updating movie:', movieId, updates);
    setAllWatchedMovies((prevMovies) =>
      prevMovies.map((movie) => (movie.id === movieId ? { ...movie, ...updates } : movie))
    );
    // No need to update recentMovies directly as it's derived from activityFeed
    setFavoriteMovies((prevMovies) =>
      prevMovies.map((movie) => (movie.id === movieId ? { ...movie, ...updates } : movie))
    );
  }, []);

  const handleTvUpdate = useCallback((tvId: number, updates: Partial<Content>) => {
    console.log('📺 Updating TV:', tvId, updates);
    setAllWatchedTV((prevTV) => prevTV.map((tv) => (tv.id === tvId ? { ...tv, ...updates } : tv)));
    // No need to update recentTV directly as it's derived from activityFeed
    setFavoriteTV((prevTV) => prevTV.map((tv) => (tv.id === tvId ? { ...tv, ...updates } : tv)));
  }, []);

  const handleGameUpdate = useCallback((gameId: number, updates: Partial<Content>) => {
    console.log('🎮 Updating Game:', gameId, updates);
    setAllWatchedGames((prevGames) =>
      prevGames.map((game) => (game.id === gameId ? { ...game, ...updates } : game))
    );
    // No need to update recentGames directly as it's derived from activityFeed
    setFavoriteGames((prevGames) =>
      prevGames.map((game) => (game.id === gameId ? { ...game, ...updates } : game))
    );
  }, []);

  const handleBookUpdate = useCallback((bookId: number, updates: Partial<Content>) => {
    console.log('📚 Updating Book:', bookId, updates);
    setAllWatchedBooks((prevBooks) =>
      prevBooks.map((book) => (book.id === bookId ? { ...book, ...updates } : book))
    );
    // No need to update recentBooks directly as it's derived from activityFeed
    setFavoriteBooks((prevBooks) =>
      prevBooks.map((book) => (book.id === bookId ? { ...book, ...updates } : book))
    );
  }, []);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [profileNotFound, setProfileNotFound] = useState(false);
  usePageTitle(buildProfilePageTitle(appUser?.username || username, activeTab));

  const handleFollow = useCallback(async () => {
    if (!user || !appUser?.username) return;
    try {
      await followUser(appUser.username);
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  }, [user, appUser?.username]);

  const handleUnfollow = useCallback(async () => {
    if (!user || !appUser?.username) return;
    try {
      await unfollowUser(appUser.username);
      setIsFollowing(false);
      setFollowersCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  }, [user, appUser?.username]);

  const loadFromCache = useCallback((cachedData: any) => {
    setAppUser(cachedData.appUser);
    // recentMovies, recentTV, etc. are now derived from activityFeed
    setAllWatchedMovies(cachedData.allWatchedMovies);
    setAllWatchedTV(cachedData.allWatchedTV || []);
    setAllWatchedGames(cachedData.allWatchedGames || []);
    setAllWatchedBooks(cachedData.allWatchedBooks || []);
    setFavoriteMovies(cachedData.favoriteMovies || []);
    setFavoriteTV(cachedData.favoriteTV || []);
    setFavoriteGames(cachedData.favoriteGames || []);
    setFavoriteBooks(cachedData.favoriteBooks || []);
    setFollowers(cachedData.followers);
    setFollowing(cachedData.following);
    setActivityFeed(cachedData.activityFeed);
    setActivityFeedLimit(cachedData.activityFeed?.length > 0 ? HOME_ACTIVITY_FEED_LIMIT : 0);
    setStats(cachedData.stats);
    setFollowersCount(cachedData.followersCount);
    setFollowingCount(cachedData.followingCount);
    setIsFollowing(cachedData.isFollowing);
    setLoading(false);
  }, []);

  // Home tab için veri yükleme - optimized to avoid multiple auth calls
  const loadHomeData = useCallback(
    async (profileUser: AppUser, authenticatedUserId: string | null = null) => {
      try {
        console.log(
          `🏠 [loadHomeData] Starting to load home data for user:`,
          profileUser.username,
          profileUser.auth_user_id
        );
        setTabLoading((prev) => ({ ...prev, Home: true }));

        const [
          watchedMoviesResult,
          watchedTVResult,
          watchedGamesResult,
          watchedBooksResult,
          favoriteMoviesResult,
          favoriteTVResult,
          favoriteGamesResult,
          favoriteBooksResult,
          featuredMoviesResult,
          featuredTVResult,
          featuredGamesResult,
          featuredBooksResult,
          favoritePeopleResult,
          userStats,
          followData,
          activityFeedResult, // Fetch activity feed here
        ] = await Promise.all([
          getUserWatchedContent(profileUser.auth_user_id!, 'MOVIE'),
          getUserWatchedContent(profileUser.auth_user_id!, 'TV'),
          getUserWatchedContent(profileUser.auth_user_id!, 'GAME'),
          getUserWatchedContent(profileUser.auth_user_id!, 'BOOK'),
          getUserFavoriteContent(profileUser.auth_user_id!, 'MOVIE'),
          getUserFavoriteContent(profileUser.auth_user_id!, 'TV'),
          getUserFavoriteContent(profileUser.auth_user_id!, 'GAME'),
          getUserFavoriteContent(profileUser.auth_user_id!, 'BOOK'),
          getUserFeaturedContent(profileUser.auth_user_id!, 'MOVIE'),
          getUserFeaturedContent(profileUser.auth_user_id!, 'TV'),
          getUserFeaturedContent(profileUser.auth_user_id!, 'GAME'),
          getUserFeaturedContent(profileUser.auth_user_id!, 'BOOK'),
          fetchUserFavoritePeople(profileUser.auth_user_id!, 12),
          getUserStats(profileUser.auth_user_id!),
          authenticatedUserId
            ? getFollowData(profileUser.username!)
            : Promise.resolve({ followersCount: 0, followingCount: 0, isFollowing: false }),
          getActivityFeed(profileUser.auth_user_id!, HOME_ACTIVITY_FEED_LIMIT), // Fetch activity feed
        ]);

        console.log(`📊 [loadHomeData] All data fetched. Results:`, {
          watchedMovies: watchedMoviesResult?.data?.length || 0,
          watchedTV: watchedTVResult?.data?.length || 0,
          watchedGames: watchedGamesResult?.data?.length || 0,
          watchedBooks: watchedBooksResult?.data?.length || 0,
          favoriteMovies: favoriteMoviesResult?.data?.length || 0,
          favoriteTV: favoriteTVResult?.data?.length || 0,
          favoriteGames: favoriteGamesResult?.data?.length || 0,
          favoriteBooks: favoriteBooksResult?.data?.length || 0,
          activityFeed: activityFeedResult?.data?.length || 0,
        });

        let favoriteMoviesData: Content[] = [];
        let favoriteTVData: Content[] = [];
        let favoriteGamesData: Content[] = [];
        let favoriteBooksData: Content[] = [];

        if (favoriteMoviesResult?.data) {
          favoriteMoviesData = favoriteMoviesResult.data.slice(0, 5);
          console.log(`⭐ [loadHomeData] Favorite movies:`, favoriteMoviesData.length);
        }

        if (favoriteTVResult?.data) {
          favoriteTVData = favoriteTVResult.data.slice(0, 5);
          console.log(`⭐ [loadHomeData] Favorite TV:`, favoriteTVData.length);
        }

        if (favoriteGamesResult?.data) {
          favoriteGamesData = favoriteGamesResult.data.slice(0, 5);
          console.log(`⭐ [loadHomeData] Favorite games:`, favoriteGamesData.length);
        }

        if (favoriteBooksResult?.data) {
          favoriteBooksData = favoriteBooksResult.data.slice(0, 5);
          console.log(`⭐ [loadHomeData] Favorite books:`, favoriteBooksData.length);
        }

        console.log(`🔄 [loadHomeData] Setting state with data...`);
        // recentMovies, recentTV, etc. are now derived from activityFeed, so no direct set here
        setFavoriteMovies(favoriteMoviesData);
        setFavoriteTV(favoriteTVData);
        setFavoriteGames(favoriteGamesData);
        setFavoriteBooks(favoriteBooksData);
        setFeaturedMovies(featuredMoviesResult?.data || []);
        setFeaturedTV(featuredTVResult?.data || []);
        setFeaturedGames(featuredGamesResult?.data || []);
        setFeaturedBooks(featuredBooksResult?.data || []);
        setFavoritePeople(favoritePeopleResult || []);
        // Store all watched content for featured selection
        setAllWatchedMovies(watchedMoviesResult?.data || []);
        setAllWatchedTV(watchedTVResult?.data || []);
        setAllWatchedGames(watchedGamesResult?.data || []);
        setAllWatchedBooks(watchedBooksResult?.data || []);
        setStats(
          userStats.data || {
            totalMovies: 0,
            thisYearMovies: 0,
            averageRating: 0,
            discussionCount: 0,
          }
        );
        setFollowersCount(followData.followersCount);
        setFollowingCount(followData.followingCount);
        setIsFollowing(followData.isFollowing);
        setActivityFeed(activityFeedResult?.data || []); // Set activity feed
        setActivityFeedLimit(HOME_ACTIVITY_FEED_LIMIT);

        console.log(`✅ [loadHomeData] State updated successfully`);
      } catch (error) {
        console.error('❌ [loadHomeData] Failed to load home tab data:', error);
      } finally {
        setTabLoading((prev) => ({ ...prev, Home: false }));
      }
    },
    []
  );

  // Movies tab için veri yükleme
  const loadMoviesData = useCallback(async (profileUser: AppUser) => {
    try {
      console.log(`🎬 [loadMoviesData] Loading movies for user:`, profileUser.username);
      setTabLoading((prev) => ({ ...prev, Movies: true }));
      const result = await getUserWatchedContent(profileUser.auth_user_id!, 'MOVIE');
      console.log(`🎬 [loadMoviesData] Movies result:`, result?.data?.length || 0, 'items');
      if (result?.data) {
        setAllWatchedMovies(result.data);
        console.log(`✅ [loadMoviesData] Movies state updated with ${result.data.length} items`);
      } else {
        console.log(`⚠️ [loadMoviesData] No movies data to set`);
      }
    } catch (error) {
      console.error('❌ [loadMoviesData] Failed to load movies tab data:', error);
    } finally {
      setTabLoading((prev) => ({ ...prev, Movies: false }));
    }
  }, []);

  // TV tab için veri yükleme
  const loadTVData = useCallback(async (profileUser: AppUser) => {
    try {
      setTabLoading((prev) => ({ ...prev, TV: true }));
      const result = await getUserWatchedContent(profileUser.auth_user_id!, 'TV');
      if (result?.data) {
        setAllWatchedTV(result.data);
      }
    } catch (error) {
      console.error('Failed to load TV tab data:', error);
    } finally {
      setTabLoading((prev) => ({ ...prev, TV: false }));
    }
  }, []);

  // Games tab için veri yükleme
  const loadGamesData = useCallback(async (profileUser: AppUser) => {
    try {
      setTabLoading((prev) => ({ ...prev, Games: true }));
      const result = await getUserWatchedContent(profileUser.auth_user_id!, 'GAME');
      if (result?.data) {
        setAllWatchedGames(result.data);
      }
    } catch (error) {
      console.error('Games tab verileri yüklenemedi:', error);
    } finally {
      setTabLoading((prev) => ({ ...prev, Games: false }));
    }
  }, []);

  // Books tab için veri yükleme
  const loadBooksData = useCallback(async (profileUser: AppUser) => {
    try {
      setTabLoading((prev) => ({ ...prev, Books: true }));
      const result = await getUserWatchedContent(profileUser.auth_user_id!, 'BOOK');
      if (result?.data) {
        setAllWatchedBooks(result.data);
      }
    } catch (error) {
      console.error('Failed to load books tab data:', error);
    } finally {
      setTabLoading((prev) => ({ ...prev, Books: false }));
    }
  }, []);

  // Network tab için veri yükleme
  const loadNetworkData = useCallback(async (profileUser: AppUser) => {
    if (!profileUser.username) {
      console.error('❌ Network tab: username is missing');
      return;
    }

    try {
      console.log('👥 Loading network data for:', profileUser.username);
      setTabLoading((prev) => ({ ...prev, Network: true }));
      const [followersResult, followingResult] = await Promise.all([
        getFollowers(profileUser.username),
        getFollowing(profileUser.username),
      ]);
      console.log('✅ Network data loaded:', {
        followers: followersResult.data?.length || 0,
        following: followingResult.data?.length || 0,
      });
      setFollowers(followersResult.data || []);
      setFollowing(followingResult.data || []);
    } catch (error) {
      console.error('❌ Failed to load network tab data:', error);
    } finally {
      setTabLoading((prev) => ({ ...prev, Network: false }));
    }
  }, []);

  // Activity tab için veri yükleme
  const loadActivityData = useCallback(
    async (profileUser: AppUser, limit = HOME_ACTIVITY_FEED_LIMIT) => {
      if (!profileUser.auth_user_id) {
        console.error('❌ Activity tab: auth_user_id is missing');
        return;
      }

      try {
        console.log('📰 Loading activity feed for user:', profileUser.auth_user_id);
        setTabLoading((prev) => ({ ...prev, Activity: true }));
        const result = await getActivityFeed(profileUser.auth_user_id, limit);
        console.log('📰 Activity feed result:', result);
        if (result?.data) {
          const originalCount = result.data.length;
          console.log('✅ Activity feed loaded:', {
            originalCount,
          });
          logApiRequest(
            `/profile/${profileUser.username ?? profileUser.auth_user_id}/activity`,
            'QUERY',
            true
          );
          setActivityFeed(result.data);
          setActivityFeedLimit(limit);
        } else {
          console.log('⚠️ Activity feed: No data returned');
          logApiRequest(
            `/profile/${profileUser.username ?? profileUser.auth_user_id}/activity`,
            'QUERY',
            true,
            'No data returned'
          );
          setActivityFeed([]);
          setActivityFeedLimit(0);
        }
      } catch (error) {
        console.error('❌ Failed to load activity tab data:', error);
        logApiRequest(
          `/profile/${profileUser.username ?? profileUser.auth_user_id}/activity`,
          'QUERY',
          false,
          error instanceof Error ? error.message : String(error)
        );
        setActivityFeed([]);
        setActivityFeedLimit(0);
      } finally {
        setTabLoading((prev) => ({ ...prev, Activity: false }));
      }
    },
    []
  );

  // Interactions tab için veri yükleme
  const loadIncomingActivityData = useCallback(
    async (profileUser: AppUser, limit = ACTIVITY_TAB_FEED_LIMIT) => {
      if (!profileUser.auth_user_id) return;

      try {
        console.log('📰 Loading incoming activity feed for user:', profileUser.auth_user_id);
        setTabLoading((prev) => ({ ...prev, Interactions: true }));
        const result = await getIncomingActivityFeed(profileUser.auth_user_id, limit);

        if (result?.data) {
          setIncomingActivityFeed(result.data);
          setIncomingActivityFeedLimit(limit);
        } else {
          setIncomingActivityFeed([]);
          setIncomingActivityFeedLimit(0);
        }
      } catch (error) {
        console.error('❌ Failed to load incoming activity tab data:', error);
        setIncomingActivityFeed([]);
        setIncomingActivityFeedLimit(0);
      } finally {
        setTabLoading((prev) => ({ ...prev, Interactions: false }));
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    const loadUserData = async () => {
      if (!username) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setProfileNotFound(false);
        }

        // Profil kullanıcısını al
        const userProfileResult = await getUserByUsername(username);

        if (!userProfileResult.data) {
          if (isMounted) {
            setProfileNotFound(true);
            setLoading(false);
          }
          return;
        }

        const profileUser = userProfileResult.data;
        setAppUser(profileUser);

        // Mevcut kullanıcının profilini al (giriş yapmışsa)
        let currentProfile = null;
        if (user) {
          const currentUserResult = await getCurrentUserProfile();
          if (currentUserResult.data) {
            currentProfile = currentUserResult.data;
            setCurrentUserProfile(currentProfile);
            setIsOwnProfile(currentProfile.auth_user_id === profileUser.auth_user_id);
          }
        }

        // Auth kontrolü - AuthContext'ten gelen user'ı kullan
        let authenticatedUserId = null;
        if (user) {
          authenticatedUserId = user.id;
          console.log('✅ Authenticated user ID:', authenticatedUserId);
        }

        // İlk olarak Home tab verilerini yükle - auth validation olmadan
        if (isMounted) {
          await loadHomeData(profileUser, authenticatedUserId);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        if (isMounted) setLoading(false);
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [username, user, loadHomeData]); // Added username and loadHomeData to dependencies

  useEffect(() => {
    if (!appUser || loading) return;

    const loadTabData = async () => {
      switch (activeTab) {
        case 'Home':
          // Home tab needs activity feed for recent content and recent reviews
          if (activityFeed.length === 0) {
            await loadActivityData(appUser);
          }
          break;
        case 'Movies':
          if (allWatchedMovies.length === 0) {
            await loadMoviesData(appUser);
          }
          break;
        case 'TV':
          if (allWatchedTV.length === 0) {
            await loadTVData(appUser);
          }
          break;
        case 'Games':
          if (allWatchedGames.length === 0) {
            await loadGamesData(appUser);
          }
          break;
        case 'Books':
          if (allWatchedBooks.length === 0) {
            await loadBooksData(appUser);
          }
          break;
        case 'Network':
          if (followers.length === 0 && following.length === 0) {
            await loadNetworkData(appUser);
          }
          break;
        case 'Activity':
          if (activityFeedLimit < ACTIVITY_TAB_FEED_LIMIT) {
            await loadActivityData(appUser, ACTIVITY_TAB_FEED_LIMIT);
          }
          if (incomingActivityFeedLimit < ACTIVITY_TAB_FEED_LIMIT) {
            await loadIncomingActivityData(appUser, ACTIVITY_TAB_FEED_LIMIT);
          }
          break;
      }
    };

    loadTabData();
  }, [
    activeTab,
    appUser,
    loading,
    allWatchedMovies.length,
    allWatchedTV.length,
    allWatchedGames.length,
    allWatchedBooks.length,
    followers.length,
    following.length,
    activityFeed.length,
    incomingActivityFeed.length,
    activityFeedLimit,
    incomingActivityFeedLimit,
    loadMoviesData,
    loadTVData,
    loadGamesData,
    loadBooksData,
    loadNetworkData,
    loadActivityData,
    loadIncomingActivityData,
  ]);

  if (profileNotFound) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('userNotFound')}</h2>
          <p className="text-gray-400 mb-6">{t('userNotFoundDesc', { username })}</p>
          <Link
            href="/explore"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('backToExplore')}
          </Link>
        </div>
      </div>
    );
  }

  if (!isOwnProfile && !user) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('loginToViewProfiles')}</h2>
          <Link
            href="/auth/login"
            className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {t('login')}
          </Link>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'Home':
        return (
          <HomeTab
            username={username}
            recentMovies={recentMovies}
            recentTv={recentTv}
            recentGames={recentGames}
            recentBooks={recentBooks}
            featuredMovies={featuredMovies}
            featuredTv={featuredTV}
            featuredGames={featuredGames}
            featuredBooks={featuredBooks}
            favoritePeople={favoritePeople}
            allConsumedMovies={allWatchedMovies}
            allConsumedTv={allWatchedTV}
            allConsumedGames={allWatchedGames}
            allConsumedBooks={allWatchedBooks}
            activityFeed={activityFeed}
            stats={stats}
            isOwnProfile={isOwnProfile}
            onFeaturedUpdate={() => appUser && loadHomeData(appUser, user?.id)}
            onShowAll={(tabName) => setActiveTab(tabName)}
          />
        );
      case 'Stats':
        return (
          <StatsTab
            username={username}
            watched={{
              movies: allWatchedMovies,
              tv: allWatchedTV,
              games: allWatchedGames,
              books: allWatchedBooks,
            }}
            favorites={{
              movies: favoriteMovies,
              tv: favoriteTV,
              games: favoriteGames,
              books: favoriteBooks,
            }}
            basicStats={stats}
          />
        );
      case 'Movies':
        return tabLoading['Movies'] ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <ContentTab
            content={allWatchedMovies}
            contentType="movie"
            onContentUpdate={handleMovieUpdate}
          />
        );
      case 'TV':
        return tabLoading['TV'] ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <ContentTab content={allWatchedTV} contentType="tv" onContentUpdate={handleTvUpdate} />
        );
      case 'Games':
        return tabLoading['Games'] ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <ContentTab
            content={allWatchedGames}
            contentType="game"
            onContentUpdate={handleGameUpdate}
          />
        );
      case 'Books':
        return tabLoading['Books'] ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <ContentTab
            content={allWatchedBooks}
            contentType="book"
            onContentUpdate={handleBookUpdate}
          />
        );
      case 'Network':
        return tabLoading['Network'] ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <NetworkTab followers={followers} following={following} />
        );
      case 'Activity':
        return (
          <div className="space-y-4">
            <div className="flex space-x-6 border-b border-white/10 pb-2 mb-4">
              <button
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                  activitySubTab === 'user'
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/50'
                }`}
                onClick={() => setActivitySubTab('user')}
              >
                {tTabs('Activity')}
              </button>
              <button
                className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                  activitySubTab === 'others'
                    ? 'border-white text-white'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-white/50'
                }`}
                onClick={() => setActivitySubTab('others')}
              >
                {tTabs('Interactions')}
              </button>
            </div>

            {activitySubTab === 'user' ? (
              tabLoading['Activity'] ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              ) : (
                <ActivityTab
                  activities={activityFeed}
                  onActivityUpdate={() =>
                    appUser && loadActivityData(appUser, ACTIVITY_TAB_FEED_LIMIT)
                  }
                />
              )
            ) : tabLoading['Interactions'] ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : (
              <ActivityTab
                activities={incomingActivityFeed}
                onActivityUpdate={() =>
                  appUser && loadIncomingActivityData(appUser, ACTIVITY_TAB_FEED_LIMIT)
                }
              />
            )}
          </div>
        );
      case 'Lists':
        return <ListsTab username={username} isOwnProfile={isOwnProfile} />;
      case 'Reviews':
        return appUser ? <ReviewsTab userId={appUser.auth_user_id!} username={username} /> : null;
      case 'Discussions':
        return appUser ? (
          <DiscussionsTab userId={appUser.auth_user_id!} username={username} />
        ) : null;
      case 'Contributions':
        return <ContributionsTab username={username} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (profileNotFound) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('profileNotFound')}</h1>
          <p className="text-gray-400 mb-4">{t('profileNotFoundDesc')}</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            {t('backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page profile-redesign min-h-screen">
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
          onProfilePictureUpdated={(newUrl) => {
            console.log('✅ [Profile] Profile picture updated (client):', newUrl);
            setAppUser((prev) => (prev ? { ...prev, picturePath: newUrl } : prev));
          }}
          consumedCounts={{
            movies: allWatchedMovies.filter((item: any) => item.isConsumed || item.is_consumed)
              .length,
            tv: allWatchedTV.filter((item: any) => item.isConsumed || item.is_consumed).length,
            games: allWatchedGames.filter((item: any) => item.isConsumed || item.is_consumed)
              .length,
            books: allWatchedBooks.filter((item: any) => item.isConsumed || item.is_consumed)
              .length,
          }}
          onTabChange={setActiveTab}
          onEditFeatured={() => {
            setActiveTab('Home');
            // Allow tab to switch, then open the dialog via event
            setTimeout(() => {
              document.dispatchEvent(new CustomEvent('openFeaturedDialog'));
            }, 100);
          }}
        />
      )}
      <div className="profile-tabs-shell max-w-[1920px] mx-auto px-6 py-4">
        <ProfileTabs tabs={VALID_TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="profile-content-shell w-full py-8">
        {WIDE_CONTENT_TABS.has(activeTab) ? (
          renderTabContent()
        ) : (
          <div className="max-w-[1920px] mx-auto px-6">{renderTabContent()}</div>
        )}
      </div>
    </div>
  );
}
