'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import AddToListModal from '@/components/organisms/AddToListModal';
import { Pagination } from '@/components/molecules/Pagination';
import { contentTabConfigs } from './contentTabConfig';
import {
  logContentWatch,
  unlogContentWatch,
  toggleContentFavorite,
  toggleConsumeLater,
  toggleContinuing,
  getUserContentLogs,
} from '@/services/userContentService';
import { FilterSidebar, type FilterState } from '@/app/explore/[type]/components/FilterSidebar';
import { ProfileSortingBar, type ProfileSortOption } from './components/ProfileSortingBar';
import { useProfileContentSearch } from './hooks/useProfileContentSearch';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useTranslations } from 'next-intl';

interface ContentItem {
  id: number;
  poster_path: string | null;
  title?: string;
  name?: string;
  date?: string;
  user_date?: string;
  userDate?: string;
  user_rating?: number;
  is_favorite?: boolean;
  is_consume_later?: boolean;
  is_consumed?: boolean;
  is_continuing?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  isConsumed?: boolean;
  isContinuing?: boolean;
  genres?: Array<{ id: number; name: string }>;
  releaseDate?: string;
  people?: Array<{ role: string; person: { id: number; name: string } }>;
  hasReview?: boolean;
}

interface ItemState {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
}

interface ContentTabProps {
  content: ContentItem[];
  contentType: 'movie' | 'tv' | 'game' | 'book';
  onContentUpdate?: (contentId: number, updates: any) => void;
}

