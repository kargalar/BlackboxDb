'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { PersonData } from '@/services/graphql/person';
import { useTranslations } from 'next-intl';

interface FavoritePeopleSectionProps {
  people: PersonData[];
  isOwnProfile: boolean;
}

export function FavoritePeopleSection({ people, isOwnProfile }: FavoritePeopleSectionProps) {
  const t = useTranslations('ProfileHomeTab.favoritePeople');

  if (!isOwnProfile && people.length === 0) return null;

  return (
    <section className="glass-card p-4">
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>{t('title')}</span>
            {people.length > 0 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/50">
                {people.length}
              </span>
            )}
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            {t(isOwnProfile ? 'subtitleOwn' : 'subtitleOther')}
          </p>
        </div>
      </div>

      {people.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-xs text-white/40">
          {t('empty')}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-4">
          {people.map((person) => (
            <Link
              key={person.id}
              href={`/person/${person.id}`}
              className="group flex flex-col items-center w-24 sm:w-28 text-center"
            >
              <div className="relative mb-2 aspect-square w-24 h-24 sm:w-28 sm:h-28 overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 group-hover:scale-105 group-hover:border-white/25">
                {person.profileUrl ? (
                  <Image
                    src={person.profileUrl}
                    alt={person.name}
                    fill
                    sizes="(max-width: 640px) 96px, 112px"
                    unoptimized
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl sm:text-3xl font-bold text-white/20">
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white/70 line-clamp-1 w-full group-hover:text-white transition-colors">
                {person.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
