'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getProfileUrl } from '@/lib/image-utils';
import type { ContentPerson } from '@/types/unified-content';

const INITIAL_SHOW_COUNT = 10;

interface ContentCastProps {
  cast: ContentPerson[];
}

const ContentCast = ({ cast }: ContentCastProps) => {
  const [showAllActors, setShowAllActors] = useState(false);
  const [showAllVoiceActors, setShowAllVoiceActors] = useState(false);

  if (cast.length === 0) return null;

  // Sort by creditOrder first, then filter by role
  const sortedCast = [...cast].sort((a, b) => {
    const orderA = a.creditOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.creditOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  // Oyuncular ve seslendirme aktörlerini ayır
  const actors = sortedCast.filter((m) => m.role?.toLowerCase() === 'actor');
  const voiceActors = sortedCast.filter((m) =>
    ['voice_actor', 'voice'].includes(m.role?.toLowerCase() || '')
  );

  return (
    <div className="mt-8 space-y-8">
      {/* Oyuncular */}
      {actors.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span>🎭</span>
            <span className="gradient-text">Oyuncular</span>
            <span className="text-sm text-white/40 font-normal">({actors.length})</span>
          </h2>
          <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-thin flex-wrap">
            {(showAllActors ? actors : actors.slice(0, INITIAL_SHOW_COUNT)).map((member) => (
              <Link
                key={member.id}
                href={`/person/${member.personId}`}
                className="flex-shrink-0 text-center group cursor-pointer w-28"
              >
                {member.person.profileUrl ? (
                  <Image
                    src={getProfileUrl.card(member.person.profileUrl)}
                    alt={member.person.name}
                    width={120}
                    height={180}
                    className="w-full aspect-[2/3] object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-white/10 rounded-xl mb-2 flex items-center justify-center group-hover:bg-white/20 transition-colors duration-200">
                    <span className="text-3xl">👤</span>
                  </div>
                )}
                <p className="font-semibold text-sm group-hover:text-violet-400 transition-colors duration-200 truncate">
                  {member.person.name}
                </p>
                {member.character && (
                  <p className="text-xs text-white/50 truncate">&quot;{member.character}&quot;</p>
                )}
              </Link>
            ))}
          </div>
          {actors.length > INITIAL_SHOW_COUNT && (
            <button
              onClick={() => setShowAllActors(!showAllActors)}
              className="mt-2 px-4 py-2 rounded-lg text-sm bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 transition-colors border border-violet-500/30"
            >
              {showAllActors
                ? 'Daha Az Göster'
                : `+${actors.length - INITIAL_SHOW_COUNT} Daha Fazla Göster`}
            </button>
          )}
        </div>
      )}

      {/* Seslendirme Oyuncuları */}
      {voiceActors.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <span>🎙️</span>
            <span className="gradient-text">Seslendirme</span>
            <span className="text-sm text-white/40 font-normal">({voiceActors.length})</span>
          </h2>
          <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-thin flex-wrap">
            {(showAllVoiceActors ? voiceActors : voiceActors.slice(0, INITIAL_SHOW_COUNT)).map(
              (member) => (
                <Link
                  key={member.id}
                  href={`/person/${member.personId}`}
                  className="flex-shrink-0 text-center group cursor-pointer w-28"
                >
                  {member.person.profileUrl ? (
                    <Image
                      src={getProfileUrl.card(member.person.profileUrl)}
                      alt={member.person.name}
                      width={120}
                      height={180}
                      className="w-full aspect-[2/3] object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-white/10 rounded-xl mb-2 flex items-center justify-center group-hover:bg-white/20 transition-colors duration-200">
                      <span className="text-3xl">🎙️</span>
                    </div>
                  )}
                  <p className="font-semibold text-sm group-hover:text-violet-400 transition-colors duration-200 truncate">
                    {member.person.name}
                  </p>
                  {member.character && (
                    <p className="text-xs text-white/50 truncate">&quot;{member.character}&quot;</p>
                  )}
                </Link>
              )
            )}
          </div>
          {voiceActors.length > INITIAL_SHOW_COUNT && (
            <button
              onClick={() => setShowAllVoiceActors(!showAllVoiceActors)}
              className="mt-2 px-4 py-2 rounded-lg text-sm bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 transition-colors border border-violet-500/30"
            >
              {showAllVoiceActors
                ? 'Daha Az Göster'
                : `+${voiceActors.length - INITIAL_SHOW_COUNT} Daha Fazla Göster`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentCast;
