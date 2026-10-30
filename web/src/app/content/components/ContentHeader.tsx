'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { deleteContent } from '@/services/adminService';
import UserContentActions from './UserContentActions';
import EmotionReactions from '@/components/organisms/EmotionReactions';
import Image from 'next/image';
import Link from 'next/link';
import type { UnifiedContent, ContentPerson } from '@/types/unified-content';
import ContentAlternativeImages from '@/app/content/components/ContentAlternativeImages';
import ContentFranchise from '@/app/content/components/ContentFranchise';
import ContentExpansions from '@/app/content/components/ContentExpansions';
import ContentBookPublications from '@/app/content/components/ContentBookPublications';

import ContentStats from './ContentStats';
import { ContentCastTab } from './ContentCastTab';
import { ContentDetailTab } from './ContentDetailTab';
import { ContentProductionTab } from './ContentProductionTab';
import ContentActionsMenu from '@/components/organisms/content/ContentActionsMenu';
import AgeRatingBadge from '@/components/atoms/AgeRatingBadge';
import toast from 'react-hot-toast';
import { isFutureDate, isUpcomingContent } from '@/lib/contentStatus';
import ContentCountdown from './ContentCountdown';
import ContentDescription from './ContentDescription';
import { getImageSource, getImageObjectPosition } from '@/lib/image-focus';
import { useBackdropFade } from '../hooks/useBackdropFade';
import { useTranslations } from 'next-intl';

interface Stats {
  consume_count?: number;
  favorite_count?: number;
  consume_later_count?: number;
  review_count?: number;
  average_rating?: number;
  rating_count?: number;
  rating_distribution?: number[];
  tmdb_rating?: number;
}

interface ContentHeaderProps {
  content: UnifiedContent | null;
  type: string;
  title: string;
  imageUrl: string;
  backdropUrl: string;
  description: string;
  year: string;
  genres: any[];
  cast: ContentPerson[];
  crew: ContentPerson[];
  stats: Stats | null;
  isFavorite: boolean;
  setIsFavorite: (favorite: boolean) => void;
  isConsumed: boolean;
  setIsConsumed: (consumed: boolean) => void;
  userConsumeCount?: number;
  isLater: boolean;
  setIsLater: (later: boolean) => void;
  isReleaseNotificationEnabled: boolean;
  setIsReleaseNotificationEnabled: (enabled: boolean) => void;
  isContinuing: boolean;
  setIsContinuing: (continuing: boolean) => void;
  isAbandoned: boolean;
  setIsAbandoned: (abandoned: boolean) => void;
  playtimeMinutes: number;
  bookFormat?: string | null;
  setBookFormat?: (format: string | null) => void;
  defaultBookPublicationId?: number | null;
  userRating: number | null;
  setUserRating: (rating: number | null) => void;
  userRatingDetails?: Record<string, number> | null;
  setUserRatingDetails?: (details: Record<string, number> | null) => void;
  userTags?: string[];
  userTaggedUsers?: any[];
  setStats: React.Dispatch<React.SetStateAction<Stats | null>>;
  actionErrors: Record<string, string>;
  setActionErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearError: (key: string) => void;
  toggleFavorite: (id: string) => Promise<void>;
  refreshStats: () => Promise<void>;
  logMovieWatch: (id: string) => Promise<void>;
  unlogMovieWatch: (id: string) => Promise<void>;
  logBookRead: (id: string) => Promise<void>;
  unlogBookRead: (id: string) => Promise<void>;
  refreshUserLog: () => Promise<void>;
  refreshEpisodes?: () => Promise<void>;
  updateUserContentLog: (id: string, data: any) => Promise<{ data: boolean; error?: any }>;
  rateMovie: (id: string, rating: number | null) => Promise<void>;
  toggleContinuing: (id: string) => Promise<{ isContinuing: boolean; error?: any }>;
  toggleAbandoned: (id: string) => Promise<{ isAbandoned: boolean; error?: any }>;
  id: string;
  getTitle: () => string;
  getImageUrl: () => string;
  getBackdropUrl: () => string;
  getDescription: () => string;
  getYear: () => string;
  getGenres: () => any[];
  getDirector: () => string[];
  getDirectorId: () => string[];
  getWriters: () => string[];
  getCreators?: () => any[];
  getProductionCompanies?: () => { id: string; name: string; logoUrl?: string | null }[];
  getNetworks?: () => any[];
  getProductionCountries: () => any[];
  getDevelopers: () => { id: string; name: string; logoUrl?: string | null }[];
  getPublishers: () => { id: string; name: string; logoUrl?: string | null }[];
  formatRuntime: (minutes: number | null) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getLanguageName: (code: string) => string;
  hideInlineVideos?: boolean;
}

