'use client';

import { useId, useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { apolloClient } from '@/lib/apollo-client';
import { DocumentNode } from 'graphql';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface SimpleItem {
  id?: number | string;
  name: string;
  description?: string;
  logoUrl?: string | null;
}

interface CompactTagSelectorProps {
  label: string;
  icon?: string;
  value: SimpleItem[];
  onChange: (items: SimpleItem[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  listQuery?: DocumentNode;
  createMutation?: DocumentNode;
  queryKey?: string;
  mutationKey?: string;
  queryVariables?: Record<string, unknown>;
  createInputExtra?: Record<string, unknown>; // Extra fields merged into create mutation input
  badgeColor?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'red' | 'cyan';
  allowCreate?: boolean;
  maxItems?: number; // For single-select, set to 1
  renderItemLabel?: (item: SimpleItem) => string;
  fetchItems?: () => Promise<SimpleItem[]>; // Alternative to query
}

const badgeColors = {
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  green:
    'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200 border-green-300 dark:border-green-700',
  purple:
    'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700',
  orange:
    'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200 border-orange-300 dark:border-orange-700',
  pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-200 border-pink-300 dark:border-pink-700',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 border-red-300 dark:border-red-700',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700',
};

// Simple Edit Dialog for Tags
function TagEditDialog({
  item,
  onClose,
  onSave,
  onDelete,
  badgeColor,
}: {
  item: SimpleItem;
  onClose: () => void;
  onSave: (newItem: SimpleItem) => void;
  onDelete: () => void;
  badgeColor: string;
}) {
  const t = useTranslations('TagEditDialog');
  const [name, setName] = useState(item.name);
  const titleId = useId();
  const nameInputId = useId();
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = dialogContentRef.current?.querySelectorAll<HTMLElement>(
      'input:not([disabled]), button:not([disabled])'
    );
    if (!focusableElements?.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogContentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleDialogKeyDown}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('title')}
        </h3>

        <div className="mb-4">
          <label
            htmlFor={nameInputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t('name')}
          </label>
          <input
            id={nameInputId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors text-sm font-medium"
          >
            {t('remove')}
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (name.trim()) {
                onSave({ ...item, name: name.trim() });
              }
            }}
            disabled={!name.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompactTagSelector({
  label,
  icon,
  value,
  onChange,
  placeholder = 'Search or add...',
  emptyMessage,
  listQuery,
  createMutation,
  queryKey,
  mutationKey,
  queryVariables,
  createInputExtra,
  badgeColor = 'blue',
  allowCreate = true,
  maxItems,
  renderItemLabel,
  fetchItems,
}: CompactTagSelectorProps) {
  const t = useTranslations('Accessibility');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<SimpleItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allItems, setAllItems] = useState<SimpleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editTriggerRef = useRef<HTMLButtonElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load items from database
  useEffect(() => {
    let isActive = true;

    const loadItems = async () => {
      try {
        setIsLoading(true);

        if (fetchItems) {
          const items = await fetchItems();
          if (isActive) setAllItems(items);
        } else if (listQuery && queryKey) {
          const { data } = await apolloClient.query({
            query: listQuery,
            variables: queryVariables || {},
            fetchPolicy: 'cache-first',
          });
          const items = (data as Record<string, SimpleItem[]>)?.[queryKey] || [];
          if (isActive) setAllItems(items);
        }
      } catch (error) {
        if (isActive) console.error(`[CompactTagSelector] Error loading items:`, error);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadItems();
    return () => {
      isActive = false;
    };
  }, [listQuery, queryKey, fetchItems, queryVariables]);

  // Filter suggestions based on search
  useEffect(() => {
    const availableItems = allItems.filter(
      (item) =>
        !value.some(
          (v) =>
            v.name.toLowerCase() === item.name.toLowerCase() ||
            (v.id && item.id && v.id === item.id)
        )
    );

    if (searchTerm.trim().length < 1) {
      setSuggestions(availableItems.slice(0, 20));
    } else {
      const filtered = availableItems.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 20));
    }
  }, [searchTerm, value, allItems]);

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

  const addItem = async (item?: SimpleItem) => {
    if (!item && !searchTerm.trim()) return;

    let newItem: SimpleItem;

    if (item) {
      newItem = item;
    } else if (allowCreate && createMutation && mutationKey) {
      // Create new item via mutation
      try {
        setIsCreating(true);
        const { data } = await apolloClient.mutate({
          mutation: createMutation,
          variables: { input: { name: searchTerm.trim(), ...createInputExtra } },
        });
        newItem = (data as Record<string, SimpleItem>)?.[mutationKey];
        if (!newItem) return;
        setAllItems((prev) => [...prev, newItem]);
      } catch (error) {
        console.error(`[CompactTagSelector] Error creating item:`, error);
        return;
      } finally {
        setIsCreating(false);
      }
    } else if (allowCreate) {
      // Just add to local state (will be created on form submit)
      newItem = { name: searchTerm.trim() };
    } else {
      return;
    }

    // Check for duplicates
    if (value.some((v) => v.name.toLowerCase() === newItem.name.toLowerCase())) {
      setSearchTerm('');
      return;
    }

    // For single-select (maxItems = 1), replace existing value
    if (maxItems === 1) {
      onChange([newItem]);
    } else {
      onChange([...value, newItem]);
    }

    setSearchTerm('');
    setShowDropdown(false);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const getItemLabel = (item: SimpleItem) => {
    if (renderItemLabel) return renderItemLabel(item);
    return item.name;
  };

  const closeEditDialog = () => {
    setEditingIndex(null);
    requestAnimationFrame(() => {
      const focusTarget = editTriggerRef.current?.isConnected
        ? editTriggerRef.current
        : addButtonRef.current;
      focusTarget?.focus();
    });
  };

  // Check if there's an exact match in suggestions
  const hasExactMatch = suggestions.some((s) => s.name.toLowerCase() === searchTerm.toLowerCase());

  // Show create button when: user typed something, no exact match, allowCreate is true
  const showCreateButton = searchTerm.trim().length > 0 && !hasExactMatch && allowCreate;

  const isFilled = value && value.length > 0;

  return (
    <div
      ref={containerRef}
      className={`bg-gray-50 dark:bg-surface-panel rounded-xl p-4 space-y-3 transition-colors ${
        isFilled ? 'border-transparent' : 'border border-gray-200 dark:border-gray-800'
      }`}
    >
      {/* Label Header */}
      <div className="flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        <span
          className={`text-xs font-semibold uppercase tracking-wider transition-colors ${
            isFilled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {label}
        </span>
      </div>

      {/* Tags + Add Button Row */}
      <div className="flex flex-wrap items-center gap-2">
        {value.map((item, index) => (
          <div
            key={item.id || `${item.name}-${index}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-80 ${
              item.logoUrl ? 'bg-[#ffffff] border-gray-300 text-gray-900' : badgeColors[badgeColor]
            }`}
          >
            <button
              type="button"
              onClick={(event) => {
                editTriggerRef.current = event.currentTarget;
                setEditingIndex(index);
              }}
              aria-label={t('editItem', { item: `${label}: ${getItemLabel(item)}` })}
              className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {item.logoUrl ? (
                <Image
                  src={item.logoUrl}
                  alt=""
                  width={96}
                  height={20}
                  unoptimized
                  className="h-5 w-auto max-w-20 object-contain"
                />
              ) : (
                <span>{getItemLabel(item)}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => removeItem(index)}
              aria-label={t('removeItem', { item: `${label}: ${getItemLabel(item)}` })}
              className="ml-0.5 rounded text-xs font-bold leading-none hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Empty state */}
        {value.length === 0 && emptyMessage && (
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">{emptyMessage}</span>
        )}

        {/* Add Button (opens dropdown) */}
        {(!maxItems || value.length < maxItems) && (
          <div className="relative">
            <button
              ref={addButtonRef}
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
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-surface-raised border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
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
                          addItem(suggestions[0]);
                        } else if (showCreateButton) {
                          addItem();
                        }
                      }
                    }}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="flex-1 px-2 py-1 text-sm border-0 focus:outline-none focus:ring-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
                  />
                  {/* Create Button - Only show when typing and no exact match */}
                  {showCreateButton && (
                    <button
                      type="button"
                      onClick={() => addItem()}
                      disabled={isCreating}
                      className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 whitespace-nowrap font-medium"
                    >
                      {isCreating ? '...' : '+ Oluştur'}
                    </button>
                  )}
                </div>

                {/* Suggestions List */}
                <div className="max-h-48 overflow-y-auto">
                  {isLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Yükleniyor...
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((item) => (
                      <button
                        key={item.id || item.name}
                        type="button"
                        onClick={() => addItem(item)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-surface-panel transition-colors text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        {getItemLabel(item)}
                        {item.description && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.description}
                          </span>
                        )}
                      </button>
                    ))
                  ) : searchTerm.trim() ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Sonuç bulunamadı
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Henüz seçenek yok
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      {editingIndex !== null && value[editingIndex] && (
        <TagEditDialog
          item={value[editingIndex]}
          onClose={closeEditDialog}
          onSave={(newItem) => {
            console.log('🔄 [CompactTagSelector] Edit save:', {
              label,
              editingIndex,
              oldItem: value[editingIndex],
              newItem,
            });
            const newValue = [...value];
            newValue[editingIndex] = newItem;
            console.log('🔄 [CompactTagSelector] Calling onChange with:', newValue);
            onChange(newValue);
            closeEditDialog();
          }}
          onDelete={() => {
            console.log('🗑️ [CompactTagSelector] Deleting item:', {
              label,
              editingIndex,
              item: value[editingIndex],
            });
            removeItem(editingIndex);
            closeEditDialog();
          }}
          badgeColor={badgeColor}
        />
      )}
    </div>
  );
}
