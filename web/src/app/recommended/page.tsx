'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import PosterCard from '@/components/atoms/PosterCard';
import { emitDebugEvent } from '@/lib/debug-events';
import {
  getMyRecommendations,
  getMySentRecommendations,
  thankRecommendation,
  type Recommendation,
  type SentRecommendation,
} from '@/services/graphql/recommendations';
import { toggleConsumeLater, getUserContentLogs } from '@/services/userContentService';
import { refreshNotificationBadge } from '@/features/notifications/hooks/useUnreadNotificationsCount';
import type { Route } from 'next';
import { useTranslations, useLocale } from 'next-intl';

function getContentTypePath(contentTypeId: number): 'movie' | 'tv' | 'game' | 'book' | 'music' {
  switch (contentTypeId) {
    case 1:
      return 'movie';
    case 2:
      return 'tv';
    case 3:
      return 'game';
    case 4:
      return 'book';
    case 5:
      return 'music';
    default:
      return 'movie';
  }
}

export default function RecommendedPage() {
  const { user } = useAuth();
  const t = useTranslations('Recommended');
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Recommendation[]>([]);
  const [sentItems, setSentItems] = useState<SentRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [watchlistMap, setWatchlistMap] = useState<Record<string, boolean>>({});

  const loadWatchlistStatus = async (recommendations: Recommendation[]) => {
    if (!user || recommendations.length === 0) return;
    const contentIds = recommendations.map((r) => r.contentId);
    const result = await getUserContentLogs(contentIds);
    if (!result.error && result.data) {
      const map: Record<string, boolean> = {};
      result.data.forEach((log) => {
        map[log.contentId] = Boolean(log.isConsumeLater);
      });
      setWatchlistMap(map);
    }
  };

  const load = async () => {
    if (!user) {
      setItems([]);
      setSentItems([]);
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'received') {
        const result = await getMyRecommendations(100);
        if (result.error) {
          toast.error('Failed to load received recommendations');
          setItems([]);
        } else {
          setItems(result.data);
          await loadWatchlistStatus(result.data);
        }
      } else {
        const result = await getMySentRecommendations(100);
        if (result.error) {
          toast.error('Failed to load sent recommendations');
          setSentItems([]);
        } else {
          setSentItems(result.data);
        }
      }
    } catch (err) {
      console.error('❌ [RecommendedPage] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTab]);

  const handleThank = async (recommendationId: string) => {
    if (!user) return;

    const numericId = Number(recommendationId);
    if (Number.isNaN(numericId)) {
      toast.error('Invalid recommendation');
      return;
    }

    const result = await thankRecommendation(numericId);
    if (!result.success) {
      toast.error('Failed to send thanks');
      return;
    }

    toast.success('Thanks sent');
    refreshNotificationBadge();
    setItems((prev) =>
      prev.map((x) =>
        x.id === recommendationId ? { ...x, thankedAt: new Date().toISOString() } : x
      )
    );
  };

  const handleToggleWatchlist = async (contentId: string) => {
    if (!user) return;

    const result = await toggleConsumeLater(contentId);
    if (result.error) {
      toast.error(t('errorAction'));
      return;
    }

    setWatchlistMap((prev) => ({ ...prev, [contentId]: result.isConsumeLater }));
    toast.success(result.isConsumeLater ? t('addedToList') : t('removedFromList'));
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="mt-4 text-sm text-gray-400">Sign in to see your recommendations.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Recommendations</h1>
          <p className="text-sm text-gray-400 italic">Recommendations shared within your network</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-40 border border-gray-700/50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex border-b border-gray-800/60">
        <button
          onClick={() => setActiveTab('received')}
          className={`relative px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'received' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Received
          {activeTab === 'received' && (
            <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`relative px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'sent' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Sent
          {activeTab === 'sent' && (
            <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          )}
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <p className="text-xs text-gray-500 font-medium">Loading recommendations...</p>
          </div>
        ) : activeTab === 'received' ? (
          items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/20 p-12 text-center">
              <p className="text-sm text-gray-500">
                No recommendations received yet. Follow more people to see what they suggest!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {items.map((r) => {
                const typePath = getContentTypePath(r.content.contentTypeId);
                const href = `/content/${typePath}/${r.content.id}` as Route;
                const isThanked = Boolean(r.thankedAt);

                return (
                  <div
                    key={r.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-800/60 bg-surface-page p-4 transition-all hover:border-gray-700/80 hover:bg-surface-panel"
                  >
                    <div className="flex gap-5">
                      <Link href={href} className="flex-shrink-0">
                        <div className="relative w-20 sm:w-24 overflow-hidden rounded-lg shadow-2xl transition-transform group-hover:scale-[1.03]">
                          <PosterCard
                            src={r.content.posterUrl ?? null}
                            alt={r.content.title}
                            rounded="lg"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>

                      <div className="flex flex-col flex-1 min-w-0 py-1">
                        <Link href={href}>
                          <h3 className="text-lg font-bold text-gray-100 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                            {r.content.title}
                          </h3>
                        </Link>

                        <div className="mt-3 flex items-center gap-2">
                          <Link
                            href={`/profile/${r.recommender.username}` as Route}
                            className="flex items-center gap-2 group/user"
                          >
                            <div className="h-6 w-6 rounded-full overflow-hidden border border-gray-700 bg-gray-800">
                              <PosterCard
                                src={r.recommender.picturePath ?? null}
                                alt={r.recommender.username}
                                aspectClassName="aspect-square"
                                hoverZoom={false}
                                useNextImage={false}
                                className="h-full w-full"
                                fallback={
                                  <div className="h-full w-full flex items-center justify-center text-[10px] font-bold uppercase text-gray-400 bg-gray-800">
                                    {r.recommender.username.charAt(0)}
                                  </div>
                                }
                              />
                            </div>
                            <span className="text-sm text-gray-300 hover:text-white transition-colors">
                              {r.recommender.username}
                            </span>
                          </Link>
                          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest bg-gray-800/50 px-1.5 py-0.5 rounded">
                            RECOMMENDER
                          </span>
                        </div>

                        <div className="mt-auto pt-4 flex items-center justify-between">
                          <span className="text-[10px] text-gray-600 font-medium uppercase">
                            {new Date(r.createdAt).toLocaleDateString(locale)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleWatchlist(r.contentId)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                watchlistMap[r.contentId]
                                  ? 'bg-yellow-500/10 text-yellow-500/80 border border-yellow-500/20 hover:bg-yellow-500/20'
                                  : 'bg-gray-700/50 text-gray-300 border border-gray-600/30 hover:bg-gray-600/50 hover:text-white active:scale-95'
                              }`}
                            >
                              {watchlistMap[r.contentId] ? '✓ WATCHLIST' : '+ WATCHLIST'}
                            </button>
                            <button
                              onClick={() => handleThank(r.id)}
                              disabled={isThanked}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isThanked
                                  ? 'bg-green-500/10 text-green-500/80 cursor-default border border-green-500/20'
                                  : 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95'
                              }`}
                            >
                              {isThanked ? '✓ THANKED' : 'SAY THANKS'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : sentItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/20 p-12 text-center">
            <p className="text-sm text-gray-500">
              You haven&apos;t sent any recommendations yet. Go to a content page to recommend
              something to your friends!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sentItems.map((r) => {
              const typePath = getContentTypePath(r.content.contentTypeId);
              const href = `/content/${typePath}/${r.content.id}` as Route;
              const isThanked = Boolean(r.thankedAt);

              return (
                <div
                  key={r.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-800/60 bg-surface-page p-4 transition-all hover:border-gray-700/80 hover:bg-surface-panel"
                >
                  <div className="flex gap-5">
                    <Link href={href} className="flex-shrink-0">
                      <div className="relative w-20 sm:w-24 overflow-hidden rounded-lg shadow-2xl transition-transform group-hover:scale-[1.03]">
                        <PosterCard
                          src={r.content.posterUrl ?? null}
                          alt={r.content.title}
                          rounded="lg"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>

                    <div className="flex flex-col flex-1 min-w-0 py-1">
                      <Link href={href}>
                        <h3 className="text-lg font-bold text-gray-100 truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                          {r.content.title}
                        </h3>
                      </Link>

                      <div className="mt-3 flex items-center gap-2">
                        <Link
                          href={`/profile/${r.recipient.username}` as Route}
                          className="flex items-center gap-2 group/user"
                        >
                          <div className="h-6 w-6 rounded-full overflow-hidden border border-gray-700 bg-gray-800">
                            <PosterCard
                              src={r.recipient.picturePath ?? null}
                              alt={r.recipient.username}
                              aspectClassName="aspect-square"
                              hoverZoom={false}
                              useNextImage={false}
                              className="h-full w-full"
                              fallback={
                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold uppercase text-gray-400 bg-gray-800">
                                  {r.recipient.username.charAt(0)}
                                </div>
                              }
                            />
                          </div>
                          <span className="text-sm text-gray-300 hover:text-white transition-colors">
                            {r.recipient.username}
                          </span>
                        </Link>
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest bg-gray-800/50 px-1.5 py-0.5 rounded">
                          RECIPIENT
                        </span>
                      </div>

                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="text-[10px] text-gray-600 font-medium uppercase">
                          {new Date(r.createdAt).toLocaleDateString(locale)}
                        </span>
                        {isThanked && (
                          <div className="flex items-center gap-1.5 text-green-500/90 text-[10px] font-bold uppercase bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                            <span>✓ THANKED</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
