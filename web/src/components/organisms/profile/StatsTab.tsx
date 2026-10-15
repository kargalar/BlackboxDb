'use client';

/**
 * StatsTab — Main orchestrator
 * Composes chart sections from extracted components.
 * Business logic lives in useStatsTabData; UI sections in StatsTabCharts.
 * Deep stats (directors, actors, publishers, themes, etc.) from useDeepStatsData.
 */

import React, { useMemo, useState } from 'react';
import { logApiRequest } from '@/lib/requestLogger';

import type { ProfileStatsTabProps, TimeRangeKey, ContentTypeFilterKey } from './StatsTabTypes';
import { makeColorPalette } from './statsTabUtils';
import { useStatsTabData } from './hooks/useStatsTabData';
import { useDeepStatsData } from './hooks/useDeepStatsData';
import {
  StatCard,
  MonthlyActivityChart,
  RatingHistogramChart,
  TypePieChart,
  FavoritePieChart,
  TopGenresChart,
  YearsChart,
  ComparisonSection,
  BehaviorSummarySection,
  BasicSummarySection,
} from './components/StatsTabCharts';

import { StatsTimeSummarySection } from './components/StatsTimeSummarySection';
import { StatsHeatmapSection } from './components/StatsHeatmapSection';
import { StatsDirectorActorSection } from './components/StatsDirectorActorSection';
import { StatsRatingComparisonSection } from './components/StatsRatingComparisonSection';
import { StatsPublisherDeveloperSection } from './components/StatsPublisherDeveloperSection';
import { StatsThemeMoodSection } from './components/StatsThemeMoodSection';
import { StatsFranchiseSection } from './components/StatsFranchiseSection';
import { StatsAgeRatingSection } from './components/StatsAgeRatingSection';
import { StatsAbandonSection } from './components/StatsAbandonSection';
import { StatsReviewSection } from './components/StatsReviewSection';
import { StatsCompatibilitySection } from './components/StatsCompatibilitySection';
import { StatsPopularContentSection } from './components/StatsPopularContentSection';
import { useTranslations } from 'next-intl';

// Re-export for consumers that import the props type from here
export type { ProfileStatsTabProps } from './StatsTabTypes';

