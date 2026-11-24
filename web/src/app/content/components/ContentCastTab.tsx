'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronUp, Plus } from 'lucide-react';
import type { ContentPerson } from '@/types/unified-content';
import { useTranslations } from 'next-intl';

const INITIAL_SHOW_COUNT = 12;

interface ContentCastTabProps {
  cast: ContentPerson[];
  hasRole: (person: ContentPerson, role: string) => boolean;
}

export const ContentCastTab: React.FC<ContentCastTabProps> = ({ cast, hasRole }) => {
  const t = useTranslations('ContentCastTab');
  const [showAll, setShowAll] = useState(false);
  const hasMore = cast.length > INITIAL_SHOW_COUNT;
  const collapsedActorCount = INITIAL_SHOW_COUNT - 1;
  const visibleCast = showAll || !hasMore ? cast : cast.slice(0, collapsedActorCount);
  const hiddenCount = cast.length - collapsedActorCount;

  return (
    <div>
      {cast.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {visibleCast.map((member) => (
            <Link
              key={member.id}
              href={`/person/${member.personId}` as any}
              onClick={() =>
                console.log(
                  `👤 Oyuncu sayfasına yönlendiriliyor: ${member.person.name} (ID: ${member.personId})`
                )
              }
              className="text-center group cursor-pointer hover:bg-gray-800 rounded-lg p-1.5 transition-colors"
            >
              <div className="w-16 h-16 mx-auto mb-2 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                {member.person.profileUrl ? (
                  <Image
                    src={member.person.profileUrl}
                    alt={member.person.name}
                    width={64}
                    height={64}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                {member.person.name}
              </p>
              {member.character && (
                <p className="text-xs text-gray-400 truncate">&quot;{member.character}&quot;</p>
              )}
              {(hasRole(member, 'voice_actor') ||
                hasRole(member, 'Voice_actor') ||
                hasRole(member, 'Voice') ||
                hasRole(member, 'voice')) && (
                <p className="text-xs text-violet-400">{t('voiceActor')}</p>
              )}
            </Link>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              aria-expanded={showAll}
              className="text-center group cursor-pointer hover:bg-gray-800 rounded-lg p-1.5 transition-colors flex flex-col items-center"
            >
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 group-hover:bg-violet-600/40 group-hover:border-violet-400/50 transition-colors flex items-center justify-center">
                {showAll ? (
                  <ChevronUp className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Plus className="w-6 h-6" aria-hidden="true" />
                )}
              </div>
              <span className="text-sm font-medium text-violet-300 group-hover:text-violet-200 transition-colors leading-tight">
                {showAll ? t('showLess') : t('showMore', { count: hiddenCount })}
              </span>
            </button>
          )}
        </div>
      ) : (
        <p className="text-gray-400">{t('noCastInfo')}</p>
      )}
    </div>
  );
};
