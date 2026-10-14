'use client';

import React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import type { UnifiedContent, ContentPerson } from '@/types/unified-content';
import { useTranslations } from 'next-intl';
import AgeRatingBadge from '@/components/atoms/AgeRatingBadge';
import CompanyLogo from '@/components/atoms/CompanyLogo';

interface ContentDetailTabProps {
  content: UnifiedContent | null;
  type: string;
  genres: any[];
  crew: ContentPerson[];
  getPublishers: () => { id: string; name: string; logoUrl?: string | null }[];
  getDevelopers?: () => { id: string; name: string; logoUrl?: string | null }[];
  getProductionCompanies?: () => { id: string; name: string; logoUrl?: string | null }[];
  getNetworks: () => any[];
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number) => string;
  getLanguageName: (code: string) => string;
}

export const ContentDetailTab: React.FC<ContentDetailTabProps> = ({
  content,
  type,
  genres,
  crew,
  getPublishers,
  getDevelopers = () => [],
  getProductionCompanies = () => [],
  getNetworks,
  formatDate,
  formatCurrency,
  getLanguageName,
}) => {
  const t = useTranslations('ContentDetailTab');
  const filterByRole = (people: ContentPerson[], role: string) =>
    people.filter((p) => p.role?.toLowerCase() === role.toLowerCase());

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Basic Info */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-200">{t('basicInfo')}</h3>

        {/* Release Date */}
        {type === 'movie' && content?.releaseDate && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{t('releaseDate')}</span>
            <span className="text-white">{formatDate(content.releaseDate)}</span>
          </div>
        )}

        {/* First Air Date for TV */}
        {type === 'tv' && content?.tvDetails?.firstAirDate && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{t('firstAirDate')}</span>
            <span className="text-white">{formatDate(content.tvDetails.firstAirDate)}</span>
          </div>
        )}

        {/* Last Air Date for TV */}
        {type === 'tv' && content?.tvDetails?.lastAirDate && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{t('lastAirDate')}</span>
            <span className="text-white">{formatDate(content.tvDetails.lastAirDate)}</span>
          </div>
        )}

        {/* Language */}
        {(type === 'movie' || type === 'tv') &&
          content?.languages &&
          content.languages.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{t('originalLanguage')}</span>
              <span className="text-white">
                {typeof content.languages[0] === 'string'
                  ? content.languages[0]
                  : (content.languages[0] as any)?.language?.name ||
                    (content.languages[0] as any)?.name}
              </span>
            </div>
          )}

        {/* Studio / Production Companies */}
        {(type === 'movie' || type === 'tv') && getProductionCompanies().length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-gray-400 whitespace-nowrap mt-1">{t('studio')}</span>
            <div className="flex flex-wrap gap-2">
              {getProductionCompanies().map((company, index) => (
                <Link
                  key={index}
                  href={`/company/${company.id}` as any}
                  className="border border-gray-300 bg-[#ffffff] px-3 py-1.5 rounded flex items-center justify-center transition-colors hover:bg-[#f3f4f6] text-sm text-gray-900 font-medium"
                >
                  {company.logoUrl ? (
                    <CompanyLogo src={company.logoUrl} name={company.name} />
                  ) : (
                    company.name
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* GAME SPECIFIC DETAILS */}
        {type === 'game' && (
          <>
            {getDevelopers().length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap mt-1">{t('studio')}</span>
                <div className="flex flex-wrap gap-2">
                  {getDevelopers().map((developer, index) => (
                    <Link
                      key={index}
                      href={`/company/${developer.id}` as Route}
                      className="border border-gray-300 bg-[#ffffff] px-3 py-1.5 rounded flex items-center justify-center transition-colors hover:bg-[#f3f4f6] text-sm text-gray-900 font-medium"
                    >
                      {developer.logoUrl ? (
                        <CompanyLogo src={developer.logoUrl} name={developer.name} />
                      ) : (
                        developer.name
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {content?.gameModes && content.gameModes.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap">{t('gameModes')}</span>
                <div className="flex flex-wrap gap-1">
                  {content.gameModes.map((mode, index) => (
                    <Link
                      key={mode.id || index}
                      href={`/explore/game?gameMode=${mode.id || mode.name}` as Route}
                      className="bg-green-900/50 border border-green-700 hover:bg-green-800/80 hover:border-green-500 px-2 py-0.5 rounded text-sm text-green-300 transition-colors"
                    >
                      {mode.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {content?.gameEngines && content.gameEngines.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap">{t('gameEngine')}</span>
                <div className="flex flex-wrap gap-1">
                  {content.gameEngines.map((engine, index) => (
                    <Link
                      key={engine.id || index}
                      href={`/explore/game?gameEngine=${engine.id || engine.name}` as Route}
                      className="bg-cyan-900/50 border border-cyan-700 hover:bg-cyan-800/80 hover:border-cyan-500 px-2 py-0.5 rounded text-sm text-cyan-300 transition-colors"
                    >
                      {engine.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {content?.perspectives && content.perspectives.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap">{t('perspective')}</span>
                <div className="flex flex-wrap gap-1">
                  {content.perspectives.map((perspective, index) => (
                    <Link
                      key={perspective.id || index}
                      href={`/explore/game?perspective=${perspective.id || perspective.name}` as Route}
                      className="bg-purple-900/50 border border-purple-700 hover:bg-purple-800/80 hover:border-purple-500 px-2 py-0.5 rounded text-sm text-purple-300 transition-colors"
                    >
                      {perspective.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {content?.platforms && content.platforms.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap">{t('platforms')}</span>
                <div className="flex flex-wrap gap-1">
                  {content.platforms.map((platform, index) => (
                    <Link
                      key={platform.id || index}
                      href={`/explore/${type}?platform=${platform.id || platform.name}` as Route}
                      className="bg-blue-900/50 border border-blue-700 hover:bg-blue-800/80 hover:border-blue-500 px-2 py-0.5 rounded text-sm text-blue-300 transition-colors"
                    >
                      {platform.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {content?.fileSize && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 whitespace-nowrap">{t('fileSize')}</span>
                <span className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-sm text-gray-200 font-medium">
                  {content.fileSize}
                </span>
              </div>
            )}

            {content?.themes && content.themes.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap">{t('themesWithEmoji')}</span>
                <div className="flex flex-wrap gap-1">
                  {content.themes.map((theme, index) => (
                    <Link
                      key={theme.id || index}
                      href={`/explore/${type}?theme=${theme.id || theme.name}` as Route}
                      className="bg-orange-900/50 border border-orange-700 hover:bg-orange-800/80 hover:border-orange-500 px-2 py-0.5 rounded text-sm text-orange-300 transition-colors"
                    >
                      {theme.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(type === 'game' || type === 'book') && getPublishers().length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap mt-1">
                  {(type as string) === 'book' ? t('publisherBook') : t('publisherGame')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {getPublishers().map((publisher, index) => (
                    <Link
                      key={index}
                      href={`/company/${publisher.id}` as any}
                      className="border border-gray-300 bg-[#ffffff] px-3 py-1.5 rounded flex items-center justify-center transition-colors hover:bg-[#f3f4f6] text-sm text-gray-900 font-medium"
                    >
                      {publisher.logoUrl ? (
                        <CompanyLogo src={publisher.logoUrl} name={publisher.name} />
                      ) : (
                        publisher.name
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* BOOK SPECIFIC DETAILS */}
        {type === 'book' && (
          <>
            {content?.isbn && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{t('isbn')}</span>
                <span className="text-white font-mono">{content.isbn}</span>
              </div>
            )}

            {content?.pageCount && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{t('pageCount')}</span>
                <span className="text-white">{content.pageCount}</span>
              </div>
            )}

            {content?.releaseDate && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{t('firstPublishDate')}</span>
                <span className="text-white">{formatDate(content.releaseDate)}</span>
              </div>
            )}

            {content?.publishedDate && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{t('editionPublishDate')}</span>
                <span className="text-white">{formatDate(content.publishedDate)}</span>
              </div>
            )}

            {getPublishers().length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap mt-1">{t('publisherBook')}</span>
                <div className="flex flex-wrap gap-2">
                  {getPublishers().map((publisher, index) => (
                    <Link
                      key={index}
                      href={`/company/${publisher.id}` as any}
                      className="border border-gray-300 bg-[#ffffff] px-3 py-1.5 rounded flex items-center justify-center transition-colors hover:bg-[#f3f4f6] text-sm text-gray-900 font-medium"
                    >
                      {publisher.logoUrl ? (
                        <CompanyLogo src={publisher.logoUrl} name={publisher.name} />
                      ) : (
                        publisher.name
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {content?.language && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{t('language')}</span>
                <span className="text-white">{content.language}</span>
              </div>
            )}

            {content?.categories && content.categories.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-gray-400 whitespace-nowrap">{t('categories')}</span>
                <div className="flex flex-wrap gap-1">
                  {content.categories.map((category: string, index: number) => (
                    <Link
                      key={index}
                      href={`/explore/book?genre=${encodeURIComponent(category)}` as Route}
                      className="bg-purple-900/50 border border-purple-700 hover:bg-purple-800/80 hover:border-purple-500 px-2 py-0.5 rounded text-sm text-purple-300 transition-colors"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {content?.bookSeries && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{t('series')}</span>
                <span className="text-white">{content.bookSeries}</span>
                {content?.bookSeriesNumber && (
                  <span className="text-gray-400">(#{content.bookSeriesNumber})</span>
                )}
              </div>
            )}

            {content?.maturityRating && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{t('maturityRating')}</span>
                <span className="text-white">{content.maturityRating}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Genres Section */}
      {genres && genres.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">{t('genres')}</h3>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre: any) => (
              <Link
                key={genre.id}
                href={`/explore/${type}?genre=${genre.id}` as any}
                className="bg-gray-700 px-3 py-1 rounded-full text-sm hover:bg-violet-600 transition-colors"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Themes Section */}
      {content?.themes && content.themes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">{t('themes')}</h3>
          <div className="flex flex-wrap gap-2">
            {content.themes.map((theme: any, index: number) => (
              <Link
                key={theme.id || index}
                href={`/explore/${type}?theme=${theme.id || theme.name}` as any}
                className="bg-purple-900/50 border border-purple-600 px-3 py-1 rounded-full text-sm hover:bg-purple-700 transition-colors"
              >
                {typeof theme === 'string' ? theme : theme.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Moods Section */}
      {content?.moods && content.moods.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">{t('mood')}</h3>
          <div className="flex flex-wrap gap-2">
            {content.moods.map((mood: any, index: number) => (
              <Link
                key={mood.id || index}
                href={`/explore/${type}?mood=${mood.id || mood.name}` as any}
                className="bg-pink-900/50 border border-pink-600 px-3 py-1 rounded-full text-sm hover:bg-pink-700 transition-colors"
              >
                {typeof mood === 'string' ? mood : mood.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Age Rating Section */}
      {content?.ageRating && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">{t('ageRating')}</h3>
          <Link
            href={
              `/explore/${type}?ageRating=${typeof content.ageRating === 'string' ? content.ageRating : content.ageRating.id}` as any
            }
            className="inline-block transition-transform hover:scale-[1.02]"
          >
            <AgeRatingBadge rating={content.ageRating} />
          </Link>
        </div>
      )}

      {content?.alternativeTitles && content.alternativeTitles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">Alternative Titles</h3>
          <div className="flex flex-wrap gap-2">
            {content.alternativeTitles.map((title, index) => (
              <span
                key={`${title}-${index}`}
                className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-sm text-gray-200"
              >
                {title}
              </span>
            ))}
          </div>
        </div>
      )}

      {content?.awards && content.awards.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">Awards</h3>
          <div className="flex flex-wrap gap-2">
            {content.awards.map((award, index) => (
              <Link
                key={`${award}-${index}`}
                href={`/explore/${type}?hasAwards=true` as Route}
                className="bg-amber-900/30 border border-amber-600/40 hover:bg-amber-800/60 hover:border-amber-500 px-3 py-1 rounded-full text-sm text-amber-200 transition-colors"
              >
                {award}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Languages Section */}
      {((content as any)?.language || (content?.languages && content.languages.length > 0)) && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">{t('languageTitle')}</h3>
          <div className="flex flex-wrap gap-2">
            {(content as any)?.language ? (
              <Link
                href={`/explore/${type}?language=${(content as any).language}` as any}
                className="bg-blue-900/50 border border-blue-600 px-3 py-1 rounded-full text-sm hover:bg-blue-700 transition-colors"
              >
                {getLanguageName((content as any).language)}
              </Link>
            ) : (
              content?.languages?.map((lang: any, index: number) => {
                const langValue =
                  typeof lang === 'string' ? lang : lang.language?.name || lang.name;

                return (
                  <Link
                    key={index}
                    href={`/explore/${type}?language=${langValue}` as any}
                    className="bg-blue-900/50 border border-blue-600 px-3 py-1 rounded-full text-sm hover:bg-blue-700 transition-colors"
                  >
                    {typeof lang === 'string'
                      ? getLanguageName(lang)
                      : lang.language?.name || lang.name}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Budget & Revenue */}
      {type === 'movie' && ((content as any)?.budget || (content as any)?.revenue) && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">{t('financialInfo')}</h3>
          <div className="grid grid-cols-2 gap-4">
            {(content as any)?.budget && Number((content as any).budget) > 0 && (
              <div>
                <span className="text-gray-400 block text-sm">{t('budget')}</span>
                <span className="text-white font-medium">
                  {formatCurrency(Number((content as any).budget))}
                </span>
              </div>
            )}
            {(content as any)?.revenue && Number((content as any).revenue) > 0 && (
              <div>
                <span className="text-gray-400 block text-sm">{t('revenue')}</span>
                <span className="text-white font-medium">
                  {formatCurrency(Number((content as any).revenue))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Networks Section - TV */}
      {type === 'tv' && getNetworks().length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-200">{t('network')}</h3>
          <div className="flex flex-wrap gap-2">
            {getNetworks().map((n) => (
              <Link
                key={n.id}
                href={`/company/${n.id}` as Route}
                className="bg-gray-700 hover:bg-violet-600 px-3 py-1 rounded-full text-sm transition-colors text-white"
              >
                {n.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentDetailTab;
