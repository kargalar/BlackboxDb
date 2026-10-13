'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { apolloClient } from '@/lib/apollo-client';
import { useAuth } from '@/contexts/AuthContext';
import {
  GET_EXPANSIONS_BY_CONTENT,
  GET_USER_EXPANSION_LOGS,
  TOGGLE_EXPANSION_CONSUMED,
  RATE_EXPANSION,
  REMOVE_EXPANSION_RATING,
  type Expansion,
  type UserExpansionLog,
} from '@/services/graphql/expansion';

interface ContentExpansionsProps {
  contentId: string;
  type?: 'expansion' | 'remake'; // expansion veya remake filtresi
}

export default function ContentExpansions({
  contentId,
  type = 'expansion',
}: ContentExpansionsProps) {
  const { user } = useAuth();
  const [expansions, setExpansions] = useState<Expansion[]>([]);
  const [userLogs, setUserLogs] = useState<Map<number, UserExpansionLog>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Set<number>>(new Set());

  // Başlık ve ikon type'a göre değişir
  const sectionTitle = type === 'remake' ? "Remake'ler" : 'Expansions';
  const sectionIcon = type === 'remake' ? '🔄' : '🎮';
  const sectionSubtitle = type === 'remake' ? 'Remake' : 'Expansion';

  // Load expansions
  const loadExpansions = useCallback(async () => {
    try {
      console.log('🎮 [ContentExpansions] Loading expansions for:', contentId, 'type:', type);
      setLoading(true);

      const { data } = await apolloClient.query<{ getExpansionsByContent: Expansion[] }>({
        query: GET_EXPANSIONS_BY_CONTENT,
        variables: { contentId, type },
        fetchPolicy: 'network-only',
      });

      setExpansions(data?.getExpansionsByContent || []);
      console.log(
        '✅ [ContentExpansions] Loaded',
        data?.getExpansionsByContent?.length || 0,
        'expansions'
      );
    } catch (err) {
      console.error('❌ [ContentExpansions] Error loading expansions:', err);
      setError(err instanceof Error ? err.message : 'Expansion yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [contentId, type]);

  // Load user logs
  const loadUserLogs = useCallback(async () => {
    if (!user) return;

    try {
      console.log('👤 [ContentExpansions] Loading user logs for:', contentId);

      const { data } = await apolloClient.query<{ getUserExpansionLogs: UserExpansionLog[] }>({
        query: GET_USER_EXPANSION_LOGS,
        variables: { contentId },
        fetchPolicy: 'network-only',
      });

      const logsMap = new Map<number, UserExpansionLog>();
      (data?.getUserExpansionLogs || []).forEach((log) => {
        logsMap.set(log.expansionId, log);
      });

      setUserLogs(logsMap);
      console.log('✅ [ContentExpansions] Loaded', logsMap.size, 'user logs');
    } catch (err) {
      console.error('❌ [ContentExpansions] Error loading user logs:', err);
    }
  }, [contentId, user]);

  useEffect(() => {
    loadExpansions();
  }, [loadExpansions]);

  useEffect(() => {
    if (user && expansions.length > 0) {
      loadUserLogs();
    }
  }, [user, expansions.length, loadUserLogs]);

  // Toggle consumed
  const handleToggleConsumed = async (expansionId: number) => {
    if (!user) return;

    setActionLoading((prev) => new Set(prev).add(expansionId));

    try {
      console.log('🎮 [ContentExpansions] Toggling consumed for expansion:', expansionId);

      const { data } = await apolloClient.mutate<{ toggleExpansionConsumed: UserExpansionLog }>({
        mutation: TOGGLE_EXPANSION_CONSUMED,
        variables: { expansionId: Number(expansionId) },
      });

      if (data?.toggleExpansionConsumed) {
        setUserLogs((prev) => {
          const newMap = new Map(prev);
          newMap.set(expansionId, data.toggleExpansionConsumed);
          return newMap;
        });

        // Reload expansions to get updated counts
        await loadExpansions();
        console.log('✅ [ContentExpansions] Toggled consumed successfully');
      }
    } catch (err) {
      console.error('❌ [ContentExpansions] Error toggling consumed:', err);
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(expansionId);
        return newSet;
      });
    }
  };

  // Rate expansion
  const handleRate = async (expansionId: number, rating: number) => {
    if (!user) return;

    setActionLoading((prev) => new Set(prev).add(expansionId));

    try {
      console.log('🎮 [ContentExpansions] Rating expansion:', expansionId, 'with:', rating);

      const { data } = await apolloClient.mutate<{ rateExpansion: UserExpansionLog }>({
        mutation: RATE_EXPANSION,
        variables: { expansionId: Number(expansionId), rating },
      });

      if (data?.rateExpansion) {
        setUserLogs((prev) => {
          const newMap = new Map(prev);
          newMap.set(expansionId, data.rateExpansion);
          return newMap;
        });

        // Reload expansions to get updated ratings
        await loadExpansions();
        console.log('✅ [ContentExpansions] Rated successfully');
      }
    } catch (err) {
      console.error('❌ [ContentExpansions] Error rating:', err);
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(expansionId);
        return newSet;
      });
    }
  };

  // Remove rating
  const handleRemoveRating = async (expansionId: number) => {
    if (!user) return;

    setActionLoading((prev) => new Set(prev).add(expansionId));

    try {
      console.log('🎮 [ContentExpansions] Removing rating for expansion:', expansionId);

      const { data } = await apolloClient.mutate<{ removeExpansionRating: UserExpansionLog }>({
        mutation: REMOVE_EXPANSION_RATING,
        variables: { expansionId: Number(expansionId) },
      });

      if (data?.removeExpansionRating) {
        setUserLogs((prev) => {
          const newMap = new Map(prev);
          newMap.set(expansionId, data.removeExpansionRating);
          return newMap;
        });

        await loadExpansions();
        console.log('✅ [ContentExpansions] Rating removed successfully');
      }
    } catch (err) {
      console.error('❌ [ContentExpansions] Error removing rating:', err);
    } finally {
      setActionLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(expansionId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <div className="animate-pulse">
          <div className="h-8 bg-white/10 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-white/10 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Boş liste ise bölümü gösterme
  if (error || expansions.length === 0) {
    return null;
  }

  // Calculate completion percentage
  const completedCount = expansions.filter(
    (exp) => userLogs.get(Number(exp.id))?.isConsumed
  ).length;
  const completionPercentage =
    expansions.length > 0 ? Math.round((completedCount / expansions.length) * 100) : 0;

  // Unique gradient ID for this instance
  const gradientId = `progressGradient-${type}`;

  return (
    <div className="glass-card p-6 rounded-2xl">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              type === 'remake' ? 'bg-amber-500' : 'bg-violet-500'
            }`}
          >
            <span className="text-xl">{sectionIcon}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{sectionTitle}</h2>
            <p className="text-sm text-white/50">
              {expansions.length} {sectionSubtitle}
            </p>
          </div>
        </div>

        {/* Completion Progress */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {completedCount}/{expansions.length}
              </p>
              <p className="text-xs text-white/50">tamamlandı</p>
            </div>
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${completionPercentage * 1.26} 126`}
                />
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    {type === 'remake' ? (
                      <>
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </>
                    )}
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                {completionPercentage}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Items - Horizontal Scroll with larger posters */}
      <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin">
        {expansions.map((expansion) => {
          const expansionIdNum = Number(expansion.id);
          const userLog = userLogs.get(expansionIdNum);
          const isConsumed = userLog?.isConsumed || false;
          const userRating = userLog?.rating || 0;
          const isLoading = actionLoading.has(expansionIdNum);

          return (
            <div key={expansion.id} className="group relative flex-shrink-0">
              {/* Poster-focused Card - No border */}
              <div className="relative overflow-hidden rounded-2xl transition-all duration-300">
                {/* Large Poster */}
                <div className="relative w-[150px] h-[225px] overflow-hidden rounded-2xl">
                  {expansion.posterUrl ? (
                    <Image
                      src={expansion.posterUrl}
                      alt={expansion.name}
                      fill
                      sizes="150px"
                      unoptimized
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    /* Gray background with title only */
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 p-4">
                      <span className="text-sm text-gray-300 text-center font-medium leading-tight line-clamp-4">
                        {expansion.name}
                      </span>
                    </div>
                  )}

                  {/* Completed Badge - Top right corner */}
                  {isConsumed && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}

                  {/* Hover overlay with info and action buttons */}
                  <div className="absolute inset-0 bg-black/95 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                    {/* Top section - Average rating only on hover */}
                    <div className="flex justify-end">
                      {expansion.averageRating && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                          <span className="text-yellow-400 text-xs">★</span>
                          <span className="text-white text-xs font-bold">
                            {expansion.averageRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom section - Info and actions */}
                    <div>
                      <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-1">
                        {expansion.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/70 mb-3">
                        {expansion.releaseDate && (
                          <span>{new Date(expansion.releaseDate).getFullYear()}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <span className="opacity-60">👥</span>
                          {expansion.consumeCount}
                        </span>
                      </div>

                      {/* Action Buttons - Only visible on hover */}
                      <div className="flex flex-col gap-2">
                        {/* Complete Button - Full width */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isLoading && user) handleToggleConsumed(expansionIdNum);
                          }}
                          disabled={isLoading || !user}
                          className={`flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isLoading
                              ? 'opacity-50 cursor-not-allowed bg-white/20'
                              : isConsumed
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          {isLoading ? (
                            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span>{isConsumed ? '✓ Tamamlandı' : '○ Tamamla'}</span>
                          )}
                        </button>

                        {/* Rating Stars - with remove button */}
                        <div className="flex items-center justify-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isLoading && user) handleRate(expansionIdNum, star);
                              }}
                              disabled={isLoading || !user}
                              className={`w-4 h-4 flex items-center justify-center transition-all ${
                                isLoading
                                  ? 'cursor-not-allowed opacity-50'
                                  : 'cursor-pointer hover:scale-125'
                              }`}
                            >
                              <span
                                className={`text-xs ${
                                  userRating >= star
                                    ? 'text-yellow-400'
                                    : 'text-white/40 hover:text-white/70'
                                }`}
                              >
                                ★
                              </span>
                            </button>
                          ))}
                          {/* Remove rating button */}
                          {userRating > 0 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isLoading && user) handleRemoveRating(expansionIdNum);
                              }}
                              disabled={isLoading || !user}
                              className={`w-4 h-4 ml-1 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 transition-all ${
                                isLoading
                                  ? 'cursor-not-allowed opacity-50'
                                  : 'cursor-pointer hover:scale-110'
                              }`}
                              title="Puanı kaldır"
                            >
                              <span className="text-white text-[10px] font-bold">✕</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
