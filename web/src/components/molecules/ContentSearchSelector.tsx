'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { SEARCH_CONTENT_MINIMAL } from '@/services/graphql/content';
import { ContentItem } from '@/app/add-content/types';

interface ContentSearchSelectorProps {
  label: string;
  value: ContentItem[];
  onChange: (items: ContentItem[]) => void;
  placeholder?: string;
  contentTypeId?: number | string;
}

export function ContentSearchSelector({
  label,
  value,
  onChange,
  placeholder = 'Add similar content...',
  contentTypeId,
}: ContentSearchSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const {
    data,
    loading,
    variables: queryVariables,
  } = useQuery<any>(SEARCH_CONTENT_MINIMAL, {
    variables: {
      searchQuery: debouncedSearch.trim() || undefined,
      contentTypeId: contentTypeId ? parseInt(contentTypeId.toString(), 10) : undefined,
      limit: 10,
    },
    skip: debouncedSearch.trim().length < 2,
    fetchPolicy: 'network-only',
  });

  const normalizedSearchTerm = searchTerm.trim();
  const normalizedDebouncedSearch = debouncedSearch.trim();
  const requestedContentTypeId = contentTypeId ? parseInt(contentTypeId.toString(), 10) : undefined;
  const hasCurrentResults =
    normalizedSearchTerm.length >= 2 &&
    normalizedSearchTerm === normalizedDebouncedSearch &&
    queryVariables?.searchQuery === normalizedDebouncedSearch &&
    queryVariables?.contentTypeId === requestedContentTypeId;
  const isSearchPending = normalizedSearchTerm.length >= 2 && (!hasCurrentResults || loading);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = hasCurrentResults ? data?.searchContent?.items || [] : [];
  const selectedIds = new Set(value.map((v) => v.id));

  const handleSelect = (item: any) => {
    if (!selectedIds.has(item.id)) {
      let displayName = item.title;
      if (item.releaseDate) {
        displayName += ` (${new Date(item.releaseDate).getFullYear()})`;
      }
      onChange([...value, { id: item.id, name: displayName, posterUrl: item.posterUrl }]);
    }
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleRemove = (idToRemove: string) => {
    onChange(value.filter((v) => v.id !== idToRemove));
  };

  return (
    <div className="flex flex-col gap-1.5" ref={dropdownRef}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

      {/* Selected Items */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-2">
          {value.map((item) => (
            <div
              key={item.id}
              className="relative w-[180px] rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800/50 p-3 shadow-sm"
            >
              {item.posterUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.posterUrl}
                  alt={item.name}
                  className="w-full h-[270px] object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-[270px] bg-violet-200 dark:bg-violet-800 rounded-xl flex items-center justify-center">
                  <span className="text-sm opacity-70">Yok</span>
                </div>
              )}
              <div className="pt-3">
                <span className="block font-semibold text-sm leading-snug text-center break-words">
                  {item.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/65 text-white hover:bg-red-500 transition-colors font-bold shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input relative container */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
        />

        {/* Dropdown */}
        {showDropdown && searchTerm.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
            {isSearchPending ? (
              <div className="p-3 text-sm text-gray-500 flex items-center justify-center">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full mr-2"></span>
                Aranıyor...
              </div>
            ) : suggestions.length > 0 ? (
              <ul className="py-1">
                {suggestions.map((item: any) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <li
                      key={item.id}
                      onClick={() => !isSelected && handleSelect(item)}
                      className={`px-3 py-2 text-sm flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {item.posterUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-8 h-12 object-cover rounded shadow-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-12 bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-xs text-gray-500">Yok</span>
                        </div>
                      )}

                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-gray-900 dark:text-gray-100 font-medium truncate">
                          {item.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {item.contentType?.name}
                          {item.releaseDate && ` • ${new Date(item.releaseDate).getFullYear()}`}
                        </span>
                      </div>

                      {isSelected && (
                        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 ml-auto">
                          Seçili
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-3 text-sm text-gray-500 text-center">Sonuç bulunamadı</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
