/**
 * RecentActivityList — Geçmiş aktiviteleri tarih başlığıyla gösteren liste.
 * Bugünden geriye doğru sıralı, sayfalı (pagination) ve takvimden gün seçildiğinde
 * sadece o güne ait içerikleri gösterir.
 */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { SnakeCasedContentItem } from '../StatsTabTypes';
import { getContentTypeName, normalizeTitle } from '../statsTabUtils';
import { useTranslations, useLocale } from 'next-intl';
import { Clapperboard, Tv2, Gamepad2, BookOpenText, Music, ChevronDown } from 'lucide-react';

interface Props {
  watched: {
    movies: SnakeCasedContentItem[];
    tv: SnakeCasedContentItem[];
    games: SnakeCasedContentItem[];
    books: SnakeCasedContentItem[];
    music: SnakeCasedContentItem[];
  };
  /** If set, only show items for this specific day. undefined = show all */
  selectedDay?: string | null | undefined;
  /** Called when user wants to clear the day filter */
  onClearDay?: () => void;
}

const PAGE_SIZE = 8;

export function RecentActivityList({ watched, selectedDay, onClearDay }: Props) {
  const t = useTranslations('ProfileStatsHeatmap');
  const locale = useLocale();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Build all consumed items sorted by date descending
  const allSortedItems = useMemo(() => {
    const all = [
      ...watched.movies,
      ...watched.tv,
      ...watched.games,
      ...watched.books,
      ...watched.music,
    ];
    const consumed = all.filter((item) => item.is_consumed && item.user_date);

    return consumed.sort((a, b) => {
      const da = new Date(a.user_date!).getTime();
      const db = new Date(b.user_date!).getTime();
      return db - da;
    });
  }, [watched.movies, watched.tv, watched.games, watched.books, watched.music]);

  // Filter by selected day if provided
  const displayItems = useMemo(() => {
    if (selectedDay) {
      return allSortedItems.filter((item) => {
        if (!item.user_date) return false;
        const key = new Date(item.user_date).toISOString().slice(0, 10);
        return key === selectedDay;
      });
    }
    return allSortedItems;
  }, [allSortedItems, selectedDay]);

  // Group items by date
  const groupedByDate = useMemo(() => {
    const itemsToShow = displayItems.slice(0, visibleCount);
    const groups: { date: string; items: SnakeCasedContentItem[] }[] = [];
    let currentDate = '';

    for (const item of itemsToShow) {
      const dateKey = new Date(item.user_date!).toISOString().slice(0, 10);
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ date: dateKey, items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    }

    return groups;
  }, [displayItems, visibleCount]);

  const hasMore = displayItems.length > visibleCount;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  // Reset visible count when selectedDay changes
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedDay]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
    const isYesterday = date.toISOString().slice(0, 10) === yesterday.toISOString().slice(0, 10);

    if (isToday) return t('today');
    if (isYesterday) return t('yesterday');

    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      weekday: 'short',
    });
  };

  return (
    <div className="glass-card p-5 bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.05] relative overflow-hidden h-full flex flex-col">
      <div className="absolute top-0 left-0 -ml-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
          {t('recentActivity')}
        </h3>
        {selectedDay && onClearDay && (
          <button
            type="button"
            onClick={onClearDay}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 px-3 py-1 rounded-lg border border-violet-500/20"
          >
            {t('showAll')}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar relative z-10">
        {groupedByDate.length > 0 ? (
          <>
            {groupedByDate.map((group) => (
              <div key={group.date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-[11px] font-semibold text-white/60 uppercase tracking-wider whitespace-nowrap">
                    {formatDateHeader(group.date)}
                  </div>
                  <div className="flex-1 h-px bg-white/10" />
                  <div className="text-[10px] text-white/30 font-medium">{group.items.length}</div>
                </div>

                {/* Items for this date */}
                <div className="space-y-1.5">
                  {group.items.map((item, index) => (
                    <div
                      key={`${item.id ?? normalizeTitle(item)}-${index}`}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-all px-3 py-2 group"
                    >
                      <div className="flex-shrink-0 w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white/70 group-hover:bg-white/10 transition-colors">
                        {getContentTypeIcon(getContentTypeName(item))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/90 font-medium truncate group-hover:text-violet-200 transition-colors">
                          {normalizeTitle(item)}
                        </div>
                        <div className="text-[10px] text-white/35 font-medium tracking-wider uppercase">
                          {contentTypeLabel(getContentTypeName(item), t)}
                        </div>
                      </div>
                      {item.user_rating && (
                        <div className="flex-shrink-0 flex items-center gap-0.5 text-[11px] font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                          ★ {item.user_rating}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-white/60 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] rounded-lg border border-white/5 transition-all group"
              >
                <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                {t('loadMore')}
              </button>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-8">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <span className="text-xl">📅</span>
            </div>
            <div className="text-sm text-white/60">{t('noContentThisDay')}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function contentTypeLabel(type: string, t: any): string {
  if (type === 'MOVIE') return t('contentTypes.MOVIE');
  if (type === 'TV') return t('contentTypes.TV');
  if (type === 'GAME') return t('contentTypes.GAME');
  if (type === 'BOOK') return t('contentTypes.BOOK');
  if (type === 'MUSIC') return t('contentTypes.MUSIC');
  return t('contentTypes.DEFAULT');
}

function getContentTypeIcon(type: string) {
  if (type === 'MOVIE') return <Clapperboard className="w-3.5 h-3.5" />;
  if (type === 'TV') return <Tv2 className="w-3.5 h-3.5" />;
  if (type === 'GAME') return <Gamepad2 className="w-3.5 h-3.5" />;
  if (type === 'BOOK') return <BookOpenText className="w-3.5 h-3.5" />;
  if (type === 'MUSIC') return <Music className="w-3.5 h-3.5" />;
  return <div className="w-3.5 h-3.5" />;
}
