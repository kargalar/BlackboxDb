'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Film, Search, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import DashboardPage from './dashboard/page';
import { FilmIcon, TvIcon, GamepadIcon, BookIcon } from '@/components/atoms/icons/SidebarIcons';

type LandingPageProps = {
  user: ReturnType<typeof useAuth>['user'];
  loading: boolean;
};

function LandingPage({ user, loading }: LandingPageProps) {
  const t = useTranslations('Landing');

  const features = [
    {
      icon: Film,
      title: t('features.watchlist.title'),
      description: t('features.watchlist.description'),
    },
    {
      icon: Star,
      title: t('features.rating.title'),
      description: t('features.rating.description'),
    },
    {
      icon: Search,
      title: t('features.discover.title'),
      description: t('features.discover.description'),
    },
  ];

  const contentTypes = [
    { icon: FilmIcon, label: t('contentTypes.movies'), href: '/explore/movie' },
    { icon: TvIcon, label: t('contentTypes.tvShows'), href: '/explore/tv' },
    { icon: GamepadIcon, label: t('contentTypes.games'), href: '/explore/game' },
    { icon: BookIcon, label: t('contentTypes.books'), href: '/explore/book' },
  ];

  return (
    <div className="landing-page min-h-screen">
      <section className="landing-hero text-center">
        <div className="mx-auto max-w-5xl">
          <p className="landing-eyebrow">{t('hero.eyebrow')}</p>
          <h1 className="mb-5 text-4xl font-semibold tracking-tight md:text-6xl">
            <span className="gradient-text">{t('hero.titlePart1')}</span>
            <br />
            <span className="text-white/80">{t('hero.titlePart2')}</span>
          </h1>
          <p className="mx-auto mb-7 max-w-xl text-base leading-7 text-white/60">
            {t('hero.subtitle')}
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/explore"
              className="btn-gradient inline-flex items-center justify-center gap-2 text-sm"
            >
              <span>{t('actions.startExploring')}</span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>

            {user ? (
              <Link
                href={`/profile/${user.username}`}
                className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
              >
                {t('actions.goToProfile')}
              </Link>
            ) : loading ? (
              <div className="h-12 w-40 skeleton rounded-xl" aria-hidden="true" />
            ) : (
              <Link
                href="/auth/register"
                className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
              >
                {t('actions.createAccount')}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="py-5">
        <h2 className="sr-only">{t('actions.startExploring')}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {contentTypes.map((type) => (
            <Link
              key={type.label}
              href={type.href as Route}
              className="landing-type-card glass-card group p-5 text-center"
            >
              <type.icon
                className="mx-auto mb-3 h-7 w-7 text-white/60 transition-colors group-hover:text-white"
                aria-hidden="true"
              />
              <h3 className="mb-1 font-semibold text-white">{type.label}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-5">
        <h2 className="mb-5 text-center text-xl font-semibold">
          <span className="gradient-text">{t('features.title')}</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="landing-feature-card glass-card p-5 text-center">
              <div className="landing-feature-icon mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-6 text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const accessibility = useTranslations('Accessibility');

  if (loading) {
    return (
      <div
        className="page-loading min-h-screen"
        role="status"
        aria-label={accessibility('loading')}
      >
        <div className="loading-spinner h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <DashboardPage />;
  }

  return <LandingPage user={user} loading={loading} />;
}
