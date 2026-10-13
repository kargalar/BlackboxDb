'use client';

import { useEffect, useRef, useState } from 'react';
import { FormInput } from '@/components/atoms/FormInput';
import ImageUploadField, { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import {
  CREATE_COMPANY,
  CREATE_LANGUAGE,
  LIST_COMPANIES,
  LIST_LANGUAGES,
} from '@/services/graphql/admin';
import { searchPersons } from '@/services/adminService';
import type { AddContentFormData, BookPublicationItem, PersonItem } from '@/app/add-content/types';
import { Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface BookPublicationsFieldsProps {
  formData: AddContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddContentFormData>>;
  errors: Record<string, string>;
}

const emptyPublication = (): BookPublicationItem => ({
  title: '',
  subtitle: '',
  isbn: '',
  publisher: null,
  translators: [],
  language: '',
  pageCount: '',
  coverUrl: '',
  publishedDate: '',
  editionType: '',
  format: '',
  isOriginal: false,
  isAbridged: false,
});

export function ensureBookPublications(formData: AddContentFormData): BookPublicationItem[] {
  if (formData.bookPublications.length > 0) {
    return formData.bookPublications;
  }
  return [];
}

function normalizeTranslators(translators: BookPublicationItem['translators']): PersonItem[] {
  if (!translators) return [];
  if (Array.isArray(translators)) {
    return translators.map((translator) => ({
      ...translator,
      role: translator.role || 'translator',
    }));
  }

  return translators
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, role: 'translator' }));
}

