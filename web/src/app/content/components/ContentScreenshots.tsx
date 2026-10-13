'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/contexts/AuthContext';

interface Screenshot {
  id: number;
  imageUrl: string;
  difficulty: number;
  order: number;
  seasonNumber?: number | null;
  description?: string;
  isSpoiler?: boolean;
  isSensitive?: boolean;
  upvoteCount?: number;
  downvoteCount?: number;
  userVote?: number | null;
}

interface ContentScreenshotsProps {
  screenshots: Screenshot[];
  isWatched?: boolean;
  hideTitle?: boolean;
  mediaType?: 'screenshot' | 'image';
  imageType?: 'poster' | 'backdrop' | 'screenshot';
}

export default function ContentScreenshots({
  screenshots,
  isWatched = false,
  hideTitle = false,
  mediaType = 'screenshot',
  imageType = 'screenshot',
}: ContentScreenshotsProps) {
  const t = useTranslations('ContentScreenshots');
  const { showSensitiveContent } = useUserPreferences();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');

  const [showSpoilers, setShowSpoilers] = useState(isWatched);
  const [showSensitive, setShowSensitive] = useState(showSensitiveContent);

  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [localScreenshots, setLocalScreenshots] = useState<Screenshot[]>(screenshots ?? []);
  const { user } = useAuth();

  useEffect(() => {
    setLocalScreenshots(screenshots ?? []);
  }, [screenshots]);

  const handleVote = async (id: number, voteType: 1 | -1) => {
    if (!user) return; // Kullanıcı giriş yapmamışsa oylama yapılamaz

    // Optimistic update
    setLocalScreenshots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;

        let newUpvoteCount = s.upvoteCount || 0;
        let newDownvoteCount = s.downvoteCount || 0;
        const oldVote = s.userVote;

        // Remove old vote
        if (oldVote === 1) newUpvoteCount--;
        if (oldVote === -1) newDownvoteCount--;

        let newVote: number | null = voteType;
        // If clicking same vote, toggle it off
        if (oldVote === voteType) {
          newVote = null;
        } else {
          // Add new vote
          if (voteType === 1) newUpvoteCount++;
          if (voteType === -1) newDownvoteCount++;
        }

        return {
          ...s,
          userVote: newVote,
          upvoteCount: newUpvoteCount,
          downvoteCount: newDownvoteCount,
        };
      })
    );

    // Call API
    try {
      const { voteImage, voteScreenshot } = await import('@/services/graphql/content');
      if (mediaType === 'image') {
        await voteImage(id, voteType);
      } else {
        await voteScreenshot(id, voteType);
      }
    } catch (error) {
      console.error('Vote error:', error);
      // Revert on error
      setLocalScreenshots(screenshots);
    }
  };

  useEffect(() => {
    setShowSensitive(showSensitiveContent);
  }, [showSensitiveContent]);

  useEffect(() => {
    setShowSpoilers(isWatched);
  }, [isWatched]);

  useEffect(() => {
    setSelectedIndex(null);
    setIsExpanded(false);
  }, [selectedSeason]);

  const seasonNumbers = Array.from(
    new Set(
      localScreenshots
        .map((s) => s.seasonNumber)
        .filter((seasonNumber): seasonNumber is number => typeof seasonNumber === 'number')
    )
  ).sort((a, b) => a - b);
  const hasSeasonGroups = seasonNumbers.length > 0;
  const visibleScreenshots =
    selectedSeason === 'all'
      ? localScreenshots
      : localScreenshots.filter((s) => s.seasonNumber === selectedSeason);

  const sortedScreenshots = [...visibleScreenshots].sort((a, b) => {
    const seasonA = a.seasonNumber ?? 0;
    const seasonB = b.seasonNumber ?? 0;
    if (seasonA !== seasonB) return seasonA - seasonB;
    return a.order - b.order;
  });

  const previewCount = 8;
  const hasMore = sortedScreenshots.length > previewCount;

  const isScreenshotHidden = useCallback(
    (screenshot: Screenshot) => {
      if (revealedIds.has(screenshot.id)) return false;

      if (screenshot.isSpoiler && screenshot.isSensitive) {
        return !showSpoilers || !showSensitive;
      }
      if (screenshot.isSpoiler) return !showSpoilers;
      if (screenshot.isSensitive) return !showSensitive;

      return false;
    },
    [revealedIds, showSensitive, showSpoilers]
  );

  const getHiddenReason = (screenshot: Screenshot) => {
    if (revealedIds.has(screenshot.id)) return null;

    if (screenshot.isSensitive && !showSensitive) return 'sensitive';
    if (screenshot.isSpoiler && !showSpoilers) return 'spoiler';
    return null;
  };

  const openLightbox = (index: number) => {
    const screenshot = sortedScreenshots[index];
    if (isScreenshotHidden(screenshot)) {
      return;
    }
    setSelectedIndex(index);
  };

  const closeLightbox = () => setSelectedIndex(null);

  const spoilerCount = sortedScreenshots.filter((s) => s.isSpoiler).length;
  const sensitiveCount = sortedScreenshots.filter((s) => s.isSensitive).length;

  const goNextCb = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      let nextIndex = (prev + 1) % sortedScreenshots.length;
      let attempts = 0;
      while (attempts < sortedScreenshots.length) {
        const ss = sortedScreenshots[nextIndex];
        if (!isScreenshotHidden(ss)) break;
        nextIndex = (nextIndex + 1) % sortedScreenshots.length;
        attempts++;
      }
      return attempts < sortedScreenshots.length ? nextIndex : prev;
    });
  }, [isScreenshotHidden, sortedScreenshots]);

  const goPrevCb = useCallback(() => {
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      let prevIdx = (prev - 1 + sortedScreenshots.length) % sortedScreenshots.length;
      let attempts = 0;
      while (attempts < sortedScreenshots.length) {
        const ss = sortedScreenshots[prevIdx];
        if (!isScreenshotHidden(ss)) break;
        prevIdx = (prevIdx - 1 + sortedScreenshots.length) % sortedScreenshots.length;
        attempts++;
      }
      return attempts < sortedScreenshots.length ? prevIdx : prev;
    });
  }, [isScreenshotHidden, sortedScreenshots]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        setShowSensitive((prev) => !prev);
        return;
      }

      if (e.key === 's' || e.key === 'S') {
        setShowSpoilers((prev) => !prev);
        return;
      }

      if (selectedIndex === null) return;

      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowRight':
          goNextCb();
          break;
        case 'ArrowLeft':
          goPrevCb();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    if (selectedIndex !== null) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (selectedIndex !== null) {
        document.body.style.overflow = '';
      }
    };
  }, [selectedIndex, goNextCb, goPrevCb]);

  if (localScreenshots.length === 0) return null;

  const renderScreenshotCard = (screenshot: Screenshot, index: number) => {
    const hidden = isScreenshotHidden(screenshot);
    const hiddenReason = getHiddenReason(screenshot);

    return (
      <div
        key={screenshot.id}
        className={`relative ${imageType === 'poster' ? 'aspect-[2/3]' : 'aspect-video'} rounded-lg overflow-hidden cursor-pointer group ${hidden ? 'cursor-default' : ''}`}
        onClick={() => openLightbox(index)}
      >
        <Image
          src={screenshot.imageUrl}
          alt={screenshot.description || t('imageAlt', { index: index + 1 })}
          fill
          className={`object-cover transition-all ${hidden ? 'blur-xl scale-110' : 'group-hover:scale-105'}`}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {!hidden && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        )}

        {hidden && (
          <div
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (hiddenReason === 'sensitive') {
                setShowSensitive(true);
              } else if (hiddenReason === 'spoiler') {
                setShowSpoilers(true);
              }
            }}
          >
            {hiddenReason === 'sensitive' ? (
              <>
                <EyeOff className="w-8 h-8 mb-2 text-red-500" />
                <span className="text-sm font-medium text-red-400">{t('sensitiveContent')}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-8 h-8 mb-2 text-orange-400" />
                <span className="text-sm font-medium text-orange-300">{t('spoilerContent')}</span>
              </>
            )}
          </div>
        )}

        {/* Badgeler (Görünür olsa bile sağ ve sol üstte gösterilir) */}
        {!hidden && (
          <>
            {screenshot.isSpoiler && (
              <div className="absolute top-2 right-2 bg-orange-500/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Spoiler
              </div>
            )}
            {screenshot.isSensitive && (
              <div className="absolute top-2 left-2 bg-red-600/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <EyeOff className="w-3 h-3" />
                Hassas
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        {!hideTitle && (
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({sortedScreenshots.length})
            </span>
          </div>
        )}

        {hasSeasonGroups && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedSeason('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedSeason === 'all'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {t('all')}
            </button>
            {seasonNumbers.map((seasonNumber) => (
              <button
                key={seasonNumber}
                type="button"
                onClick={() => setSelectedSeason(seasonNumber)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  selectedSeason === seasonNumber
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                S{seasonNumber}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {/* Spoiler Toggle Switch */}
          {spoilerCount > 0 && (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Spoiler</span>
              <button
                onClick={() => setShowSpoilers(!showSpoilers)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  showSpoilers ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title="Kısayol: S"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform ${
                    showSpoilers ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                  style={{ transform: showSpoilers ? 'translateX(1.1rem)' : 'translateX(0.25rem)' }}
                />
              </button>
            </div>
          )}

          {/* Hassas İçerik Toggle Switch */}
          {sensitiveCount > 0 && (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {t('sensitive')}
              </span>
              <button
                onClick={() => setShowSensitive(!showSensitive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  showSensitive ? 'bg-red-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title="Kısayol: E"
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform ${
                    showSensitive ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                  style={{
                    transform: showSensitive ? 'translateX(1.1rem)' : 'translateX(0.25rem)',
                  }}
                />
              </button>
            </div>
          )}

          {/* Expand/Collapse Button - sadece 4'ten fazla görsel varsa göster */}
          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {t('collapse')}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {t('showMore', { count: sortedScreenshots.length - previewCount })}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collapsed: 2-row Grid */}
      {!isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedScreenshots
            .slice(0, previewCount)
            .map((screenshot, index) => renderScreenshotCard(screenshot, index))}
        </div>
      )}

      {/* Expanded: Grid View */}
      {isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedScreenshots.map((screenshot, index) => renderScreenshotCard(screenshot, index))}
        </div>
      )}

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
            title={t('close')}
          >
            <X size={32} />
          </button>

          {/* Navigation */}
          {sortedScreenshots.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrevCb();
                }}
                className="absolute left-4 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
                title={t('prev')}
              >
                <ChevronLeft size={48} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNextCb();
                }}
                className="absolute right-4 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
                title={t('next')}
              >
                <ChevronRight size={48} />
              </button>
            </>
          )}

          {/* Image */}
          <div className="flex-1 flex items-center justify-center pointer-events-none min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sortedScreenshots[selectedIndex].imageUrl}
              alt={
                sortedScreenshots[selectedIndex].description ||
                t('imageAlt', { index: selectedIndex + 1 })
              }
              className="max-w-[90vw] max-h-[85vh] object-contain pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Lightbox badgeleri */}
          <div className="absolute top-16 left-4 flex flex-col gap-2 z-10">
            {sortedScreenshots[selectedIndex].isSpoiler && (
              <div
                className="bg-orange-500/90 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertTriangle className="w-4 h-4" />
                {t('spoilerContent')}
              </div>
            )}
            {sortedScreenshots[selectedIndex].isSensitive && (
              <div
                className="bg-red-600/90 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <EyeOff className="w-4 h-4" />
                {t('sensitive')}
              </div>
            )}
          </div>

          {/* Description */}
          {sortedScreenshots[selectedIndex].description && (
            <div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg max-w-md text-center z-10 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {sortedScreenshots[selectedIndex].description}
            </div>
          )}

          {/* Counter + keyboard hint + Voting UI */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 text-sm z-20">
            <div className="flex items-center gap-4 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm pointer-events-auto">
              {/* Upvote Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote(sortedScreenshots[selectedIndex].id, 1);
                }}
                className={`flex items-center gap-1.5 transition-colors ${sortedScreenshots[selectedIndex].userVote === 1 ? 'text-emerald-400' : 'hover:text-emerald-400'}`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {sortedScreenshots[selectedIndex].upvoteCount || 0}
                </span>
              </button>

              <div className="w-px h-4 bg-white/20 mx-2"></div>

              {/* Downvote Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote(sortedScreenshots[selectedIndex].id, -1);
                }}
                className={`flex items-center gap-1.5 transition-colors ${sortedScreenshots[selectedIndex].userVote === -1 ? 'text-red-400' : 'hover:text-red-400'}`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {sortedScreenshots[selectedIndex].downvoteCount || 0}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span>
                {selectedIndex + 1} / {sortedScreenshots.length}
              </span>
              <span className="hidden sm:inline text-white/30">{t('hint')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
