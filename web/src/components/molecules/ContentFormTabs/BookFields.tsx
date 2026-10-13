'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { FormInput } from '@/components/atoms/FormInput';
import { CompactTagSelector } from '@/components/molecules/CompactTagSelector';
import { NewPersonDialog } from '@/components/molecules/NewPersonDialog';
import { LIST_COMPANIES, CREATE_COMPANY } from '@/services/graphql/admin';
import { searchPersons } from '@/services/adminService';
import Image from 'next/image';

interface Author {
  id?: number;
  name: string;
  role?: string;
  profileUrl?: string;
  biography?: string;
  birthDate?: string;
  deathDate?: string;
  placeOfBirth?: string;
}

interface BookFieldsProps {
  formData: any;
  setFormData: (data: any) => void;
  errors: Record<string, string>;
}

export function BookFields({ formData, setFormData, errors }: BookFieldsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Author[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dialog states for author creation and editing
  const [showAuthorDialog, setShowAuthorDialog] = useState(false);
  const [editingAuthorIndex, setEditingAuthorIndex] = useState<number | null>(null);
  const [editingAuthorData, setEditingAuthorData] = useState<Author | null>(null);

  // Normalize authors to ensure they have the right format - memoized to prevent infinite loops
  const authors: Author[] = useMemo(() => {
    if (!Array.isArray(formData.authors)) return [];
    return formData.authors.map((a: any) => {
      if (typeof a === 'string') return { name: a, role: 'author' };
      return { ...a, role: a.role || 'author' };
    });
  }, [formData.authors]);

  // Search for persons when typing - only when dropdown is open
  useEffect(() => {
    let isCurrentRequest = true;
    if (!showDropdown)
      return () => {
        isCurrentRequest = false;
      };

    const searchAuthors = async () => {
      setIsLoading(true);
      try {
        const query = searchTerm.trim();
        const result = await searchPersons(query, query.length === 0 ? 50 : 20);
        if (!isCurrentRequest) return;

        const available = (result.data || []).filter(
          (person: any) =>
            !authors.some((author) => author.name.toLowerCase() === person.name.toLowerCase())
        );
        setSuggestions(available);
      } catch (error) {
        if (!isCurrentRequest) return;
        console.error('[BookFields] Error searching persons:', error);
        setSuggestions([]);
      } finally {
        if (isCurrentRequest) setIsLoading(false);
      }
    };

    const debounce = setTimeout(() => void searchAuthors(), 200);
    return () => {
      isCurrentRequest = false;
      clearTimeout(debounce);
    };
  }, [searchTerm, showDropdown, authors]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addAuthor = (author: Author) => {
    const newAuthor: Author = {
      id: author.id,
      name: author.name,
      role: 'author', // Always set role to 'author'
      profileUrl: author.profileUrl,
      biography: author.biography,
      birthDate: author.birthDate,
      deathDate: author.deathDate,
      placeOfBirth: author.placeOfBirth,
    };

    if (!authors.some((a) => a.name.toLowerCase() === newAuthor.name.toLowerCase())) {
      setFormData({ ...formData, authors: [...authors, newAuthor] });
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeAuthor = (index: number) => {
    const newAuthors = [...authors];
    newAuthors.splice(index, 1);
    setFormData({ ...formData, authors: newAuthors });
  };

  return (
    <div className="space-y-4">
      {false && (
        <>
          {/* Page Count */}
          <FormInput
            label="Sayfa Sayısı"
            name="pageCount"
            type="number"
            value={formData.pageCount || ''}
            onChange={(value) => setFormData({ ...formData, pageCount: value })}
            placeholder="300"
            error={errors?.pageCount}
          />

          <FormInput
            label="Cevirmen(ler)"
            name="translators"
            value={formData.translators || ''}
            onChange={(value) => setFormData({ ...formData, translators: value })}
            placeholder="Cevirmenleri virgul ile ayir"
            error={errors?.translators}
          />

          {/* Publisher - as Company using CompactTagSelector with listQuery */}
          <div className="space-y-2">
            <CompactTagSelector
              label="Yayınevi"
              icon="🏢"
              value={formData.publisher ? [formData.publisher] : []}
              onChange={(items) => setFormData({ ...formData, publisher: items[0] || null })}
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
            {errors?.publisher && <p className="text-xs text-red-500">{errors.publisher}</p>}
          </div>
        </>
      )}

      {/* Authors - Simplified without role selection */}
      <div
        ref={containerRef}
        className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3"
      >
        {/* Label Header */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="text-sm">✍️</span>
            Yazarlar
          </span>
        </div>

        {/* Author chips + Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          {authors.map((author, index) => (
            <div
              key={author.id || `${author.name}-${index}`}
              className="inline-flex items-center gap-2 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 group cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-hover transition-all"
              onClick={() => {
                setEditingAuthorIndex(index);
                setEditingAuthorData(author);
              }}
            >
              {/* Avatar */}
              {author.profileUrl ? (
                <Image
                  src={author.profileUrl}
                  alt={author.name}
                  width={24}
                  height={24}
                  unoptimized
                  className="h-6 w-6 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-white">
                  {author.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {author.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">(yazar)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAuthor(index);
                }}
                className="text-gray-400 hover:text-red-500 font-bold leading-none ml-1 opacity-60 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}

          {authors.length === 0 && (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">
              Henüz yazar eklenmedi
            </span>
          )}

          {/* Add Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDropdown(!showDropdown);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-raised hover:border-violet-500 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
            >
              + Ekle
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                {/* Search Input */}
                <div className="p-2.5 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (suggestions.length > 0) {
                          addAuthor(suggestions[0]);
                        } else if (searchTerm.trim()) {
                          setShowAuthorDialog(true);
                        }
                      }
                    }}
                    placeholder="Yazar adı ara..."
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-surface-panel text-gray-900 dark:text-white"
                  />
                  {searchTerm.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowAuthorDialog(true)}
                      className="px-2.5 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap font-medium"
                    >
                      + Yeni
                    </button>
                  )}
                </div>

                {/* Suggestions */}
                <div className="max-h-48 overflow-y-auto">
                  {isLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Yükleniyor...
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((person) => (
                      <button
                        key={person.id || person.name}
                        type="button"
                        onClick={() => addAuthor(person)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-surface-panel transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        {person.profileUrl ? (
                          <Image
                            src={person.profileUrl}
                            alt={person.name}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-white">
                            {person.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-sm text-gray-900 dark:text-white">{person.name}</span>
                      </button>
                    ))
                  ) : searchTerm.trim() ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Sonuç yok - &quot;Yeni&quot; ile ekleyebilirsiniz
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Kayıtlı kişi yok
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {errors?.authors && <p className="text-xs text-red-500">{errors.authors}</p>}
      </div>

      {/* Author Create Dialog */}
      {showAuthorDialog && (
        <NewPersonDialog
          mode="create"
          initialName={searchTerm}
          onClose={() => {
            setShowAuthorDialog(false);
          }}
          onSave={(person) => {
            console.log('📝 [BookFields] Create onSave called with:', person);
            const newAuthor: Author = {
              id: person.id ? Number(person.id) : undefined,
              name: person.name,
              role: 'author',
              profileUrl: person.profileUrl || undefined,
              biography: person.biography || undefined,
              birthDate: person.birthDate || undefined,
              deathDate: person.deathDate || undefined,
              placeOfBirth: person.placeOfBirth || undefined,
            };
            console.log('📝 [BookFields] newAuthor:', newAuthor);

            // Use callback form to get latest formData
            setFormData((prevFormData: any) => {
              const currentAuthors = Array.isArray(prevFormData.authors)
                ? prevFormData.authors
                : [];
              if (
                currentAuthors.some(
                  (a: Author) => a.name.toLowerCase() === newAuthor.name.toLowerCase()
                )
              ) {
                return prevFormData; // Don't add duplicate
              }
              return { ...prevFormData, authors: [...currentAuthors, newAuthor] };
            });
            setShowAuthorDialog(false);
            setSearchTerm('');
            setShowDropdown(false);
          }}
          title="Yeni Yazar Ekle"
        />
      )}

      {/* Author Edit Dialog */}
      {editingAuthorData !== null && editingAuthorIndex !== null && (
        <NewPersonDialog
          mode="edit"
          person={editingAuthorData}
          apiMode="api"
          onClose={() => {
            setEditingAuthorIndex(null);
            setEditingAuthorData(null);
          }}
          onSave={(updatedPerson) => {
            console.log('📝 [BookFields] onSave called with:', updatedPerson);
            const updatedAuthor: Author = {
              id: updatedPerson.id ? Number(updatedPerson.id) : editingAuthorData.id, // Preserve original ID
              name: updatedPerson.name,
              role: 'author',
              profileUrl: updatedPerson.profileUrl || undefined,
              biography: updatedPerson.biography || undefined,
              birthDate: updatedPerson.birthDate || undefined,
              deathDate: updatedPerson.deathDate || undefined,
              placeOfBirth: updatedPerson.placeOfBirth || undefined,
            };
            console.log('📝 [BookFields] updatedAuthor:', updatedAuthor);

            // Use callback form to get latest formData
            setFormData((prevFormData: any) => {
              const currentAuthors = Array.isArray(prevFormData.authors)
                ? prevFormData.authors
                : [];
              const newAuthors = [...currentAuthors];
              newAuthors[editingAuthorIndex] = updatedAuthor;
              console.log('📝 [BookFields] newAuthors:', newAuthors);
              return { ...prevFormData, authors: newAuthors };
            });
            setEditingAuthorIndex(null);
            setEditingAuthorData(null);
          }}
          title="Yazar Düzenle"
        />
      )}
    </div>
  );
}
