'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Stars from './Stars';
import type { TvEpisode, TvSeason } from '@/types/unified-content';
import { logUiEvent } from '@/lib/requestLogger';
import { useTranslations } from 'next-intl';

type SeasonEpisode = TvEpisode & {
  watched?: boolean | null;
  watchedAt?: string | null;
  userRating?: number | null;
};

type SeasonWithEpisodes = TvSeason & {
  episodes?: SeasonEpisode[];
  userRating?: number | null;
  viewerCount?: number;
};

interface ContentTvSeasonsProps {
  seasons: SeasonWithEpisodes[];
  expandedSeasons: Set<number>;
  setExpandedSeasons: React.Dispatch<React.SetStateAction<Set<number>>>;
  watchedSeasons: Set<number>;
  watchedEpisodes: Set<string>;
  actionErrors: Record<string, string>;
  canManage: boolean;
  onToggleSeasonWatch: (seasonNum: number) => Promise<void> | void;
  onToggleEpisodeWatch: (seasonNum: number, episodeNum: number) => Promise<void> | void;
  onRateEpisode: (
    seasonNum: number,
    episodeNum: number,
    rating: number | null
  ) => Promise<void> | void;
}

const getDateKey = (value?: unknown): number | null => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.getFullYear() * 10000 + (value.getMonth() + 1) * 100 + value.getDate();
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const isoPrefix = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoPrefix)) {
    const year = Number(isoPrefix.slice(0, 4));
    const month = Number(isoPrefix.slice(5, 7));
    const day = Number(isoPrefix.slice(8, 10));
    return year * 10000 + month * 100 + day;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear() * 10000 + (parsed.getMonth() + 1) * 100 + parsed.getDate();
};

const formatAirDate = (value?: unknown): string | null => {
  if (!value) return null;

  const parsed = new Date(String(value));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return null;
};

const formatRuntime = (runtime?: number): string | null => {
  if (!runtime || runtime <= 0) return null;
  return `${runtime} dk`;
};

