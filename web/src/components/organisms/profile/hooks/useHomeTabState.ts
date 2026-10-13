import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Content } from '@/types/content';
import { useAuth } from '@/contexts/AuthContext';
import { getUserContentLogs, setFeaturedContent } from '@/services/database/contentService';
import { toast } from 'react-hot-toast';
import {
  logContentWatch,
  toggleConsumeLater,
  toggleContentFavorite,
  toggleContinuing,
  unlogContentWatch,
} from '@/services/userContentService';
import type { ItemStatesMap, FeaturedType, ContentType } from '../HomeTabTypes';
import { DEFAULT_ITEM_STATE } from '../HomeTabTypes';
import { useTranslations } from 'next-intl';

interface UseHomeTabStateParams {
  recentMovies: Content[];
  recentTv: Content[];
  recentGames: Content[];
  recentBooks: Content[];
  recentMusic: Content[];
  continuingItems: Content[];
  featuredMovies: Content[];
  featuredTv: Content[];
  featuredGames: Content[];
  featuredBooks: Content[];
  featuredMusic: Content[];
  allConsumedMovies: Content[];
  allConsumedTv: Content[];
  allConsumedGames: Content[];
  allConsumedBooks: Content[];
  allConsumedMusic: Content[];
  isOwnProfile: boolean;
  onFeaturedUpdate?: () => void;
}

/**
 * Custom hook encapsulating all state management and action handlers
 * for the HomeTab component.
 */
