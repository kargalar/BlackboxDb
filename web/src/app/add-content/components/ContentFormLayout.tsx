'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useState, useCallback } from 'react';
import { ReleaseFields } from '@/components/molecules/ContentFormTabs/ReleaseFields';
import { CommonFields } from '@/components/molecules/ContentFormTabs/CommonFields';
import { BookFields } from '@/components/molecules/ContentFormTabs/BookFields';
import { BoardGameFields } from '@/components/molecules/ContentFormTabs/BoardGameFields';
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
      seasonNumber: Number(season.seasonNumber ?? index + 1),
      name: season.name || t('seasonName', { number: season.seasonNumber ?? index + 1 }),
    }))
    .filter((season) => Number.isFinite(season.seasonNumber))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}

function screenshotInGroup(s: Screenshot, season: number | null, episode: number | null) {
  return (s.seasonNumber ?? null) === season && (s.episodeNumber ?? null) === episode;
}
function screenshotKey(s: Screenshot) { return s.id ? `id:${s.id}` : `url:${s.imageUrl}|${s.fileName || ''}`; }
function mergeGroup(all: Screenshot[], season: number | null, episode: number | null, group: Screenshot[]) {
  return [...all.filter(s => !screenshotInGroup(s, season, episode)), ...group.map((s, order) => ({ ...s, seasonNumber: season, episodeNumber: episode, order }))];
}
function moveGroup(all: Screenshot[], screenshot: Screenshot, season: number | null, episode: number | null, index?: number) {
  const original = all.find(s => screenshotKey(s) === screenshotKey(screenshot));
  if (!original) return all;
  const rest = all.filter(s => screenshotKey(s) !== screenshotKey(screenshot));
  const group = rest.filter(s => screenshotInGroup(s, season, episode));
  group.splice(index ?? group.length, 0, original);
  return mergeGroup(rest, season, episode, group);
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
  const translateUi = useUiTranslations('Ui');
  const t = useTranslations('AddContent.formLayout');
  const tBoardGames = useTranslations('BoardGames');
  const releaseTranslations = useTranslations('ContentReleases');
  const isBoardGame = formData.contentTypeSlug === 'board-game';
  const [tabSelection, setTabSelection] = useState({
    contentTypeId: formData.contentTypeId,
    tabId: 'basic',
  });

  if (tabSelection.contentTypeId !== formData.contentTypeId) {
    setTabSelection({ contentTypeId: formData.contentTypeId, tabId: 'basic' });
  }

  const activeTab = tabSelection.tabId;

  const tabs = getTabsForContentType(formData.contentTypeId, formData.contentTypeSlug).map((tab) => {
    if (tab.id === 'releases') return { ...tab, label: releaseTranslations('formTitle') };
    if (isBoardGame && tab.id === 'game-expansions') {
      return { ...tab, label: tBoardGames('packagesTab') };
    }
    return { ...tab, label: t(tab.messageKey).replace(/^\p{Extended_Pictographic}\uFE0F?\s+/u, '') };
  });

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
  const diffLabels = useTranslations('DiffUtils');
  const allDiffs: DiffResult[] = originalData
    ? compareFormData(originalData, formData, (key) => diffLabels.has(key) ? diffLabels(key) : key)
    : [];

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
        {validTab === 'releases' && (
          <div className="space-y-4">
            <DiffAlert diffs={getDiffForTab(allDiffs, 'releases')} onRevert={handleRevert} />
            <ReleaseFields formData={formData} setFormData={setFormData} canImport={canDirectCreate} />
          </div>
        )}

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
            {formData.contentTypeSlug === 'board-game' && (
              <BoardGameFields formData={formData} setFormData={setFormData} errors={errors} />
            )}
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
        {validTab === 'game-expansions' && (formData.contentTypeId === '3' || isBoardGame) && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isBoardGame ? tBoardGames('packagesTab') : t('gameExpansions')}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'relations')} onRevert={handleRevert} />
            <GameExpansionFields
              formData={formData}
              setFormData={setFormData}
              boardGame={isBoardGame}
            />
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
            {formData.contentTypeId === '2' ? (
              <div className="space-y-6">
                {[
                  { season: null as number | null, episode: null as number | null, title: t('generalScreenshots') },
                  ...(formData.screenshots || []).filter(s => s.seasonNumber != null && !(formData.seasons || []).some(season => Number(season.seasonNumber) === s.seasonNumber && (s.episodeNumber == null || season.episodes?.some(ep => ep.episodeNumber === s.episodeNumber)))).filter((s, index, all) => all.findIndex(other => other.seasonNumber === s.seasonNumber && (other.episodeNumber ?? null) === (s.episodeNumber ?? null)) === index).map(s => ({ season: s.seasonNumber!, episode: s.episodeNumber ?? null, title: `S${s.seasonNumber}${s.episodeNumber != null ? `E${s.episodeNumber}` : ''}` })),
                  ...getTvScreenshotSeasons(formData, t).flatMap(season => [
                    { season: season.seasonNumber, episode: null as number | null, title: t('seasonScreenshots', { seasonName: season.name }) },
                    ...(formData.seasons.find(s => Number(s.seasonNumber) === season.seasonNumber)?.episodes ?? []).map(ep => ({ season: season.seasonNumber, episode: ep.episodeNumber, title: `S${season.seasonNumber}E${ep.episodeNumber} — ${ep.name}` })),
                  ]),
                ].map(group => (
                  <div key={`${group.season}-${group.episode}`} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <ScreenshotUpload title={group.title} groupKey={`${group.season}-${group.episode}`}
                      screenshots={(formData.screenshots || []).filter(s => screenshotInGroup(s, group.season, group.episode))}
                      onScreenshotsChange={screenshots => setFormData(prev => ({ ...prev, screenshots: mergeGroup(prev.screenshots || [], group.season, group.episode, screenshots) }))}
                      onMoveScreenshotHere={(screenshot, index) => setFormData(prev => ({ ...prev, screenshots: moveGroup(prev.screenshots || [], screenshot, group.season, group.episode, index) }))}
                      disabled={loading} />
                  </div>
                ))}
              </div>
            ) : (
              <ScreenshotUpload screenshots={formData.screenshots} onScreenshotsChange={screenshots => setFormData({ ...formData, screenshots })} disabled={loading} />
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
              {translateUi("atif_yapan_icerikler_c5d49b3")}
            </h3>
            <DiffAlert diffs={getDiffForTab(allDiffs, 'relations')} onRevert={handleRevert} />
            <CitationsFields formData={formData} setFormData={setFormData} />
          </div>
        )}
      </div>
    </div>
  );
}
