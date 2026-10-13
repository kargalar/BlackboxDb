'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { Route } from 'next';
import { useTranslations, useLocale } from 'next-intl';
import { apolloClient } from '@/lib/apollo-client';
import { useAuth } from '@/contexts/AuthContext';
import PosterCard from '@/components/atoms/PosterCard';
import {
  GET_CONTINUING_TV_TRACKER,
  type ContinuingTvTrackerItem,
  type ContinuingSeriesItem,
  type ContinuingTvTrackerPayload,
  type GetContinuingTvTrackerData,
} from '@/services/graphql/episode';
import { MARK_EPISODE_WATCHED } from '@/services/graphql/episode';
import TrackerSeriesCard from './components/TrackerSeriesCard';

type TrackerSectionKey = 'pastDue' | 'thisWeek' | 'nextWeek';

const SECTION_META: Record<
  TrackerSectionKey,
  {
    accentClassName: string;
  }
> = {
  pastDue: {
    accentClassName: 'bg-rose-500/20  ',
  },
  thisWeek: {
    accentClassName: 'bg-cyan-500/20  ',
  },
  nextWeek: {
    accentClassName: 'bg-emerald-500/20  ',
  },
};

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]">
      <div className="text-2xl font-black tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
        {label}
      </div>
    </div>
  );
}

function TrackerSection({
  section,
  items,
  onMarkWatched,
  onRefresh,
  pendingKey,
}: {
  section: TrackerSectionKey;
  items: ContinuingTvTrackerItem[];
  onMarkWatched: (item: ContinuingTvTrackerItem) => Promise<void>;
  onRefresh: () => Promise<void>;
  pendingKey: string | null;
}) {
  const t = useTranslations('TvTracker');
  const meta = SECTION_META[section];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {t(`sections.${section}.title`)}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {t('sections.episodesCount', { count: items.length })}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <h3 className="text-base font-bold text-white/80">
            {t(`sections.${section}.emptyTitle`)}
          </h3>
          <p className="mt-2 text-sm text-white/45">{t(`sections.${section}.emptyDescription`)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TrackerSeriesCard
              key={`${section}-${item.tvShowId}-${item.seasonNumber}-${item.episodeNumber}`}
              item={item}
              section={section}
              onMarkWatched={onMarkWatched}
              onRefresh={onRefresh}
              pendingKey={pendingKey}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ContinuingSeriesListSection({ items }: { items: ContinuingSeriesItem[] }) {
  const t = useTranslations('TvTracker');

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {t('summary.continuing')}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {t('sections.episodesCount', { count: items.length })}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/45">Devam eden dizi bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.tvShowId}
              href={`/content/tv/${item.tvShowId}` as Route}
              className="group relative flex gap-4 overflow-hidden rounded-[20px] border border-white/10 bg-surface-panel p-3 shadow-lg transition hover:bg-white/[0.02]"
            >
              <div className="w-16 min-w-16 overflow-hidden rounded-xl">
                <PosterCard
                  src={item.tvShowPosterUrl ?? null}
                  alt={item.tvShowTitle}
                  rounded="lg"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <h3 className="truncate text-base font-bold text-white transition-colors group-hover:text-sky-300">
                  {item.tvShowTitle}
                </h3>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-white/60">
                  <p>
                    Bekleyen toplam bölüm:{' '}
                    <span className="font-semibold text-white/90">{item.expectedEpisodeCount}</span>
                  </p>
                  {item.airedUnwatchedCount > 0 && (
                    <p>
                      Sıradaki Bölüm:{' '}
                      <span className="font-medium text-white/80">{item.airedUnwatchedCount}</span>
                    </p>
                  )}
                  {item.unairedCount > 0 && (
                    <p>
                      Bekleyen Bölüm:{' '}
                      <span className="font-medium text-white/80">{item.unairedCount}</span>
                    </p>
                  )}
                  {item.airedUnwatchedCount === 0 && item.unairedCount === 0 && (
                    <p>Bekleyen bölüm yok</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function TvTrackerPage() {
  const t = useTranslations('TvTracker');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [payload, setPayload] = useState<ContinuingTvTrackerPayload>({
    pastDue: [],
    thisWeek: [],
    nextWeek: [],
    allContinuingSeries: [],
    summary: {
      continuingSeriesCount: 0,
      pastDueCount: 0,
      thisWeekCount: 0,
      nextWeekCount: 0,
    },
  });

  const refreshTracker = async () => {
    const { data } = await apolloClient.query<GetContinuingTvTrackerData>({
      query: GET_CONTINUING_TV_TRACKER,
      fetchPolicy: 'network-only',
    });
    if (!data?.continuingTvTracker) {
      throw new Error('Tracker payload missing');
    }
    setPayload(data.continuingTvTracker);
  };

  const loadTracker = async () => {
    setLoading(true);
    try {
      await refreshTracker();
    } catch (error) {
      console.error('❌ [TvTrackerPage] Failed to load tracker data:', error);
      toast.error(t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace('/');
      return;
    }

    loadTracker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const handleMarkWatched = async (item: ContinuingTvTrackerItem) => {
    const actionKey = `${item.tvShowId}:${item.seasonNumber}:${item.episodeNumber}`;
    setPendingKey(actionKey);
    try {
      const result = await apolloClient.mutate<{ markEpisodeWatched: boolean }>({
        mutation: MARK_EPISODE_WATCHED,
        variables: {
          tvShowId: item.tvShowId,
          seasonNumber: item.seasonNumber,
          episodeNumber: item.episodeNumber,
          watched: true,
        },
      });

      if (!result.data?.markEpisodeWatched) {
        throw new Error('Mutation returned false');
      }

      await refreshTracker();
      toast.success(t('card.watchedSuccess'));
    } catch (error) {
      console.error('❌ [TvTrackerPage] Failed to mark episode watched:', error);
      toast.error(t('card.watchedError'));
    } finally {
      setPendingKey(null);
    }
  };

  if (!user && !authLoading) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_32%),linear-gradient(180deg,rgba(12,14,18,0.98),rgba(6,8,10,0.98))] p-6 shadow-[0_28px_100px_-40px_rgba(0,0,0,0.95)] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05),transparent_30%,transparent)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-300/80">
            {t('title')}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
            {t('subtitle')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60 md:text-base">
            {t('description')}
          </p>
        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label={t('summary.continuing')}
            value={payload.summary.continuingSeriesCount}
          />
          <SummaryCard label={t('summary.pastDue')} value={payload.summary.pastDueCount} />
          <SummaryCard label={t('summary.thisWeek')} value={payload.summary.thisWeekCount} />
          <SummaryCard label={t('summary.nextWeek')} value={payload.summary.nextWeekCount} />
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-sky-400" />
            <p className="mt-4 text-sm text-white/55">{t('loading')}</p>
          </div>
        ) : (
          <>
            <TrackerSection
              section="pastDue"
              items={payload.pastDue}
              onMarkWatched={handleMarkWatched}
              onRefresh={refreshTracker}
              pendingKey={pendingKey}
            />
            <TrackerSection
              section="thisWeek"
              items={payload.thisWeek}
              onMarkWatched={handleMarkWatched}
              onRefresh={refreshTracker}
              pendingKey={pendingKey}
            />
            <TrackerSection
              section="nextWeek"
              items={payload.nextWeek}
              onMarkWatched={handleMarkWatched}
              onRefresh={refreshTracker}
              pendingKey={pendingKey}
            />

            {/* Devam Eden Tüm Diziler */}
            <div className="pt-8 mt-8 border-t border-white/10">
              <ContinuingSeriesListSection items={payload.allContinuingSeries} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
