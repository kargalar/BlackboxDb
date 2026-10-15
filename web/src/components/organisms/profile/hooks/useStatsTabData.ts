/**
 * useStatsTabData — Custom hook that computes all StatsTab aggregations.
 * Extracts complex useMemo logic from the main component for SRP.
 */

import { useMemo } from 'react';
import type {
  ContentTypeLabel,
  ContentTypeFilterKey,
  TimeRangeKey,
  DateBucket,
  ComputedStats,
  ComparisonStats,
  ProfileStatsTabProps,
  SnakeCasedContentItem,
} from '../StatsTabTypes';
import {
  normalizeRating,
  computeWeightedAverage,
  getYear,
  computeStreak,
  estimatePercentile,
  getTimeRangeStart,
  isTrackedConsumption,
  isInTimeRange,
  getContentTypeName,
} from '../statsTabUtils';

interface UseStatsTabDataParams {
  watched: ProfileStatsTabProps['watched'];
  favorites: ProfileStatsTabProps['favorites'];
  contentTypeFilter: ContentTypeFilterKey;
  timeRange: TimeRangeKey;
}

interface UseStatsTabDataResult {
  computed: ComputedStats;
  comparison: ComparisonStats;
  allWatched: SnakeCasedContentItem[];
  allFavorites: SnakeCasedContentItem[];
}

function filterByType<T>(
  data: { movies: T[]; tv: T[]; games: T[]; books: T[] },
  filter: ContentTypeFilterKey
): T[] {
  if (filter === 'all')
    return [...data.movies, ...data.tv, ...data.games, ...data.books];
  switch (filter) {
    case 'movies':
      return data.movies;
    case 'tv':
      return data.tv;
    case 'games':
      return data.games;
    case 'books':
      return data.books;
    default:
      return [...data.movies, ...data.tv, ...data.games, ...data.books];
  }
}

