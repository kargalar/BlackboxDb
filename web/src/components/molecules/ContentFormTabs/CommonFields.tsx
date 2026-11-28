'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { ContentTranslationFields } from './ContentTranslationFields';

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
  const translateUi = useUiTranslations('Ui');
  const t = useUiTranslations('AddContent.translations');
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
                label={t('defaultTitle')}
                name="title"
                value={formData.title}
                onChange={(value) => {
                  isUserTypingRef.current = true;
                  setFormData({ ...formData, title: value });
                }}
                placeholder={t('defaultTitleHint')}
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

        <FormInput
          label={t('originalTitle')}
          name="originalTitle"
          value={formData.originalTitle || ''}
          onChange={(value) => setFormData({ ...formData, originalTitle: value })}
          placeholder={translateUi("orijinal_dildeki_baslik_or_83a9fb2")}
        />

        <FormTextArea
          label={translateUi("alternatif_isimler_8ce55ec")}
          name="alternativeTitles"
          value={(formData.alternativeTitles || []).join('\n')}
          onChange={(value) =>
            setFormData({ ...formData, alternativeTitles: parseMultiValueText(value) })
          }
          placeholder={translateUi("her_satira_bir_alternatif_isim_yazin_7da2747")}
          rows={3}
        />

        <FormTextArea
          label={t('defaultDescription')}
          name="description"
          value={formData.description}
          onChange={(value) => setFormData({ ...formData, description: value })}
          placeholder={translateUi("icerik_hakkinda_detayli_aciklama_c956d1d")}
          rows={4}
        />

        <ContentTranslationFields
          translations={formData.translations ?? []}
          onChange={(translations) => setFormData({ ...formData, translations })}
        />

        {contentTypeId !== 2 && (
          <FormInput
            label={contentTypeId === 4 ? translateUi("ilk_orijinal_yayin_tarihi_397a001") : translateUi("yayin_tarihi_600b05a")}
            name="releaseDate"
            type="date"
            value={formData.releaseDate}
            onChange={(value) => setFormData({ ...formData, releaseDate: value })}
            placeholder={
              contentTypeId === 4 ? translateUi("kitabin_ilk_yazildigi_basildigi_tarih_61561e5") : undefined
            }
          />
        )}

        {/* Dizi için İlk/Son Yayın Tarihi */}
        {contentTypeId === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label={translateUi("ilk_yayin_tarihi_b63582f")}
              name="firstAirDate"
              type="date"
              value={formData.firstAirDate}
              onChange={(value) => setFormData({ ...formData, firstAirDate: value })}
            />
            <FormInput
              label={translateUi("son_yayin_tarihi_59a202d")}
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
              label={translateUi("yas_siniri_ca82b58")}
              icon="🔞"
              value={formData.ageRating || null}
              onChange={(item) => setFormData({ ...formData, ageRating: item })}
              placeholder={translateUi("sec_a958cab")}
              listQuery={LIST_AGE_RATINGS}
              createMutation={CREATE_AGE_RATING}
              queryKey="listAgeRatings"
              mutationKey="createAgeRating"
              allowCreate={true}
            />

            <CompactTagSelector
              label={translateUi("oduller_3bff399")}
              icon="🏆"
              value={normalizeToItems(formData.awards || [])}
              onChange={(items) =>
                setFormData({ ...formData, awards: items.map((item) => item.name) })
              }
              placeholder={translateUi("odul_adi_girin_ve_enter_a_6d6655b")}
              emptyMessage={translateUi("odul_eklenmedi_c8d7703")}
              badgeColor="purple"
              allowCreate={true}
            />

            {/* Franchise */}
            <CompactDropdownSelector
              label={translateUi("franchise_4784bee")}
              icon="🎬"
              value={formData.franchise || null}
              onChange={(item) => setFormData({ ...formData, franchise: item })}
              placeholder={translateUi("sec_a958cab")}
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
            label={translateUi("turler_2ac9898")}
            icon="🎭"
            value={formData.genres || []}
            onChange={(items) => setFormData({ ...formData, genres: items })}
            placeholder={translateUi("ara_veya_ekle_b91f9f0")}
            emptyMessage={translateUi("tur_eklenmedi_997835e")}
            fetchItems={fetchGenres}
            badgeColor="blue"
            allowCreate={true}
          />

          <CompactTagSelector
            label={translateUi("temalar_93f67c2")}
            icon="🎨"
            value={normalizeToItems(formData.themes || [])}
            onChange={(items) => {
              console.log('🎨 [CommonFields] Themes onChange:', items);
              setFormData({ ...formData, themes: items });
            }}
            placeholder={translateUi("uzay_ortacag_vampir_f9f4204")}
            emptyMessage={translateUi("tema_eklenmedi_7c00128")}
            listQuery={LIST_THEMES}
            createMutation={CREATE_THEME}
            queryKey="listThemes"
            mutationKey="createTheme"
            badgeColor="orange"
            allowCreate={true}
          />

          <CompactTagSelector
            label={translateUi("ruh_halleri_0b98701")}
            icon="😊"
            value={normalizeToItems(formData.moods || [])}
            onChange={(items) => {
              console.log('😊 [CommonFields] Moods onChange:', items);
              setFormData({ ...formData, moods: items });
            }}
            placeholder={translateUi("komik_melankolik_gerilimli_0b4440a")}
            emptyMessage={translateUi("ruh_hali_eklenmedi_772b202")}
            listQuery={LIST_MOODS}
            createMutation={CREATE_MOOD}
            queryKey="listMoods"
            mutationKey="createMood"
            badgeColor="pink"
            allowCreate={true}
          />

          <CompactTagSelector
            label={translateUi("diller_3c42b0c")}
            icon="🌐"
            value={formData.languages || []}
            onChange={(items) => setFormData({ ...formData, languages: items })}
            placeholder={translateUi("ingilizce_turkce_826f9fc")}
            emptyMessage={translateUi("dil_eklenmedi_92518b7")}
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
              {translateUi("orijinal_yayin_bilgileri_78361c8")}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {translateUi("kitabin_ilk_ciktigi_orijinal_basimina_ait_c9eba03")}
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
            <ImageUploadField
              label={translateUi("kapak_gorseli_032958c")}
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
                  label={translateUi("sayfa_sayisi_92c8679")}
                  name="pageCount"
                  type="number"
                  value={formData.pageCount || ''}
                  onChange={(value) => setFormData({ ...formData, pageCount: value })}
                  placeholder="300"
                  error={errors.pageCount}
                />
                <FormInput
                  label={translateUi("ilk_yayin_tarihi_b63582f")}
                  name="releaseDate"
                  type="date"
                  value={formData.releaseDate || ''}
                  onChange={(value) => setFormData({ ...formData, releaseDate: value })}
                  error={errors.releaseDate}
                />
              </div>

              <CompactTagSelector
                label={translateUi("yayinevi_442e7f5")}
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
                placeholder={translateUi("yayinevi_ara_afa12b7")}
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
  const translateUi = useUiTranslations('Ui');
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
      title={translateUi("value1_den_otomatik_doldur_cb7778f", { value1: String(label) })}
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
