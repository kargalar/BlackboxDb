'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';
import Image from 'next/image';
import { FormInput } from '@/components/atoms/FormInput';
import { FormTextArea } from '@/components/atoms/FormTextArea';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import { CompactDropdownSelector } from '@/components/molecules/CompactDropdownSelector';
import {
  TmdbSearchResults,
  type UnifiedSearchResult,
} from '@/components/molecules/TmdbSearchResults';
import { apolloClient } from '@/lib/apollo-client';
import { getContentImageUrl } from '@/lib/image-utils';
import ImageUploadField from '@/components/molecules/ImageUploadField';
import toast from 'react-hot-toast';
import {
  LIST_THEMES,
  CREATE_THEME,
  LIST_MOODS,
  CREATE_MOOD,
  LIST_AGE_RATINGS,
  CREATE_AGE_RATING,
  LIST_GENRES,
  LIST_SERIES,
  CREATE_SERIES,
  UPDATE_SERIES,
  LIST_LANGUAGES,
  CREATE_LANGUAGE,
  SEARCH_TMDB,
  SEARCH_IGDB_GAMES,
  LIST_COMPANIES,
  CREATE_COMPANY,
} from '@/services/graphql/admin';

/** Au prop shape (reusable for primary & secondary) */
interface AutoFillProps {
  searchResults: UnifiedSearchResult[];
  localResults?: UnifiedSearchResult[];
  isSearching: boolean;
  isLoadingMore?: boolean;
  hasMoreResults?: boolean;
  isSearchingLocal?: boolean;
  isFetchingDetails: boolean;
  showResults: boolean;
  error: string | null;
  onSearch: () => void;
  onSelect: (sourceId: string) => void;
  onClose: () => void;
  onLoadMore?: () => void;
  sourceName?: string;
  searchLocal?: () => Promise<void>;
  onUpdateExisting?: (localContentId: string, sourceId: string) => Promise<void>;
  isUpdatingExisting?: boolean;
}

interface CommonFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
  errors: Record<string, string>;
  contentTypeId?: number;
  editingContentId?: string | null;
  // Au props (tüm content tipleri için)
  autoFill?: AutoFillProps;
  // İkinci au kaynağı (oyunlar için IGDB)
  autoFillSecondary?: AutoFillProps;
  onPendingPosterChange?: (pending: any) => void;
  onPendingBackdropChange?: (pending: any) => void;
}

// Status options removed as they will be inferred