function TranslatorSelector({
  value,
  onChange,
}: {
  value: PersonItem[];
  onChange: (items: PersonItem[]) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<PersonItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSearching(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchTerm.trim();
    let isCurrentRequest = true;

    if (!isOpen || query.length < 2) {
      setSuggestions([]);
      return () => {
        isCurrentRequest = false;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchPersons(query, 20);
        if (!isCurrentRequest) return;

        const selectedNames = new Set(value.map((item) => item.name.toLowerCase()));
        setSuggestions(
          (result.data || [])
            .filter((person: any) => !selectedNames.has(String(person.name).toLowerCase()))
            .map((person: any) => ({
              id: person.id,
              name: person.name,
              profileUrl: person.profileUrl,
              biography: person.biography,
              birthDate: person.birthDate,
              deathDate: person.deathDate,
              placeOfBirth: person.placeOfBirth,
              role: 'translator',
            }))
        );
      } catch (error) {
        if (!isCurrentRequest) return;
        console.error('[TranslatorSelector] Error searching persons:', error);
        setSuggestions([]);
      } finally {
        if (isCurrentRequest) setIsSearching(false);
      }
    }, 250);

    return () => {
      isCurrentRequest = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm, isOpen, value]);

  const addTranslator = (translator: PersonItem) => {
    const name = translator.name.trim();
    if (!name) return;
    if (value.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...value, { ...translator, name, role: 'translator' }]);
    setSearchTerm('');
    setSuggestions([]);
    setIsOpen(false);
    setIsSearching(false);
  };

  const removeTranslator = (index: number) => {
    onChange(value.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Cevirmenler
      </label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((translator, index) => (
            <button
              key={translator.id || `${translator.name}-${index}`}
              type="button"
              onClick={() => removeTranslator(index)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-sm font-medium text-cyan-900 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-100"
              title="Cevirmeni kaldir"
            >
              {translator.profileUrl && (
                <Image
                  src={translator.profileUrl}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              {translator.name}
              <span className="text-cyan-500">x</span>
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            const nextSearchTerm = event.target.value;
            setSearchTerm(nextSearchTerm);
            if (nextSearchTerm.trim().length < 2) setIsSearching(false);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (suggestions[0]) {
                addTranslator(suggestions[0]);
              } else if (searchTerm.trim()) {
                addTranslator({ name: searchTerm.trim(), role: 'translator' });
              }
            }
          }}
          placeholder="Cevirmen ara veya yeni cevirmen yaz..."
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-gray-700 dark:bg-surface-panel dark:text-white"
        />

        {isOpen && searchTerm.trim().length > 0 && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-surface-raised">
            {searchTerm.trim().length < 2 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Aramak icin en az 2 karakter yazin
              </div>
            ) : isSearching ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Araniyor...</div>
            ) : suggestions.length > 0 ? (
              suggestions.map((person) => (
                <button
                  key={person.id || person.name}
                  type="button"
                  onClick={() => addTranslator(person)}
                  className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:border-gray-800 dark:text-white dark:hover:bg-surface-panel"
                >
                  {person.profileUrl ? (
                    <Image
                      src={person.profileUrl}
                      alt=""
                      width={28}
                      height={28}
                      unoptimized
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-semibold text-white">
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  {person.name}
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => addTranslator({ name: searchTerm.trim(), role: 'translator' })}
                className="w-full px-3 py-2 text-left text-sm text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
              >
                Yeni kisi olarak ekle: {searchTerm.trim()}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function BookPublicationsFields({
  formData,
  setFormData,
  errors,
}: BookPublicationsFieldsProps) {
  const publications = ensureBookPublications(formData);

  const updatePublication = (index: number, patch: Partial<BookPublicationItem>) => {
    setFormData((prev) => {
      const next = ensureBookPublications(prev).map((publication, itemIndex) => {
        return itemIndex === index ? { ...publication, ...patch } : publication;
      });
      return { ...prev, bookPublications: next };
    });
  };

  const addPublication = () => {
    setFormData((prev) => ({
      ...prev,
      bookPublications: [...ensureBookPublications(prev), emptyPublication()],
    }));
  };

  const removePublication = (index: number) => {
    setFormData((prev) => {
      const next = ensureBookPublications(prev).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...prev,
        bookPublications: next,
      };
    });
  };

  const handlePendingCover = (index: number, pending: PendingImageUpload | null) => {
    updatePublication(index, {
      coverBase64: pending?.base64,
      coverFileName: pending?.fileName,
    });
  };

  const formatOptions = [
    { value: 'paperback', label: 'Karton Kapak' },
    { value: 'hardcover', label: 'Ciltli' },
    { value: 'ebook', label: 'E-Kitap' },
    { value: 'audiobook', label: 'Sesli Kitap' },
    { value: 'pocket', label: 'Cep Boy' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
            Baskılar ve Edisyonlar
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Farklı yayınevleri, çevirmenler, kapaklar veya formatlar (Ciltli, E-Kitap, Sesli Kitap).
          </p>
        </div>
        <button
          type="button"
          onClick={addPublication}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Yeni Baskı / Edisyon Ekle
        </button>
      </div>

      {errors.bookPublications && <p className="text-sm text-red-500">{errors.bookPublications}</p>}

      <div className="space-y-4">
        {publications.map((publication, index) => (
          <section
            key={publication.id ?? index}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-panel p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold">
                  {index + 1}
                </span>
                <h5 className="font-semibold text-gray-900 dark:text-white">
                  {publication.title ? `${publication.title}` : `Baskı #${index + 1}`}
                  {publication.publisher?.name && (
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      ({publication.publisher.name})
                    </span>
                  )}
                </h5>
                {publication.isOriginal && (
                  <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Orijinal Baskı
                  </span>
                )}
              </div>
              {publications.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePublication(index)}
                  className="inline-flex items-center justify-center rounded-lg border border-red-200 dark:border-red-900/60 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Baskıyı kaldır"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
              <ImageUploadField
                label="Baskı Kapak Görseli"
                name={`bookPublicationCover-${index}`}
                value={publication.coverUrl || ''}
                onChange={(coverUrl) => updatePublication(index, { coverUrl })}
                onPendingUpload={(pending) => handlePendingCover(index, pending)}
                imageType="poster"
                error={errors[`bookPublications.${index}.coverUrl`]}
              />

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Baskı / Edisyon Başlığı"
                    name={`bookPublicationTitle-${index}`}
                    value={publication.title || ''}
                    onChange={(title) => updatePublication(index, { title })}
                    placeholder="Boş kalırsa kitap adı kullanılır"
                  />
                  <FormInput
                    label="ISBN / Barkod"
                    name={`bookPublicationIsbn-${index}`}
                    value={publication.isbn || ''}
                    onChange={(isbn) => updatePublication(index, { isbn })}
                    placeholder="978-975-..."
                    error={errors[`bookPublications.${index}.isbn`]}
                  />
                  <FormInput
                    label="Sayfa Sayısı"
                    name={`bookPublicationPageCount-${index}`}
                    type="number"
                    value={publication.pageCount || ''}
                    onChange={(pageCount) => updatePublication(index, { pageCount })}
                    placeholder="Örn: 420"
                  />
                  <FormInput
                    label="Basım / Yayın Tarihi"
                    name={`bookPublicationPublishedDate-${index}`}
                    type="date"
                    value={publication.publishedDate || ''}
                    onChange={(publishedDate) => updatePublication(index, { publishedDate })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Baskı Formatı
                    </label>
                    <select
                      value={publication.format || ''}
                      onChange={(e) => updatePublication(index, { format: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-surface-panel dark:text-white"
                    >
                      <option value="">Format Seçin (Varsayılan)</option>
                      {formatOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <FormInput
                    label="Edisyon / Baskı Türü"
                    name={`bookPublicationEditionType-${index}`}
                    value={publication.editionType || ''}
                    onChange={(editionType) => updatePublication(index, { editionType })}
                    placeholder="Örn: Sansürsüz Tam Metin, Notlu Baskı"
                  />
                </div>

                <TranslatorSelector
                  value={normalizeTranslators(publication.translators)}
                  onChange={(translators) =>
                    updatePublication(index, {
                      translators,
                    })
                  }
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CompactTagSelector
                    label="Yayın / Çeviri Dili"
                    icon="Languages"
                    value={publication.language ? [{ name: publication.language }] : []}
                    onChange={(items) =>
                      updatePublication(index, {
                        language: items[0]?.name || '',
                      })
                    }
                    placeholder="Dil ara veya yeni dil ekle..."
                    emptyMessage="Dil seçilmedi"
                    listQuery={LIST_LANGUAGES}
                    queryKey="listLanguages"
                    createMutation={CREATE_LANGUAGE}
                    mutationKey="createLanguage"
                    allowCreate={true}
                    maxItems={1}
                    badgeColor="green"
                  />

                  <CompactTagSelector
                    label="Yayınevi"
                    icon="Building"
                    value={publication.publisher ? [publication.publisher] : []}
                    onChange={(items) =>
                      updatePublication(index, {
                        publisher: items[0]
                          ? {
                              ...items[0],
                              logoUrl: items[0].logoUrl || undefined,
                            }
                          : null,
                      })
                    }
                    placeholder="Yayınevi ara veya ekle..."
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

                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!publication.isOriginal}
                      onChange={(event) =>
                        updatePublication(index, { isOriginal: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    Orijinal / Ana Baskı
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!publication.isAbridged}
                      onChange={(event) =>
                        updatePublication(index, { isAbridged: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    Kısaltılmış / Özet Yayın
                  </label>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
