'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Content, Review } from '@/services/movieLogs';
import { AppUser } from '@/services/userService';

interface UserProfileData {
  appUser: AppUser;
  recentMovies: Content[];
  allWatchedMovies: Content[];
  favoriteMovies: Content[];
  reviews: Review[];
  followers: AppUser[];
  following: AppUser[];
  activityFeed: any[];
  stats: {
    totalMovies: number;
    thisYearMovies: number;
    averageRating: number;
    reviewCount: number;
  };
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  lastUpdated: number;
}

interface ProfileCacheContextType {
  getProfileData: (username: string) => UserProfileData | null;
  setProfileData: (username: string, data: UserProfileData) => void;
  clearProfile: (username: string) => void;
  clearAllProfiles: () => void;
  isDataFresh: (username: string, maxAge?: number) => boolean;
}

const ProfileCacheContext = createContext<ProfileCacheContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika cache

export function ProfileCacheProvider({ children }: { children: React.ReactNode }) {
  const [profileCache, setProfileCache] = useState<Map<string, UserProfileData>>(new Map());

  const getProfileData = useCallback((username: string): UserProfileData | null => {
    return profileCache.get(username) || null;
  }, [profileCache]);

  const setProfileData = useCallback((username: string, data: UserProfileData) => {
    setProfileCache(prev => {
      const newCache = new Map(prev);
      newCache.set(username, { ...data, lastUpdated: Date.now() });
      return newCache;
    });
  }, []);

  const clearProfile = useCallback((username: string) => {
    setProfileCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(username);
      return newCache;
    });
  }, []);

  const clearAllProfiles = useCallback(() => {
    setProfileCache(new Map());
  }, []);

  const isDataFresh = useCallback((username: string, maxAge: number = CACHE_DURATION): boolean => {
    const data = profileCache.get(username);
    if (!data) return false;
    return Date.now() - data.lastUpdated < maxAge;
  }, [profileCache]);

  return (
    <ProfileCacheContext.Provider
      value={{
        getProfileData,
        setProfileData,
        clearProfile,
        clearAllProfiles,
        isDataFresh,
      }}
    >
      {children}
    </ProfileCacheContext.Provider>
  );
}

export function useProfileCache() {
  const context = useContext(ProfileCacheContext);
  if (context === undefined) {
    throw new Error('useProfileCache must be used within a ProfileCacheProvider');
  }
  return context;
}