const ContentTab: React.FC<ContentTabProps> = ({ content, contentType, onContentUpdate }) => {
  const { user } = useAuth();
  const { gridClassName } = useUserPreferences();
  const t = useTranslations('ProfileContentTab');
  console.log(`📋 [ContentTab] Rendered - Type: ${contentType}, Items: ${content.length}`);

  const [itemStates, setItemStates] = useState<Record<number, ItemState>>({});

  // Pagination
  const ITEMS_PER_PAGE = 30;
  const [currentPage, setCurrentPage] = useState(1);

  // Add to list modal state
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedItemForList, setSelectedItemForList] = useState<ContentItem | null>(null);

  // Handle add to list
  const handleAddToList = (item: ContentItem) => {
    setSelectedItemForList(item);
    setShowAddToListModal(true);
  };

  // Explore page ile aynı filter/sort state yapısı
  const [filters, setFilters] = useState<FilterState>({
    genres: [],
    rating: { min: 0, max: 10 },
    year: { min: 1900, max: new Date().getFullYear() },
    duration: { min: '' as number | '', max: '' as number | '' },
    actors: [],
    directors: [],
    language: [],
    hideWatched: 'passive',
    hideWatchlist: 'hide',
    hideContinuing: 'passive',
    hideFavorites: 'passive',
  });
  const [sortBy, setSortBy] = useState<ProfileSortOption>('userDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('desc');

  // Content type specific configurations
  const currentConfig = contentTabConfigs[contentType];

  // Load item states from content (fallback to derived state)
  const initialItemStates = useMemo(() => {
    const states: Record<number, ItemState> = {};
    content.forEach((item) => {
      const isConsumed = item.isConsumed ?? item.is_consumed ?? false;
      const isContinuing = item.isContinuing ?? item.is_continuing ?? false;
      const rating = item.user_rating;

      const computedIsConsumed = isContinuing ? false : isConsumed === true || (rating ?? 0) > 0;

      states[item.id] = {
        isConsumed: computedIsConsumed,
        isFavorite: (item.isFavorite ?? item.is_favorite) || false,
        isConsumeLater: (item.isConsumeLater ?? item.is_consume_later) || false,
        isContinuing: isContinuing,
      };
    });
    return states;
  }, [content]);

  useEffect(() => {
    setItemStates(initialItemStates);
  }, [initialItemStates]);

  // Load item states for logged-in user from backend
  useEffect(() => {
    const fetchUserItemStates = async () => {
      if (!user || content.length === 0) return;

      try {
        const contentIds = content.map((item) => item.id.toString());
        const { data: logs } = await getUserContentLogs(contentIds);

        if (logs) {
          setItemStates((prev) => {
            const nextStates = { ...prev };
            logs.forEach((log: any) => {
              nextStates[Number(log.contentId)] = {
                isConsumed: log.isConsumed || false,
                isFavorite: log.isFavorite || false,
                isConsumeLater: log.isConsumeLater || false,
                isContinuing: log.isContinuing || false,
              };
            });
            return nextStates;
          });
        }
      } catch (error) {
        console.error('Error fetching user item states:', error);
      }
    };

    fetchUserItemStates();
  }, [user, content]);

  // Use the profile content search hook with all content (HideToggles handle status filtering)
  const filteredAndSortedContent = useProfileContentSearch(content, filters, sortBy, sortOrder);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedContent.length / ITEMS_PER_PAGE);
  const paginatedContent = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedContent.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedContent, currentPage]);

  // Reset to page 1 when filters/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy, sortOrder]);

  // Handler functions
  const handleWatch = async (item: ContentItem) => {
    const currentState = itemStates[item.id];
    const newConsumedState = !currentState.isConsumed;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], isConsumed: newConsumedState },
    }));

    try {
      const contentId = item.id.toString();
      const result = newConsumedState
        ? await logContentWatch(contentId)
        : await unlogContentWatch(contentId);

      if (result.success) {
        toast.success(newConsumedState ? t('toast.statusAdded') : t('toast.statusRemoved'));
        if (onContentUpdate) {
          onContentUpdate(item.id, { is_consumed: newConsumedState });
        }
      } else {
        toast.error(t('toast.statusError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: { ...prev[item.id], isConsumed: currentState.isConsumed },
        }));
      }
    } catch (error) {
      console.error('Error updating watch status:', error);
      toast.error(t('toast.statusError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], isConsumed: currentState.isConsumed },
      }));
    }
  };

  const handleFavoriteToggle = async (item: ContentItem) => {
    const currentState = itemStates[item.id];
    const newFavoriteState = !currentState.isFavorite;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], isFavorite: newFavoriteState },
    }));

    try {
      const result = await toggleContentFavorite(item.id.toString());

      if (result.isFavorite !== undefined) {
        toast.success(newFavoriteState ? t('toast.favoriteAdded') : t('toast.favoriteRemoved'));
        if (onContentUpdate) {
          onContentUpdate(item.id, { is_favorite: newFavoriteState });
        }
      } else {
        toast.error(t('toast.favoriteError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: { ...prev[item.id], isFavorite: currentState.isFavorite },
        }));
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      toast.error(t('toast.favoriteError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], isFavorite: currentState.isFavorite },
      }));
    }
  };

  const handleWatchlistToggle = async (item: ContentItem) => {
    const currentState = itemStates[item.id];
    const newConsumeLaterState = !currentState.isConsumeLater;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], isConsumeLater: newConsumeLaterState },
    }));

    try {
      const result = await toggleConsumeLater(item.id.toString());

      if (result.isConsumeLater !== undefined) {
        toast.success(
          newConsumeLaterState ? t('toast.watchlistAdded') : t('toast.watchlistRemoved')
        );
        if (onContentUpdate) {
          onContentUpdate(item.id, { is_consume_later: newConsumeLaterState });
        }
      } else {
        toast.error(t('toast.watchlistError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: { ...prev[item.id], isConsumeLater: currentState.isConsumeLater },
        }));
      }
    } catch (error) {
      console.error('Error updating watchlist status:', error);
      toast.error(t('toast.watchlistError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], isConsumeLater: currentState.isConsumeLater },
      }));
    }
  };

  const handleToggleContinuing = async (item: ContentItem) => {
    const currentState = itemStates[item.id];
    const newContinuingState = !currentState.isContinuing;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: { ...prev[item.id], isContinuing: newContinuingState },
    }));

    try {
      const result = await toggleContinuing(item.id.toString());

      if (result.isContinuing !== undefined) {
        toast.success(
          newContinuingState ? t('toast.continuingAdded') : t('toast.continuingRemoved')
        );
        if (onContentUpdate) {
          onContentUpdate(item.id, { is_continuing: newContinuingState });
        }
      } else {
        toast.error(t('toast.continuingError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: { ...prev[item.id], isContinuing: currentState.isContinuing },
        }));
      }
    } catch (error) {
      console.error('Error updating continuing status:', error);
      toast.error(t('toast.continuingError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: { ...prev[item.id], isContinuing: currentState.isContinuing },
      }));
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    console.log('[ContentTab] Filters changed:', newFilters);
  };

  const handleSortChange = (
    newSortBy: ProfileSortOption,
    newSortOrder: 'asc' | 'desc' | 'none'
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    console.log('[ContentTab] Sort changed:', newSortBy, newSortOrder);
  };

  // Removed early return for empty content - now shows tabs even when empty

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Sorting Bar */}
      <ProfileSortingBar
        onSortChange={handleSortChange}
        currentSort={sortBy}
        currentOrder={sortOrder}
        hideOptions={{
          hideWatched: filters.hideWatched || 'passive',
          hideWatchlist: filters.hideWatchlist || 'passive',
          hideContinuing: filters.hideContinuing || 'passive',
          hideFavorites: filters.hideFavorites || 'passive',
          hideAbandoned: (filters as any).hideAbandoned || 'passive',
          hideInAnyList: (filters as any).hideInAnyList || 'passive',
        }}
        onHideChange={(key, value) => {
          const newFilters = { ...filters, [key]: value };
          handleFilterChange(newFilters);
        }}
      />

      {/* Main Content Area: Grid + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content Grid Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[1600px] mx-auto">
            {/* Results info */}
            <div className="mb-4">
              <p className="text-sm text-gray-400">
                {t('pagination.showing', {
                  count: filteredAndSortedContent.length,
                  total: content.length,
                })}
                {totalPages > 1 &&
                  t('pagination.page', { current: currentPage, pages: totalPages })}
              </p>
            </div>

            {/* Content Grid */}
            {paginatedContent.length > 0 ? (
              <div className={`grid ${gridClassName} gap-2`}>
                {paginatedContent.map((item) => {
                  const state = itemStates[item.id] || {
                    isConsumed: false,
                    isFavorite: false,
                    isConsumeLater: false,
                    isContinuing: false,
                  };
                  const rating = item.user_rating ?? null;

                  return (
                    <InteractivePoster
                      key={item.id}
                      content={item}
                      contentType={contentType}
                      isConsumed={
                        (item.isContinuing ?? item.is_continuing)
                          ? false
                          : Boolean(
                              item.isConsumed ?? item.is_consumed ?? (item.user_rating ?? 0) > 0
                            )
                      }
                      isFavorite={Boolean(item.isFavorite ?? item.is_favorite)}
                      isConsumeLater={Boolean(item.isConsumeLater ?? item.is_consume_later)}
                      isContinuing={Boolean(item.isContinuing ?? item.is_continuing)}
                      viewerIsConsumed={state.isConsumed}
                      viewerIsFavorite={state.isFavorite}
                      viewerIsConsumeLater={state.isConsumeLater}
                      viewerIsContinuing={state.isContinuing}
                      rating={rating}
                      onWatch={() => handleWatch(item)}
                      onToggleFavorite={() => handleFavoriteToggle(item)}
                      onToggleWatchlist={() => handleWatchlistToggle(item)}
                      onToggleContinuing={() => handleToggleContinuing(item)}
                      onAddToList={() => handleAddToList(item)}
                      hasReview={Boolean((item as any).hasReview)}
                      showActions={true}
                      context="profile"
                    />
                  );
                })}
              </div>
            ) : (
              <div className={`grid ${gridClassName} gap-2`}>{/* Empty grid */}</div>
            )}

            {/* Pagination Controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>

        {/* Filter Sidebar */}
        <FilterSidebar
          contentType={contentType}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Add to List Modal */}
      {selectedItemForList && (
        <AddToListModal
          isOpen={showAddToListModal}
          onClose={() => {
            setShowAddToListModal(false);
            setSelectedItemForList(null);
          }}
          contentId={selectedItemForList.id.toString()}
          contentType={contentType}
          contentTitle={selectedItemForList.title || selectedItemForList.name || ''}
        />
      )}
    </div>
  );
};

export default ContentTab;
