'use client';

import Link from 'next/link';
import type { Route } from 'next';
import {
  FilmIcon,
  TvIcon,
  GamepadIcon,
  BookIcon,
  UserIcon,
  BuildingIcon,
} from '@/components/atoms/icons/SidebarIcons';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTranslations } from 'next-intl';

export default function ExplorePage() {
  const { preferredContentTypes } = useUserPreferences();
  const t = useTranslations('Explore');

  const allContentTypes = [
    {
      id: 'movies',
      typeId: 1,
      title: t('categories.movies'),
      description: t('categories.moviesDesc'),
      href: '/explore/movie' as Route,
      icon: FilmIcon,
    },
    {
      id: 'tv',
      typeId: 2,
      title: t('categories.tv'),
      description: t('categories.tvDesc'),
      href: '/explore/tv' as Route,
      icon: TvIcon,
    },
    {
      id: 'games',
      typeId: 3,
      title: t('categories.games'),
      description: t('categories.gamesDesc'),
      href: '/explore/game' as Route,
      icon: GamepadIcon,
    },
    {
      id: 'books',
      typeId: 4,
      title: t('categories.books'),
      description: t('categories.booksDesc'),
      href: '/explore/book' as Route,
      icon: BookIcon,
    },
  ];

  const entityTypes = [
    {
      id: 'persons',
      title: t('categories.persons'),
      description: t('categories.personsDesc'),
      href: '/explore/person' as Route,
      icon: UserIcon,
    },
    {
      id: 'companies',
      title: t('categories.companies'),
      description: t('categories.companiesDesc'),
      href: '/explore/company' as Route,
      icon: BuildingIcon,
    },
  ];

  const contentTypes = allContentTypes.filter(
    (type) => preferredContentTypes.includes(type.typeId)
  );

  // Combine filtered content types with entity types
  const exploreOptions = [...contentTypes, ...entityTypes];

  return (
    <div className="explore-page page-shell min-h-screen">
      {/* Hero Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          <span className="gradient-text">{t('mainTitle')}</span>
        </h1>
        <p className="text-sm text-white/60 max-w-2xl">{t('description')}</p>
      </div>

      {/* Content Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {exploreOptions.map((type) => (
          <Link key={type.id} href={type.href} className="group glass-card p-5 transition-colors">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                <type.icon className="w-5 h-5 text-neutral-300" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-white group-hover:text-white/90 transition-colors">
                    {type.title}
                  </h3>
                </div>
                <p className="text-white/50 text-sm line-clamp-2">{type.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
