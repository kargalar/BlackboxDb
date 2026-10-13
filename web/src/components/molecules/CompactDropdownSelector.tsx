'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { apolloClient } from '@/lib/apollo-client';
import { DocumentNode } from 'graphql';
import { Loader2, Pencil } from 'lucide-react';

interface SimpleItem {
  id?: number | string;
  name: string;
  description?: string;
}

interface CompactDropdownSelectorProps {
  label: string;
  icon?: string;
  value: SimpleItem | null;
  onChange: (item: SimpleItem | null) => void;
  placeholder?: string;
  listQuery?: DocumentNode;
  createMutation?: DocumentNode;
  queryKey?: string;
  mutationKey?: string;
  allowCreate?: boolean;
  allowEdit?: boolean;
  updateMutation?: DocumentNode;
  updateMutationKey?: string;
  renderItemLabel?: (item: SimpleItem) => ReactNode;
  renderSelectedLabel?: (item: SimpleItem) => ReactNode;
  fetchItems?: (search?: string) => Promise<SimpleItem[]>;
  staticOptions?: SimpleItem[];
  dropdownWidthClass?: string;
  dropdownHeightClass?: string;
}

function normalizeItemName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

export function CompactDropdownSelector({
  label,
  icon,
  value,
  onChange,
  placeholder = 'Select...',
  listQuery,
  createMutation,
  queryKey,
  mutationKey,
  allowCreate = false,
  allowEdit = false,
  updateMutation,
  updateMutationKey,
  renderItemLabel,
  renderSelectedLabel,
  fetchItems,
  staticOptions,
  dropdownWidthClass,
  dropdownHeightClass,
}: CompactDropdownSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<SimpleItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allItems, setAllItems] = useState<SimpleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestLoadRequestRef = useRef(0);

  const loadItems = useCallback(
    async (search = '') => {
      const requestId = ++latestLoadRequestRef.current;
      if (staticOptions) {
        setAllItems(staticOptions);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        if (fetchItems) {
          const items = await fetchItems(search);
          if (requestId === latestLoadRequestRef.current) setAllItems(items);
        } else if (listQuery && queryKey) {
          const { data } = await apolloClient.query({
            query: listQuery,
            variables: { search: search.trim() || undefined },
            fetchPolicy: 'network-only',
          });
          const items = (data as Record<string, SimpleItem[]>)?.[queryKey] || [];
          if (requestId === latestLoadRequestRef.current) setAllItems(items);
        }
      } catch (error) {
        if (requestId === latestLoadRequestRef.current) {
          console.error('[CompactDropdownSelector] Error loading items:', error);
        }
      } finally {
        if (requestId === latestLoadRequestRef.current) setIsLoading(false);
      }
    },
    [fetchItems, listQuery, queryKey, staticOptions]
  );

  useEffect(() => {
    void loadItems('');
  }, [loadItems]);

  useEffect(() => {
    if (!showDropdown || staticOptions) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      void loadItems(searchTerm);
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [loadItems, searchTerm, showDropdown, staticOptions]);

  useEffect(() => {
    const normalizedSearchTerm = normalizeItemName(searchTerm);
    const baseItems =
      value &&
      !allItems.some(
        (item) =>
          item.id === value.id || normalizeItemName(item.name) === normalizeItemName(value.name)
      )
        ? [value, ...allItems]
        : allItems;

    if (normalizedSearchTerm.length < 1) {
      setSuggestions(baseItems.slice(0, 20));
      return;
    }

    const filtered = baseItems.filter((item) =>
      normalizeItemName(item.name).includes(normalizedSearchTerm)
    );
    setSuggestions(filtered.slice(0, 20));
  }, [searchTerm, allItems, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const upsertItem = (item: SimpleItem) => {
    const normalizedItemName = normalizeItemName(item.name);
    setAllItems((prev) => {
      const next = prev.filter(
        (existing) =>
          existing.id !== item.id && normalizeItemName(existing.name) !== normalizedItemName
      );
      return [item, ...next];
    });
  };

  const selectItem = async (item?: SimpleItem) => {
    if (!item && !searchTerm.trim()) return;

    let newItem: SimpleItem;

    if (item) {
      newItem = item;
    } else if (allowCreate && createMutation && mutationKey) {
      try {
        setIsCreating(true);
        const { data } = await apolloClient.mutate({
          mutation: createMutation,
          variables: { input: { name: searchTerm.trim() } },
        });
        newItem = (data as Record<string, SimpleItem>)?.[mutationKey];
        if (!newItem) return;
        upsertItem(newItem);
        await loadItems(newItem.name);
      } catch (error) {
        console.error('[CompactDropdownSelector] Error creating item:', error);
        return;
      } finally {
        setIsCreating(false);
      }
    } else if (allowCreate) {
      newItem = { name: searchTerm.trim() };
    } else {
      return;
    }

    onChange(newItem);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleEditItem = async (item: SimpleItem) => {
    if (!allowEdit || !updateMutation || !updateMutationKey || item.id === undefined) {
      return;
    }

    const nextName = window.prompt(`${label} adini duzenle`, item.name)?.trim();
    if (!nextName || nextName === item.name) {
      return;
    }

    try {
      setEditingItemId(item.id);
      setIsUpdating(true);
      const { data } = await apolloClient.mutate({
        mutation: updateMutation,
        variables: {
          id: item.id,
          input: { name: nextName },
        },
      });

      const updatedItem = (data as Record<string, SimpleItem>)?.[updateMutationKey];
      if (!updatedItem) {
        return;
      }

      setAllItems((prev) =>
        prev.map((existing) => (existing.id === updatedItem.id ? updatedItem : existing))
      );

      if (value?.id === updatedItem.id) {
        onChange(updatedItem);
      }

      await loadItems(updatedItem.name);
    } catch (error) {
      console.error('[CompactDropdownSelector] Error updating item:', error);
    } finally {
      setEditingItemId(null);
      setIsUpdating(false);
    }
  };

  const clearValue = () => {
    onChange(null);
  };

  const getItemLabel = (item: SimpleItem): ReactNode => {
    if (renderItemLabel) return renderItemLabel(item);
    return item.name;
  };

  const getSelectedLabel = (item: SimpleItem): ReactNode => {
    if (renderSelectedLabel) return renderSelectedLabel(item);
    return item.name;
  };

  const hasExactMatch = suggestions.some(
    (s) => normalizeItemName(s.name) === normalizeItemName(searchTerm)
  );
  const showCreateButton = searchTerm.trim().length > 0 && !hasExactMatch && allowCreate;
  const isFilled = !!value;

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 min-w-0">
      <span
        className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
          isFilled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {icon && <span className="text-sm">{icon}</span>}
        {label}
      </span>

      <div className="relative">
        <div className="flex w-full items-center gap-1">
          <button
            type="button"
            aria-expanded={showDropdown}
            onClick={() => {
              const nextIsOpen = !showDropdown;
              setShowDropdown(nextIsOpen);
              if (nextIsOpen) window.setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className={`min-w-0 flex-1 flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-surface-panel rounded-lg text-sm hover:border-violet-500 dark:hover:border-violet-500 transition-all ${
              isFilled ? 'border-transparent' : 'border border-gray-200 dark:border-gray-800'
            }`}
          >
            <span
              className={`truncate ${
                value
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {value ? getSelectedLabel(value) : placeholder}
            </span>
            <span className="shrink-0 text-gray-400 text-xs" aria-hidden="true">
              v
            </span>
          </button>

          {value && allowEdit && updateMutation && updateMutationKey && value.id !== undefined && (
            <button
              type="button"
              onClick={() => void handleEditItem(value)}
              disabled={isUpdating}
              aria-label={`${label} adını düzenle`}
              className="shrink-0 text-gray-400 hover:text-violet-500 transition-colors p-1 disabled:opacity-50"
              title="Adı düzenle"
            >
              {editingItemId === value.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Pencil size={14} />
              )}
            </button>
          )}

          {value && (
            <button
              type="button"
              onClick={clearValue}
              aria-label={`${label} seçimini temizle`}
              className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"
            >
              ×
            </button>
          )}
        </div>

        {showDropdown && (
          <div
            className={`absolute top-full left-0 mt-1 ${dropdownWidthClass || 'w-full min-w-[14rem]'} bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50`}
          >
            <div className="p-2.5 border-b border-gray-200 dark:border-gray-700 flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const exactMatch = suggestions.find(
                      (suggestion) =>
                        normalizeItemName(suggestion.name) === normalizeItemName(searchTerm)
                    );
                    if (exactMatch) {
                      void selectItem(exactMatch);
                    } else if (showCreateButton) {
                      void selectItem();
                    } else if (suggestions.length > 0) {
                      void selectItem(suggestions[0]);
                    }
                  }
                }}
                placeholder="Ara..."
                disabled={isUpdating}
                className="flex-1 px-2 py-1 text-sm border-0 focus:outline-none focus:ring-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
              />
              {showCreateButton && (
                <button
                  type="button"
                  onClick={() => void selectItem()}
                  disabled={isCreating}
                  className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap font-medium"
                >
                  {isCreating ? '...' : '+ Olustur'}
                </button>
              )}
            </div>

            <div className={`${dropdownHeightClass || 'max-h-48'} overflow-y-auto`}>
              {isLoading ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Yukleniyor...
                </div>
              ) : suggestions.length > 0 ? (
                suggestions.map((item) => (
                  <div
                    key={item.id?.toString() || item.name}
                    className={`flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                      value?.id === item.id
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void selectItem(item)}
                      className="flex-1 text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-surface-panel transition-colors"
                    >
                      {getItemLabel(item)}
                      {item.description && (
                        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.description}
                        </span>
                      )}
                    </button>
                    {allowEdit && updateMutation && updateMutationKey && item.id !== undefined && (
                      <button
                        type="button"
                        onClick={() => void handleEditItem(item)}
                        disabled={isUpdating}
                        className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-surface-panel dark:hover:text-violet-300"
                        title="Adi duzenle"
                      >
                        {editingItemId === item.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Pencil size={14} />
                        )}
                      </button>
                    )}
                  </div>
                ))
              ) : searchTerm.trim() ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Sonuc bulunamadi
                </div>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Henuz secenek yok
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
