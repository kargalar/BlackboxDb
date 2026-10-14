'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { apolloClient } from '@/lib/apollo-client';
import { formatRating } from '@/lib/formatRating';
import { GET_USERS_BY_RATING, RatingUser } from '@/services/graphql/userContent';

interface StatsProps {
  stats: {
    consume_count?: number;
    favorite_count?: number;
    consume_later_count?: number;
    review_count?: number;
    average_rating?: number;
    rating_count?: number;
    rating_distribution?: number[];
  };
  type: string;
  contentId: string;
}

const ContentStats = ({ stats, type, contentId }: StatsProps) => {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [ratingUsers, setRatingUsers] = useState<RatingUser[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const t = useTranslations('ContentStats');

  const handleBarClick = async (rating: number, index: number) => {
    const count = stats.rating_distribution?.[index] || 0;
    if (count === 0) return;

    setSelectedRating(rating);
    setIsDialogOpen(true);
    setIsLoading(true);

    try {
      const { data } = await apolloClient.query<{ getUsersByRating: RatingUser[] }>({
        query: GET_USERS_BY_RATING,
        variables: { contentId, rating },
        fetchPolicy: 'network-only',
      });
      setRatingUsers(data?.getUsersByRating || []);
    } catch (error) {
      console.error('Error fetching users by rating:', error);
      setRatingUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedRating(null);
    setRatingUsers([]);
  };

  const consumeLabel =
    type === 'book' ? t('labels.read') : type === 'game' ? t('labels.played') : t('labels.watched');
  const laterLabel =
    type === 'book'
      ? t('labels.toRead')
      : type === 'game'
        ? t('labels.toPlay')
        : t('labels.toWatch');
  const ratingScale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <>
      <div className="glass-card p-4 mt-6 max-w-[320px]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
            title={consumeLabel}
          >
            <span className="text-base">👁️</span>
            <span className="text-sm font-medium text-violet-400">{stats.consume_count || 0}</span>
          </div>
          <div
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
            title={t('labels.favorite')}
          >
            <span className="text-base">❤️</span>
            <span className="text-sm font-medium text-pink-400">{stats.favorite_count || 0}</span>
          </div>
          <div
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
            title={laterLabel}
          >
            <span className="text-base">📌</span>
            <span className="text-sm font-medium text-fuchsia-400">
              {stats.consume_later_count || 0}
            </span>
          </div>
          <div
            className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
            title={t('labels.review')}
          >
            <span className="text-base">💬</span>
            <span className="text-sm font-medium text-emerald-400">{stats.review_count || 0}</span>
          </div>
        </div>

        <div className="flex items-end justify-center gap-2 mt-4">
          <div className="flex w-full max-w-[200px] flex-none items-end justify-center gap-0.5 h-14">
            {ratingScale.map((rating, index) => {
              const count = stats.rating_distribution?.[index] || 0;
              const maxCount = Math.max(...(stats.rating_distribution || [1]));
              const heightPx = maxCount > 0 ? Math.max((count / maxCount) * 56, 3) : 3;
              const hasUsers = count > 0;

              return (
                <div key={rating} className="flex flex-col items-center group relative">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs text-amber-400 font-medium bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none absolute -top-6 z-10">
                    {count}
                  </div>
                  <button
                    onClick={() => handleBarClick(rating, index)}
                    disabled={!hasUsers}
                    className={`w-4 bg-amber-500 rounded-t-sm transition-all duration-200 ${hasUsers ? 'hover:bg-amber-400 hover: cursor-pointer' : 'opacity-50 cursor-default'}`}
                    style={{ height: `${heightPx}px` }}
                    title={t('tooltips.ratingCount', { rating, count })}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-end">
            <div className="text-xl font-bold text-amber-400">
              {stats.average_rating ? formatRating(stats.average_rating) : '0'}
            </div>
            <div className="text-[10px] text-white/40">{t('dialog.average')}</div>
          </div>
        </div>

        <div className="mt-1 text-[10px] text-white/30 text-center">
          {t('dialog.points', { count: stats.rating_count || 0 })}
        </div>
      </div>

      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeDialog}
        >
          <div
            className="glass-card p-5 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>⭐</span>
                <span>{t('dialog.title', { rating: selectedRating ?? 0 })}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors flex items-center gap-1"
                  title={sortOrder === 'desc' ? t('dialog.sortDesc') : t('dialog.sortAsc')}
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                  <span className="hidden sm:inline">
                    {sortOrder === 'desc' ? t('dialog.new') : t('dialog.old')}
                  </span>
                </button>
                <button
                  onClick={closeDialog}
                  className="text-white/60 hover:text-white transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 -mx-2 px-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : ratingUsers.length === 0 ? (
                <div className="text-center py-8 text-white/50">{t('dialog.noUsers')}</div>
              ) : (
                <div className="space-y-2">
                  {[...ratingUsers]
                    .sort((a, b) => {
                      const diff =
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      return sortOrder === 'desc' ? diff : -diff;
                    })
                    .map((user) => {
                      const date = new Date(user.createdAt);
                      const formattedDate = date.toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });

                      return (
                        <Link
                          key={user.userId}
                          href={`/profile/${user.username}`}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          onClick={closeDialog}
                        >
                          <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {user.avatarUrl ? (
                              <Image
                                src={user.avatarUrl}
                                alt={user.username}
                                width={40}
                                height={40}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-sm font-medium">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">@{user.username}</div>
                            <div className="text-xs text-white/40">{formattedDate}</div>
                          </div>
                          <div className="flex items-center gap-1 text-amber-400 flex-shrink-0">
                            <span>⭐</span>
                            <span className="font-medium">{user.rating}</span>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentStats;