export function useStatsTabData({
  watched,
  favorites,
  contentTypeFilter,
  timeRange,
}: UseStatsTabDataParams): UseStatsTabDataResult {
  const allWatched = useMemo(
    () => filterByType(watched, contentTypeFilter),
    [watched, contentTypeFilter]
  );

  const allFavorites = useMemo(
    () => filterByType(favorites, contentTypeFilter),
    [favorites, contentTypeFilter]
  );

  const computed = useMemo<ComputedStats>(() => {
    const now = new Date();
    const start = getTimeRangeStart(timeRange, now);
    const includeUndated = timeRange === 'all';

    const filteredInteractions = allWatched.filter((item) =>
      isInTimeRange(item.user_date, start, includeUndated)
    );
    const filteredFavorites = allFavorites.filter((item) =>
      isInTimeRange(item.user_date, start, includeUndated)
    );
    const filteredConsumed = filteredInteractions.filter(isTrackedConsumption);

    const monthMap = new Map<string, { count: number; ratings: number[] }>();
    const dayKeys: string[] = [];
    const ratingValues: Array<number | null> = [];
    let ratedCount = 0;
    const ratingBuckets = new Map<number, number>();
    const consumedTypeCounts = {
      movies: 0,
      tv: 0,
      games: 0,
      books: 0,
    };
    const typeCounts: Record<ContentTypeLabel, number> = {
      Movies: 0,
      TV: 0,
      Games: 0,
      Books: 0,
    };
    const favoriteCounts: Record<ContentTypeLabel, number> = {
      Movies: 0,
      TV: 0,
      Games: 0,
      Books: 0,
    };
    const releaseYearCounts = new Map<number, number>();
    const consumedYearCounts = new Map<number, { count: number; ratings: number[] }>();
    const genreCounts = new Map<string, number>();

    const continuingCount = filteredInteractions.filter((i) => !!i.is_continuing).length;
    const consumeLaterCount = filteredInteractions.filter((i) => !!i.is_consume_later).length;
    const favoritesInWatchedCount = filteredConsumed.filter((i) => !!i.is_favorite).length;

    const earliestConsumedDate =
      timeRange === 'all'
        ? filteredConsumed
            .map((item) => item.user_date)
            .filter((value): value is string => Boolean(value))
            .sort()[0]
        : undefined;

    for (const item of filteredInteractions) {
      const typeName = getContentTypeName(item);

      if (!isTrackedConsumption(item)) {
        continue;
      }

      if (typeName === 'MOVIE') typeCounts.Movies += 1;
      if (typeName === 'TV') typeCounts.TV += 1;
      if (typeName === 'GAME') typeCounts.Games += 1;
      if (typeName === 'BOOK') typeCounts.Books += 1;
      if (typeName === 'MOVIE') consumedTypeCounts.movies += 1;
      if (typeName === 'TV') consumedTypeCounts.tv += 1;
      if (typeName === 'GAME') consumedTypeCounts.games += 1;
      if (typeName === 'BOOK') consumedTypeCounts.books += 1;

      const userDate = item.user_date ? new Date(item.user_date) : null;
      if (userDate && !Number.isNaN(userDate.getTime())) {
        const userMonthKey =
          timeRange === '24h'
            ? `${userDate.getHours().toString().padStart(2, '0')}:00`
            : timeRange === 'week' || timeRange === 'month'
              ? userDate.toISOString().slice(5, 10)
              : `${userDate.getFullYear()}-${`${userDate.getMonth() + 1}`.padStart(2, '0')}`;
        const existing = monthMap.get(userMonthKey) || { count: 0, ratings: [] };
        existing.count += 1;
        const r = normalizeRating(item);
        if (r !== null) existing.ratings.push(r);
        monthMap.set(userMonthKey, existing);

        const dayKey = userDate.toISOString().slice(0, 10);
        dayKeys.push(dayKey);
      }

      const r = normalizeRating(item);
      ratingValues.push(r);
      if (r !== null) {
        ratedCount += 1;
        const bucket = Math.round(r * 2);
        ratingBuckets.set(bucket, (ratingBuckets.get(bucket) || 0) + 1);
      }

      const releaseYear = getYear(item.release_date);
      if (releaseYear) {
        releaseYearCounts.set(releaseYear, (releaseYearCounts.get(releaseYear) || 0) + 1);
      }

      const consumedYear = getYear(item.user_date);
      if (consumedYear) {
        const existing = consumedYearCounts.get(consumedYear) || { count: 0, ratings: [] };
        existing.count += 1;
        if (r !== null) existing.ratings.push(r);
        consumedYearCounts.set(consumedYear, existing);
      }

      const genres = item.genres || [];
      for (const g of genres) {
        const name = typeof g === 'string' ? g : g.name;
        if (!name) continue;
        const key = name.trim();
        if (!key) continue;
        genreCounts.set(key, (genreCounts.get(key) || 0) + 1);
      }
    }

    for (const item of filteredFavorites) {
      const typeName = getContentTypeName(item);
      if (typeName === 'MOVIE') favoriteCounts.Movies += 1;
      if (typeName === 'TV') favoriteCounts.TV += 1;
      if (typeName === 'GAME') favoriteCounts.Games += 1;
      if (typeName === 'BOOK') favoriteCounts.Books += 1;
    }

    const buckets: DateBucket[] = [];
    if (timeRange === '24h') {
      for (let i = 23; i >= 0; i -= 1) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        const entry = monthMap.get(key);
        buckets.push({
          month: key,
          count: entry?.count || 0,
          ratedCount: entry?.ratings.length || 0,
          avgRating: entry ? computeWeightedAverage(entry.ratings) : null,
        });
      }
    } else if (timeRange === 'week' || timeRange === 'month') {
      const cursor = new Date(start);
      const end = new Date(now);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(5, 10);
        const entry = monthMap.get(key);
        buckets.push({
          month: key,
          count: entry?.count || 0,
          ratedCount: entry?.ratings.length || 0,
          avgRating: entry ? computeWeightedAverage(entry.ratings) : null,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      const firstBucketStart =
        timeRange === 'all' && earliestConsumedDate
          ? new Date(
              new Date(earliestConsumedDate).getFullYear(),
              new Date(earliestConsumedDate).getMonth(),
              1
            )
          : new Date(start.getFullYear(), start.getMonth(), 1);

      const cursor = new Date(firstBucketStart);
      const end = new Date(now.getFullYear(), now.getMonth(), 1);
      while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, '0')}`;
        const entry = monthMap.get(key);
        buckets.push({
          month: key,
          count: entry?.count || 0,
          ratedCount: entry?.ratings.length || 0,
          avgRating: entry ? computeWeightedAverage(entry.ratings) : null,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    const ratingHistogram = Array.from({ length: 10 }).map((_, i) => {
      const rating = i + 1;
      return {
        rating,
        count: ratingBuckets.get(i + 1) || 0,
      };
    });

    const typePie = (Object.keys(typeCounts) as ContentTypeLabel[])
      .map((k) => ({ name: k, value: typeCounts[k] }))
      .filter((x) => x.value > 0);

    const favoritePie = (Object.keys(favoriteCounts) as ContentTypeLabel[])
      .map((k) => ({ name: k, value: favoriteCounts[k] }))
      .filter((x) => x.value > 0);

    const topGenres = Array.from(genreCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);

    const yearsConsumed = Array.from(consumedYearCounts.entries())
      .map(([year, value]) => ({
        year: `${year}`,
        value: value.count,
        avgRating: computeWeightedAverage(value.ratings),
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const yearsRelease = Array.from(releaseYearCounts.entries())
      .map(([year, value]) => ({ year: `${year}`, value }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const avgRatingAll = computeWeightedAverage(ratingValues);
    const streak = computeStreak(dayKeys);
    const completionPct =
      filteredConsumed.length === 0 ? 0 : (ratedCount / filteredConsumed.length) * 100;
    const favoriteFromWatchedPct =
      filteredConsumed.length === 0 ? 0 : (favoritesInWatchedCount / filteredConsumed.length) * 100;

    const result: ComputedStats = {
      monthSeries: buckets,
      ratingHistogram,
      typePie,
      favoritePie,
      topGenres,
      yearsConsumed,
      yearsRelease,
      avgRatingAll,
      ratedCount,
      streak,
      continuingCount,
      consumeLaterCount,
      favoritesInWatchedCount,
      completionPct,
      favoriteFromWatchedPct,
      totalWatched: filteredInteractions.length,
      totalConsumed: filteredConsumed.length,
      totalFavorites: filteredFavorites.length,
      consumedTypeCounts,
    };

    return result;
  }, [allFavorites, allWatched, timeRange]);

  const comparison = useMemo<ComparisonStats>(() => {
    const watchedP = estimatePercentile(computed.totalConsumed, 40, 150, 500);
    const favP = estimatePercentile(computed.totalFavorites, 10, 40, 120);
    const streakP = estimatePercentile(computed.streak.best, 7, 30, 120);
    const ratingP =
      computed.avgRatingAll === null
        ? null
        : estimatePercentile(computed.avgRatingAll, 3.2, 4.1, 4.8);

    return { watchedP, favP, streakP, ratingP };
  }, [
    computed.avgRatingAll,
    computed.streak.best,
    computed.totalConsumed,
    computed.totalFavorites,
  ]);

  return { computed, comparison, allWatched, allFavorites };
}
