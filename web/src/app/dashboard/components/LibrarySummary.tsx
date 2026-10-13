import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { UserStats } from '@/services/graphql/userContent';

interface LibrarySummaryProps {
  stats: Pick<
    UserStats,
    'totalMovies' | 'thisYearMovies' | 'averageRating' | 'discussionCount'
  > | null;
  loading: boolean;
  username: string;
}

export default function LibrarySummary({ stats, loading, username }: LibrarySummaryProps) {
  const t = useTranslations('Dashboard.summary');
  const metrics = [
    { key: 'movies', value: stats?.totalMovies ?? 0 },
    { key: 'thisYear', value: stats?.thisYearMovies ?? 0 },
    { key: 'rating', value: (stats?.averageRating ?? 0).toFixed(1) },
    { key: 'discussions', value: stats?.discussionCount ?? 0 },
  ] as const;

  if (!stats && !loading) return null;

  return (
    <section className="glass-card dashboard-summary-card" aria-labelledby="library-summary-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="library-summary-title" className="text-base font-semibold">
          {t('title')}
        </h2>
        <Link
          href={`/profile/${username}`}
          className="inline-flex items-center gap-1.5 rounded-lg text-sm text-white/60 hover:text-white"
        >
          {t('viewProfile')}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy={loading}>
        {metrics.map(({ key, value }) => (
          <div key={key} className="dashboard-summary-stat">
            <dt className="text-xs text-white/60">{t(key)}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {loading ? <span className="skeleton block h-8 w-12 rounded-lg" /> : value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
