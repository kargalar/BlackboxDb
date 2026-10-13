import { useState, useCallback } from 'react';
import { getUserContentLogs } from '@/services/database/contentService';
import type { UnifiedContent } from '@/types/unified-content';

interface ItemState {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
  rating: number | null;
  hasReview: boolean;
}

/**
 * Hook for managing user's interaction states with content items
 */
export function useItemStates(userId: number | null) {
  const [itemStates, setItemStates] = useState<Record<string, ItemState>>({});

  const loadItemStates = useCallback(
    async (items: UnifiedContent[]) => {
      if (!items || items.length === 0 || !userId) {
        console.log('⚠️ No items or user to load states for');
        if (!userId) setItemStates({});
        return;
      }

      try {
        console.log(`🔄 Loading states for ${items.length} items...`);
        const contentIds = items.map((item) => item.id);
        const result = await getUserContentLogs(contentIds);
        const logs = result.data || [];

        const newStates: Record<string, ItemState> = {};
        logs.forEach((log) => {
          newStates[log.contentId] = {
            isConsumed: log.isConsumed || false,
            isFavorite: log.isFavorite || false,
            isConsumeLater: log.isConsumeLater || false,
            isContinuing: log.isContinuing || false,
            rating: log.rating ?? null,
            hasReview: !!((log as any).review && (log as any).review.trim()),
          };
        });

        console.log(`✅ Loaded states for ${Object.keys(newStates).length} items`);
        setItemStates((prev) => ({ ...prev, ...newStates }));
      } catch (error) {
        console.error('❌ Error loading item states:', error);
      }
    },
    [userId]
  );

  const updateItemState = useCallback((itemId: string, updates: Partial<ItemState>) => {
    setItemStates((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {
          isConsumed: false,
          isFavorite: false,
          isConsumeLater: false,
          isContinuing: false,
          rating: null,
          hasReview: false,
        }),
        ...updates,
      },
    }));
  }, []);

  const getItemState = useCallback(
    (itemId: string): ItemState => {
      return (
        itemStates[itemId] || {
          isConsumed: false,
          isFavorite: false,
          isConsumeLater: false,
          isContinuing: false,
          rating: null,
          hasReview: false,
        }
      );
    },
    [itemStates]
  );

  return {
    itemStates,
    loadItemStates,
    updateItemState,
    getItemState,
  };
}
