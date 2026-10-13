/**
 * StatsHeatmapSection — GitHub-style yıllık aktivite heatmap
 * Son 365 günün tüketim aktivitesini grid olarak gösterir.
 */

'use client';

import React, { useMemo, useState } from 'react';
import type { SnakeCasedContentItem } from '../StatsTabTypes';
import { buildHeatmapGrid, heatmapColor } from '../statsTabUtils';
import { useTranslations } from 'next-intl';
import {
  Clapperboard,
  Tv2,
  Gamepad2,
  BookOpenText,
  Music,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface Props {
  watched: {
    movies: SnakeCasedContentItem[];
    tv: SnakeCasedContentItem[];
    games: SnakeCasedContentItem[];
    books: SnakeCasedContentItem[];
    music: SnakeCasedContentItem[];
  };
  selectedDay?: string | null;
  onSelectDay?: (day: string) => void;
}

export function StatsHeatmapSection({
  watched,
  selectedDay: externalSelectedDay,
  onSelectDay,
}: Props) {
  const t = useTranslations('ProfileStatsHeatmap');

  const MONTH_LABELS = t.raw('months') as string[];
  const DAY_LABELS = t.raw('days') as string[];

  const fallbackYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(fallbackYear);
  const [internalSelectedDay, setInternalSelectedDay] = useState<string | null>(null);
  const [onlyConsumed, setOnlyConsumed] = useState<boolean>(true);

  const handleSelectDay = (day: string) => {
    if (onSelectDay) {
      onSelectDay(day);
    } else {
      setInternalSelectedDay(day);
    }
  };

  const { allItems, heatmap, availableYears } = useMemo(() => {
    const allItems = [
      ...watched.movies,
      ...watched.tv,
      ...watched.games,
      ...watched.books,
      ...watched.music,
    ];
    const filteredItems = onlyConsumed ? allItems.filter((item) => item.is_consumed) : allItems;

    const dayKeys: string[] = [];
    const years = new Set<number>();

    for (const item of filteredItems) {
      if (!item.user_date) continue;
      const d = new Date(item.user_date);
      if (isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      dayKeys.push(key);
      years.add(d.getFullYear());
    }

    const grid = buildHeatmapGrid(dayKeys);
    const sortedYears = Array.from(years).sort((a, b) => b - a);
    if (sortedYears.length === 0) {
      sortedYears.push(fallbackYear);
    }

    return {
      allItems: filteredItems,
      heatmap: grid,
      availableYears: sortedYears,
    };
  }, [
    watched.movies,
    watched.tv,
    watched.games,
    watched.books,
    watched.music,
    onlyConsumed,
    fallbackYear,
  ]);

  const currentYear = availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears[0] ?? fallbackYear);

  const yearDays = useMemo(() => {
    const days: string[] = [];
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31);

    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      days.push(new Date(cursor).toISOString().slice(0, 10));
    }

    return days;
  }, [currentYear]);

  const firstActiveDay = useMemo(
    () => [...yearDays].reverse().find((day) => (heatmap.get(day) ?? 0) > 0) ?? null,
    [heatmap, yearDays]
  );
  const selectedDay =
    externalSelectedDay !== undefined
      ? externalSelectedDay
      : internalSelectedDay?.startsWith(`${currentYear}-`)
        ? internalSelectedDay
        : firstActiveDay;

  const totalThisYear = useMemo(
    () => allItems.filter((item) => getYearFromItem(item) === currentYear).length,
    [allItems, currentYear]
  );

  // Per-type stats for the selected year
  const typeStats = useMemo(() => {
    const yearFilter = (items: SnakeCasedContentItem[]) => {
      const filtered = onlyConsumed ? items.filter((i) => i.is_consumed) : items;
      return filtered.filter((i) => getYearFromItem(i) === currentYear).length;
    };
    return {
      movies: yearFilter(watched.movies),
      tv: yearFilter(watched.tv),
      games: yearFilter(watched.games),
      books: yearFilter(watched.books),
      music: yearFilter(watched.music),
    };
  }, [
    watched.movies,
    watched.tv,
    watched.games,
    watched.books,
    watched.music,
    currentYear,
    onlyConsumed,
  ]);

  // Most active month
  const mostActiveMonth = useMemo(() => {
    const monthCounts = new Array(12).fill(0);
    allItems.forEach((item) => {
      if (getYearFromItem(item) === currentYear && item.user_date) {
        const m = new Date(item.user_date).getMonth();
        monthCounts[m]++;
      }
    });
    const maxIdx = monthCounts.indexOf(Math.max(...monthCounts));
    return { month: MONTH_LABELS[maxIdx], count: monthCounts[maxIdx] };
  }, [allItems, currentYear, MONTH_LABELS]);

  // Active days count
  const activeDaysCount = useMemo(() => {
    const days = new Set<string>();
    allItems.forEach((item) => {
      if (getYearFromItem(item) === currentYear && item.user_date) {
        days.add(new Date(item.user_date).toISOString().slice(0, 10));
      }
    });
    return days.size;
  }, [allItems, currentYear]);

  // Group days into weeks (columns of 7)
  const weeks: string[][] = [];
  let week: string[] = [];

  const firstDay = new Date(yearDays[0]);
  const firstDow = firstDay.getDay();
  for (let i = 0; i < firstDow; i++) week.push('');

  for (const day of yearDays) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push('');
    weeks.push(week);
  }

  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((wk, colIdx) => {
    const firstFilledDay = wk.find((d) => d !== '');
    if (!firstFilledDay) return;
    const m = new Date(firstFilledDay).getMonth();
    if (m !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[m], col: colIdx });
      lastMonth = m;
    }
  });

  return (
    <div className="glass-card p-5 bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.05] relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col space-y-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <h3 className="text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              {t('title')}
            </h3>

            <div className="flex items-center gap-4 border-l border-white/10 pl-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-xs text-white/70 group-hover:text-white transition-colors select-none">
                  {t('onlyConsumed')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={onlyConsumed}
                  onClick={() => setOnlyConsumed((prev) => !prev)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${
                    onlyConsumed ? 'bg-violet-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
                      onlyConsumed ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    const index = availableYears.indexOf(currentYear);
                    if (index < availableYears.length - 1)
                      setSelectedYear(availableYears[index + 1]);
                  }}
                  disabled={availableYears.indexOf(currentYear) >= availableYears.length - 1}
                  className="px-2 py-1 rounded-l-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors"
                >
                  ←
                </button>
                <div className="px-2 py-1 text-xs text-white min-w-[50px] text-center font-medium">
                  {currentYear}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const index = availableYears.indexOf(currentYear);
                    if (index > 0) setSelectedYear(availableYears[index - 1]);
                  }}
                  disabled={availableYears.indexOf(currentYear) <= 0}
                  className="px-2 py-1 rounded-r-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto min-w-0">
          <div className="min-w-max">
            <div className="flex mb-1 ml-8">
              {weeks.map((_, colIdx) => {
                const mp = monthPositions.find((m) => m.col === colIdx);
                return (
                  <div
                    key={colIdx}
                    className="w-3 flex-shrink-0 text-[9px] text-white/40 text-center"
                  >
                    {mp ? mp.label : ''}
                  </div>
                );
              })}
            </div>

            <div className="flex">
              <div className="flex flex-col mr-1">
                {DAY_LABELS.map((label, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="h-3 w-7 text-[9px] text-white/40 flex items-center justify-end pr-1"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="flex gap-[2px]">
                {weeks.map((wk, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-[2px]">
                    {wk.map((day, rowIdx) => {
                      if (!day) {
                        return <div key={rowIdx} className="w-3 h-3 rounded-[2px]" />;
                      }
                      const count = heatmap.get(day) ?? 0;
                      const isSelected = day === selectedDay;
                      return (
                        <button
                          key={rowIdx}
                          type="button"
                          title={`${day}: ${count} içerik`}
                          onClick={() => handleSelectDay(day)}
                          className={`w-3 h-3 rounded-[3px] ${heatmapColor(count)} ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black/50 z-10 relative scale-110' : ''} transition-all duration-200 hover:scale-125 hover:z-10`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Summary */}
        <div className="flex items-center justify-between ml-8 pr-2">
          <div className="text-xs font-medium text-white/70 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
            {t('yearSummary', { year: currentYear })}:{' '}
            <span className="text-white font-bold">
              {t('totalItems', { count: totalThisYear })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium tracking-wide uppercase">
            <span>{t('less')}</span>
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className={`w-2.5 h-2.5 rounded-[2px] ${heatmapColor(n)}`} />
            ))}
            <span>{t('more')}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {/* Type breakdown */}
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('contentTypes.MOVIE')}
            </div>
            <div className="flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-rose-400/70" />
              <span className="text-lg font-bold text-white">{typeStats.movies}</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('contentTypes.TV')}
            </div>
            <div className="flex items-center gap-2">
              <Tv2 className="w-4 h-4 text-blue-400/70" />
              <span className="text-lg font-bold text-white">{typeStats.tv}</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('contentTypes.GAME')}
            </div>
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-green-400/70" />
              <span className="text-lg font-bold text-white">{typeStats.games}</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('contentTypes.BOOK')}
            </div>
            <div className="flex items-center gap-2">
              <BookOpenText className="w-4 h-4 text-amber-400/70" />
              <span className="text-lg font-bold text-white">{typeStats.books}</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('contentTypes.MUSIC')}
            </div>
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-pink-400/70" />
              <span className="text-lg font-bold text-white">{typeStats.music}</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('bestMonth')}
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400/70" />
              <span className="text-sm font-bold text-white">{mostActiveMonth.month}</span>
              <span className="text-[10px] text-white/40">({mostActiveMonth.count})</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-2">
            <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              {t('activeDays')}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400/70" />
              <span className="text-lg font-bold text-white">{activeDaysCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getYearFromItem(item: SnakeCasedContentItem): number | null {
  if (!item.user_date) return null;
  const date = new Date(item.user_date);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear();
}
