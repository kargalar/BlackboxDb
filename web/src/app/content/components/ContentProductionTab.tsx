'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { ContentPerson } from '@/types/unified-content';
import { useTranslations } from 'next-intl';
import CompanyLogo from '@/components/atoms/CompanyLogo';

const INITIAL_SHOW_COUNT = 10;

interface ContentProductionTabProps {
  type: string;
  crew: ContentPerson[];
  getProductionCompanies: () => { id: string; name: string; logoUrl?: string | null }[];
  getCreators: () => any[];
  getProductionCountries: () => any[];
}

export const ContentProductionTab: React.FC<ContentProductionTabProps> = ({
  type,
  crew,
  getProductionCompanies,
  getCreators,
  getProductionCountries,
}) => {
  const t = useTranslations('ContentProductionTab');
  const [showAllOtherCrew, setShowAllOtherCrew] = useState(false);

  const hasRole = (person: ContentPerson, role: string) =>
    person.role?.toLowerCase() === role.toLowerCase();

  const filterByRole = (people: ContentPerson[], role: string) =>
    people.filter((p) => hasRole(p, role));

  const filterExcludeRoles = (people: ContentPerson[], excludeRoles: string[]) =>
    people.filter((p) => !excludeRoles.some((role) => hasRole(p, role)));

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-200 mb-4">{t('title')}</h3>
      <div className="space-y-4">
        {/* Production Companies */}
        {getProductionCompanies().length > 0 && (
          <div>
            <span className="text-gray-400">{t('productionCompany')}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {getProductionCompanies().map((c) => (
                <Link
                  key={c.id}
                  href={`/company/${c.id}` as any}
                  className="border border-gray-300 bg-[#ffffff] px-3 py-1.5 rounded flex items-center justify-center transition-colors hover:bg-[#f3f4f6] text-sm text-gray-900 font-medium"
                >
                  {c.logoUrl ? <CompanyLogo src={c.logoUrl} name={c.name} /> : c.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Directors */}
        {(type === 'movie' || type === 'tv') && filterByRole(crew, 'director').length > 0 && (
          <div>
            <span className="text-gray-400">{t('director')}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {filterByRole(crew, 'director').map((member) => (
                <Link
                  key={member.id}
                  href={`/person/${member.personId}` as any}
                  className="bg-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  {member.person.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Writers */}
        {(type === 'movie' || type === 'tv') && filterByRole(crew, 'writer').length > 0 && (
          <div>
            <span className="text-gray-400">{t('writer')}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {filterByRole(crew, 'writer').map((member) => (
                <Link
                  key={member.id}
                  href={`/person/${member.personId}` as any}
                  className="bg-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  {member.person.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Creators for TV */}
        {type === 'tv' && getCreators().length > 0 && (
          <div>
            <span className="text-gray-400">{t('creator')}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {getCreators().map((creator) => (
                <span key={creator.id} className="bg-gray-700 px-2 py-1 rounded text-sm">
                  {creator.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Crew Members */}
        {crew.length > 0 && (
          <div className="space-y-3">
            {filterByRole(crew, 'cinematographer').length > 0 && (
              <div>
                <span className="text-gray-400">{t('cinematographer')}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {filterByRole(crew, 'cinematographer').map((member) => (
                    <Link
                      key={member.id}
                      href={`/person/${member.personId}` as any}
                      className="bg-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      {member.person.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filterByRole(crew, 'composer').length > 0 && (
              <div>
                <span className="text-gray-400">{t('composer')}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {filterByRole(crew, 'composer').map((member) => (
                    <Link
                      key={member.id}
                      href={`/person/${member.personId}`}
                      className="bg-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      {member.person.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filterByRole(crew, 'producer').length > 0 && (
              <div>
                <span className="text-gray-400">{t('producer')}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {filterByRole(crew, 'producer').map((member) => (
                    <Link
                      key={member.id}
                      href={`/person/${member.personId}`}
                      className="bg-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      {member.person.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filterByRole(crew, 'editor').length > 0 && (
              <div>
                <span className="text-gray-400">{t('editor')}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {filterByRole(crew, 'editor').map((member) => (
                    <Link
                      key={member.id}
                      href={`/person/${member.personId}`}
                      className="bg-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      {member.person.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {filterExcludeRoles(crew, [
              'cinematographer',
              'composer',
              'producer',
              'editor',
              'director',
              'writer',
            ]).length > 0 && (
              <div>
                <span className="text-gray-400">{t('otherCrew')}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(() => {
                    const otherCrew = filterExcludeRoles(crew, [
                      'cinematographer',
                      'composer',
                      'producer',
                      'editor',
                      'director',
                      'writer',
                    ]);
                    const visibleCrew = showAllOtherCrew
                      ? otherCrew
                      : otherCrew.slice(0, INITIAL_SHOW_COUNT);
                    return (
                      <>
                        {visibleCrew.map((member) => (
                          <Link
                            key={member.id}
                            href={`/person/${member.personId}` as any}
                            className="bg-gray-700 px-2 py-1 rounded text-sm hover:bg-gray-600 transition-colors"
                            title={member.role}
                          >
                            {member.person.name} ({member.job || member.role})
                          </Link>
                        ))}
                        {otherCrew.length > INITIAL_SHOW_COUNT && (
                          <button
                            onClick={() => setShowAllOtherCrew(!showAllOtherCrew)}
                            className="px-3 py-1 rounded text-sm bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 transition-colors border border-violet-500/30"
                          >
                            {showAllOtherCrew
                              ? t('showLess')
                              : t('showMore', { count: otherCrew.length - INITIAL_SHOW_COUNT })}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Production Countries */}
        {getProductionCountries().length > 0 && (
          <div>
            <span className="text-gray-400">{t('country')}</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {getProductionCountries().map((country) => (
                <span key={country.iso_3166_1} className="bg-gray-700 px-2 py-1 rounded text-sm">
                  {country.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentProductionTab;
