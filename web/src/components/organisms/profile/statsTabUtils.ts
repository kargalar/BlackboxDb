/**
 * StatsTab — Pure utility functions
 * No React dependencies — safe for use in hooks, tests, etc.
 */

import type { SnakeCasedContentItem, TimeRangeKey } from './StatsTabTypes';

// ── Date helpers ──────────────────────────────────────────

export function safeMonthKey(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}

export function getYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

// ── Content helpers ───────────────────────────────────────

export function normalizeTitle(item: SnakeCasedContentItem): string {
  return item.title || item.name || 'Untitled';
}

export function normalizeRating(item: SnakeCasedContentItem): number | null {
  const v = item.user_rating;
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return Math.max(1, Math.min(10, v));
}

export function getTimeRangeStart(timeRange: TimeRangeKey, now = new Date()): Date {
  switch (timeRange) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case 'week': {
      const d = new Date(now);
      const day = d.getDay();
      const diff = (day + 6) % 7;
      d.setDate(d.getDate() - diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case '6m': {
      const d = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'year': {
      const d = new Date(now.getFullYear(), 0, 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'all':
    default:
      return new Date(0);
  }
}

export function isTrackedConsumption(item: SnakeCasedContentItem): boolean {
  return Boolean(
    item.is_consumed ||
    item.is_abandoned ||
    item.is_continuing ||
    normalizeRating(item) !== null ||
    (item.playtime_minutes ?? 0) > 0
  );
}

export function isInTimeRange(
  dateStr: string | null | undefined,
  startDate: Date,
  includeUndated = false
): boolean {
  if (!dateStr) return includeUndated;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  return date >= startDate;
}

export function getContentTypeName(item: SnakeCasedContentItem): string {
  if (typeof item.content_type === 'string' && item.content_type.trim()) {
    return item.content_type.toUpperCase();
  }

  if (item.content_type && typeof item.content_type === 'object' && item.content_type.name) {
    return item.content_type.name.toUpperCase();
  }

  switch (item.content_type_id) {
    case 1:
      return 'MOVIE';
    case 2:
      return 'TV';
    case 3:
      return 'GAME';
    case 4:
      return 'BOOK';
    case 5:
      return 'MUSIC';
    default:
      return 'UNKNOWN';
  }
}

export function formatRatingValue(rating: number): string {
  return Number.isInteger(rating) ? `${rating}` : rating.toFixed(1);
}

// ── Math helpers ──────────────────────────────────────────

export function computeWeightedAverage(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  const s = nums.reduce((a, b) => a + b, 0);
  return s / nums.length;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ── Palette ───────────────────────────────────────────────

export function makeColorPalette(size: number): string[] {
  const base = [
    '#8B5CF6', // violet
    '#3B82F6', // blue
    '#22C55E', // green
    '#F97316', // orange
    '#EF4444', // red
    '#06B6D4', // cyan
    '#F59E0B', // amber
    '#EC4899', // pink
  ];

  const out: string[] = [];
  for (let i = 0; i < size; i += 1) out.push(base[i % base.length]);
  return out;
}

// ── Streak computation ────────────────────────────────────

export function computeStreak(dayKeys: string[]): { current: number; best: number } {
  if (dayKeys.length === 0) return { current: 0, best: 0 };

  const days = Array.from(new Set(dayKeys)).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  // Current streak: end at today or yesterday
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const last = days[days.length - 1];
  if (last !== todayKey && last !== yesterdayKey) return { current: 0, best };

  let current = 1;
  for (let i = days.length - 2; i >= 0; i -= 1) {
    const a = new Date(days[i]);
    const b = new Date(days[i + 1]);
    const diffDays = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) current += 1;
    else break;
  }

  return { current, best };
}

// ── Formatting & comparison ───────────────────────────────

export function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

export function estimatePercentile(value: number, p50: number, p90: number, p99: number): number {
  // Simple piecewise linear estimate.
  // Returns a number in [1..99]. This is intentionally labeled as "tahmini".
  if (value <= 0) return 1;
  if (value <= p50) return clamp((value / Math.max(1, p50)) * 50, 1, 50);
  if (value <= p90) return 50 + clamp(((value - p50) / Math.max(1, p90 - p50)) * 40, 0, 40);
  if (value <= p99) return 90 + clamp(((value - p90) / Math.max(1, p99 - p90)) * 9, 0, 9);
  return 99;
}

export function compareLabel(p: number): string {
  if (p >= 95) return 'in the top tier';
  if (p >= 80) return 'in the high tier';
  if (p >= 50) return 'above average';
  if (p >= 20) return 'around average';
  return 'at beginner level';
}

// ── Runtime Formatting ────────────────────────────────────

/** Formats total minutes into a human-readable string like "142 h 35 m" */
export function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} m`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} m`;
}

/** Formats total minutes as days: "5.2 days" */
export function formatAsDays(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 days';
  const days = totalMinutes / (60 * 24);
  if (days < 1) return `${formatMinutes(totalMinutes)}`;
  return `${days.toFixed(1)} days`;
}

/** Returns a short label for a rating delta: "+2.4 ▲" or "-1.8 ▼" */
export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  const arrow = delta >= 0 ? '▲' : '▼';
  return `${sign}${delta.toFixed(1)} ${arrow}`;
}

/** Generate a heatmap grid of 365 days, keyed YYYY-MM-DD → count */
export function buildHeatmapGrid(dayKeys: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const key of dayKeys) {
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** Returns ISO date strings for the past N days */
export function getPastDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/** Returns YYYY-MM-DD array for week headers (Sunday starts) */
export function getWeekHeaders(days: string[]): string[] {
  const seen = new Set<string>();
  return days.filter((d) => {
    const week = new Date(d).getDay() === 0 ? d : null;
    if (week && !seen.has(week)) {
      seen.add(week);
      return true;
    }
    return false;
  });
}

/**
 * Maps the stats page content type filter key to the explore page URL slug.
 * "all" defaults to "movie" (the generic explore page fallback).
 */
export function filterToExploreSlug(contentTypeFilter: string): string {
  const map: Record<string, string> = {
    movies: 'movie',
    tv: 'tv',
    games: 'game',
    books: 'book',
    music: 'music',
    all: 'movie',
  };
  return map[contentTypeFilter] ?? 'movie';
}

/** Heatmap intensity class based on count */
export function heatmapColor(count: number): string {
  if (count === 0) return 'bg-white/5';
  if (count === 1) return 'bg-violet-900/60';
  if (count === 2) return 'bg-violet-700/70';
  if (count <= 4) return 'bg-violet-500/80';
  return 'bg-violet-400';
}
