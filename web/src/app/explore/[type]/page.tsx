'use client';

import { Suspense, useEffect, useState, useMemo, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { UnifiedContent } from '@/types/unified-content';
import { SearchBar } from './components/SearchBar';
import { ContentGrid } from './components/ContentGrid';
import { Pagination } from './components/Pagination';
import { FilterSidebar, type FilterMode } from './components/FilterSidebar';
import { SortingBar, type HideOptions } from './components/SortingBar';
import { CONTENT_CONFIG } from './config';
import AddToListModal from '@/components/organisms/AddToListModal';
import { useExploreFilters } from './hooks/useExploreFilters';
import { useExploreContent } from './hooks/useExploreContent';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTranslations } from 'next-intl';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

type ContentType = 'movie' | 'tv' | 'game' | 'book' | 'music' | 'podcast' | 'theater';
const GET_CONTENT_TYPE_BY_SLUG = gql`
  query ExploreContentType($slug: String!) {
    contentTypeBySlug(slug: $slug) {
      id
    }
  }
`;
interface PageProps {
  params: Promise<{ type: string }>;
}

export default function ExplorePage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white" />}>
      <ExplorePageInner params={params} />
    </Suspense>
  );
}

function ExplorePageInner({ params }: PageProps) {
  const { type } = use(params);
  const contentType = type as ContentType;
  const config = CONTENT_CONFIG[contentType];
  const { data: contentTypeData } = useQuery<{ contentTypeBySlug?: { id: number } | null }>(
    GET_CONTENT_TYPE_BY_SLUG,
    { variables: { slug: contentType }, skip: Boolean(config?.contentTypeId) }
  );
  const contentTypeId = config?.contentTypeId ?? contentTypeData?.contentTypeBySlug?.id ?? 0;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { settings } = useGlobalSettings();

  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const t = useTranslations('Explore');

  // Add to list modal state
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedContentForList, setSelectedContentForList] = useState<UnifiedContent | null>(null);

  // User preferences
  const preferences = useUserPreferences();
  const gridColumns = preferences?.gridColumns || 5;
  const gridRows = preferences?.gridRows || 4;
  const itemsPerPage = gridColumns * gridRows;

  const { filters, filterCounts, sortBy, sortOrder, handleFilterChange, handleSortChange } =
    useExploreFilters(contentType, contentTypeId);

  // Redirect if book is disabled
  useEffect(() => {
    if (contentType === 'book' && settings?.isBookEnabled === false) {
      router.push('/explore/movie');
    }
  }, [contentType, settings, router]);

  const hideOptions: HideOptions = useMemo(
    () => ({
      hideWatched: (filters.hideWatched as FilterMode) || 'passive',
      hideWatchlist: (filters.hideWatchlist as FilterMode) || 'passive',
      hideContinuing: (filters.hideContinuing as FilterMode) || 'passive',
      hideFavorites: (filters.hideFavorites as FilterMode) || 'passive',
      hideAbandoned: (filters.hideAbandoned as FilterMode) || 'passive',
      hideInAnyList: (filters.hideInAnyList as FilterMode) || 'passive',
    }),
    [filters]
  );

  const handleHideChange = (key: keyof HideOptions, value: FilterMode) => {
    handleFilterChange({ ...filters, [key]: value });
    console.log(`[ExplorePage] Hide toggle: ${key} = ${value}`);
  };

  const handleSidebarFilterChange = (newFilters: typeof filters) => {
    handleFilterChange(newFilters);
  };

  const mergedFilters = filters;

  const {
    items,
    loading,
    error,
    retry,
    currentPage,
    totalPages,
    totalCount,
    itemStates,
    handleWatch,
    handleToggleFavorite,
    handleToggleWatchlist,
    handleToggleContinuing,
  } = useExploreContent({
    contentType,
    contentTypeId,
    itemsPerPage,
    query,
    page,
    filters: mergedFilters,
    sortBy,
    sortOrder,
  });

  const handleAddToList = (item: UnifiedContent) => {
    console.log(`[ExplorePage] Add to list clicked for ${item.title}`, item);
    setSelectedContentForList(item);
    setShowAddToListModal(true);
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-red-500">{t('invalidType')}</h1>
            <p className="text-gray-400 mt-2">{t('invalidTypeDesc')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header with Search */}
      <div className="px-4 py-4 sm:px-6">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 flex-wrap min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{t(`title.${contentType}`)}</h1>
              <span className="text-sm text-gray-400 ml-1">
                ({t('results', { count: totalCount })})
              </span>
            </div>
            <div className="basis-full min-w-0 sm:flex-1 sm:basis-0">
              <SearchBar contentType={contentType} />
            </div>
          </div>
        </div>
      </div>

      <SortingBar
        onSortChange={handleSortChange}
        currentSort={sortBy}
        currentOrder={sortOrder}
        searchQuery={query}
        hideOptions={hideOptions}
        onHideChange={handleHideChange}
        lengthSortLabel={contentType === 'book' ? t('lengthSort.page') : t('lengthSort.runtime')}
      />

      {/* Main Content Area: Grid + Sidebar */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Content Grid Area */}
        <div className="flex-1 min-w-0 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
          <div className="max-w-[1600px] mx-auto">
            <ContentGrid
              items={items}
              contentType={contentType}
              itemStates={itemStates}
              onWatch={handleWatch}
              onToggleFavorite={handleToggleFavorite}
              onToggleWatchlist={handleToggleWatchlist}
              onToggleContinuing={handleToggleContinuing}
              onAddToList={handleAddToList}
              loading={loading}
              error={error}
              onRetry={retry}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              contentType={contentType}
            />
          </div>
        </div>

        {/* Filter Sidebar */}
        <FilterSidebar
          contentType={contentType}
          filters={filters}
          onFilterChange={handleSidebarFilterChange}
          filterCounts={filterCounts}
        />
      </div>

      {/* Add to List Modal */}
      {selectedContentForList && (
        <AddToListModal
          isOpen={showAddToListModal}
          onClose={() => {
            setShowAddToListModal(false);
            setSelectedContentForList(null);
          }}
          contentId={selectedContentForList.id.toString()}
          contentType={contentType}
          contentTitle={selectedContentForList.title}
        />
      )}
    </div>
  );
}
