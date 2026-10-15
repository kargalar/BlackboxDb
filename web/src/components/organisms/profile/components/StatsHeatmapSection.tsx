'use client';

import React, { useMemo, useState } from 'react';
import type { SnakeCasedContentItem } from '../StatsTabTypes';
import { buildHeatmapGrid, heatmapColor, getContentTypeName } from '../statsTabUtils';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  HeatmapFilterBar,
  DetailedMetrics,
  MediaTypeBreakdown,
  MonthlyDistributionChart,
  type ActivityFilterType,
} from './HeatmapDetailedViews';
import { DayActivityInspector } from './HeatmapDayInspector';

export interface StatsHeatmapSectionProps {
  watched: {
    movies: SnakeCasedContentItem[];
    tv: SnakeCasedContentItem[];
    games: SnakeCasedContentItem[];
    books: SnakeCasedContentItem[];
  };
  selectedDay?: string | null | undefined;
  onSelectDay?: (day: string | undefined) => void;
  variant?: 'compact' | 'detailed';
}

export function StatsHeatmapSection({
  watched,
  selectedDay: externalSelectedDay,
  onSelectDay,
  variant = 'detailed',
}: StatsHeatmapSectionProps) {
  const t = useTranslations('ProfileStatsHeatmap');
  const locale = useLocale();
  const isCompact = variant === 'compact';

  const MONTH_LABELS = t.raw('months') as string[];
  const DAY_LABELS = t.raw('days') as string[];

  const fallbackYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(fallbackYear);
  const [internalSelectedDay, setInternalSelectedDay] = useState<string | undefined>(undefined);
  const [onlyConsumed, setOnlyConsumed] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<ActivityFilterType>('all');

  const handleSelectDay = (day: string) => {
    const isCurrentlySelected = selectedDay === day;
    const nextDay = isCurrentlySelected ? undefined : day;
    if (onSelectDay) {
      onSelectDay(nextDay);
    } else {
      setInternalSelectedDay(nextDay);
    }
  };

  const isConsumed = (item: SnakeCasedContentItem): boolean =>
    Boolean(item.is_consumed ?? (item as any).isConsumed);

  // All items across types
  const allFilteredItems = useMemo(() => {
    const list = [
      ...watched.movies,
      ...watched.tv,
      ...watched.games,
      ...watched.books,
    ];
    return onlyConsumed ? list.filter(isConsumed) : list;
  }, [
    watched.movies,
    watched.tv,
    watched.games,
    watched.books,
    onlyConsumed,
  ]);

  // Available years from user activities
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const item of allFilteredItems) {
      const year = getYearFromItem(item);
      if (year) years.add(year);
    }
    const sorted = Array.from(years).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [fallbackYear];
  }, [allFilteredItems, fallbackYear]);

  const currentYear = availableYears.includes(selectedYear)
    ? selectedYear
    : (availableYears[0] ?? fallbackYear);

  // Active items considering media filter in detailed mode
  const activeItems = useMemo(() => {
    if (isCompact || filterType === 'all') {
      return allFilteredItems;
    }
    return allFilteredItems.filter((item) => {
      const t = getContentTypeName(item);
      if (filterType === 'movies') return t === 'MOVIE';
      if (filterType === 'tv') return t === 'TV';
      if (filterType === 'games') return t === 'GAME';
      if (filterType === 'books') return t === 'BOOK';
      return true;
    });
  }, [allFilteredItems, filterType, isCompact]);

  // Heatmap grid map for active items
  const heatmap = useMemo(() => {
    const dayKeys: string[] = [];
    for (const item of activeItems) {
      if (!item.user_date) continue;
      const d = new Date(item.user_date);
      if (isNaN(d.getTime())) continue;
      dayKeys.push(d.toISOString().slice(0, 10));
    }
    return buildHeatmapGrid(dayKeys);
  }, [activeItems]);

  // Days in current selected year
  const yearDays = useMemo(() => {
    const days: string[] = [];
    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31);
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      days.push(new Date(cursor).toISOString().slice(0, 10));
    }
    return days;
  }, [currentYear]);

  const selectedDay =
    externalSelectedDay !== undefined
      ? externalSelectedDay
      : (internalSelectedDay?.startsWith(`${currentYear}-`) ? internalSelectedDay : null);

  const totalThisYear = useMemo(
    () => activeItems.filter((item) => getYearFromItem(item) === currentYear).length,
    [activeItems, currentYear]
  );

  // Per-type stats for the selected year
  const typeStats = useMemo(() => {
    const countForType = (items: SnakeCasedContentItem[]) => {
      const filtered = onlyConsumed ? items.filter(isConsumed) : items;
      return filtered.filter((i) => getYearFromItem(i) === currentYear).length;
    };
    return {
      movies: countForType(watched.movies),
      tv: countForType(watched.tv),
      games: countForType(watched.games),
      books: countForType(watched.books),
    };
  }, [
    watched.movies,
    watched.tv,
    watched.games,
    watched.books,
    currentYear,
    onlyConsumed,
  ]);

  // Monthly counts for distribution
  const monthlyCounts = useMemo(() => {
    const counts = new Array(12).fill(0);
    activeItems.forEach((item) => {
      if (getYearFromItem(item) === currentYear && item.user_date) {
        const m = new Date(item.user_date).getMonth();
        counts[m]++;
      }
    });
    return counts;
  }, [activeItems, currentYear]);

  // Most active month
  const mostActiveMonth = useMemo(() => {
    const maxVal = Math.max(...monthlyCounts);
    const maxIdx = monthlyCounts.indexOf(maxVal);
    return {
      month: MONTH_LABELS[maxIdx] ?? '',
      count: maxVal,
    };
  }, [monthlyCounts, MONTH_LABELS]);

  // Active days count
  const activeDaysCount = useMemo(() => {
    const days = new Set<string>();
    activeItems.forEach((item) => {
      if (getYearFromItem(item) === currentYear && item.user_date) {
        days.add(new Date(item.user_date).toISOString().slice(0, 10));
      }
    });
    return days.size;
  }, [activeItems, currentYear]);

  // Streak calculations
  const streakInfo = useMemo(
    () => computeYearStreaks(yearDays, heatmap, currentYear),
    [yearDays, heatmap, currentYear]
  );

  // Group days into weeks
  const weeks = useMemo(() => {
    const result: string[][] = [];
    let week: string[] = [];
    const firstDow = new Date(yearDays[0]).getDay();
    for (let i = 0; i < firstDow; i++) week.push('');

    for (const day of yearDays) {
      week.push(day);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push('');
      result.push(week);
    }
    return result;
  }, [yearDays]);

  const monthPositions = useMemo(() => {
    const positions: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((wk, colIdx) => {
      const firstFilledDay = wk.find((d) => d !== '');
      if (!firstFilledDay) return;
      const m = new Date(firstFilledDay).getMonth();
      if (m !== lastMonth) {
        positions.push({ label: MONTH_LABELS[m] ?? '', col: colIdx });
        lastMonth = m;
      }
    });
    return positions;
  }, [weeks, MONTH_LABELS]);

  // Selected day items for inspector
  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    return activeItems.filter((item) => {
      if (!item.user_date) return false;
      const d = new Date(item.user_date);
      if (isNaN(d.getTime())) return false;
      return d.toISOString().slice(0, 10) === selectedDay;
    });
  }, [activeItems, selectedDay]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDay) return '';
    try {
      const [y, m, d] = selectedDay.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDay;
    }
  }, [selectedDay, locale]);

  return (
    <div className="glass-card p-5 bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.05] relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="flex flex-col space-y-5 relative z-10">
        {/* Header */}
        <HeatmapHeader
          title={t('title')}
          currentYear={currentYear}
          availableYears={availableYears}
          onSelectYear={setSelectedYear}
          onlyConsumed={onlyConsumed}
          onToggleConsumed={() => setOnlyConsumed((prev) => !prev)}
          onlyConsumedLabel={t('onlyConsumed')}
        />

        {/* Detailed Mode: Media Filter Bar */}
        {!isCompact && (
          <HeatmapFilterBar
            filterType={filterType}
            onSelectFilter={setFilterType}
            t={t}
            typeStats={typeStats}
            totalThisYear={totalThisYear}
          />
        )}

        {/* Detailed Mode: Key Metrics */}
        {!isCompact && (
          <DetailedMetrics
            totalThisYear={totalThisYear}
            activeDaysCount={activeDaysCount}
            totalDays={yearDays.length}
            longestStreak={streakInfo.longest}
            mostActiveMonth={mostActiveMonth}
            t={t}
          />
        )}

        {/* Calendar Grid */}
        <HeatmapGrid
          weeks={weeks}
          monthPositions={monthPositions}
          dayLabels={DAY_LABELS}
          heatmap={heatmap}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
          itemsCountLabel={(count) => t('itemsCount', { count })}
        />

        {/* Legend & Summary */}
        <HeatmapLegend
          showSummary={!isCompact}
          currentYear={currentYear}
          totalThisYear={totalThisYear}
          yearSummaryLabel={t('yearSummary', { year: currentYear })}
          totalItemsLabel={t('totalItems', { count: totalThisYear })}
          lessLabel={t('less')}
          moreLabel={t('more')}
        />

        {/* Detailed Mode: Media Type Breakdown */}
        {!isCompact && (
          <MediaTypeBreakdown
            typeStats={typeStats}
            totalThisYear={totalThisYear}
            t={t}
          />
        )}

        {/* Detailed Mode: Monthly Distribution */}
        {!isCompact && (
          <MonthlyDistributionChart
            monthlyCounts={monthlyCounts}
            monthLabels={MONTH_LABELS}
            title={t('monthlyDistribution')}
          />
        )}

        {/* Detailed Mode: Interactive Day Inspector */}
        {!isCompact && (
          <DayActivityInspector
            selectedDay={selectedDay}
            formattedDate={formattedSelectedDate}
            items={selectedDayItems}
            onClearDay={() => handleSelectDay(selectedDay ?? '')}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

function HeatmapHeader({
  title,
  currentYear,
  availableYears,
  onSelectYear,
  onlyConsumed,
  onToggleConsumed,
  onlyConsumedLabel,
}: {
  title: string;
  currentYear: number;
  availableYears: number[];
  onSelectYear: (year: number) => void;
  onlyConsumed: boolean;
  onToggleConsumed: () => void;
  onlyConsumedLabel: string;
}) {
  const currentIndex = availableYears.indexOf(currentYear);
  const canGoPrev = currentIndex < availableYears.length - 1;
  const canGoNext = currentIndex > 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <h3 className="text-lg font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
        {title}
      </h3>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer group">
          <span className="text-xs text-white/70 group-hover:text-white transition-colors select-none">
            {onlyConsumedLabel}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={onlyConsumed}
            onClick={onToggleConsumed}
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

        <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/5 p-0.5">
          <button
            type="button"
            onClick={() => canGoPrev && onSelectYear(availableYears[currentIndex + 1])}
            disabled={!canGoPrev}
            className="p-1 rounded text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-2 py-0.5 text-xs text-white min-w-[48px] text-center font-semibold">
            {currentYear}
          </div>
          <button
            type="button"
            onClick={() => canGoNext && onSelectYear(availableYears[currentIndex - 1])}
            disabled={!canGoNext}
            className="p-1 rounded text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function HeatmapGrid({
  weeks,
  monthPositions,
  dayLabels,
  heatmap,
  selectedDay,
  onSelectDay,
  itemsCountLabel,
}: {
  weeks: string[][];
  monthPositions: { label: string; col: number }[];
  dayLabels: string[];
  heatmap: Map<string, number>;
  selectedDay?: string | null;
  onSelectDay: (day: string) => void;
  itemsCountLabel: (count: number) => string;
}) {
  return (
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
            {dayLabels.map((label, rowIdx) => (
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
                      title={`${day}: ${itemsCountLabel(count)}`}
                      onClick={() => onSelectDay(day)}
                      className={`w-3 h-3 rounded-[3px] ${heatmapColor(count)} ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-black/50 z-10 relative scale-125 shadow-lg'
                          : ''
                      } transition-all duration-150 hover:scale-125 hover:z-10`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeatmapLegend({
  showSummary,
  totalThisYear,
  yearSummaryLabel,
  totalItemsLabel,
  lessLabel,
  moreLabel,
}: {
  showSummary: boolean;
  currentYear: number;
  totalThisYear: number;
  yearSummaryLabel: string;
  totalItemsLabel: string;
  lessLabel: string;
  moreLabel: string;
}) {
  return (
    <div
      className={`flex items-center ${
        showSummary ? 'justify-between' : 'justify-end'
      } ml-8 pr-2`}
    >
      {showSummary && (
        <div className="text-xs font-medium text-white/70 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
          {yearSummaryLabel}:{' '}
          <span className="text-white font-bold">{totalItemsLabel}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium tracking-wide uppercase">
        <span>{lessLabel}</span>
        {[0, 1, 2, 3, 4].map((n) => (
          <div key={n} className={`w-2.5 h-2.5 rounded-[2px] ${heatmapColor(n)}`} />
        ))}
        <span>{moreLabel}</span>
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

function computeYearStreaks(
  yearDays: string[],
  heatmap: Map<string, number>,
  currentYear: number
): { longest: number; current: number } {
  let longest = 0;
  let running = 0;

  for (const day of yearDays) {
    const count = heatmap.get(day) ?? 0;
    if (count > 0) {
      running++;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  const now = new Date();
  if (now.getFullYear() === currentYear) {
    const todayStr = now.toISOString().slice(0, 10);
    const todayIdx = yearDays.indexOf(todayStr);
    if (todayIdx !== -1) {
      let startIdx = todayIdx;
      if (
        (heatmap.get(yearDays[todayIdx]) ?? 0) === 0 &&
        todayIdx > 0 &&
        (heatmap.get(yearDays[todayIdx - 1]) ?? 0) > 0
      ) {
        startIdx = todayIdx - 1;
      }
      for (let i = startIdx; i >= 0; i--) {
        if ((heatmap.get(yearDays[i]) ?? 0) > 0) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  return { longest, current: currentStreak };
}
