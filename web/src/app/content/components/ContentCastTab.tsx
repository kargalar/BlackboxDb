'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  const visibleCast = showAll ? cast : cast.slice(0, INITIAL_SHOW_COUNT);

  return (
    <div>
      {cast.length > 0 ? (
        <>
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
          </div>
          {cast.length > INITIAL_SHOW_COUNT && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 px-4 py-2 rounded-lg text-sm bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 transition-colors border border-violet-500/30"
            >
              {showAll ? t('showLess') : t('showMore', { count: cast.length - INITIAL_SHOW_COUNT })}
            </button>
          )}
        </>
      ) : (
        <p className="text-gray-400">{t('noCastInfo')}</p>
      )}
    </div>
  );
};
