'use client';

import { useState, useCallback } from 'react';
import { CommonFields } from '@/components/molecules/ContentFormTabs/CommonFields';
import { BookFields } from '@/components/molecules/ContentFormTabs/BookFields';
import { BookPublicationsFields } from '@/components/molecules/ContentFormTabs/BookPublicationsFields';
import { MovieInfoFields } from '@/components/molecules/ContentFormTabs/MovieInfoFields';
import { TvInfoFields } from '@/components/molecules/ContentFormTabs/TvInfoFields';
import { CastCrewFields } from '@/components/molecules/ContentFormTabs/CastCrewFields';
import { GameInfoFields } from '@/components/molecules/ContentFormTabs/GameInfoFields';
import { GameExpansionFields } from '@/components/molecules/ContentFormTabs/GameExpansionFields';

import { SeasonsBuilder } from '@/components/molecules/ContentFormTabs/SeasonsBuilder';
import { SoundtrackFields } from '@/components/molecules/ContentFormTabs/SoundtrackFields';
import { SimilarContentsFields } from '@/components/molecules/ContentFormTabs/SimilarContentsFields';
import { CitationsFields } from '@/components/molecules/ContentFormTabs/CitationsFields';
import { MediaFields } from '@/components/molecules/ContentFormTabs/MediaFields';
import { VideoFields } from '@/components/molecules/ContentFormTabs/VideoFields';
import ScreenshotUpload, { Screenshot } from '@/components/molecules/ScreenshotUpload';
import { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { AddContentFormData } from '../types';
import { ContentFormSidebar } from './ContentFormSidebar';
import { getTabsForContentType } from '../config/tabConfig';
import { isTabFilled } from '../config/tabFillStatus';
import { useTranslations } from 'next-intl';
import { useAutoFill } from '../hooks/useAutoFill';

import { DiffAlert } from './DiffAlert';
import { AdditionalRatingCategories } from './AdditionalRatingCategories';
import { compareFormData, getDiffForTab, DiffResult } from '@/utils/diffUtils';

interface ContentFormLayoutProps {
  formData: AddContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddContentFormData>>;
  errors: Record<string, string>;
  loading: boolean;
  onPendingPosterChange: (pending: PendingImageUpload | null) => void;
  onPendingBackdropChange: (pending: PendingImageUpload | null) => void;
  editingContentId?: string | null;
  canDirectCreate?: boolean;
  enableTitleAutoFill?: boolean;
  originalData?: AddContentFormData | null;
}

function getTvScreenshotSeasons(formData: AddContentFormData, t: any) {
  return [...(formData.seasons || [])]
    .map((season, index) => ({
      seasonNumber: Number(season.seasonNumber || index + 1),
      name: season.name || t('seasonName', { number: season.seasonNumber || index + 1 }),
    }))
    .filter((season) => Number.isFinite(season.seasonNumber))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

function mergeSeasonScreenshots(
  allScreenshots: Screenshot[],
  seasonNumber: number | null,
  seasonScreenshots: Screenshot[]
) {
  const matchesSeason = (s: Screenshot) =>
    seasonNumber === null
      ? s.seasonNumber === undefined || s.seasonNumber === null
      : s.seasonNumber === seasonNumber;
  const otherScreenshots = allScreenshots.filter((s) => !matchesSeason(s));
  const normalizedSeasonScreenshots = seasonScreenshots.map((s, index) => ({
    ...s,
    seasonNumber,
    order: index,
  }));

  return [...otherScreenshots, ...normalizedSeasonScreenshots].map((s, index) => ({
    ...s,
    order: s.seasonNumber ? s.order : index,
  }));
}

function getScreenshotKey(screenshot: Screenshot) {
  return screenshot.id
    ? `id:${screenshot.id}`
    : `url:${screenshot.imageUrl}|file:${screenshot.fileName || ''}`;
}

function moveScreenshotToSeason(
  allScreenshots: Screenshot[],
  screenshot: Screenshot,
  targetSeasonNumber: number | null,
  targetIndex?: number
) {
  const movingKey = getScreenshotKey(screenshot);
  const withoutMoving = allScreenshots.filter((s) => getScreenshotKey(s) !== movingKey);
  const movedScreenshot = {
    ...screenshot,
    seasonNumber: targetSeasonNumber,
  };

  const matchesTargetSeason = (s: Screenshot) =>
    targetSeasonNumber === null
      ? s.seasonNumber === undefined || s.seasonNumber === null
      : s.seasonNumber === targetSeasonNumber;

  const targetScreenshots = withoutMoving.filter(matchesTargetSeason);
  const otherScreenshots = withoutMoving.filter((s) => !matchesTargetSeason(s));
  const insertIndex =
    targetIndex === undefined
      ? targetScreenshots.length
      : Math.max(0, Math.min(targetIndex, targetScreenshots.length));

  targetScreenshots.splice(insertIndex, 0, movedScreenshot);

  const combined = [...otherScreenshots, ...targetScreenshots];
  const groupOrder = new Map<string, number>();

  return combined.map((s) => {
    const key =
      s.seasonNumber === undefined || s.seasonNumber === null ? 'general' : String(s.seasonNumber);
    const order = groupOrder.get(key) || 0;
    groupOrder.set(key, order + 1);
    return { ...s, order };
  });
}

/**
 * Sidebar-tab layout: left sidebar with tab navigation, right panel with active tab content.
 * Tabs change dynamically based on the selected content type.
 */
export function ContentFormLayout({
  formData,
  setFormData,
  errors,
  loading,
  onPendingPosterChange,
  onPendingBackdropChange,
  editingContentId,
  canDirectCreate = true,
  enableTitleAutoFill = true,
  originalData,
}: ContentFormLayoutProps) {
  const t = useTranslations('AddContent.formLayout');
  const [tabSelection, setTabSelection] = useState({
    contentTypeId: formData.contentTypeId,
    tabId: 'basic',
  });

  if (tabSelection.contentTypeId !== formData.contentTypeId) {
    setTabSelection({ contentTypeId: formData.contentTypeId, tabId: 'basic' });
  }

  const activeTab = tabSelection.tabId;

  const tabs = getTabsForContentType(formData.contentTypeId);

  // Auto-fill hook (TMDB / Google Books / IGDB — default source)
  const autoFill = useAutoFill({ formData, setFormData });
  // Secondary auto-fill hook for Open Library (only used for books)
  const autoFillOpenLibrary = useAutoFill({ formData, setFormData, source: 'openlibrary' });
  const canUseTitleAutoFill = canDirectCreate && enableTitleAutoFill;
  const isAutoFillContentType =
    formData.contentTypeId === '1' ||
    formData.contentTypeId === '2' ||
    formData.contentTypeId === '3' ||
    formData.contentTypeId === '4';

  // Diffs
  const allDiffs: DiffResult[] = originalData ? compareFormData(originalData, formData) : [];

  const handleRevert = useCallback(
    (key: string) => {
      if (!originalData) return;
      setFormData((prev) => ({
        ...prev,
        [key]: originalData[key as keyof AddContentFormData],
      }));
      if (key === 'posterUrl') {
        onPendingPosterChange(null);
      }
      if (key === 'backdropUrl') {
        onPendingBackdropChange(null);
      }
    },
    [originalData, setFormData, onPendingPosterChange, onPendingBackdropChange]
  );

  // Reset to 'basic' if the active tab doesn't exist in the new content type's tabs
  const handleTabChange = useCallback(
    (tabId: string) => {
      console.log('📑 [ContentFormLayout] Tab changed:', tabId);
      setTabSelection({ contentTypeId: formData.contentTypeId, tabId });
    },
    [formData.contentTypeId]
  );

  // Ensure activeTab is valid for the current content type
  const validTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'basic';

  console.log('🖼️ [ContentFormLayout] Rendering:', {
    contentType: formData.contentTypeId,
    activeTab: validTab,
    tabCount: tabs.length,
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 -mx-6 px-6">
      {/* Sidebar Tab Navigation */}
      <div className="w-full lg:w-56 flex flex-col gap-6 flex-shrink-0">
        <ContentFormSidebar
          tabs={tabs}
          activeTab={validTab}
          onTabChange={handleTabChange}
          tabFillMap={Object.fromEntries(tabs.map((t) => [t.id, isTabFilled(t.id, formData)]))}
        />
        {allDiffs.length > 0 && (
          <div className="hidden lg:block">
            <DiffAlert diffs={allDiffs} onRevert={handleRevert} title={t('allChanges')} />
          </div>
        )}
      </div>

      {/* Tab Content Panel */}
      <div className="flex-1 min-w-0">
        {/* Temel Bilgiler */}
        {validTab === 'basic' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('basic')}</h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'basic')} onRevert={handleRevert} />
            <CommonFields
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              contentTypeId={parseInt(formData.contentTypeId)}
              onPendingPosterChange={onPendingPosterChange}
              onPendingBackdropChange={onPendingBackdropChange}
              editingContentId={editingContentId}
              autoFill={
                isAutoFillContentType && canUseTitleAutoFill
                  ? {
                      searchResults: autoFill.searchResults,
                      localResults: autoFill.localResults,
                      isSearching: autoFill.isSearching,
                      isLoadingMore: autoFill.isLoadingMore,
                      hasMoreResults: autoFill.hasMoreResults,
                      isSearchingLocal: autoFill.isSearchingLocal,
                      isFetchingDetails: autoFill.isFetchingDetails,
                      showResults: autoFill.showResults,
                      error: autoFill.error,
                      onSearch: () => autoFill.handleSearch(formData.title, formData.contentTypeId),
                      onLoadMore: autoFill.loadMoreResults,
                      onSelect: autoFill.handleSelect,
                      onClose: autoFill.closeResults,
                      sourceName: autoFill.sourceName,
                      onUpdateExisting: autoFill.handleUpdateExisting,
                      isUpdatingExisting: autoFill.isUpdatingExisting,
                    }
                  : undefined
              }
              autoFillSecondary={
                formData.contentTypeId === '4' && canUseTitleAutoFill
                  ? {
                      searchResults: autoFillOpenLibrary.searchResults,
                      localResults: autoFillOpenLibrary.localResults,
                      isSearching: autoFillOpenLibrary.isSearching,
                      isLoadingMore: autoFillOpenLibrary.isLoadingMore,
                      hasMoreResults: autoFillOpenLibrary.hasMoreResults,
                      isSearchingLocal: autoFillOpenLibrary.isSearchingLocal,
                      isFetchingDetails: autoFillOpenLibrary.isFetchingDetails,
                      showResults: autoFillOpenLibrary.showResults,
                      error: autoFillOpenLibrary.error,
                      onSearch: () =>
                        autoFillOpenLibrary.handleSearch(formData.title, formData.contentTypeId),
                      onLoadMore: autoFillOpenLibrary.loadMoreResults,
                      onSelect: autoFillOpenLibrary.handleSelect,
                      onClose: autoFillOpenLibrary.closeResults,
                      sourceName: autoFillOpenLibrary.sourceName,
                      onUpdateExisting: autoFillOpenLibrary.handleUpdateExisting,
                      isUpdatingExisting: autoFillOpenLibrary.isUpdatingExisting,
                    }
                  : undefined
              }
            />
            {canDirectCreate && (
              <AdditionalRatingCategories
                categories={formData.additionalRatingCategories}
                onChange={(additionalRatingCategories) =>
                  setFormData((previous) => ({ ...previous, additionalRatingCategories }))
                }
                disabled={loading}
              />
            )}
          </div>
        )}

        {/* Film Bilgileri */}
        {validTab === 'movie-info' && formData.contentTypeId === '1' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('movieInfo')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'financial')} onRevert={handleRevert} />
            <MovieInfoFields formData={formData} setFormData={setFormData} />
          </div>
        )}

        {/* Kitap Bilgileri */}
        {validTab === 'book-info' && formData.contentTypeId === '4' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('bookInfo')}</h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'bookInfo')} onRevert={handleRevert} />
            <BookFields formData={formData} setFormData={setFormData} errors={errors} />
          </div>
        )}

        {/* Dizi Bilgileri */}
        {validTab === 'tv-info' && formData.contentTypeId === '2' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('tvInfo')}</h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'basic')} onRevert={handleRevert} />
            <TvInfoFields formData={formData} setFormData={setFormData} />
          </div>
        )}

        {/* Sezonlar (TV) */}
        {validTab === 'tv-seasons' && formData.contentTypeId === '2' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('tvSeasons')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'seasons')} onRevert={handleRevert} />
            <SeasonsBuilder formData={formData} setFormData={setFormData} />
          </div>
        )}

        {/* Oyuncular & Ekip (Movie / TV) */}
        {validTab === 'cast-crew' &&
          (formData.contentTypeId === '1' ||
            formData.contentTypeId === '2') && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('castCrew')}
              </h3>
              <DiffAlert diffs={getDiffForTab(allDiffs, 'crew')} onRevert={handleRevert} />
              <CastCrewFields
                formData={formData}
                setFormData={setFormData}
                contentTypeId={parseInt(formData.contentTypeId)}
              />
            </div>
          )}

        {/* Oyun Bilgileri */}
        {validTab === 'game-info' && formData.contentTypeId === '3' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('gameInfo')}</h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'taxonomy')} onRevert={handleRevert} />
            <DiffAlert diffs={getDiffForTab(allDiffs, 'companies')} onRevert={handleRevert} />
            <GameInfoFields formData={formData} setFormData={setFormData} />
          </div>
        )}

        {/* Eklentiler & Remake'ler */}
        {validTab === 'game-expansions' && formData.contentTypeId === '3' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('gameExpansions')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'relations')} onRevert={handleRevert} />
            <GameExpansionFields formData={formData} setFormData={setFormData} />
          </div>
        )}

        {/* Kitap Bilgileri */}
        {validTab === 'book-info' && formData.contentTypeId === '4' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('bookInfo')}</h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'basic')} onRevert={handleRevert} />
            <DiffAlert diffs={getDiffForTab(allDiffs, 'crew')} onRevert={handleRevert} />
            <DiffAlert diffs={getDiffForTab(allDiffs, 'companies')} onRevert={handleRevert} />
            <BookFields formData={formData} setFormData={setFormData} errors={errors} />
          </div>
        )}

        {/* Kitap Yayinlari */}
        {validTab === 'book-publications' && formData.contentTypeId === '4' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('bookPublications')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'media')} onRevert={handleRevert} />
            <DiffAlert diffs={getDiffForTab(allDiffs, 'companies')} onRevert={handleRevert} />
            <BookPublicationsFields formData={formData} setFormData={setFormData} errors={errors} />
          </div>
        )}

        {/* Ekran Görüntüleri */}
        {validTab === 'screenshots' && formData.contentTypeId !== '4' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('screenshots')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'media')} onRevert={handleRevert} />
            {formData.contentTypeId === '2' && getTvScreenshotSeasons(formData, t).length > 0 ? (
              <div className="space-y-8">
                {(formData.screenshots || []).some(
                  (s) => s.seasonNumber === undefined || s.seasonNumber === null
                ) && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <ScreenshotUpload
                      title={t('generalScreenshots')}
                      groupKey="general"
                      screenshots={(formData.screenshots || []).filter(
                        (s) => s.seasonNumber === undefined || s.seasonNumber === null
                      )}
                      onScreenshotsChange={(screenshots) =>
                        setFormData({
                          ...formData,
                          screenshots: mergeSeasonScreenshots(
                            formData.screenshots || [],
                            null,
                            screenshots
                          ),
                        })
                      }
                      onMoveScreenshotHere={(screenshot, targetIndex) =>
                        setFormData({
                          ...formData,
                          screenshots: moveScreenshotToSeason(
                            formData.screenshots || [],
                            screenshot,
                            null,
                            targetIndex
                          ),
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                )}
                {getTvScreenshotSeasons(formData, t).map((season) => (
                  <div
                    key={season.seasonNumber}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                  >
                    <ScreenshotUpload
                      title={t('seasonScreenshots', { seasonName: season.name })}
                      groupKey={`season-${season.seasonNumber}`}
                      screenshots={(formData.screenshots || []).filter(
                        (s) => s.seasonNumber === season.seasonNumber
                      )}
                      onScreenshotsChange={(screenshots) =>
                        setFormData({
                          ...formData,
                          screenshots: mergeSeasonScreenshots(
                            formData.screenshots || [],
                            season.seasonNumber,
                            screenshots
                          ),
                        })
                      }
                      onMoveScreenshotHere={(screenshot, targetIndex) =>
                        setFormData({
                          ...formData,
                          screenshots: moveScreenshotToSeason(
                            formData.screenshots || [],
                            screenshot,
                            season.seasonNumber,
                            targetIndex
                          ),
                        })
                      }
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ScreenshotUpload
                screenshots={formData.screenshots}
                onScreenshotsChange={(screenshots) => setFormData({ ...formData, screenshots })}
                disabled={loading}
              />
            )}
          </div>
        )}

        {/* Soundtrack */}
        {validTab === 'soundtrack' && formData.contentTypeId !== '4' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('soundtrack')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'media')} onRevert={handleRevert} />
            <SoundtrackFields formData={formData} setFormData={setFormData} errors={errors} />
          </div>
        )}

        {/* Media (Kapak & Poster) */}
        {validTab === 'media' && formData.contentTypeId !== '4' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('media')}</h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'media')} onRevert={handleRevert} />
            <MediaFields
              formData={formData}
              setFormData={setFormData}
              contentTypeId={parseInt(formData.contentTypeId)}
              onPendingPosterChange={onPendingPosterChange}
              onPendingBackdropChange={onPendingBackdropChange}
            />
          </div>
        )}

        {/* Videolar */}
        {validTab === 'videos' && formData.contentTypeId !== '4' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('videos')}</h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'media')} onRevert={handleRevert} />
            <VideoFields
              formData={formData}
              setFormData={setFormData}
              contentTypeId={parseInt(formData.contentTypeId)}
            />
          </div>
        )}

        {/* Benzer İçerikler */}
        {validTab === 'similar-contents' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('similarContents')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'relations')} onRevert={handleRevert} />
            <SimilarContentsFields formData={formData} setFormData={setFormData} />
          </div>
        )}

        {/* Atıf Yapan İçerikler */}
        {validTab === 'citations' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Atıf Yapan İçerikler
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'relations')} onRevert={handleRevert} />
            <CitationsFields formData={formData} setFormData={setFormData} />
          </div>
        )}
      </div>
    </div>
  );
}
