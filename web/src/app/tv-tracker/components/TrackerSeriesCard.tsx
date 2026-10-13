import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Route } from 'next';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronDown, CheckCircle, Clock } from 'lucide-react';
import Stars from '@/app/content/components/Stars';
import PosterCard from '@/components/atoms/PosterCard';
import {
  type ContinuingTvTrackerItem,
  GET_EPISODES_BY_TV_SHOW,
  type GetEpisodesByTvShowData,
  MARK_EPISODE_WATCHED,
  RATE_EPISODE,
} from '@/services/graphql/episode';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import toast from 'react-hot-toast';

type TrackerSectionKey = 'pastDue' | 'thisWeek' | 'nextWeek';

const SECTION_META: Record<TrackerSectionKey, { accentClassName: string }> = {
  pastDue: { accentClassName: 'bg-rose-500/20' },
  thisWeek: { accentClassName: 'bg-cyan-500/20' },
  nextWeek: { accentClassName: 'bg-emerald-500/20' },
};

function formatEpisodeCode(seasonNumber: number, episodeNumber: number) {
  return `S${String(seasonNumber).padStart(2, '0')}E${String(episodeNumber).padStart(2, '0')}`;
}

function formatAirDate(value: string | Date, locale: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export default function TrackerSeriesCard({
  item,
  section,
  onMarkWatched,
  onRefresh,
  pendingKey,
}: {
  item: ContinuingTvTrackerItem;
  section: TrackerSectionKey;
  onMarkWatched: (item: ContinuingTvTrackerItem) => Promise<void>;
  onRefresh: () => Promise<void>;
  pendingKey: string | null;
}) {
  const t = useTranslations('TvTracker');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [localPendingKey, setLocalPendingKey] = useState<string | null>(null);

  const [fetchEpisodes, { data, loading }] = useLazyQuery<
    GetEpisodesByTvShowData,
    { tvShowId: string }
  >(GET_EPISODES_BY_TV_SHOW, {
    fetchPolicy: 'cache-and-network',
  });

  const [markWatchedMutation] = useMutation(MARK_EPISODE_WATCHED);
  const [rateEpisodeMutation] = useMutation(RATE_EPISODE);

  const href = `/content/tv/${item.tvShowId}` as Route;
  const actionKey = `${item.tvShowId}:${item.seasonNumber}:${item.episodeNumber}`;
  const isPending = pendingKey === actionKey;
  const isActionPending = isPending || localPendingKey !== null;

  const handleExpand = () => {
    if (!expanded) {
      fetchEpisodes({ variables: { tvShowId: item.tvShowId } });
    }
    setExpanded(!expanded);
  };

  const handleMarkEpisodeWatched = async (seasonNumber: number, episodeNumber: number) => {
    const key = `${item.tvShowId}:${seasonNumber}:${episodeNumber}`;
    setLocalPendingKey(key);
    try {
      await markWatchedMutation({
        variables: {
          tvShowId: item.tvShowId,
          seasonNumber,
          episodeNumber,
          watched: true,
        },
        update: (cache) => {
          // Optimistically update the episode list
          const existingData = cache.readQuery<GetEpisodesByTvShowData>({
            query: GET_EPISODES_BY_TV_SHOW,
            variables: { tvShowId: item.tvShowId },
          });
          if (existingData) {
            cache.writeQuery({
              query: GET_EPISODES_BY_TV_SHOW,
              variables: { tvShowId: item.tvShowId },
              data: {
                getEpisodesByTvShow: existingData.getEpisodesByTvShow.map((ep) =>
                  ep.seasonNumber === seasonNumber && ep.episodeNumber === episodeNumber
                    ? { ...ep, watched: true }
                    : ep
                ),
              },
            });
          }
        },
      });
      toast.success(t('card.watchedSuccess'));

      await onRefresh();
    } catch (error) {
      toast.error(t('card.watchedError'));
    } finally {
      setLocalPendingKey(null);
    }
  };

  const handleRateEpisode = async (
    seasonNumber: number,
    episodeNumber: number,
    rating: number | null
  ) => {
    const key = `${item.tvShowId}:${seasonNumber}:${episodeNumber}:rate`;
    setLocalPendingKey(key);
    try {
      await rateEpisodeMutation({
        variables: {
          tvShowId: item.tvShowId,
          seasonNumber,
          episodeNumber,
          rating,
        },
        update: (cache) => {
          const existingData = cache.readQuery<GetEpisodesByTvShowData>({
            query: GET_EPISODES_BY_TV_SHOW,
            variables: { tvShowId: item.tvShowId },
          });
          if (existingData) {
            cache.writeQuery({
              query: GET_EPISODES_BY_TV_SHOW,
              variables: { tvShowId: item.tvShowId },
              data: {
                getEpisodesByTvShow: existingData.getEpisodesByTvShow.map((ep) =>
                  ep.seasonNumber === seasonNumber && ep.episodeNumber === episodeNumber
                    ? { ...ep, watched: rating !== null, userRating: rating }
                    : ep
                ),
              },
            });
          }
        },
      });
      toast.success(t('card.watchedSuccess'));

      await onRefresh();
    } catch (error) {
      toast.error(t('card.watchedError'));
    } finally {
      setLocalPendingKey(null);
    }
  };

  const now = new Date();

  // Filter unwatched episodes that have already aired (or air today)
  const backlogEpisodes =
    data?.getEpisodesByTvShow
      ?.filter(
        (ep) => !ep.watched && ep.airDate && new Date(ep.airDate) <= now && ep.seasonNumber > 0
      )
      .sort((a, b) => {
        if (a.seasonNumber !== b.seasonNumber) return a.seasonNumber - b.seasonNumber;
        return a.episodeNumber - b.episodeNumber;
      }) || [];

  const hasBacklog = section === 'pastDue' && item.backlogCount > 1;

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-surface-panel p-4 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)] transition-all">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-20 ${SECTION_META[section].accentClassName}`}
      />

      {/* Main Card Content */}
      <div className="relative flex gap-4">
        <Link href={href} className="w-24 min-w-24 overflow-hidden rounded-2xl">
          <PosterCard
            src={item.tvShowPosterUrl ?? null}
            alt={item.tvShowTitle}
            rounded="xl"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        <div className="min-w-0 flex-1 flex flex-col justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={href}>
                  <h3 className="truncate text-lg font-black tracking-tight text-white transition-colors hover:text-sky-300">
                    {item.tvShowTitle}
                  </h3>
                </Link>
                {hasBacklog && (
                  <span className="inline-flex items-center rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-200">
                    {item.backlogCount} Unwatched
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                <span className="text-sky-300/80">
                  Next: {formatEpisodeCode(item.seasonNumber, item.episodeNumber)}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/25" />
                <span>{formatAirDate(item.episodeAirDate, locale)}</span>
              </div>
              {item.episodeStillUrl ? (
                <div className="mt-3 flex gap-3">
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-white/5 relative">
                    <Image
                      src={item.episodeStillUrl}
                      alt={item.episodeTitle}
                      fill
                      sizes="112px"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <p className="line-clamp-3 text-sm text-white/75 self-center">
                    {item.episodeTitle}
                  </p>
                </div>
              ) : (
                <p className="mt-3 line-clamp-2 text-sm text-white/75">{item.episodeTitle}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0 md:items-end mt-4 md:mt-0">
              <div className="hidden md:block w-[180px]">
                <Stars
                  value={null}
                  onChange={(val) => handleRateEpisode(item.seasonNumber, item.episodeNumber, val)}
                  size="sm"
                  disabled={isActionPending}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="block md:hidden flex-1">
                  <Stars
                    value={null}
                    onChange={(val) =>
                      handleRateEpisode(item.seasonNumber, item.episodeNumber, val)
                    }
                    size="sm"
                    disabled={isActionPending}
                  />
                </div>
                <button
                  onClick={() => onMarkWatched(item)}
                  disabled={isActionPending}
                  className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isPending ? t('card.saving') : t('card.watched')}
                </button>
              </div>

              {hasBacklog && (
                <button
                  onClick={handleExpand}
                  className="inline-flex items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition"
                >
                  {expanded ? 'Hide Backlog' : 'Show All'}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accordion / Backlog Section */}
      {expanded && hasBacklog && (
        <div className="relative mt-4 border-t border-white/10 pt-4 animate-in slide-in-from-top-4 fade-in duration-300">
          <h4 className="mb-3 text-sm font-bold text-white/80 flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" />
            Unwatched Backlog
          </h4>

          {loading && (
            <div className="flex justify-center py-4">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-sky-400" />
            </div>
          )}

          {!loading && backlogEpisodes.length === 0 && (
            <p className="text-sm text-white/50 text-center py-2">
              No past unwatched episodes found.
            </p>
          )}

          {!loading && backlogEpisodes.length > 0 && (
            <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {backlogEpisodes.map((ep) => {
                const isEpPending = localPendingKey !== null || isPending;
                return (
                  <div
                    key={ep.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 p-3 hover:bg-white/[0.04] transition gap-3 sm:gap-4"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      {ep.stillUrl && (
                        <div className="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-white/5 relative">
                          <Image
                            src={ep.stillUrl}
                            alt={ep.name}
                            fill
                            sizes="64px"
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/70">
                            {formatEpisodeCode(ep.seasonNumber, ep.episodeNumber)}
                          </span>
                          <span className="truncate text-sm font-medium text-white/90">
                            {ep.name}
                          </span>
                        </div>
                        <div className="text-[10px] text-white/40 mt-0.5">
                          {ep.airDate ? formatAirDate(ep.airDate, locale) : 'Unknown Date'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="w-[140px] sm:w-[160px]">
                        <Stars
                          value={ep.userRating}
                          onChange={(val) =>
                            handleRateEpisode(ep.seasonNumber, ep.episodeNumber, val)
                          }
                          size="sm"
                          disabled={isEpPending}
                        />
                      </div>
                      <button
                        onClick={() => handleMarkEpisodeWatched(ep.seasonNumber, ep.episodeNumber)}
                        disabled={isEpPending}
                        className="shrink-0 rounded-lg p-2 text-white/40 hover:bg-emerald-500/10 hover:text-emerald-400 transition disabled:opacity-50"
                        title="Mark Watched"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
