'use client';

import Link from 'next/link';
import type { Route } from 'next';
import type { SnakeCasedContentItem } from '../StatsTabTypes';

interface Props {
  watched: SnakeCasedContentItem[];
  favorites: SnakeCasedContentItem[];
  title: string;
  description: string;
  mostWatchedLabel: string;
  leastWatchedLabel: string;
  mostLikedLabel: string;
  leastLikedLabel: string;
  emptyLabel: string;
}

type PopularContent = SnakeCasedContentItem & {
  consumeCount?: number;
  favoriteCount?: number;
  posterUrl?: string | null;
  contentType?: string | { name?: string } | null;
};

const CONTENT_TYPE_SLUGS: Record<string, string> = {
  MOVIE: 'movie',
  TV: 'tv',
  GAME: 'game',
  BOOK: 'book',
  MUSIC: 'music',
};

function getContentPath(item: PopularContent): string | null {
  if (!item.id) return null;

  const type = typeof item.contentType === 'string' ? item.contentType : item.contentType?.name;
  const slug = type ? CONTENT_TYPE_SLUGS[type.toUpperCase()] : undefined;
  return slug ? `/content/${slug}/${item.id}` : null;
}

function rankItems(
  items: PopularContent[],
  metric: 'consumeCount' | 'favoriteCount',
  descending: boolean
) {
  return [...items]
    .sort((left, right) => {
      const difference = (left[metric] ?? 0) - (right[metric] ?? 0);
      if (difference !== 0) return descending ? -difference : difference;
      return (left.title ?? left.name ?? '').localeCompare(right.title ?? right.name ?? '');
    })
    .slice(0, 5);
}

function PopularContentList({
  title,
  items,
  metric,
  emptyLabel,
}: {
  title: string;
  items: PopularContent[];
  metric: 'consumeCount' | 'favoriteCount';
  emptyLabel: string;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h4 className="mb-3 text-sm font-semibold text-white/80">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-white/40">{emptyLabel}</p>
      ) : (
        <ol className="space-y-2">
          {items.map((item, index) => {
            const label = item.title ?? item.name ?? '';
            const path = getContentPath(item);
            const count = item[metric] ?? 0;

            return (
              <li key={`${item.id ?? label}-${index}`} className="flex items-center gap-3 text-sm">
                <span className="w-5 shrink-0 text-right text-xs text-white/40">{index + 1}.</span>
                {path ? (
                  <Link
                    href={path as Route}
                    className="min-w-0 flex-1 truncate text-white/80 hover:text-white"
                  >
                    {label}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-white/80">{label}</span>
                )}
                <span className="shrink-0 text-xs tabular-nums text-white/50">
                  {count.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function StatsPopularContentSection({
  watched,
  favorites,
  title,
  description,
  mostWatchedLabel,
  leastWatchedLabel,
  mostLikedLabel,
  leastLikedLabel,
  emptyLabel,
}: Props) {
  const watchedItems = watched as PopularContent[];
  const favoriteItems = favorites as PopularContent[];

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PopularContentList
          title={mostWatchedLabel}
          items={rankItems(watchedItems, 'consumeCount', true)}
          metric="consumeCount"
          emptyLabel={emptyLabel}
        />
        <PopularContentList
          title={leastWatchedLabel}
          items={rankItems(watchedItems, 'consumeCount', false)}
          metric="consumeCount"
          emptyLabel={emptyLabel}
        />
        <PopularContentList
          title={mostLikedLabel}
          items={rankItems(favoriteItems, 'favoriteCount', true)}
          metric="favoriteCount"
          emptyLabel={emptyLabel}
        />
        <PopularContentList
          title={leastLikedLabel}
          items={rankItems(favoriteItems, 'favoriteCount', false)}
          metric="favoriteCount"
          emptyLabel={emptyLabel}
        />
      </div>
    </section>
  );
}
