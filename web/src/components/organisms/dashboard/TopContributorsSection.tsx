'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { useTranslations } from 'next-intl';
import { GET_TOP_CONTRIBUTORS, type TopContributorEntry } from '@/services/graphql/contribution';

const CONTRIBUTOR_LIMIT = 5;

export default function TopContributorsSection() {
  const t = useTranslations('Dashboard.contributors');
  const { data, loading, error } = useQuery<{
    getTopContributors: TopContributorEntry[];
  }>(GET_TOP_CONTRIBUTORS, {
    variables: { limit: CONTRIBUTOR_LIMIT },
    fetchPolicy: 'cache-first',
  });

  if (loading) {
    return <div className="skeleton h-24 rounded-xl" aria-hidden="true" />;
  }

  if (error || !data?.getTopContributors.length) return null;

  return (
    <section aria-labelledby="contributors-title">
      <h2 id="contributors-title" className="mb-4 font-semibold">
        {t('title')}
      </h2>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.getTopContributors.map((entry, index) => (
          <li key={entry.user.id} className="min-w-0">
            <Link
              href={`/profile/${entry.user.username}`}
              className="flex items-center gap-3 rounded-xl bg-neutral-800/60 p-3 transition-colors hover:bg-neutral-800"
            >
              <span className="text-xs text-white/40">{index + 1}</span>
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-neutral-700">
                <span
                  className="absolute inset-0 flex items-center justify-center text-sm"
                  aria-hidden="true"
                >
                  {entry.user.username.charAt(0).toUpperCase()}
                </span>
                {entry.user.picturePath && (
                  <Image
                    src={entry.user.picturePath}
                    alt=""
                    fill
                    sizes="36px"
                    unoptimized
                    className="object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.user.username}</p>
                <p className="mt-0.5 text-xs text-white/50">
                  {t('points', { count: entry.contributionScore })}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
