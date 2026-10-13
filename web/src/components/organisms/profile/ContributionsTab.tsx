import React from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_USER_CONTRIBUTIONS } from '@/services/graphql/contribution';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

interface ContributionsTabProps {
  username: string;
}

export default function ContributionsTab({ username }: ContributionsTabProps) {
  const t = useTranslations('ProfileContributionsTab');
  const locale = useLocale();
  const { data, loading, error } = useQuery<any>(GET_USER_CONTRIBUTIONS, {
    variables: { username, limit: 50, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-400">{t('error')}</div>;
  }

  const contributions = data?.getUserContributions || [];

  if (contributions.length === 0) {
    return (
      <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
        <span className="text-4xl mb-4 block">🏆</span>
        <h3 className="text-xl font-bold text-white mb-2">{t('emptyTitle')}</h3>
        <p className="text-white/50">{t('emptyDesc')}</p>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'NEW_CONTENT':
        return t('types.newContent');
      case 'EDIT_CONTENT':
        return t('types.editContent');
      default:
        return t('types.contribution');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-yellow-500">🏆</span> {t('history')}
        </h2>
        <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <span className="text-yellow-500 font-bold">
            {t('totalPoints', {
              points: contributions.reduce(
                (acc: number, curr: any) => acc + (curr.pointsEarned || 0),
                0
              ),
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contributions.map((contribution: any) => (
          <div
            key={contribution.id}
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start gap-4">
              {contribution.content?.posterUrl ? (
                <Link
                  href={`/content/${contribution.content.id}` as any}
                  className="group relative block h-24 w-16 overflow-hidden rounded-lg border border-white/10"
                >
                  <Image
                    src={contribution.content.posterUrl}
                    alt={contribution.content.title}
                    fill
                    sizes="64px"
                    unoptimized
                    className="rounded-lg object-cover shadow-md transition-opacity hover:opacity-80"
                  />
                </Link>
              ) : (
                <div className="w-16 h-24 bg-white/10 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
              )}

              <div className="flex-1">
                <Link
                  href={`/content/${contribution.content.id}` as any}
                  className="font-bold text-white hover:text-yellow-500 transition-colors line-clamp-2"
                >
                  {contribution.content?.title || t('unknownContent')}
                </Link>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium border border-blue-500/20">
                      {getTypeLabel(contribution.type)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-white/50">
                      {new Date(parseInt(contribution.createdAt)).toLocaleDateString(locale)}
                    </span>
                    <span className="text-sm font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-lg">
                      {t('points', { points: contribution.pointsEarned || 0 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
