'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import type { UnifiedContent } from '@/types/unified-content';
import type { ContentType } from '../types';

const CONTENT_TYPE_SLUGS: Record<number, string> = {
  1: 'movie',
  2: 'tv',
  3: 'game',
  4: 'book',
  5: 'music',
};

interface DashboardHeroProps {
  content?: UnifiedContent | null;
  isLoading?: boolean;
  onAddToList?: (content: UnifiedContent, contentType: ContentType) => void;
}

function getYear(content: UnifiedContent) {
  const date = content.releaseDate || content.firstAirDate || content.publishedDate;
  return date ? date.slice(0, 4) : '';
}

function formatRuntime(minutes?: number) {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes}m`;
}

export default function DashboardHero({
  content,
  isLoading = false,
  onAddToList,
}: DashboardHeroProps) {
  const t = useTranslations('Dashboard');

  if (isLoading && !content) {
    return <div className="dashboard-hero dashboard-hero-skeleton skeleton" aria-hidden="true" />;
  }

  if (!content) return null;

  const typeSlug = CONTENT_TYPE_SLUGS[content.contentTypeId] || 'movie';
  const typeLabel = (() => {
    switch (content.contentTypeId) {
      case 1:
        return t('hero.contentType.movie');
      case 2:
        return t('hero.contentType.tvShow');
      case 3:
        return t('hero.contentType.game');
      case 4:
        return t('hero.contentType.book');
      case 5:
        return t('hero.contentType.music');
      default:
        return t('hero.contentType.content');
    }
  })();
  const contentType = (
    typeSlug === 'movie' ||
    typeSlug === 'tv' ||
    typeSlug === 'game' ||
    typeSlug === 'book' ||
    typeSlug === 'music'
      ? typeSlug
      : 'movie'
  ) as ContentType;
  const href = `/content/${typeSlug}/${content.id}`;
  const year = getYear(content);
  const runtime = content.runtime ? formatRuntime(content.runtime) : '';

  return (
    <section className="dashboard-hero" aria-labelledby="dashboard-hero-title">
      {content.backdropUrl ? (
        <Image
          src={content.backdropUrl}
          alt=""
          fill
          priority
          className="dashboard-hero-backdrop"
          sizes="(max-width: 1024px) 100vw, 1200px"
        />
      ) : (
        <div className="dashboard-hero-fallback" aria-hidden="true" />
      )}
      <div className="dashboard-hero-scrim" aria-hidden="true" />

      <div className="dashboard-hero-content">
        <div className="dashboard-hero-kicker">
          <span className="dashboard-hero-kicker-dot" />
          {t('hero.kicker')}
        </div>
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-white/60">
            {typeLabel} {year && `• ${year}`} {runtime && `• ${runtime}`}
          </p>
          <h2
            id="dashboard-hero-title"
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {content.title}
          </h2>
          {content.description && (
            <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-white/70">
              {content.description}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={href as Route}
              className="btn-gradient inline-flex items-center gap-2 text-sm"
            >
              {t('hero.viewDetails')}
            </Link>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => onAddToList?.(content, contentType)}
            >
              {t('hero.addToList')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
