'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import { createContent } from '@/services/adminService';
import type { UnifiedSearchResult } from '@/components/molecules/TmdbSearchResults';
import { useAutoFill } from '../hooks/useAutoFill';
import type { AddContentFormData } from '../types';
import { INITIAL_FORM_DATA } from '../types';
import { buildContentInput } from '../utils/buildContentInput';

interface BulkAddInterfaceProps {
  contentTypeId: string;
}

type BulkItemStatus = 'queued' | 'processing' | 'success' | 'error';

interface BulkProcessItem {
  sourceId: string;
  title: string;
  status: BulkItemStatus;
  contentId?: string;
  errorMessage?: string;
}

const CONTENT_TYPE_SLUG_MAP: Record<string, 'movie' | 'tv' | 'game' | 'book'> = {
  '1': 'movie',
  '2': 'tv',
  '3': 'game',
  '4': 'book',
};

export function BulkAddInterface({ contentTypeId }: BulkAddInterfaceProps) {
  const t = useTranslations('AddContent.bulkAdd');
  const [localFormData, setLocalFormData] = useState<AddContentFormData>({
    ...INITIAL_FORM_DATA,
    contentTypeId,
  });

  const {
    searchResults,
    localResults,
    isSearching,
    isLoadingMore,
    hasMoreResults,
    showResults,
    error,
    handleSearch,
    loadMoreResults,
    closeResults,
    fetchAndMapDetails,
  } = useAutoFill({
    formData: localFormData,
    setFormData: setLocalFormData,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<UnifiedSearchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [processItems, setProcessItems] = useState<BulkProcessItem[]>([]);
  const [createdUrls, setCreatedUrls] = useState<string[]>([]);

  const selectedSourceIds = new Set(selectedItems.map((item) => item.sourceId));
  const contentTypeSlug = CONTENT_TYPE_SLUG_MAP[contentTypeId] || 'movie';

  const normalizeTitle = (title?: string) =>
    (title || '')
      .toLocaleLowerCase('tr-TR')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();

  const getYear = (date?: string) => date?.split('-')[0] || '';

  const findExistingLocalItem = (item: UnifiedSearchResult) =>
    localResults.find((localItem) => {
      const sameYear =
        !getYear(localItem.releaseDate) ||
        !getYear(item.releaseDate) ||
        getYear(localItem.releaseDate) === getYear(item.releaseDate);

      return normalizeTitle(localItem.title) === normalizeTitle(item.title) && sameYear;
    });

  const updateProcessItem = (sourceId: string, updates: Partial<BulkProcessItem>) => {
    setProcessItems((prev) =>
      prev.map((item) => (item.sourceId === sourceId ? { ...item, ...updates } : item))
    );
  };

  const onSearch = useCallback(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      void handleSearch(trimmedQuery, contentTypeId);
    }
  }, [contentTypeId, handleSearch, searchQuery]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 2) {
      closeResults();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSearch(trimmedQuery, contentTypeId);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [closeResults, contentTypeId, handleSearch, searchQuery]);

  const handleSelectItem = (item: UnifiedSearchResult) => {
    if (selectedSourceIds.has(item.sourceId)) {
      toast.error(t('alreadyInList', { title: item.title }));
      return;
    }

    if (findExistingLocalItem(item)) {
      toast.error(t('alreadyInDb', { title: item.title }));
      return;
    }

    setSelectedItems((prev) => [...prev, item]);
    toast.success(t('addedToList', { title: item.title }));
  };

  const handleRemoveItem = (sourceId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.sourceId !== sourceId));
  };

  const openCreatedUrls = () => {
    let blockedCount = 0;

    for (const url of createdUrls) {
      const openedTab = window.open(url, '_blank');
      if (!openedTab) {
        blockedCount++;
      }
    }

    if (blockedCount > 0) {
      toast.error(t('popupsBlocked', { count: blockedCount }));
    }
  };

  const processSelectedItems = async () => {
    if (selectedItems.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedItems.length });
    setCreatedUrls([]);
    setProcessItems(
      selectedItems.map((item) => ({
        sourceId: item.sourceId,
        title: item.title,
        status: 'queued',
      }))
    );

    let successCount = 0;
    let errorCount = 0;
    const successfulUrls: string[] = [];

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      setProgress({ current: i + 1, total: selectedItems.length });
      updateProcessItem(item.sourceId, { status: 'processing', errorMessage: undefined });

      try {
        const { mappedData, autoFillSource } = await fetchAndMapDetails(
          item.sourceId,
          contentTypeId
        );

        const completeFormData: AddContentFormData = {
          ...INITIAL_FORM_DATA,
          ...mappedData,
          contentTypeId,
          autoFillSourceId: item.sourceId,
          autoFillSource,
        };

        const { input } = buildContentInput({
          formData: completeFormData,
          posterUrl: completeFormData.posterUrl || '',
          backdropUrl: completeFormData.backdropUrl || '',
          isEditMode: false,
        });

        const result = await createContent(input);

        if (result.error || !result.data?.id) {
          updateProcessItem(item.sourceId, {
            status: 'error',
            errorMessage: t('createError'),
          });
          errorCount++;
          continue;
        }

        const targetUrl = `/content/${contentTypeSlug}/${result.data.id}`;
        successfulUrls.push(targetUrl);
        updateProcessItem(item.sourceId, {
          status: 'success',
          contentId: result.data.id,
        });
        successCount++;
      } catch (err) {
        console.error(`[BulkAdd] Exception processing ${item.title}:`, err);
        updateProcessItem(item.sourceId, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : t('errorUnknown'),
        });
        errorCount++;
      }
    }

    setIsProcessing(false);
    setSelectedItems([]);
    setCreatedUrls(successfulUrls);
    toast.success(t('completeMessage', { success: successCount, error: errorCount }));
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl border border-gray-700 p-6">
        <h2 className="mb-4 text-xl font-bold">{t('title')}</h2>
        <div className="mb-4 flex gap-4">
          <input
            type="text"
            className="input-field flex-1"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            disabled={isProcessing}
          />
          <button
            onClick={onSearch}
            disabled={isSearching || isProcessing}
            className="rounded-lg bg-violet-600 px-6 py-2 font-medium text-white disabled:opacity-50 hover:bg-violet-700"
          >
            {isSearching ? t('searching') : t('search')}
          </button>
        </div>

        {error && <p className="mb-4 text-red-400">{error}</p>}

        {showResults && searchResults.length > 0 && (
          <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900/50 p-4 pr-2">
            <h3 className="mb-3 text-sm font-semibold text-gray-400">{t('searchResults')}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((item) => {
                const isAlreadySelected = selectedSourceIds.has(item.sourceId);
                const existingLocalItem = findExistingLocalItem(item);
                const isDisabled = isAlreadySelected || Boolean(existingLocalItem);

                return (
                  <div
                    key={item.sourceId}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      isDisabled
                        ? 'cursor-not-allowed border-gray-700 bg-gray-800/60 opacity-60'
                        : 'cursor-pointer border-gray-700 bg-gray-800 hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      if (!isDisabled) {
                        handleSelectItem(item);
                      }
                    }}
                  >
                    {item.posterPath ? (
                      <Image
                        src={item.posterPath}
                        alt={item.title}
                        width={48}
                        height={64}
                        unoptimized
                        className="h-16 w-12 rounded object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-16 w-12 items-center justify-center rounded bg-gray-900 text-xs text-gray-500">
                        {t('noImage')}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="truncate font-medium text-white">{item.title}</h4>
                        {isAlreadySelected ? (
                          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                            {t('alreadyInListLabel')}
                          </span>
                        ) : existingLocalItem ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                            {t('alreadySaved')}
                          </span>
                        ) : null}
                      </div>

                      {item.releaseDate && (
                        <p className="truncate text-sm text-gray-400">
                          {item.releaseDate.split('-')[0]}
                        </p>
                      )}

                      {item.voteAverage != null && item.voteAverage > 0 && (
                        <div className="mt-1 flex items-center gap-1">
                          <span className="text-xs text-yellow-500">★</span>
                          <span className="text-xs text-gray-400">
                            {item.voteAverage.toFixed(1)}
                          </span>
                        </div>
                      )}

                      {existingLocalItem && (
                        <p className="mt-2 truncate text-xs text-emerald-300">
                          {t('alreadyInDbText')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMoreResults && (
              <button
                type="button"
                onClick={() => void loadMoreResults()}
                disabled={isLoadingMore}
                className="mt-4 w-full rounded-lg bg-gray-800 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              >
                {isLoadingMore ? t('loadingMore') : t('showMore')}
              </button>
            )}

            <button
              onClick={closeResults}
              className="mt-2 w-full rounded-lg bg-gray-800 py-2 text-sm text-gray-400 hover:text-white"
            >
              {t('close')}
            </button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl border border-gray-700 p-6">
        <h2 className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xl font-bold">
          <span>{t('selectedItems', { count: selectedItems.length })}</span>
          <span className="flex flex-wrap gap-2">
            {selectedItems.length > 0 && !isProcessing && (
              <button
                onClick={processSelectedItems}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                {t('addAll')}
              </button>
            )}
            {createdUrls.length > 0 && !isProcessing && (
              <button
                onClick={openCreatedUrls}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t('openAdded', { count: createdUrls.length })}
              </button>
            )}
          </span>
        </h2>

        {isProcessing && (
          <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-900/30 p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-violet-300">{t('processing')}</span>
              <span className="text-violet-300">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full bg-violet-500 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {processItems.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900/50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-300">{t('liveUploadStatus')}</h3>
            <div className="space-y-2">
              {processItems.map((item) => (
                <div
                  key={item.sourceId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-800/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    {item.errorMessage && (
                      <p className="truncate text-xs text-red-300">{item.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={item.status} t={t} />
                    {item.status === 'success' && item.contentId && (
                      <Link
                        href={`/content/${contentTypeSlug}/${item.contentId}`}
                        target="_blank"
                        className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
                      >
                        {t('open')}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedItems.length === 0 ? (
          <p className="py-8 text-center text-gray-500">{t('noItemsSelected')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {selectedItems.map((item) => (
              <div
                key={item.sourceId}
                className="relative overflow-hidden rounded-xl border border-gray-700 bg-gray-800/80 p-4"
              >
                {item.posterPath ? (
                  <Image
                    src={item.posterPath}
                    alt={item.title}
                    width={480}
                    height={640}
                    unoptimized
                    className="h-72 w-full rounded-lg object-cover shadow-lg sm:h-80"
                  />
                ) : (
                  <div className="flex h-72 w-full items-center justify-center rounded-lg bg-gray-900 text-center text-sm text-gray-500 sm:h-80">
                    {t('noImage')}
                  </div>
                )}

                <div className="min-w-0 pr-10 pt-4">
                  <h4 className="line-clamp-2 text-base font-semibold leading-snug text-white">
                    {item.title}
                  </h4>
                  {item.releaseDate && (
                    <p className="mt-1 text-sm text-gray-400">{item.releaseDate.split('-')[0]}</p>
                  )}
                </div>

                {!isProcessing && (
                  <button
                    onClick={() => handleRemoveItem(item.sourceId)}
                    className="absolute right-3 top-3 rounded-full p-2 text-gray-300 transition-colors hover:bg-gray-700/90 hover:text-red-400"
                    title={t('remove')}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: BulkItemStatus; t: any }) {
  if (status === 'queued') {
    return (
      <span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold text-gray-200">
        {t('status.pending')}
      </span>
    );
  }

  if (status === 'processing') {
    return (
      <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-semibold text-blue-300">
        {t('status.uploading')}
      </span>
    );
  }

  if (status === 'success') {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
        {t('status.uploaded')}
      </span>
    );
  }

  return (
    <span className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
      {t('status.error')}
    </span>
  );
}
