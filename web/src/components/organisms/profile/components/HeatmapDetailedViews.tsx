'use client';

import React from 'react';
import {
  Clapperboard,
  Tv2,
  Gamepad2,
  BookOpenText,
  TrendingUp,
  Calendar,
  Flame,
  Layers,
} from 'lucide-react';

export type ActivityFilterType = 'all' | 'movies' | 'tv' | 'games' | 'books';

export function HeatmapFilterBar({
  filterType,
  onSelectFilter,
  t,
  typeStats,
  totalThisYear,
}: {
  filterType: ActivityFilterType;
  onSelectFilter: (type: ActivityFilterType) => void;
  t: any;
  typeStats: { movies: number; tv: number; games: number; books: number };
  totalThisYear: number;
}) {
  const tabs: { key: ActivityFilterType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: 'all', label: t('contentTypes.ALL'), count: totalThisYear, icon: <Layers className="w-3.5 h-3.5" /> },
    { key: 'movies', label: t('contentTypes.MOVIE'), count: typeStats.movies, icon: <Clapperboard className="w-3.5 h-3.5" /> },
    { key: 'tv', label: t('contentTypes.TV'), count: typeStats.tv, icon: <Tv2 className="w-3.5 h-3.5" /> },
    { key: 'games', label: t('contentTypes.GAME'), count: typeStats.games, icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { key: 'books', label: t('contentTypes.BOOK'), count: typeStats.books, icon: <BookOpenText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
      {tabs.map((tab) => {
        const isActive = filterType === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectFilter(tab.key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function DetailedMetrics({
  totalThisYear,
  activeDaysCount,
  totalDays,
  longestStreak,
  mostActiveMonth,
  t,
}: {
  totalThisYear: number;
  activeDaysCount: number;
  totalDays: number;
  longestStreak: number;
  mostActiveMonth: { month: string; count: number };
  t: any;
}) {
  const activeRate = totalDays > 0 ? ((activeDaysCount / totalDays) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-violet-400" />
          {t('totalItems', { count: totalThisYear }).split(' ')[0]}
        </div>
        <div className="text-xl font-bold text-white">{totalThisYear}</div>
        <div className="text-[11px] text-white/40">{t('itemsCount', { count: totalThisYear })}</div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-cyan-400" />
          {t('activeDays')}
        </div>
        <div className="text-xl font-bold text-white">{activeDaysCount}</div>
        <div className="text-[11px] text-cyan-300/70">{t('shareOfYear', { pct: activeRate })}</div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Flame className="w-3 h-3 text-amber-400" />
          {t('longestStreak')}
        </div>
        <div className="text-xl font-bold text-white">{longestStreak}</div>
        <div className="text-[11px] text-amber-300/70">{t('daysCount', { count: longestStreak })}</div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-1">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-rose-400" />
          {t('bestMonth')}
        </div>
        <div className="text-xl font-bold text-white truncate">{mostActiveMonth.month || '—'}</div>
        <div className="text-[11px] text-rose-300/70">{t('itemsCount', { count: mostActiveMonth.count })}</div>
      </div>
    </div>
  );
}

export function MediaTypeBreakdown({
  typeStats,
  totalThisYear,
  t,
}: {
  typeStats: { movies: number; tv: number; games: number; books: number };
  totalThisYear: number;
  t: any;
}) {
  const items = [
    { label: t('contentTypes.MOVIE'), count: typeStats.movies, icon: <Clapperboard className="w-4 h-4 text-rose-400" />, barColor: 'bg-rose-500' },
    { label: t('contentTypes.TV'), count: typeStats.tv, icon: <Tv2 className="w-4 h-4 text-blue-400" />, barColor: 'bg-blue-500' },
    { label: t('contentTypes.GAME'), count: typeStats.games, icon: <Gamepad2 className="w-4 h-4 text-emerald-400" />, barColor: 'bg-emerald-500' },
    { label: t('contentTypes.BOOK'), count: typeStats.books, icon: <BookOpenText className="w-4 h-4 text-amber-400" />, barColor: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">
        {t('mediaBreakdown')}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {items.map((item) => {
          const pct = totalThisYear > 0 ? Math.round((item.count / totalThisYear) * 100) : 0;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-white/60 font-medium">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <span className="text-xs font-bold text-white">{item.count}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.barColor} transition-all duration-300 rounded-full`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-white/40 text-right font-medium">%{pct}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthlyDistributionChart({
  monthlyCounts,
  monthLabels,
  title,
}: {
  monthlyCounts: number[];
  monthLabels: string[];
  title: string;
}) {
  const maxVal = Math.max(...monthlyCounts, 1);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-white/50 uppercase tracking-wider">{title}</div>
      <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="grid grid-cols-12 gap-2 h-20 items-end">
          {monthlyCounts.map((count, idx) => {
            const heightPct = Math.max(8, Math.round((count / maxVal) * 100));
            return (
              <div key={idx} className="flex flex-col items-center gap-1 h-full justify-end group">
                <span className="text-[9px] text-white/40 group-hover:text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {count}
                </span>
                <div
                  className="w-full bg-violet-500/20 group-hover:bg-violet-500/50 border border-violet-500/30 rounded-t transition-all"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[10px] text-white/50 font-medium truncate w-full text-center">
                  {monthLabels[idx]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