export default function StatsTab({
  username,
  watched,
  favorites,
  basicStats,
}: ProfileStatsTabProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('6m');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilterKey>('all');
  const t = useTranslations('ProfileStatsTab');

  console.log(
    '🔄 [StatsTab] Render — user:',
    username,
    '| filter:',
    contentTypeFilter,
    '| range:',
    timeRange
  );

  const { computed, comparison, allWatched, allFavorites } = useStatsTabData({
    watched,
    favorites,
    contentTypeFilter,
    timeRange,
  });

  const {
    deepStats,
    loading: deepLoading,
    error: deepError,
  } = useDeepStatsData({
    username,
    contentTypeFilter,
    timeRange,
  });

  // Debug
  React.useEffect(() => {
    logApiRequest(`/profile/${username}/stats`, 'COMPUTE', true);
    console.log('✅ [StatsTab] Stats effect fired for', username);
  }, [username, timeRange]);

  React.useEffect(() => {
    if (deepError) {
      console.error('❌ [StatsTab] Deep stats error:', deepError);
    } else if (!deepLoading && deepStats) {
      console.log('✅ [StatsTab] Deep stats loaded:', {
        directors: deepStats.topDirectors?.length,
        themes: deepStats.topThemes?.length,
        publishers: deepStats.topPublishers?.length,
      });
    }
  }, [deepStats, deepLoading, deepError]);

  const pieColors = useMemo(() => makeColorPalette(8), []);

  const empty = computed.totalWatched === 0;

  const showFilm =
    contentTypeFilter === 'all' || contentTypeFilter === 'movies' || contentTypeFilter === 'tv';
  const showGame = contentTypeFilter === 'all' || contentTypeFilter === 'games';
  const showBook = contentTypeFilter === 'all' || contentTypeFilter === 'books';
  const showFranchise = contentTypeFilter !== 'books';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
          <p className="text-sm text-white/50">{t('description')}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-white/60">{t('timeRange')}</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
            className="bg-gray-800/60 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
          >
            <option value={'24h'}>{t('ranges.24h')}</option>
            <option value={'week'}>{t('ranges.week')}</option>
            <option value={'month'}>{t('ranges.month')}</option>
            <option value={'6m'}>{t('ranges.6m')}</option>
            <option value={'year'}>{t('ranges.year')}</option>
            <option value={'all'}>{t('ranges.all')}</option>
          </select>
        </div>
      </div>

      {/* Content Type Filter */}
      <ContentTypeFilterBar value={contentTypeFilter} onChange={setContentTypeFilter} />

      <StatsPopularContentSection
        watched={allWatched}
        favorites={allFavorites}
        title={t('popular.title')}
        description={t('popular.description')}
        mostWatchedLabel={t('popular.mostWatched')}
        leastWatchedLabel={t('popular.leastWatched')}
        mostLikedLabel={t('popular.mostLiked')}
        leastLikedLabel={t('popular.leastLiked')}
        emptyLabel={t('popular.empty')}
      />

      {empty ? (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white">{t('empty.title')}</h3>
          <p className="text-sm text-white/50 mt-1">{t('empty.description')}</p>
        </div>
      ) : null}

      {/* ── TIME SUMMARY (deep) ── */}
      {!deepLoading ? (
        <StatsTimeSummarySection
          runtimeSummary={deepStats.runtimeSummary}
          totalWatched={computed.totalConsumed}
          totalMovies={computed.consumedTypeCounts.movies + computed.consumedTypeCounts.tv}
          totalGames={computed.consumedTypeCounts.games}
          totalBooks={computed.consumedTypeCounts.books}
        />
      ) : (
        <SectionSkeleton title={t('skeletons.time')} t={t} />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('cards.interacted')}
          value={computed.totalWatched}
          hint={t('cards.actualConsumed', { count: computed.totalConsumed })}
        />
        <StatCard
          label={t('cards.totalFavorites')}
          value={computed.totalFavorites}
          hint={t('cards.allContentTypes')}
        />
        <StatCard
          label={t('cards.avgRating')}
          value={computed.avgRatingAll === null ? '—' : computed.avgRatingAll.toFixed(1)}
          hint={t('cards.rated', { count: computed.ratedCount })}
        />
        <StatCard
          label={t('cards.streak')}
          value={t('cards.days', { count: computed.streak.current })}
          hint={t('cards.best', { count: computed.streak.best })}
        />
      </div>

      {/* ── ACTIVITY HEATMAP ── */}
      <StatsHeatmapSection watched={watched} variant="detailed" />

      {/* Charts row 1: Activity + Rating */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyActivityChart data={computed.monthSeries} />
        <RatingHistogramChart data={computed.ratingHistogram} />
      </div>

      {/* ── RATING COMPARISON (deep) ── */}
      {!deepLoading ? (
        <StatsRatingComparisonSection
          ratingHistogram={computed.ratingHistogram}
          mostOverrated={deepStats.mostOverrated}
          mostUnderrated={deepStats.mostUnderrated}
          avgRatingAll={computed.avgRatingAll}
          ratedCount={computed.ratedCount}
        />
      ) : (
        <SectionSkeleton title={t('skeletons.rating')} t={t} />
      )}

      {/* Comparison */}
      <ComparisonSection comparison={comparison} />

      {/* Charts row 2: Pies + Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TypePieChart data={computed.typePie} colors={pieColors} />
        <FavoritePieChart data={computed.favoritePie} colors={pieColors} />
        <BehaviorSummarySection computed={computed} />
      </div>

      {/* Charts row 3: Genres + Years */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopGenresChart data={computed.topGenres} />
        <YearsChart data={computed.yearsConsumed} />
      </div>

      {/* ── DIRECTORS / ACTORS / WRITERS / AUTHORS (film + tv + books) ── */}
      {(showFilm || showBook) &&
        (!deepLoading ? (
          <StatsDirectorActorSection
            topDirectors={deepStats.topDirectors}
            bestRatedDirectors={deepStats.bestRatedDirectors}
            worstRatedDirectors={deepStats.worstRatedDirectors}
            topActors={deepStats.topActors}
            topWriters={deepStats.topWriters}
            topAuthors={deepStats.topAuthors}
            topCrew={deepStats.topCrew}
            contentTypeFilter={contentTypeFilter}
          />
        ) : (
          <SectionSkeleton title={t('skeletons.directorActor')} t={t} />
        ))}

      {/* ── PUBLISHER / DEVELOPER (games) ── */}
      {showGame &&
        (!deepLoading ? (
          <StatsPublisherDeveloperSection
            topPublishers={deepStats.topPublishers}
            topDevelopers={deepStats.topDevelopers}
            topGameModes={deepStats.topGameModes}
            topPlatforms={deepStats.topPlatforms}
            topPerspectives={deepStats.topPerspectives}
          />
        ) : (
          <SectionSkeleton title={t('skeletons.game')} t={t} />
        ))}

      {/* ── THEME & MOOD (not games-only) ── */}
      {(showFilm || showBook) &&
        (!deepLoading ? (
          <StatsThemeMoodSection
            topThemes={deepStats.topThemes}
            topMoods={deepStats.topMoods}
            contentTypeFilter={contentTypeFilter}
          />
        ) : (
          <SectionSkeleton title={t('skeletons.themeMood')} t={t} />
        ))}

      {/* ── FRANCHISE ── */}
      {showFranchise &&
        (!deepLoading ? (
          <StatsFranchiseSection topFranchises={deepStats.topFranchises} />
        ) : (
          <SectionSkeleton title={t('skeletons.franchise')} t={t} />
        ))}

      {/* ── AGE RATING ── */}
      {!deepLoading ? (
        <StatsAgeRatingSection
          ageRatingDistribution={deepStats.ageRatingDistribution}
          contentTypeFilter={contentTypeFilter}
        />
      ) : (
        <SectionSkeleton title={t('skeletons.ageRating')} t={t} />
      )}

      {/* ── ABANDONED ── */}
      {!deepLoading ? (
        <StatsAbandonSection
          abandonedCount={deepStats.abandonedCount}
          abandonedByType={deepStats.abandonedByType}
          totalConsumed={computed.totalConsumed}
        />
      ) : (
        <SectionSkeleton title={t('skeletons.abandoned')} t={t} />
      )}

      {/* ── REVIEWS ── */}
      {!deepLoading ? (
        <StatsReviewSection
          reviewCount={deepStats.reviewCount}
          avgReviewLength={deepStats.avgReviewLength}
        />
      ) : (
        <SectionSkeleton title={t('skeletons.reviews')} t={t} />
      )}

      {!deepLoading ? (
        <StatsCompatibilitySection
          friendCompatibility={deepStats.friendCompatibility}
          globalCompatibility={deepStats.globalCompatibility}
        />
      ) : (
        <SectionSkeleton title={t('skeletons.compatibility')} t={t} />
      )}

      {/* Basic summary */}
      <BasicSummarySection basicStats={basicStats} />

      {deepError && (
        <div className="text-xs text-red-400/60 bg-red-500/5 border border-red-500/10 rounded-lg px-4 py-2">
          {t('errors.deepLoad', { error: deepError })}
        </div>
      )}

      <div className="text-xs text-white/20">{t('debug')}</div>
    </div>
  );
}

// ── Skeleton placeholder ──────────────────────────────────

function SectionSkeleton({ title, t }: { title: string; t: any }) {
  return (
    <div className="glass-card p-5 animate-pulse">
      <div className="h-4 w-40 bg-white/10 rounded mb-3" />
      <div className="h-32 bg-white/5 rounded-xl" />
      <p className="text-xs text-white/20 mt-2">
        {t ? t('skeletons.loading', { title }) : `${title} loading...`}
      </p>
    </div>
  );
}

// ── Content type filter bar ───────────────────────────────

function ContentTypeFilterBar({
  value,
  onChange,
}: {
  value: ContentTypeFilterKey;
  onChange: (v: ContentTypeFilterKey) => void;
}) {
  const t = useTranslations('ProfileStatsTab');
  const options: { key: ContentTypeFilterKey; label: string }[] = [
    { key: 'all', label: t('filters.all') },
    { key: 'movies', label: t('filters.movies') },
    { key: 'tv', label: t('filters.tv') },
    { key: 'games', label: t('filters.games') },
    { key: 'books', label: t('filters.books') },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value === opt.key
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/50'
              : 'bg-gray-800/60 text-white/60 hover:bg-gray-800 hover:text-white border border-white/10'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
