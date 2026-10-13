'use client';

/**
 * Category list component — shows items with API search, infinite scroll, and genre content-type filter.
 * Single Responsibility: rendering the list of category items with scroll pagination.
 */

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  type TabType,
  type CategoryItem,
  TAB_CONFIG,
  CONTENT_TYPE_OPTIONS,
} from './categoriesTypes';
import { listCompanyRoles } from '@/services/adminService';
import { useTranslations } from 'next-intl';

interface CompanyRole {
  id: number;
  name: string;
}

interface CategoryListProps {
  activeTab: TabType;
  items: CategoryItem[];
  loading: boolean;
  genreContentTypeFilter: number | null;
  onGenreFilterChange: (filter: number | null) => void;
  onEdit: (item: CategoryItem) => void;
  onDelete: (id: number | string) => void;
  getItemDisplayName: (item: CategoryItem) => string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export default function CategoryList({
  activeTab,
  items,
  loading,
  genreContentTypeFilter,
  onGenreFilterChange,
  onEdit,
  onDelete,
  getItemDisplayName,
  searchQuery: externalSearch,
  onSearchChange: externalSearchChange,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  totalCount,
  sortBy = 'name',
  sortOrder = 'asc',
  onSortChange,
}: CategoryListProps) {
  const [roleMap, setRoleMap] = useState<Map<number, string>>(new Map());
  const [internalSearch, setInternalSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('AdminCategoriesPage');

  // Use external or internal search
  const searchQuery = externalSearch ?? internalSearch;
  const setSearchQuery = externalSearchChange ?? setInternalSearch;

  // Load company roles for name lookup when on companies tab
  useEffect(() => {
    if (activeTab === 'companies') {
      console.log('🏷️ [CategoryList] Loading company roles for badge display...');
      listCompanyRoles()
        .then((result) => {
          const map = new Map<number, string>();
          (result.data || []).forEach((r: CompanyRole) => map.set(r.id, r.name));
          setRoleMap(map);
          console.log(`✅ [CategoryList] Role map loaded: ${map.size} roles`);
        })
        .catch((err) => {
          console.error('❌ [CategoryList] Failed to load roles for badges:', err);
        });
    }
  }, [activeTab]);

  console.log(
    `📋 [CategoryList] Rendering — tab=${activeTab}, itemCount=${items.length}, search="${searchQuery}"`
  );

  // Apply genre content type filter (for genres tab — client-side since contentTypeId is already in data)
  const activeOption = CONTENT_TYPE_OPTIONS.find((opt) => opt.value === genreContentTypeFilter);
  const displayItems = useMemo(() => {
    const filtered =
      activeTab === 'genres' && genreContentTypeFilter !== null && activeOption
        ? items.filter((g) => {
            return (
              (activeOption.matchValues as readonly number[]).includes(g.contentTypeId as number) ||
              g.contentTypeId == null
            );
          })
        : items;

    const sorted = [...filtered].sort((left, right) => {
      if (sortBy === 'contentCount') {
        const leftCount = left.contentCount ?? 0;
        const rightCount = right.contentCount ?? 0;
        if (leftCount !== rightCount) {
          return sortOrder === 'asc' ? leftCount - rightCount : rightCount - leftCount;
        }
      }

      const leftName = getItemDisplayName(left).toLocaleLowerCase();
      const rightName = getItemDisplayName(right).toLocaleLowerCase();
      const nameCompare = leftName.localeCompare(rightName, undefined, { numeric: true });
      if (nameCompare !== 0) {
        return sortOrder === 'asc' ? nameCompare : -nameCompare;
      }

      return String(left.id).localeCompare(String(right.id), undefined, { numeric: true });
    });

    return sorted;
  }, [
    activeOption,
    activeTab,
    genreContentTypeFilter,
    getItemDisplayName,
    items,
    sortBy,
    sortOrder,
  ]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingMore || !hasMore || !onLoadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 50) {
      onLoadMore();
    }
  }, [isLoadingMore, hasMore, onLoadMore]);

  return (
    <div className="glass-card p-6">
      {/* Search & Sort */}
      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('list.searchPh', { tabLabel: t(`tabs.${activeTab}`) })}
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        {onSortChange && (
          <div className="flex gap-2">
            <button
              onClick={() =>
                onSortChange('name', sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')
              }
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                sortBy === 'name'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t('list.sortName')} {sortBy === 'name' && (sortOrder === 'asc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() =>
                onSortChange(
                  'contentCount',
                  sortBy === 'contentCount' && sortOrder === 'desc' ? 'asc' : 'desc'
                )
              }
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                sortBy === 'contentCount'
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t('list.sortCount')}{' '}
              {sortBy === 'contentCount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        )}
      </div>
      {/* Genre Content Type Filter — only for genres tab */}
      {activeTab === 'genres' && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-700">
          <button
            onClick={() => onGenreFilterChange(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              genreContentTypeFilter === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {t('list.all', { count: items.length })}
          </button>
          {CONTENT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onGenreFilterChange(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                genreContentTypeFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {t(`contentTypes.${opt.value}`)} (
              {
                items.filter((g) =>
                  (opt.matchValues as readonly number[]).includes(g.contentTypeId as number)
                ).length
              }
              )
            </button>
          ))}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">
        {TAB_CONFIG[activeTab].icon} {t(`tabs.${activeTab}`)}
        <span className="text-sm text-gray-400 ml-2">
          {searchQuery
            ? `(${displayItems.length} sonuç)`
            : totalCount !== undefined
              ? `(${displayItems.length} / ${totalCount})`
              : `(${displayItems.length})`}
        </span>
      </h2>

      {loading && items.length === 0 ? (
        <div className="text-center text-gray-400 py-8">{t('list.loadingMsg')}</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          {searchQuery ? t('list.noResults') : t('list.noRecords')}
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="space-y-2 max-h-[500px] overflow-y-auto"
        >
          {displayItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{getItemDisplayName(item)}</span>
                  {item.contentCount !== undefined && item.contentCount !== null && (
                    <span
                      title={t('list.usedInTitle', { count: item.contentCount })}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        item.contentCount > 0
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-gray-700/50 text-gray-500 border border-gray-600/30'
                      }`}
                    >
                      {t('list.contentCount', { count: item.contentCount })}
                    </span>
                  )}
                </div>
                {activeTab === 'persons' && (item as any).placeOfBirth && (
                  <div className="text-sm text-gray-400">{(item as any).placeOfBirth}</div>
                )}
                {activeTab === 'companies' && (item as any).defaultRoleIds?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {((item as any).defaultRoleIds as number[]).map((roleId: number) => (
                      <span
                        key={roleId}
                        className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded"
                      >
                        {roleMap.get(roleId) || t('list.roleFallback', { id: roleId })}
                      </span>
                    ))}
                  </div>
                )}
                {activeTab === 'personRoles' && item.contentTypeId && (
                  <div className="text-sm text-gray-400">
                    {t('list.contentTypeId', { id: item.contentTypeId })}
                  </div>
                )}
                {activeTab === 'companyRoles' && item.contentTypeId && (
                  <div className="text-sm text-gray-400">
                    {t('list.contentTypeId', { id: item.contentTypeId })}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                <button
                  onClick={() => onEdit(item)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {t('list.edit')}
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  {t('list.delete')}
                </button>
              </div>
            </div>
          ))}

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">{t('list.loading')}</span>
            </div>
          )}

          {/* Load more button */}
          {hasMore && !isLoadingMore && onLoadMore && (
            <button
              onClick={onLoadMore}
              className="w-full text-center text-sm text-blue-400 hover:text-blue-300 py-3 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              {t('list.loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