export function CommonFields({
  formData,
  setFormData,
  errors,
  contentTypeId,
  editingContentId,
  autoFill,
  autoFillSecondary,
  onPendingPosterChange,
  onPendingBackdropChange,
}: CommonFieldsProps) {
  const isAutoFillEnabled =
    contentTypeId === 1 || contentTypeId === 2 || contentTypeId === 3 || contentTypeId === 4;

  const isUserTypingRef = useRef(false);

  useEffect(() => {
    if (editingContentId) return;
    if (!isAutoFillEnabled || !autoFill) return;
    if (!isUserTypingRef.current) return;

    const trimmedQuery = (formData.title || '').trim();

    if (trimmedQuery.length < 2) {
      autoFill.onClose();
      isUserTypingRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      isUserTypingRef.current = false;
      autoFill.onSearch();
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formData.title, editingContentId, isAutoFillEnabled, autoFill]);

  const activeAutoFill = autoFillSecondary?.showResults
    ? autoFillSecondary
    : autoFill?.showResults
      ? autoFill
      : null;

  const parseMultiValueText = (value: string) =>
    value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  // String array'den SimpleItem array'e dönüştür
  const normalizeToItems = (value: any[]): { id?: number; name: string }[] => {
    if (!Array.isArray(value)) return [];
    return value.map((v) => (typeof v === 'string' ? { name: v } : v));
  };

  // Fetch genres for content type
  const fetchGenres = useCallback(async () => {
    try {
      const { data } = await apolloClient.query<{ listGenres: any[] }>({
        query: LIST_GENRES,
        variables: { contentTypeId },
        fetchPolicy: 'network-only',
      });
      return data?.listGenres || [];
    } catch (error) {
      console.error('[CommonFields] Error fetching genres:', error);
      return [];
    }
  }, [contentTypeId]);

  // Fetch languages
  const fetchLanguages = useCallback(async () => {
    try {
      const { data } = await apolloClient.query<{ listLanguages: any[] }>({
        query: LIST_LANGUAGES,
        variables: { limit: 250 },
        fetchPolicy: 'cache-first',
      });
      return data?.listLanguages || [];
    } catch (error) {
      console.error('[CommonFields] Error fetching languages:', error);
      return [];
    }
  }, []);

  // Fetch franchises
  const fetchFranchises = useCallback(async (search?: string) => {
    try {
      const { data } = await apolloClient.query<{ listSeries: any[] }>({
        query: LIST_SERIES,
        variables: { limit: 200, search: search?.trim() || undefined },
        fetchPolicy: 'network-only',
      });
      return data?.listSeries || [];
    } catch (error) {
      console.error('[CommonFields] Error fetching franchises:', error);
      return [];
    }
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Sol Sütun: Temel metin alanları */}
      <div className="space-y-4">
        {/* Başlık + Auto Fill */}
        <div className="relative">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormInput
                label={contentTypeId === 4 ? 'Orijinal Başlık' : 'Başlık'}
                name="title"
                value={formData.title}
                onChange={(value) => {
                  isUserTypingRef.current = true;
                  setFormData({ ...formData, title: value });
                }}
                placeholder={contentTypeId === 4 ? 'Kitabin orijinal adi' : 'Film/Dizi/Oyun adı'}
                required
                error={errors.title}
              />
            </div>
            {/* Primary Auto-Fill Button */}
            {isAutoFillEnabled && autoFill && (
              <AutoFillButton autoFill={autoFill} disabled={!formData.title?.trim()} />
            )}
            {/* Secondary Auto-Fill Button (IGDB — sadece oyunlar) */}
            {isAutoFillEnabled && autoFillSecondary && (
              <AutoFillButton
                autoFill={autoFillSecondary}
                disabled={!formData.title?.trim()}
                variant="secondary"
              />
            )}
          </div>

          {/* Auto-Fill Search Results Dropdown (aktif kaynak hangisiyse) */}
          {isAutoFillEnabled && activeAutoFill && activeAutoFill.showResults && (
            <TmdbSearchResults
              results={activeAutoFill.searchResults}
              localResults={activeAutoFill.localResults}
              isSearching={activeAutoFill.isSearching}
              isSearchingLocal={activeAutoFill.isSearchingLocal}
              isFetchingDetails={activeAutoFill.isFetchingDetails}
              isOpen={activeAutoFill.showResults}
              error={activeAutoFill.error}
              onSelect={activeAutoFill.onSelect}
              onClose={activeAutoFill.onClose}
              sourceName={activeAutoFill.sourceName}
              searchLocal={activeAutoFill.searchLocal}
              onUpdateExisting={activeAutoFill.onUpdateExisting}
              isUpdatingExisting={activeAutoFill.isUpdatingExisting}
              onLoadMore={activeAutoFill.hasMoreResults ? activeAutoFill.onLoadMore : undefined}
              isLoadingMore={activeAutoFill.isLoadingMore}
              editingContentId={editingContentId}
            />
          )}
        </div>

        {contentTypeId !== 4 && (
          <FormInput
            label="Orijinal Başlık"
            name="originalTitle"
            value={formData.originalTitle || ''}
            onChange={(value) => setFormData({ ...formData, originalTitle: value })}
            placeholder="Orijinal dildeki başlık (ör: 君の名は。)"
          />
        )}

        <FormTextArea
          label="Alternatif İsimler"
          name="alternativeTitles"
          value={(formData.alternativeTitles || []).join('\n')}
          onChange={(value) =>
            setFormData({ ...formData, alternativeTitles: parseMultiValueText(value) })
          }
          placeholder="Her satıra bir alternatif isim yazın"
          rows={3}
        />

        <FormTextArea
          label="Açıklama"
          name="description"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder="İçerik hakkında detaylı açıklama..."
          rows={4}
        />

        {contentTypeId !== 2 && (
          <FormInput
            label={contentTypeId === 4 ? 'İlk / Orijinal Yayın Tarihi' : 'Yayın Tarihi'}
            name="releaseDate"
            type="date"
            value={formData.releaseDate}
            onChange={(value) => setFormData({ ...formData, releaseDate: value })}
            placeholder={
              contentTypeId === 4 ? 'Kitabın ilk yazıldığı / basıldığı tarih' : undefined
            }
          />
        )}

        {/* Dizi için İlk/Son Yayın Tarihi */}
        {contentTypeId === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="İlk Yayın Tarihi"
              name="firstAirDate"
              type="date"
              value={formData.firstAirDate}
              onChange={(value) => setFormData({ ...formData, firstAirDate: value })}
            />
            <FormInput
              label="Son Yayın Tarihi"
              name="lastAirDate"
              type="date"
              value={formData.lastAirDate}
              onChange={(value) => setFormData({ ...formData, lastAirDate: value })}
            />
          </div>
        )}
      </div>

      {/* Sağ Sütun: Metadata, etiketler */}
      <div className="space-y-4">
        {/* Tek değerli alanlar */}
        <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Yaş Sınırı */}
            <CompactDropdownSelector
              label="Yaş Sınırı"
              icon="🔞"
              value={formData.ageRating || null}
              onChange={(item) => setFormData({ ...formData, ageRating: item })}
              placeholder="Seç"
              listQuery={LIST_AGE_RATINGS}
              createMutation={CREATE_AGE_RATING}
              queryKey="listAgeRatings"
              mutationKey="createAgeRating"
              allowCreate={true}
            />

            <CompactTagSelector
              label="Ödüller"
              icon="🏆"
              value={normalizeToItems(formData.awards || [])}
              onChange={(items) =>
                setFormData({ ...formData, awards: items.map((item) => item.name) })
              }
              placeholder="Ödül adı girin ve enter'a basın..."
              emptyMessage="Ödül eklenmedi"
              badgeColor="purple"
              allowCreate={true}
            />

            {/* Franchise */}
            <CompactDropdownSelector
              label="Franchise"
              icon="🎬"
              value={formData.franchise || null}
              onChange={(item) => setFormData({ ...formData, franchise: item })}
              placeholder="Seç"
              fetchItems={fetchFranchises}
              createMutation={CREATE_SERIES}
              mutationKey="createSeries"
              allowCreate={true}
              allowEdit={true}
              updateMutation={UPDATE_SERIES}
              updateMutationKey="updateSeries"
              dropdownWidthClass="w-[28rem]"
              dropdownHeightClass="max-h-[36rem]"
              renderSelectedLabel={(item: any) =>
                item.contentCount !== undefined ? `${item.name} (${item.contentCount})` : item.name
              }
              renderItemLabel={(item: any) => (
                <div className="flex items-center gap-4">
                  {item.posterUrl && (
                    <Image
                      src={getContentImageUrl(item.posterUrl, 342, 'poster')}
                      alt={item.name}
                      width={96}
                      height={144}
                      unoptimized
                      className="w-24 h-36 object-cover rounded-md shadow-sm"
                    />
                  )}
                  <span className="text-base">
                    {item.contentCount !== undefined
                      ? `${item.name} (${item.contentCount})`
                      : item.name}
                  </span>
                </div>
              )}
            />
          </div>
        </div>

        {/* Çoklu değerli etiket alanları */}
        <div className="space-y-3">
          <CompactTagSelector
            label="Türler"
            icon="🎭"
            value={formData.genres || []}
            onChange={(items) => setFormData({ ...formData, genres: items })}
            placeholder="Ara veya ekle..."
            emptyMessage="Tür eklenmedi"
            fetchItems={fetchGenres}
            badgeColor="blue"
            allowCreate={true}
          />

          <CompactTagSelector
            label="Temalar"
            icon="🎨"
            value={normalizeToItems(formData.themes || [])}
            onChange={(items) => {
              console.log('🎨 [CommonFields] Themes onChange:', items);
              setFormData({ ...formData, themes: items });
            }}
            placeholder="Uzay, ortaçağ, vampir..."
            emptyMessage="Tema eklenmedi"
            listQuery={LIST_THEMES}
            createMutation={CREATE_THEME}
            queryKey="listThemes"
            mutationKey="createTheme"
            badgeColor="orange"
            allowCreate={true}
          />

          <CompactTagSelector
            label="Ruh Halleri"
            icon="😊"
            value={normalizeToItems(formData.moods || [])}
            onChange={(items) => {
              console.log('😊 [CommonFields] Moods onChange:', items);
              setFormData({ ...formData, moods: items });
            }}
            placeholder="Komik, melankolik, gerilimli..."
            emptyMessage="Ruh hali eklenmedi"
            listQuery={LIST_MOODS}
            createMutation={CREATE_MOOD}
            queryKey="listMoods"
            mutationKey="createMood"
            badgeColor="pink"
            allowCreate={true}
          />

          <CompactTagSelector
            label="Diller"
            icon="🌐"
            value={formData.languages || []}
            onChange={(items) => setFormData({ ...formData, languages: items })}
            placeholder="İngilizce, Türkçe..."
            emptyMessage="Dil eklenmedi"
            fetchItems={fetchLanguages}
            createMutation={CREATE_LANGUAGE}
            mutationKey="createLanguage"
            badgeColor="green"
            allowCreate={true}
            renderItemLabel={(item) => item.name}
          />
        </div>
      </div>

      {/* Orijinal Yayın Bilgileri (Sadece Kitap) */}
      {contentTypeId === 4 && (
        <div className="md:col-span-2 mt-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-panel p-4">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Orijinal Yayın Bilgileri
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Kitabın ilk çıktığı orijinal basımına ait temel bilgiler.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
            <ImageUploadField
              label="Kapak Görseli"
              name="posterUrl"
              value={formData.posterUrl || ''}
              onChange={(url) => setFormData({ ...formData, posterUrl: url })}
              onPendingUpload={onPendingPosterChange}
              imageType="poster"
              error={errors.posterUrl}
            />

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="ISBN"
                  name="isbn"
                  value={formData.isbn || ''}
                  onChange={(value) => setFormData({ ...formData, isbn: value })}
                  placeholder="978-3-16-148410-0"
                  error={errors.isbn}
                />
                <FormInput
                  label="Sayfa Sayısı"
                  name="pageCount"
                  type="number"
                  value={formData.pageCount || ''}
                  onChange={(value) => setFormData({ ...formData, pageCount: value })}
                  placeholder="300"
                  error={errors.pageCount}
                />
                <FormInput
                  label="İlk Yayın Tarihi"
                  name="releaseDate"
                  type="date"
                  value={formData.releaseDate || ''}
                  onChange={(value) => setFormData({ ...formData, releaseDate: value })}
                  error={errors.releaseDate}
                />
              </div>

              <CompactTagSelector
                label="Yayınevi"
                icon="🏢"
                value={formData.publisher ? [formData.publisher] : []}
                onChange={(items) =>
                  setFormData({
                    ...formData,
                    publisher: items[0]
                      ? { ...items[0], logoUrl: items[0].logoUrl || undefined }
                      : null,
                  })
                }
                placeholder="Yayınevi ara..."
                listQuery={LIST_COMPANIES}
                queryKey="listCompanies"
                queryVariables={{ roleIds: [3] }}
                createMutation={CREATE_COMPANY}
                mutationKey="createCompany"
                createInputExtra={{ defaultRoleIds: [3] }}
                allowCreate={true}
                maxItems={1}
                badgeColor="purple"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auto-Fill Button Sub-Component ───

interface AutoFillButtonProps {
  autoFill: AutoFillProps;
  disabled: boolean;
  variant?: 'primary' | 'secondary';
}

function AutoFillButton({ autoFill, disabled, variant = 'primary' }: AutoFillButtonProps) {
  const isLoading = autoFill.isSearching || autoFill.isFetchingDetails;
  const label = autoFill.sourceName || 'Auto Fill';

  const baseClasses =
    'mb-[2px] flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap';
  const colorClasses =
    variant === 'secondary'
      ? 'bg-purple-600 text-white hover:bg-purple-700'
      : 'bg-blue-600 text-white hover:bg-blue-700';

  return (
    <button
      type="button"
      onClick={autoFill.onSearch}
      disabled={isLoading || disabled}
      className={`${baseClasses} ${colorClasses}`}
      title={`${label}'den otomatik doldur`}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <span>🔍</span>
      )}
      {label}
    </button>
  );
}