const clampPercentage = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const ContentTvSeasons = ({
  seasons,
  expandedSeasons,
  setExpandedSeasons,
  watchedSeasons,
  watchedEpisodes,
  actionErrors,
  canManage,
  onToggleSeasonWatch,
  onToggleEpisodeWatch,
  onRateEpisode,
}: ContentTvSeasonsProps) => {
  const t = useTranslations('ContentTvSeasons');
  const todayKey = useMemo(() => {
    const now = new Date();
    return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  }, []);

  const seasonMetrics = useMemo(() => {
    return seasons.map((season) => {
      // Sadece yayınlanmış (bugün veya geçmiş) bölümleri hesaba kat
      let totalEpisodes = season.episodeCount ?? 0;
      let hasUpcomingEpisodes = false;

      if (season.episodes && Array.isArray(season.episodes)) {
        totalEpisodes = season.episodes.filter((episode) => {
          const dateKey = getDateKey(episode.airDate);
          return Boolean(dateKey && dateKey <= todayKey);
        }).length;
        hasUpcomingEpisodes = season.episodes.length > totalEpisodes;
      }

      const watchedCount = (season.episodes ?? []).filter((episode) => {
        const episodeKey = `${season.seasonNumber}x${episode.episodeNumber}`;
        return watchedEpisodes.has(episodeKey) || Boolean(episode.watched);
      }).length;
      const completionPercentage = totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0;

      const allAiredWatched = totalEpisodes > 0 && watchedCount >= totalEpisodes;
      const markedWatched = watchedSeasons.has(season.seasonNumber);

      const isActuallyCompleted = (markedWatched || allAiredWatched) && !hasUpcomingEpisodes;
      const isInProgress =
        (watchedCount > 0 && watchedCount < totalEpisodes) ||
        (allAiredWatched && hasUpcomingEpisodes);

      return {
        seasonNumber: season.seasonNumber,
        totalEpisodes,
        watchedCount,
        completionPercentage: clampPercentage(completionPercentage),
        isCompleted: isActuallyCompleted,
        isInProgress,
      };
    });
  }, [seasons, watchedEpisodes, watchedSeasons, todayKey]);

  const summary = useMemo(() => {
    const totalEpisodes = seasonMetrics.reduce((sum, item) => sum + item.totalEpisodes, 0);
    const watchedCount = seasonMetrics.reduce((sum, item) => sum + item.watchedCount, 0);
    const completedSeasons = seasonMetrics.filter((item) => item.isCompleted).length;
    const inProgressSeasons = seasonMetrics.filter((item) => item.isInProgress).length;

    return {
      totalEpisodes,
      watchedCount,
      completedSeasons,
      inProgressSeasons,
      completionPercentage:
        totalEpisodes > 0 ? clampPercentage((watchedCount / totalEpisodes) * 100) : 0,
    };
  }, [seasonMetrics]);

  const toggleSeasonPanel = (seasonNumber: number) => {
    const nextExpanded = !expandedSeasons.has(seasonNumber);

    console.log(`📺 [ContentTvSeasons] Sezon paneli ${seasonNumber} => ${nextExpanded}`);
    logUiEvent('TV: season panel toggle', true, `season=${seasonNumber};expanded=${nextExpanded}`);

    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  return (
    <section className="mb-10">
      <div className="rounded-3xl border border-white/10 bg-surface-page p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 text-white/70 ring-1 ring-white/10">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-6 5h4a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h4z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
                <p className="text-sm text-white/55">{t('subtitle')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white/80">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {t('stats.total')}
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {t('stats.seasonsCount', { count: seasons.length })}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white/80">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {t('stats.episode')}
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {summary.watchedCount}/{summary.totalEpisodes}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white/80">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {t('stats.inProgress')}
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {summary.inProgressSeasons}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white/80">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {t('stats.completed')}
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {summary.completedSeasons}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-[220px] rounded-2xl border border-white/10 bg-black/35 p-4 lg:max-w-xs">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                  {t('stats.overallProgress')}
                </div>
                <div className="mt-1 text-3xl font-bold text-white">
                  %{summary.completionPercentage}
                </div>
              </div>
              <div className="text-right text-sm text-white/55">
                <div>{t('stats.watchedCount', { count: summary.watchedCount })}</div>
                <div>{t('stats.episodesCount', { count: summary.totalEpisodes })}</div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#6b6b6b] transition-all duration-500"
                style={{ width: `${summary.completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {seasons.map((season) => {
            const metrics = seasonMetrics.find((item) => item.seasonNumber === season.seasonNumber);
            const episodes = season.episodes ?? [];
            const isExpanded = expandedSeasons.has(season.seasonNumber);
            const seasonError = actionErrors[`season-${season.seasonNumber}`];
            const seasonIsFuture = (() => {
              const dateKey = getDateKey(season.airDate);
              return Boolean(dateKey && dateKey > todayKey);
            })();

            return (
              <article
                key={season.id}
                className={`overflow-hidden rounded-3xl border backdrop-blur-sm transition-colors hover:border-white/20 ${
                  metrics?.isCompleted
                    ? 'border-white/8 bg-black/75'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div className="flex flex-col gap-3.5 p-2 sm:p-2.5 lg:flex-row lg:items-stretch">
                  <button
                    type="button"
                    onClick={() => toggleSeasonPanel(season.seasonNumber)}
                    className="flex w-full items-stretch gap-3 text-left lg:flex-1"
                  >
                    <div className="relative hidden self-stretch overflow-hidden rounded-2xl bg-white/5 sm:block sm:min-h-[260px] sm:aspect-[2/3] sm:shrink-0">
                      {season.posterUrl ? (
                        <Image
                          src={season.posterUrl}
                          alt={season.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 120px, 200px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-white/35">
                          {t('season.noCover')}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-white">
                          {season.name}
                          {season.seasonNumber === 0 && (
                            <span className="ml-2 text-sm font-normal text-white/45">
                              {t('season.specials')}
                            </span>
                          )}
                        </h3>

                        {seasonIsFuture && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/70">
                            {t('season.upcoming')}
                          </span>
                        )}

                        {metrics?.isCompleted && (
                          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            {t('season.completed')}
                          </span>
                        )}

                        {!metrics?.isCompleted && metrics?.isInProgress && (
                          <span className="rounded-full border border-sky-500/25 bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-300">
                            {t('season.inProgress')}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55">
                        <span>{formatAirDate(season.airDate) || t('episode.noDate')}</span>
                        <span>
                          {t('stats.episodesCount', {
                            count: metrics?.totalEpisodes ?? season.episodeCount,
                          })}
                        </span>
                        {typeof season.viewerCount === 'number' && season.viewerCount > 0 && (
                          <span>{t('season.peopleWatched', { count: season.viewerCount })}</span>
                        )}
                        {season.userRating && season.userRating > 0 && (
                          <span>⭐ {season.userRating.toFixed(1)}</span>
                        )}
                      </div>

                      {season.overview && (
                        <p className="mt-3 max-w-4xl text-sm leading-6 text-white/70 line-clamp-3">
                          {season.overview}
                        </p>
                      )}

                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="text-white/55">{t('season.progress')}</span>
                          <span className="font-medium text-white/80">
                            {metrics?.watchedCount ?? 0}/
                            {metrics?.totalEpisodes ?? season.episodeCount}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              metrics?.isCompleted
                                ? 'bg-[#9a9a9a]'
                                : metrics?.isInProgress
                                  ? 'bg-[#5f5f5f]'
                                  : 'bg-white/20'
                            }`}
                            style={{ width: `${metrics?.completionPercentage ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[180px] lg:items-end">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onToggleSeasonWatch(season.seasonNumber)}
                        className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                          metrics?.isCompleted
                            ? 'border border-emerald-500/25 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'bg-white/10 text-white/85 hover:bg-white/15'
                        }`}
                      >
                        {metrics?.isCompleted ? t('season.watched') : t('season.markWatched')}
                      </button>
                    )}

                    {seasonError && (
                      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {seasonError}
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && episodes.length > 0 && (
                  <div className="border-t border-white/10 bg-black/25 px-2.5 py-3 sm:px-4 sm:py-4">
                    <div className="space-y-2">
                      {episodes.map((episode) => {
                        const episodeKey = `${season.seasonNumber}x${episode.episodeNumber}`;
                        const episodeError = actionErrors[`episode-${episodeKey}`];
                        const isWatched =
                          watchedEpisodes.has(episodeKey) || Boolean(episode.watched);
                        const isFutureEpisode = (() => {
                          const dateKey = getDateKey(episode.airDate);
                          return Boolean(dateKey && dateKey > todayKey);
                        })();

                        return (
                          <div
                            key={episode.id}
                            onClick={() => {
                              if (!canManage || isFutureEpisode) return;
                              console.log(
                                `📺 [ContentTvSeasons] Bölüm satırı toggle S${season.seasonNumber}E${episode.episodeNumber}`
                              );
                              onToggleEpisodeWatch(season.seasonNumber, episode.episodeNumber);
                            }}
                            className={`rounded-2xl border px-2.5 py-2.5 transition-colors sm:px-3 ${
                              isWatched
                                ? 'border-white/8 bg-black/80'
                                : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'
                            } ${canManage && !isFutureEpisode ? 'cursor-pointer' : ''}`}
                          >
                            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
                              {episode.stillUrl && (
                                <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-white/10 bg-white/5 sm:w-[240px] sm:shrink-0 md:w-[280px] lg:w-[320px]">
                                  <Image
                                    src={episode.stillUrl}
                                    alt={episode.name}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 240px, (max-width: 1024px) 280px, 320px"
                                  />
                                </div>
                              )}

                              <div className="flex min-w-0 flex-1 gap-3">
                                <div
                                  className={`flex h-11 min-w-11 items-center justify-center rounded-2xl text-sm font-semibold text-center ${
                                    isWatched
                                      ? 'bg-[#050505] text-white'
                                      : 'bg-white/8 text-white/65'
                                  }`}
                                >
                                  {episode.episodeNumber}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="truncate text-sm font-semibold text-white sm:text-base">
                                      {episode.name}
                                    </h4>
                                    {isFutureEpisode && (
                                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/65">
                                        {t('episode.upcoming')}
                                      </span>
                                    )}
                                    {isWatched && (
                                      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                        {t('episode.watched')}
                                      </span>
                                    )}
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                                    <span>S{season.seasonNumber}</span>
                                    <span>
                                      {formatAirDate(episode.airDate) || t('episode.noDate')}
                                    </span>
                                    {episode.runtime && episode.runtime > 0 && (
                                      <span>
                                        {t('episode.runtime', { minutes: episode.runtime })}
                                      </span>
                                    )}
                                  </div>

                                  {episode.overview && (
                                    <p className="mt-2 text-sm leading-6 text-white/65 line-clamp-2">
                                      {episode.overview}
                                    </p>
                                  )}

                                  <div
                                    className="mt-3 flex flex-wrap items-center gap-2"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <div
                                      className={`w-[200px] ${!canManage ? 'opacity-75 pointer-events-none' : ''}`}
                                    >
                                      <Stars
                                        value={episode.userRating ?? 0}
                                        onChange={(rating) =>
                                          onRateEpisode(
                                            season.seasonNumber,
                                            episode.episodeNumber,
                                            rating
                                          )
                                        }
                                        size="sm"
                                        disabled={!canManage}
                                      />
                                    </div>

                                    {episode.userRating !== null &&
                                      episode.userRating !== undefined &&
                                      episode.userRating > 0 &&
                                      canManage && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onRateEpisode(
                                              season.seasonNumber,
                                              episode.episodeNumber,
                                              null
                                            )
                                          }
                                          className="rounded-full bg-white/5 p-1 text-white/45 transition-colors hover:bg-red-500/15 hover:text-red-300"
                                          title={t('episode.clearRating')}
                                        >
                                          <svg
                                            className="h-3.5 w-3.5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2.5}
                                              d="M6 18L18 6M6 6l12 12"
                                            />
                                          </svg>
                                        </button>
                                      )}
                                  </div>

                                  {episodeError && (
                                    <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                                      {episodeError}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContentTvSeasons;
