import Link from 'next/link';
import type { Route } from 'next';

const TIME_RANGE_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  all: 'All Time',
};

const TIME_RANGE_ORDER = ['daily', 'weekly', 'monthly', 'yearly', 'all'];

/** Section header with title, optional time filter, and "See All" link */
export function SectionHeader({
  title,
  href,
  emoji,
  timeRange,
  onTimeRangeChange,
}: {
  title: string;
  href: string;
  emoji: string;
  timeRange?: string;
  onTimeRangeChange?: (newRange: string) => void;
}) {
  const cycleTimeRange = () => {
    if (!timeRange || !onTimeRangeChange) return;
    const idx = TIME_RANGE_ORDER.indexOf(timeRange);
    const next = TIME_RANGE_ORDER[(idx + 1) % TIME_RANGE_ORDER.length];
    onTimeRangeChange(next);
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <span className="gradient-text">{title}</span>
      </h2>
      <div className="flex items-center gap-2">
        {timeRange && onTimeRangeChange && (
          <button
            onClick={cycleTimeRange}
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 transition-colors border border-white/10"
          >
            {TIME_RANGE_LABELS[timeRange] || timeRange}
          </button>
        )}
        <Link href={href as Route}>
          <button className="btn-secondary text-sm px-4 py-2">See All</button>
        </Link>
      </div>
    </div>
  );
}

/** Skeleton loading grid for content posters */
export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-4">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[2/3] skeleton rounded-xl" />
          <div className="h-4 skeleton rounded w-3/4" />
          <div className="h-3 skeleton rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Empty state message for sections with no content */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card p-8 text-center">
      <p className="text-white/40">{message}</p>
    </div>
  );
}
