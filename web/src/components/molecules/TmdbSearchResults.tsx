'use client';

import { useEffect, useRef, useState, UIEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * Unified Auto-Fill Search Result (TMDB, Google Books, IGDB)
 * Her kaynak aynı arayüzü kullanır — sourceId string olarak tutulur.
 */
export interface UnifiedSearchResult {
  sourceId: string;
  title: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  mediaType?: string;
  extraInfo?: string[];
  tmdbId?: number;
  igdbId?: number;
  googleBooksId?: string;
}

/**
 * Auto-Fill Search Results Dropdown
 * Başlık input'unun altında gösterilen arama sonuçları listesi.
 * Tüm content tipleri için (Film/Dizi/Oyun/Kitap) çalışır.
 */

interface AutoFillSearchResultsProps {
  /** Arama sonuçları */
  results: UnifiedSearchResult[];
  /** Veritabanımızdaki arama sonuçları */
  localResults?: UnifiedSearchResult[];
  /** Arama devam ediyor mu */
  isSearching: boolean;
  /** DB'de arama devam ediyor mu */
  isSearchingLocal?: boolean;
  /** Detay çekiliyor mu */
  isFetchingDetails: boolean;
  /** Dropdown gösterilsin mi */
  isOpen: boolean;
  /** Hata mesajı */
  error: string | null;
  /** Sonuç seçildiğinde (sourceId string — TMDB id, volumeId, IGDB id) */
  onSelect: (sourceId: string) => void;
  /** Kayıt zaten varsa API ile güncelleme */
  onUpdateExisting?: (localContentId: string, sourceId: string) => Promise<void>;
  /** Güncelleme işlemi devam ediyor mu */
  isUpdatingExisting?: boolean;
  /** Güncellenen yerel kayıt id'si */
  updatingLocalId?: string | null;
  /** Dropdown kapatıldığında */
  onClose: () => void;
  /** Arama kaynak metni (ör: "TMDB", "Google Books", "IGDB") */
  sourceName?: string;
  /** Sadece kendi veritabanımızda arama yapılması gerektiğinde çağrılır */
  searchLocal?: () => Promise<void>;
  /** Next page araması için */
  onLoadMore?: () => void;
  /** Yükleniyor durumu */
  isLoadingMore?: boolean;
  /** Düzenlenmekte olan içeriğin ID'si */
  editingContentId?: string | null;
}

export function TmdbSearchResults(props: AutoFillSearchResultsProps) {
  const { isOpen, ...dropdownProps } = props;
  if (!isOpen) return null;

  return <TmdbSearchResultsDropdown {...dropdownProps} />;
}

function TmdbSearchResultsDropdown({
  results,
  localResults = [],
  isSearching,
  isSearchingLocal = false,
  isFetchingDetails,
  error,
  onSelect,
  onUpdateExisting,
  isUpdatingExisting = false,
  updatingLocalId = null,
  onClose,
  sourceName = 'TMDB',
  searchLocal,
  onLoadMore,
  isLoadingMore = false,
  editingContentId,
}: Omit<AutoFillSearchResultsProps, 'isOpen'>) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'external' | 'local'>('external');

  // Infinite scroll mantığı için liste kaydırmasını algıla
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (!onLoadMore) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight * 1.5 &&
      !isLoadingMore &&
      !isSearching &&
      !isSearchingLocal
    ) {
      onLoadMore();
    }
  };

  // Fallback to determine content URL slug from media type
  const getTypeSlug = (mediaType?: string) => {
    if (!mediaType) return 'movie';
    const lower = mediaType.toLowerCase();
    if (lower.includes('tv') || lower === 'dizi') return 'tv';
    if (lower.includes('game') || lower === 'oyun') return 'game';
    if (lower.includes('book') || lower === 'kitap') return 'book';

    return 'movie'; // fallback for film/movie
  };

  // Dropdown açılıp kapandığında statedeki tab'ı sıfırla
  // Dışarı tıklayınca kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-[600px] flex flex-col"
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-surface-raised z-10 shrink-0 rounded-t-xl">
        <button
          type="button"
          onClick={() => setActiveTab('external')}
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'external'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {sourceName}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('local')}
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'local'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Sistemde Zaten Kayıtlı
        </button>
      </div>

      <div className="overflow-y-auto flex-1 pb-4" onScroll={handleScroll}>
        {/* Loading State */}
        {(isSearching || isSearchingLocal) && !isLoadingMore && (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500 dark:text-gray-400">
            <LoadingSpinner />
            <span>
              {isSearchingLocal && activeTab === 'local'
                ? 'Veritabanında aranıyor...'
                : `${sourceName} aranıyor...`}
            </span>
          </div>
        )}

        {/* Fetching Details Overlay */}
        {isFetchingDetails && (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-blue-600 dark:text-blue-400">
            <LoadingSpinner />
            <span>Detaylar yükleniyor...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isSearching && !isSearchingLocal && (
          <div className="p-4 text-sm text-red-500 dark:text-red-400 text-center">{error}</div>
        )}

        {/* Empty State */}
        {!isSearching &&
          !isSearchingLocal &&
          !error &&
          activeTab === 'external' &&
          results.length === 0 && (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              {sourceName} üzerinde sonuç bulunamadı
            </div>
          )}
        {!isSearching &&
          !isSearchingLocal &&
          !error &&
          activeTab === 'local' &&
          localResults.length === 0 && (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
              Veritabanında sonuç bulunamadı
            </div>
          )}

        {/* Local DB Results Tab */}
        {activeTab === 'local' && !isSearchingLocal && localResults.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 bg-gray-50 dark:bg-surface-raised">
            {localResults.map((item) => (
              <li key={item.sourceId}>
                <Link
                  href={`/content/${getTypeSlug(item.mediaType)}/${item.sourceId}`}
                  className="w-full flex items-start gap-4 p-3 transition-colors text-left hover:bg-gray-100 dark:hover:bg-surface-hover cursor-pointer"
                >
                  {/* Poster Thumbnail */}
                  <div className="flex-shrink-0 w-16 h-[96px] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                    {item.posterPath ? (
                      <Image
                        src={item.posterPath}
                        alt={item.title}
                        fill
                        sizes="64px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        N/A
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-blue-500/80 text-white text-[10px] text-center py-0.5">
                      Görüntüle
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {item.title}
                    </div>
                    {item.originalTitle && item.originalTitle !== item.title && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.originalTitle}
                      </div>
                    )}
                    {item.releaseDate && (
                      <div className="text-xs text-gray-400 mt-1">
                        {item.releaseDate.substring(0, 4)}
                      </div>
                    )}
                    {item.mediaType && (
                      <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mt-1">
                        {item.mediaType}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* External API Results Tab */}
        {activeTab === 'external' && !isSearching && !isFetchingDetails && results.length > 0 && (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {results.map((item) => {
              // Check if this item is in the local DB based on ids or text match (even if localResults might not be fetched yet, we do our best with what we have)
              const matchedLocalItem = localResults.find(
                (localItem) =>
                  (item.tmdbId && localItem.tmdbId === item.tmdbId) ||
                  (item.igdbId && localItem.igdbId === item.igdbId) ||
                  (item.googleBooksId && localItem.googleBooksId === item.googleBooksId) ||
                  // fallback to title and year if no IDs match
                  (localItem.title === item.title &&
                    localItem.releaseDate &&
                    item.releaseDate &&
                    localItem.releaseDate.substring(0, 4) === item.releaseDate.substring(0, 4))
              );

              const isLocalMatch = !!matchedLocalItem;

              return (
                <li key={item.sourceId}>
                  {isLocalMatch && matchedLocalItem ? (
                    <div className="w-full flex items-start gap-4 p-3 transition-colors bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-xl">
                      <Link
                        href={`/content/${getTypeSlug(matchedLocalItem.mediaType)}/${matchedLocalItem.sourceId}`}
                        className="flex-1 flex items-start gap-4 text-left"
                      >
                        {/* Poster Thumbnail */}
                        <div className="flex-shrink-0 w-16 h-[96px] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 relative group">
                          {item.posterPath ? (
                            <Image
                              src={item.posterPath}
                              alt={item.title}
                              fill
                              sizes="64px"
                              unoptimized
                              className="object-cover transition-transform opacity-80"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              N/A
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-yellow-500/90 text-white text-[10px] text-center py-0.5">
                            İncele
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {item.title}{' '}
                            <span className="text-yellow-600 dark:text-yellow-500 ml-1 text-xs">
                              ✓ Zaten Kayıtlı
                            </span>
                          </div>
                          {item.originalTitle && item.originalTitle !== item.title && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.originalTitle}
                            </div>
                          )}
                          {/* Extra info (authors, platforms, etc.) */}
                          {item.extraInfo && item.extraInfo.length > 0 && (
                            <div className="text-xs text-purple-600 dark:text-purple-400 truncate mt-0.5">
                              {item.extraInfo.join(', ')}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {item.releaseDate && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                📅 {item.releaseDate.slice(0, 4)}
                              </span>
                            )}
                            {item.voteAverage != null && item.voteAverage > 0 && (
                              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                ⭐ {item.voteAverage.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {item.overview && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {item.overview}
                            </p>
                          )}
                        </div>
                      </Link>

                      {editingContentId === matchedLocalItem.sourceId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect(item.sourceId);
                          }}
                          className="self-start rounded-md border border-yellow-400 bg-yellow-100 text-yellow-800 px-3 py-1.5 text-xs font-semibold hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Güncelle
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelect(item.sourceId)}
                      className="w-full flex items-start gap-4 p-3 transition-colors text-left hover:bg-gray-50 dark:hover:bg-surface-hover"
                    >
                      {/* Poster Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-[96px] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 relative group">
                        {item.posterPath ? (
                          <Image
                            src={item.posterPath}
                            alt={item.title}
                            fill
                            sizes="64px"
                            unoptimized
                            className="object-cover transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            N/A
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {item.title}
                        </div>
                        {item.originalTitle && item.originalTitle !== item.title && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.originalTitle}
                          </div>
                        )}
                        {/* Extra info (authors, platforms, etc.) */}
                        {item.extraInfo && item.extraInfo.length > 0 && (
                          <div className="text-xs text-purple-600 dark:text-purple-400 truncate mt-0.5">
                            {item.extraInfo.join(', ')}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {item.releaseDate && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              📅 {item.releaseDate.slice(0, 4)}
                            </span>
                          )}
                          {item.voteAverage != null && item.voteAverage > 0 && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">
                              ⭐ {item.voteAverage.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {item.overview && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.overview}
                          </p>
                        )}
                      </div>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeTab === 'external' &&
        onLoadMore &&
        results.length > 0 &&
        !isSearching &&
        !isFetchingDetails && (
          <div className="sticky bottom-9 bg-white dark:bg-surface-raised border-t border-gray-100 dark:border-gray-800 p-2 shrink-0">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {isLoadingMore ? 'Yükleniyor...' : 'Daha fazla göster'}
            </button>
          </div>
        )}

      {/* Close button at bottom */}
      {((activeTab === 'external' && results.length > 0) ||
        (activeTab === 'local' && localResults.length > 0)) &&
        !isSearching &&
        !isSearchingLocal &&
        !isFetchingDetails && (
          <div className="sticky bottom-0 bg-white dark:bg-surface-raised border-t border-gray-100 dark:border-gray-800 p-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 py-1"
            >
              Kapat
            </button>
          </div>
        )}
    </div>
  );
}

/** Mini loading spinner */
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
