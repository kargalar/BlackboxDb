'use client';

import { BarChart3, BookOpen, Clapperboard, Gamepad2, Tv2, Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

type ProfileItem = {
  id?: string | number;
  isConsumed?: boolean;
  is_consumed?: boolean;
  userDate?: string | null;
  user_date?: string | null;
  updatedAt?: string | null;
  releaseDate?: string | null;
  release_date?: string | null;
};

interface ProfileProgressSectionProps {
  movies: ProfileItem[];
  tv: ProfileItem[];
  games: ProfileItem[];
  books: ProfileItem[];
  music: ProfileItem[];
  onViewStats?: () => void;
}

export default function ProfileProgressSection({
  movies,
  tv,
  games,
  books,
  music,
  onViewStats,
}: ProfileProgressSectionProps) {
  const t = useTranslations('ProfileHomeTab.librarySummary');
  const cards = [
    { key: 'movies', items: movies, icon: Clapperboard },
    { key: 'tv', items: tv, icon: Tv2 },
    { key: 'games', items: games, icon: Gamepad2 },
    { key: 'books', items: books, icon: BookOpen },
    { key: 'music', items: music, icon: Music },
  ] as const;

  return (
    <section
      className="profile-progress-section glass-card"
      aria-labelledby="profile-progress-title"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="profile-progress-title" className="text-base font-semibold">
          {t('title')}
        </h2>
        {onViewStats && (
          <button type="button" onClick={onViewStats} className="profile-section-link">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            {t('viewStats')}
          </button>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ key, items, icon: Icon }) => (
          <div key={key} className="profile-progress-card">
            <dt className="flex items-center gap-2 text-xs text-white/60">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(key)}
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">{items.length}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