export function useHomeTabState({
  recentMovies,
  recentTv,
  recentGames,
  recentBooks,
  recentMusic,
  continuingItems,
  featuredMovies,
  featuredTv,
  featuredGames,
  featuredBooks,
  featuredMusic,
  allConsumedMovies,
  allConsumedTv,
  allConsumedGames,
  allConsumedBooks,
  allConsumedMusic,
  isOwnProfile,
  onFeaturedUpdate,
}: UseHomeTabStateParams) {
  const { user } = useAuth();
  const t = useTranslations('ProfileHomeTab');

  // UI state
  const [showFeaturedDialog, setShowFeaturedDialog] = useState(false);
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
  const [pendingSelections, setPendingSelections] = useState<Record<FeaturedType, string[]>>({
    movies: [],
    tv: [],
    games: [],
    books: [],
    music: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredType, setFeaturedType] = useState<FeaturedType>('movies');
  const [itemStates, setItemStates] = useState<ItemStatesMap>({});
  const [isSaving, setIsSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Heatmap calendar selected day (undefined = show all recent, string = specific day)
  const [heatmapSelectedDay, setHeatmapSelectedDay] = useState<string | undefined>(undefined);

  // Au first non-empty featured tab on initial load
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  useEffect(() => {
    if (hasAutoSelected) return;
    const tabOrder: { key: FeaturedType; items: Content[] }[] = [
      { key: 'movies', items: featuredMovies },
      { key: 'tv', items: featuredTv },
      { key: 'games', items: featuredGames },
      { key: 'books', items: featuredBooks },
      { key: 'music', items: featuredMusic },
    ];
    const firstNonEmpty = tabOrder.find((t) => t.items.length > 0);
    if (firstNonEmpty && firstNonEmpty.key !== featuredType) {
      setFeaturedType(firstNonEmpty.key);
    }
    if (firstNonEmpty) {
      setHasAutoSelected(true);
    }
  }, [featuredMovies, featuredTv, featuredGames, featuredBooks, featuredMusic, featuredType, hasAutoSelected]);

  // Add to list modal state
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [selectedContentForList, setSelectedContentForList] = useState<Content | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType>('movie');

  // ─── Derived data ──────────────────────────────────────────

  const getConsumedContent = useCallback((): Content[] => {
    switch (featuredType) {
      case 'movies':
        return allConsumedMovies;
      case 'tv':
        return allConsumedTv;
      case 'games':
        return allConsumedGames;
      case 'books':
        return allConsumedBooks;
      case 'music':
        return allConsumedMusic;
      default:
        return [];
    }
  }, [
    featuredType,
    allConsumedMovies,
    allConsumedTv,
    allConsumedGames,
    allConsumedBooks,
    allConsumedMusic,
  ]);

  const getFeaturedContent = useCallback((): Content[] => {
    switch (featuredType) {
      case 'movies':
        return featuredMovies;
      case 'tv':
        return featuredTv;
      case 'games':
        return featuredGames;
      case 'books':
        return featuredBooks;
      case 'music':
        return featuredMusic;
      default:
        return [];
    }
  }, [featuredType, featuredMovies, featuredTv, featuredGames, featuredBooks, featuredMusic]);

  const filteredContent = getConsumedContent().filter((content) =>
    content.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const itemStateContentIdsKey = useMemo(() => {
    const uniqueIds = new Set<string>();

    [
      ...recentMovies,
      ...recentTv,
      ...recentGames,
      ...recentBooks,
      ...recentMusic,
      ...continuingItems,
      ...featuredMovies,
      ...featuredTv,
      ...featuredGames,
      ...featuredBooks,
      ...featuredMusic,
    ].forEach((item) => {
      if (item?.id !== undefined && item?.id !== null) {
        uniqueIds.add(item.id.toString());
      }
    });

    return Array.from(uniqueIds).sort().join('|');
  }, [
    recentMovies,
    recentTv,
    recentGames,
    recentBooks,
    recentMusic,
    continuingItems,
    featuredMovies,
    featuredTv,
    featuredGames,
    featuredBooks,
    featuredMusic,
  ]);

  // ─── Effects ───────────────────────────────────────────────

  // Initialize all pending selections when dialog opens
  useEffect(() => {
    if (showFeaturedDialog) {
      const initialSelections: Record<FeaturedType, string[]> = {
        movies: featuredMovies.map((c) => c.id.toString()),
        tv: featuredTv.map((c) => c.id.toString()),
        games: featuredGames.map((c) => c.id.toString()),
        books: featuredBooks.map((c) => c.id.toString()),
        music: featuredMusic.map((c) => c.id.toString()),
      };
      setPendingSelections(initialSelections);
      setSelectedContentIds(initialSelections[featuredType]);
      console.log(`📋 [useHomeTabState] Dialog opened — initialized all type selections`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFeaturedDialog]);

  // When featuredType changes while dialog is open, save current and load new
  useEffect(() => {
    if (showFeaturedDialog) {
      setSelectedContentIds(pendingSelections[featuredType]);
      console.log(
        `📋 [useHomeTabState] Tab changed to ${featuredType} — loaded ${pendingSelections[featuredType].length} items`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featuredType]);

  // Load item states for all content
  useEffect(() => {
    const loadItemStates = async () => {
      if (!user) {
        console.log('🔍 [useHomeTabState] User not authenticated, skipping item states');
        return;
      }

      if (!itemStateContentIdsKey) {
        console.log('🔍 [useHomeTabState] No content ids found for item states');
        setItemStates({});
        return;
      }

      try {
        const contentIds = itemStateContentIdsKey.split('|').filter(Boolean);

        if (contentIds.length > 0) {
          console.log(
            `🔍 [useHomeTabState] Loading states for ${contentIds.length} items (GraphQL)`
          );
          const { data: logs } = await getUserContentLogs(contentIds);

          const newStates: ItemStatesMap = {};
          logs?.forEach((log: any) => {
            newStates[log.contentId] = {
              isConsumed: log.isConsumed || false,
              isFavorite: log.isFavorite || false,
              isConsumeLater: log.isConsumeLater || false,
              isContinuing: log.isContinuing || false,
            };
          });

          setItemStates(newStates);
          console.log(`✅ [useHomeTabState] Item states loaded`, {
            count: Object.keys(newStates).length,
          });
        }
      } catch (error) {
        console.error('❌ [useHomeTabState] Error loading item states:', error);
      }
    };

    if (user) {
      loadItemStates();
    }
  }, [itemStateContentIdsKey, user]);

  // ─── Helpers ───────────────────────────────────────────────

  const ensureUserAction = (): boolean => {
    if (!user) {
      toast.error(t('toasts.loginRequired'));
      return false;
    }
    return true;
  };

  // ─── Content action handlers ──────────────────────────────

  const handleAddToList = (item: Content, contentType: ContentType) => {
    setSelectedContentForList(item);
    setSelectedContentType(contentType);
    setShowAddToListModal(true);
  };

  const handleWatchToggle = async (item: Content) => {
    if (!ensureUserAction()) return;

    const currentState = itemStates[item.id] || DEFAULT_ITEM_STATE;
    const newConsumedState = !currentState.isConsumed;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || currentState),
        isConsumed: newConsumedState,
        isContinuing: newConsumedState
          ? false
          : (prev[item.id]?.isContinuing ?? currentState.isContinuing),
      },
    }));

    try {
      const contentId = item.id.toString();
      const result = newConsumedState
        ? await logContentWatch(contentId)
        : await unlogContentWatch(contentId);
      if (result.success) {
        toast.success(newConsumedState ? t('toasts.consumedAdded') : t('toasts.consumedRemoved'));
      } else {
        toast.error(t('toasts.consumedError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: {
            ...(prev[item.id] || currentState),
            isConsumed: currentState.isConsumed,
            isContinuing: currentState.isContinuing,
          },
        }));
      }
    } catch (error) {
      console.error('❌ [useHomeTabState] Error updating consumed status:', error);
      toast.error(t('toasts.consumedError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: {
          ...(prev[item.id] || currentState),
          isConsumed: currentState.isConsumed,
          isContinuing: currentState.isContinuing,
        },
      }));
    }
  };

  const handleFavoriteToggle = async (item: Content) => {
    if (!ensureUserAction()) return;

    const currentState = itemStates[item.id] || DEFAULT_ITEM_STATE;
    const newFavoriteState = !currentState.isFavorite;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: { ...(prev[item.id] || currentState), isFavorite: newFavoriteState },
    }));

    try {
      const result = await toggleContentFavorite(item.id.toString());
      if (result.isFavorite !== undefined) {
        toast.success(newFavoriteState ? t('toasts.favoriteAdded') : t('toasts.favoriteRemoved'));
      } else {
        toast.error(t('toasts.favoriteError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: { ...(prev[item.id] || currentState), isFavorite: currentState.isFavorite },
        }));
      }
    } catch (error) {
      console.error('❌ [useHomeTabState] Error updating favorite status:', error);
      toast.error(t('toasts.favoriteError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: { ...(prev[item.id] || currentState), isFavorite: currentState.isFavorite },
      }));
    }
  };

  const handleWatchlistToggle = async (item: Content) => {
    if (!ensureUserAction()) return;

    const currentState = itemStates[item.id] || DEFAULT_ITEM_STATE;
    const newConsumeLaterState = !currentState.isConsumeLater;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: { ...(prev[item.id] || currentState), isConsumeLater: newConsumeLaterState },
    }));

    try {
      const result = await toggleConsumeLater(item.id.toString());
      if (result.isConsumeLater !== undefined) {
        toast.success(
          newConsumeLaterState ? t('toasts.consumeLaterAdded') : t('toasts.consumeLaterRemoved')
        );
      } else {
        toast.error(t('toasts.consumeLaterError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: {
            ...(prev[item.id] || currentState),
            isConsumeLater: currentState.isConsumeLater,
          },
        }));
      }
    } catch (error) {
      console.error('❌ [useHomeTabState] Error updating consume later status:', error);
      toast.error(t('toasts.consumeLaterError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: {
          ...(prev[item.id] || currentState),
          isConsumeLater: currentState.isConsumeLater,
        },
      }));
    }
  };

  const handleContinuingToggle = async (item: Content) => {
    if (!ensureUserAction()) return;

    const currentState = itemStates[item.id] || DEFAULT_ITEM_STATE;
    const newContinuingState = !currentState.isContinuing;

    setItemStates((prev) => ({
      ...prev,
      [item.id]: {
        ...(prev[item.id] || currentState),
        isContinuing: newContinuingState,
        isConsumed: newContinuingState
          ? false
          : (prev[item.id]?.isConsumed ?? currentState.isConsumed),
      },
    }));

    try {
      const result = await toggleContinuing(item.id.toString());
      if (result.isContinuing !== undefined) {
        toast.success(
          newContinuingState ? t('toasts.continuingAdded') : t('toasts.continuingRemoved')
        );
      } else {
        toast.error(t('toasts.continuingError'));
        setItemStates((prev) => ({
          ...prev,
          [item.id]: {
            ...(prev[item.id] || currentState),
            isContinuing: currentState.isContinuing,
            isConsumed: currentState.isConsumed,
          },
        }));
      }
    } catch (error) {
      console.error('❌ [useHomeTabState] Error updating continuing status:', error);
      toast.error(t('toasts.continuingError'));
      setItemStates((prev) => ({
        ...prev,
        [item.id]: {
          ...(prev[item.id] || currentState),
          isContinuing: currentState.isContinuing,
          isConsumed: currentState.isConsumed,
        },
      }));
    }
  };

  // ─── Featured content selection & drag/drop ───────────────

  const toggleContentSelection = (contentId: string) => {
    setSelectedContentIds((prev) => {
      let newIds: string[];
      if (prev.includes(contentId)) {
        newIds = prev.filter((id) => id !== contentId);
      } else {
        if (prev.length >= 5) return prev;
        newIds = [...prev, contentId];
      }
      // Also update the pendingSelections map for the current type
      setPendingSelections((prevMap) => ({
        ...prevMap,
        [featuredType]: newIds,
      }));
      return newIds;
    });
  };

  const handleDragStart = (e: React.DragEvent, contentId: string) => {
    setDraggedId(contentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, contentId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (contentId !== draggedId) setDragOverId(contentId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      handleDragEnd();
      return;
    }

    setSelectedContentIds((prev) => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedId);
      const targetIndex = newOrder.indexOf(targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      // Sync with pendingSelections
      setPendingSelections((prevMap) => ({
        ...prevMap,
        [featuredType]: newOrder,
      }));
      return newOrder;
    });

    handleDragEnd();
  };

  const getSelectedContentItems = () => {
    const allContent = getConsumedContent();
    return selectedContentIds
      .map((id) => allContent.find((c: any) => c.id.toString() === id))
      .filter(Boolean);
  };

  const handleSaveFeatured = async () => {
    setIsSaving(true);
    try {
      const contentTypeMap = {
        movies: 'MOVIE',
        tv: 'TV',
        games: 'GAME',
        books: 'BOOK',
        music: 'MUSIC',
      } as const;

      // Save current tab's selection to pendingSelections before saving
      const finalSelections = {
        ...pendingSelections,
        [featuredType]: selectedContentIds,
      };

      // Build the original selections to compare
      const originalSelections: Record<FeaturedType, string[]> = {
        movies: featuredMovies.map((c) => c.id.toString()),
        tv: featuredTv.map((c) => c.id.toString()),
        games: featuredGames.map((c) => c.id.toString()),
        books: featuredBooks.map((c) => c.id.toString()),
        music: featuredMusic.map((c) => c.id.toString()),
      };

      // Find which types have changed
      const typesToSave = (Object.keys(contentTypeMap) as FeaturedType[]).filter((type) => {
        const original = originalSelections[type];
        const pending = finalSelections[type];
        if (original.length !== pending.length) return true;
        return original.some((id, idx) => id !== pending[idx]);
      });

      if (typesToSave.length === 0) {
        toast.success(t('toasts.noChanges'));
        setShowFeaturedDialog(false);
        return;
      }

      console.log(
        `💾 [useHomeTabState] Saving ${typesToSave.length} type(s): ${typesToSave.join(', ')}`
      );

      // Save all modified types
      let hasError = false;
      for (const type of typesToSave) {
        const result = await setFeaturedContent(finalSelections[type], contentTypeMap[type]);
        if (!result.data) {
          const errorMessage =
            result.error?.graphQLErrors?.[0]?.message ||
            result.error?.networkError?.message ||
            result.error?.message ||
            `${type} kaydedilemedi`;
          toast.error(errorMessage);
          console.error(`❌ [useHomeTabState] Save featured failed for ${type}:`, errorMessage);
          hasError = true;
          break;
        }
        console.log(`✅ [useHomeTabState] Featured content saved for ${type}`);
      }

      if (!hasError) {
        toast.success(t('toasts.featuredSaved'));
        setShowFeaturedDialog(false);
        onFeaturedUpdate?.();
      }
    } catch (error) {
      console.error('❌ [useHomeTabState] Error saving featured content:', error);
      const message = (error as any)?.message || t('toasts.featuredSaveError');
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Public API ────────────────────────────────────────────

  return {
    // Item states
    itemStates,
    // Content action handlers
    handlers: {
      handleWatchToggle,
      handleFavoriteToggle,
      handleWatchlistToggle,
      handleContinuingToggle,
      handleAddToList,
    },
    // Featured dialog
    showFeaturedDialog,
    setShowFeaturedDialog,
    featuredType,
    setFeaturedType,
    searchQuery,
    setSearchQuery,
    selectedContentIds,
    toggleContentSelection,
    filteredContent,
    isSaving,
    handleSaveFeatured,
    // Drag & drop
    getSelectedContentItems,
    draggedId,
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    // Add to list modal
    showAddToListModal,
    setShowAddToListModal,
    selectedContentForList,
    setSelectedContentForList,
    selectedContentType,
    // Heatmap selected day
    heatmapSelectedDay,
    setHeatmapSelectedDay,
  };
}