export const ContentHeader: React.FC<ContentHeaderProps> = ({
  content,
  type,
  title,
  imageUrl,
  backdropUrl,
  description,
  year,
  genres,
  cast,
  crew,
  stats,
  isFavorite,
  setIsFavorite,
  isConsumed,
  setIsConsumed,
  userConsumeCount,
  isLater,
  setIsLater,
  isReleaseNotificationEnabled,
  setIsReleaseNotificationEnabled,
  isContinuing,
  setIsContinuing,
  isAbandoned,
  setIsAbandoned,
  playtimeMinutes,
  bookFormat,
  setBookFormat,
  defaultBookPublicationId,
  userRating,
  setUserRating,
  userRatingDetails,
  setUserRatingDetails,
  userTags,
  userTaggedUsers,
  setStats,
  actionErrors,
  setActionErrors,
  clearError,
  toggleFavorite,
  refreshStats,
  logMovieWatch,
  unlogMovieWatch,
  logBookRead,
  unlogBookRead,
  refreshUserLog,
  refreshEpisodes,
  updateUserContentLog,
  rateMovie,
  toggleContinuing,
  toggleAbandoned,
  id,
  getTitle,
  getImageUrl,
  getBackdropUrl,
  getDescription,
  getYear,
  getGenres,
  getDirector,
  getDirectorId,
  getWriters,
  getCreators,
  getProductionCompanies,
  getNetworks,
  getProductionCountries,
  getDevelopers,
  getPublishers,
  formatRuntime,
  formatCurrency,
  formatDate,
  getLanguageName,
  hideInlineVideos = false,
}) => {
  const router = useRouter();
  const { user, isPrivileged } = useAuth();
  const t = useTranslations('ContentHeader');
  console.log('🎬 ContentHeader render ediliyor');

  // Helper function for case-insensitive role comparison
  const hasRole = (person: ContentPerson, role: string) =>
    person.role?.toLowerCase() === role.toLowerCase();

  const filterByRole = (people: ContentPerson[], role: string) =>
    people.filter((p) => hasRole(p, role));

  const filterByRoles = (people: ContentPerson[], roles: string[]) =>
    people.filter((p) => roles.some((role) => hasRole(p, role)));

  const filterExcludeRoles = (people: ContentPerson[], excludeRoles: string[]) =>
    people.filter((p) => !excludeRoles.some((role) => hasRole(p, role)));

  const hasCast = (type === 'movie' || type === 'tv') && cast && cast.length > 0;

  const hasProduction =
    (crew && crew.length > 0) ||
    (getProductionCompanies && getProductionCompanies().length > 0) ||
    (getCreators && getCreators().length > 0) ||
    (getProductionCountries && getProductionCountries().length > 0);

  const hasDetail = !!(
    (type === 'movie' && content?.releaseDate) ||
    (type === 'tv' && (content as any)?.tvDetails?.firstAirDate) ||
    (type === 'tv' && (content as any)?.tvDetails?.lastAirDate) ||
    ((type === 'movie' || type === 'tv') && content?.languages && content.languages.length > 0) ||
    (type === 'game' &&
      ((content?.gameModes && content.gameModes.length > 0) ||
        (content?.gameEngines && content.gameEngines.length > 0) ||
        (content?.perspectives && content.perspectives.length > 0) ||
        (content?.platforms && content.platforms.length > 0) ||
        (content?.themes && content.themes.length > 0) ||
        (getPublishers && getPublishers().length > 0))) ||
    (type === 'book' &&
      ((content as any)?.isbn ||
        (content as any)?.pageCount ||
        (content as any)?.publishedDate ||
        (getPublishers && getPublishers().length > 0) ||
        (content as any)?.language ||
        ((content as any)?.categories && (content as any).categories.length > 0) ||
        (content as any)?.bookSeries ||
        (content as any)?.maturityRating ||
        (content as any)?.previewLink ||
        (content as any)?.infoLink)) ||
    (genres && genres.length > 0) ||
    (content?.themes && content.themes.length > 0) ||
    (content?.moods && content.moods.length > 0) ||
    content?.ageRating ||
    (content as any)?.language ||
    (content?.languages && content.languages.length > 0) ||
    (type === 'movie' && ((content as any)?.budget || (content as any)?.revenue)) ||
    (type === 'tv' && getNetworks && getNetworks().length > 0)
  );

  const hasAnyTabsOrTrailer =
    hasCast || hasProduction || hasDetail || (type !== 'book' && content?.trailerUrl);
  const releaseDateForNotification =
    content?.releaseDate || content?.firstAirDate || (content as any)?.publishedDate;
  const isUpcomingByDate = isFutureDate(releaseDateForNotification);
  const isUpcoming = isUpcomingContent({
    status: content?.status,
    releaseDate: releaseDateForNotification,
  });
  const shouldShowReleaseNotificationButton = Boolean(isUpcomingByDate);

  const getInitialTab = () => {
    if (type === 'movie' || type === 'tv') {
      if (hasCast) return 'cast';
      if (hasDetail) return 'detail';
      if (hasProduction) return 'production';
    } else {
      if (hasDetail) return 'detail';
      if (hasProduction) return 'production';
      if (hasCast) return 'cast';
    }
    return '';
  };

  const [activeTab, setActiveTab] = React.useState(getInitialTab());
  const [isPosterModalOpen, setIsPosterModalOpen] = React.useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = React.useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (activeTab === 'cast' && !hasCast)
      setActiveTab(hasDetail ? 'detail' : hasProduction ? 'production' : '');
    if (activeTab === 'detail' && !hasDetail)
      setActiveTab(hasCast ? 'cast' : hasProduction ? 'production' : '');
    if (activeTab === 'production' && !hasProduction)
      setActiveTab(hasCast ? 'cast' : hasDetail ? 'detail' : '');
  }, [hasCast, hasDetail, hasProduction, activeTab]);

  const hasBackdrop = Boolean(
    backdropUrl &&
    typeof backdropUrl === 'string' &&
    backdropUrl.trim().length > 0 &&
    backdropUrl !== 'null' &&
    backdropUrl !== 'undefined'
  );
  const backdropHeroRef = useBackdropFade(hasBackdrop, id, description);

  return (
    <div ref={backdropHeroRef} className="content-detail-page content-cinematic-hero">
      {hasBackdrop && (
        <div className="content-detail-backdrop relative w-full">
          <div className="content-detail-backdrop-media">
            <Image
              src={getImageSource(backdropUrl)}
              alt={title}
              fill
              className="object-cover"
              style={{ objectPosition: getImageObjectPosition(backdropUrl) }}
              priority
            />
          </div>
        </div>
      )}

      <div
        className={`content-detail-container content-detail-hero-container ${
          hasBackdrop ? 'has-backdrop' : 'no-backdrop'
        } w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8 relative z-10`}
      >
        <div className="content-detail-layout flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Poster */}
          <div className="content-detail-poster flex-shrink-0">
            {imageUrl ? (
              <div
                className="cursor-pointer group relative inline-block"
                onClick={() => setIsPosterModalOpen(true)}
              >
                <Image
                  src={imageUrl}
                  alt={title}
                  width={300}
                  height={450}
                  className="rounded-2xl shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
                  priority
                />
                {isConsumed && userConsumeCount && userConsumeCount > 1 ? (
                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center justify-center border border-white/20 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10">
                    <span className="text-sm text-white font-black tracking-wide">
                      x{userConsumeCount}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="w-72 h-96 bg-white/10 rounded-2xl flex items-center justify-center">
                <span className="text-white/40 text-4xl">🎬</span>
              </div>
            )}

            {/* Geri Sayım */}
            {releaseDateForNotification && isUpcomingByDate && (
              <ContentCountdown releaseDate={releaseDateForNotification} />
            )}

            {/* Stats - Under poster */}
            {stats && (
              <ContentStats
                stats={{
                  ...stats,
                  tmdb_rating: stats.tmdb_rating ?? (content as any)?.tmdbRating,
                }}
                type={type}
                contentId={id}
              />
            )}
          </div>
          <div className="content-detail-main flex-1">
            <div className="content-detail-title-row mb-2 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-4xl font-bold text-white">
                  {title}
                  {content?.status === 'ongoing' && (
                    <span className="ml-3 rounded-full bg-green-600 px-3 py-1 align-middle text-lg font-semibold text-white">
                      {t('ongoing')}
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="ml-3 rounded-full bg-yellow-600 px-3 py-1 align-middle text-lg font-semibold text-white">
                      {t('upcoming')}
                    </span>
                  )}
                </h1>
                {(year || (content?.originalTitle && content.originalTitle !== title)) && (
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-white/65">
                    {year && <span>{year}</span>}
                    {content?.originalTitle && content.originalTitle !== title && (
                      <span title={t('originalTitle')}>{content.originalTitle}</span>
                    )}
                  </p>
                )}
              </div>
              <ContentActionsMenu contentId={id} contentTitle={title} contentType={type} />
            </div>

            <div className="content-detail-meta-row flex flex-wrap items-center gap-2 mb-4">
              {/* Director */}
              {(type === 'movie' || type === 'tv') && getDirector().length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {getDirector()
                    .slice(0, 3)
                    .map((director, index) => (
                      <Link
                        key={index}
                        href={`/person/${getDirectorId()[index]}` as any}
                        className="text-sm font-bold text-white hover:text-white/80 transition-colors"
                      >
                        {director}
                      </Link>
                    ))}
                  {getDirector().length > 3 && (
                    <span
                      className="text-sm font-bold text-white cursor-pointer hover:text-white/80 transition-colors"
                      onClick={() => setActiveTab('production')}
                    >
                      {t('more', { count: getDirector().length - 3 })}
                    </span>
                  )}
                </div>
              )}

              {/* Developer - For Games */}
              {type === 'game' && getDevelopers().length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {getDevelopers().map((developer, index) => (
                    <Link
                      key={index}
                      href={`/company/${developer.id}` as any}
                      className="text-sm font-bold text-white hover:text-white/80 transition-colors"
                    >
                      {developer.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Authors - For Books */}
              {type === 'book' && filterByRole(crew, 'author').length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-white/50">Yazar:</span>
                  {filterByRole(crew, 'author').map((author, index) => (
                    <Link
                      key={author.id}
                      href={`/person/${author.personId}` as any}
                      className="text-sm font-bold text-white hover:text-white/80 transition-colors"
                    >
                      {author.person.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Translators - For Books */}
              {type === 'book' && filterByRole(crew, 'translator').length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-white/50">Çeviri:</span>
                  {filterByRole(crew, 'translator').map((translator, index) => (
                    <Link
                      key={translator.id}
                      href={`/person/${translator.personId}` as any}
                      className="font-bold text-white hover:text-white/80 transition-colors"
                    >
                      {translator.person.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Publisher - For Books */}
              {type === 'book' && getPublishers().length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-white/50">Yayınevi:</span>
                  {getPublishers().map((publisher, index) => (
                    <Link
                      key={index}
                      href={`/company/${publisher.id}` as any}
                      className="font-bold text-white hover:text-white/80 transition-colors"
                    >
                      {publisher.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Page Count for Books */}
              {type === 'book' && content?.pageCount && (
                <span className="text-lg font-bold text-white">
                  {t('pages', { count: content.pageCount })}
                </span>
              )}

              {/* Duration/Runtime */}
              {type === 'movie' && content?.runtime && (
                <span className="text-base font-semibold text-white">
                  {formatRuntime(content.runtime)}
                </span>
              )}

              {type === 'game' && (content as any).time_to_beat?.normally && (
                <span className="text-lg font-bold text-white">
                  {t('average', {
                    time: (() => {
                      const durationInSeconds = (content as any).time_to_beat.normally;
                      const hours = Math.floor(durationInSeconds / 3600);
                      const minutes = Math.floor((durationInSeconds % 3600) / 60);
                      if (hours > 0 && minutes > 0)
                        return t('timeFormats.hoursAndMins', { hours, mins: minutes });
                      if (hours > 0) return t('timeFormats.hours', { hours });
                      return t('timeFormats.mins', { mins: minutes });
                    })(),
                  })}
                </span>
              )}

              {/* TV Seasons & Episodes */}
              {type === 'tv' &&
                (() => {
                  // Get seasons count and episode count from data
                  let seasonCount = (content as any)?.numberOfSeasons;
                  let episodeCount = (content as any)?.numberOfEpisodes;

                  // Try to calculate from seasons data if not available
                  if ((!seasonCount || !episodeCount) && (content as any)?.seasons) {
                    try {
                      const seasonsData = (content as any).seasons;
                      const seasons =
                        typeof seasonsData === 'string' ? JSON.parse(seasonsData) : seasonsData;
                      if (Array.isArray(seasons)) {
                        if (!seasonCount) seasonCount = seasons.length;
                        if (!episodeCount) {
                          episodeCount = seasons.reduce(
                            (total: number, s: any) => total + (s.episodes?.length || 0),
                            0
                          );
                        }
                      }
                    } catch (e) {
                      // JSON parse error, skip
                    }
                  }

                  // Get average duration (now a single number, not an array)
                  const avgDuration = (content as any)?.averageDuration;

                  return (
                    <>
                      {seasonCount && seasonCount > 0 && (
                        <span className="text-lg font-bold text-white">
                          {t('seasons', { count: seasonCount })}
                        </span>
                      )}
                      {episodeCount && episodeCount > 0 && (
                        <span className="text-lg font-bold text-white">
                          {t('episodes', { count: episodeCount })}
                          {avgDuration && ` ${t('avgMins', { count: avgDuration })}`}
                        </span>
                      )}
                      {/* Show average duration separately if we have it but no episode count */}
                      {avgDuration && (!episodeCount || episodeCount === 0) && (
                        <span className="text-lg font-bold text-white">
                          {t('minsPerEpisode', { count: avgDuration })}
                        </span>
                      )}
                    </>
                  );
                })()}

              {/* Game Average Playtime */}
              {type === 'game' && (content as any)?.averageDuration && (
                <span className="text-lg font-bold text-white">
                  {t('average', {
                    time: (() => {
                      const duration = (content as any).averageDuration;
                      const hours = Math.floor(duration / 60);
                      const minutes = duration % 60;
                      if (hours > 0 && minutes > 0)
                        return t('timeFormats.hoursAndMins', { hours, mins: minutes });
                      if (hours > 0) return t('timeFormats.hours', { hours });
                      return t('timeFormats.mins', { mins: minutes });
                    })(),
                  })}
                </span>
              )}

              {content?.ageRating && (
                <AgeRatingBadge rating={content.ageRating} className="min-h-0" />
              )}
            </div>

            {/* Book Preview Button */}
            {type === 'book' && (content as any)?.previewLink && (
              <div className="mb-4">
                <button
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  {t('previewBook')}
                </button>
              </div>
            )}

            {/* Description */}
            {description && <ContentDescription key={content?.id} description={description} />}

            {/* Detailed Information - Collapsible */}
            {hasAnyTabsOrTrailer && (
              <div className="mb-6">
                <div className="content-detail-information content-detail-tabs-card glass-card p-6">
                  {/* Tab Buttons */}
                  <div className="content-detail-tabs flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
                    {/* Cast tab first - sadece film ve TV için */}
                    {hasCast && (
                      <button
                        onClick={() => setActiveTab('cast')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          activeTab === 'cast'
                            ? 'bg-violet-600 text-white'
                            : 'text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {t('tabs.cast')}
                      </button>
                    )}
                    {hasDetail && (
                      <button
                        onClick={() => setActiveTab('detail')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          activeTab === 'detail'
                            ? 'bg-violet-600 text-white'
                            : 'text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {t('tabs.details')}
                      </button>
                    )}
                    {hasProduction && (
                      <button
                        onClick={() => setActiveTab('production')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          activeTab === 'production'
                            ? 'bg-violet-600 text-white'
                            : 'text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {t('tabs.production')}
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'detail' && (
                    <ContentDetailTab
                      content={content}
                      type={type}
                      genres={genres}
                      crew={crew}
                      getPublishers={getPublishers || (() => [])}
                      getDevelopers={getDevelopers || (() => [])}
                      getNetworks={getNetworks || (() => [])}
                      getProductionCompanies={getProductionCompanies || (() => [])}
                      formatDate={formatDate}
                      formatCurrency={formatCurrency}
                      getLanguageName={getLanguageName}
                    />
                  )}

                  {/* Cast Tab */}
                  {activeTab === 'cast' && <ContentCastTab cast={cast} hasRole={hasRole} />}

                  {/* Production & Crew Tab */}
                  {activeTab === 'production' && (
                    <ContentProductionTab
                      type={type}
                      crew={crew}
                      getProductionCompanies={getProductionCompanies || (() => [])}
                      getCreators={getCreators || (() => [])}
                      getProductionCountries={getProductionCountries || (() => [])}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Videos Section */}
            {!hideInlineVideos &&
              (content?.trailerUrl || content?.reviewVideoUrl || content?.gameplayVideoUrl) &&
              type !== 'book' && (
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-4">{t('videos')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { url: content?.trailerUrl, title: t('videoTypes.trailer') },
                      { url: content?.reviewVideoUrl, title: t('videoTypes.review') },
                      { url: content?.gameplayVideoUrl, title: t('videoTypes.gameplay') },
                    ]
                      .filter((video) => video.url)
                      .map((video, index) => {
                        const url = video.url!;
                        let embedUrl = url;
                        const patterns = [
                          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                          /^([a-zA-Z0-9_-]{11})$/,
                        ];
                        for (const pattern of patterns) {
                          const match = url.match(pattern);
                          if (match) {
                            embedUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0`;
                            break;
                          }
                        }

                        return (
                          <div key={index} className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-gray-400">{video.title}</span>
                            <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden bg-black/50">
                              <iframe
                                src={embedUrl}
                                className="absolute top-0 left-0 w-full h-full"
                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            <div className="mb-6">
              <EmotionReactions contentId={id} />
            </div>

            {/* Mobilde altta, büyük ekranlarda sağ sütunda gösterilecek */}
            <div className="mt-6 2xl:hidden">
              <UserContentActions
                isFavorite={isFavorite}
                setIsFavorite={setIsFavorite}
                isConsumed={isConsumed}
                setIsConsumed={setIsConsumed}
                isLater={isLater}
                setIsLater={setIsLater}
                isReleaseNotificationEnabled={isReleaseNotificationEnabled}
                setIsReleaseNotificationEnabled={setIsReleaseNotificationEnabled}
                showReleaseNotificationButton={shouldShowReleaseNotificationButton}
                isContinuing={isContinuing}
                setIsContinuing={setIsContinuing}
                isAbandoned={isAbandoned}
                setIsAbandoned={setIsAbandoned}
                playtimeMinutes={playtimeMinutes}
                bookFormat={bookFormat}
                setBookFormat={setBookFormat}
                defaultBookPublicationId={defaultBookPublicationId}
                userRating={userRating}
                setUserRating={setUserRating}
                userRatingDetails={userRatingDetails}
                setUserRatingDetails={setUserRatingDetails}
                userTags={userTags}
                userTaggedUsers={userTaggedUsers}
                setStats={setStats}
                actionErrors={actionErrors}
                setActionErrors={setActionErrors}
                clearError={clearError}
                id={id}
                type={type}
                contentTypeId={content?.contentTypeId ?? 0}
                additionalRatingCategories={content?.additionalRatingCategories || []}
                toggleFavorite={toggleFavorite}
                refreshStats={refreshStats}
                logMovieWatch={logMovieWatch}
                unlogMovieWatch={unlogMovieWatch}
                logBookRead={logBookRead}
                unlogBookRead={unlogBookRead}
                refreshUserLog={refreshUserLog}
                refreshEpisodes={refreshEpisodes}
                updateUserContentLog={updateUserContentLog}
                rateMovie={rateMovie}
                toggleContinuing={toggleContinuing}
                toggleAbandoned={toggleAbandoned}
                supportedPlatforms={content?.platforms || []}
              />
            </div>
          </div>
          {/* Sağ sabit aksiyon paneli */}
          <div className="content-detail-action-rail hidden 2xl:block w-64 shrink-0 pt-4">
            <div className="sticky top-24">
              <UserContentActions
                isFavorite={isFavorite}
                setIsFavorite={setIsFavorite}
                isConsumed={isConsumed}
                setIsConsumed={setIsConsumed}
                isLater={isLater}
                setIsLater={setIsLater}
                isReleaseNotificationEnabled={isReleaseNotificationEnabled}
                setIsReleaseNotificationEnabled={setIsReleaseNotificationEnabled}
                showReleaseNotificationButton={shouldShowReleaseNotificationButton}
                isContinuing={isContinuing}
                setIsContinuing={setIsContinuing}
                isAbandoned={isAbandoned}
                setIsAbandoned={setIsAbandoned}
                playtimeMinutes={playtimeMinutes}
                bookFormat={bookFormat}
                setBookFormat={setBookFormat}
                defaultBookPublicationId={defaultBookPublicationId}
                userRating={userRating}
                setUserRating={setUserRating}
                userRatingDetails={userRatingDetails}
                setUserRatingDetails={setUserRatingDetails}
                userTags={userTags}
                userTaggedUsers={userTaggedUsers}
                setStats={setStats}
                actionErrors={actionErrors}
                setActionErrors={setActionErrors}
                clearError={clearError}
                id={id}
                type={type}
                contentTypeId={content?.contentTypeId ?? 0}
                additionalRatingCategories={content?.additionalRatingCategories || []}
                toggleFavorite={toggleFavorite}
                refreshStats={refreshStats}
                logMovieWatch={logMovieWatch}
                unlogMovieWatch={unlogMovieWatch}
                logBookRead={logBookRead}
                unlogBookRead={unlogBookRead}
                refreshUserLog={refreshUserLog}
                refreshEpisodes={refreshEpisodes}
                updateUserContentLog={updateUserContentLog}
                rateMovie={rateMovie}
                toggleContinuing={toggleContinuing}
                toggleAbandoned={toggleAbandoned}
                supportedPlatforms={content?.platforms || []}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Poster Modal */}
      {isPosterModalOpen && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
          onClick={() => setIsPosterModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <Image
              src={imageUrl}
              alt={title}
              width={600}
              height={900}
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain"
              priority
            />
          </div>
        </div>
      )}

      {/* Trailer Cinema Mode Modal */}
      {type !== 'book' && isTrailerModalOpen && content?.trailerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setIsTrailerModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[70vw] max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsTrailerModalOpen(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl transition-colors z-10"
            >
              ✕
            </button>
            <div className="relative pb-[56.25%] h-0 rounded-xl overflow-hidden">
              <iframe
                src={(() => {
                  const url = content.trailerUrl;
                  // Extract YouTube video ID from various URL formats
                  const patterns = [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
                  ];
                  for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
                  }
                  return url;
                })()}
                className="absolute top-0 left-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Book Preview Modal */}
      {type === 'book' && isPreviewModalOpen && (content as any)?.previewLink && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[80vw] h-[90vh] mx-4 bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute top-4 right-6 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-xl transition-colors z-10"
            >
              ✕
            </button>
            <iframe
              src={(() => {
                let url = (content as any).previewLink;
                if (url.includes('books.google.') && !url.includes('output=embed')) {
                  url += '&output=embed';
                }
                return url;
              })()}
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentHeader;
