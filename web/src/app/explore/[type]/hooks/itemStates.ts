import { getUserContentLogs } from '@/services/userContentService';
import type { UserContentLog } from '@/services/graphql/userContent';

interface ItemState {
  isConsumed: boolean;
  isFavorite: boolean;
  isConsumeLater: boolean;
  isContinuing: boolean;
  isAbandoned: boolean;
  rating: number | null;
  hasReview: boolean;
}

export async function loadItemStates(contentIds: string[]): Promise<Record<string, ItemState>> {
  if (contentIds.length === 0) return {};

  try {
    const result = await getUserContentLogs(contentIds);
    const logs = result.data || [];
    const states: Record<string, ItemState> = {};

    logs.forEach((log) => {
      states[log.contentId] = {
        isConsumed: log.isConsumed || false,
        isFavorite: log.isFavorite || false,
        isConsumeLater: log.isConsumeLater || false,
        isContinuing: log.isContinuing || false,
        isAbandoned: log.isAbandoned || false,
        rating: log.rating ?? null,
        hasReview: Boolean(log.hasReview),
      };
    });

    return states;
  } catch (error) {
    console.error('[loadItemStates] Error:', error);
    return {};
  }
}

export async function updateItemState(contentId: string): Promise<ItemState> {
  const states = await loadItemStates([contentId]);
  return (
    states[contentId] || {
      isConsumed: false,
      isFavorite: false,
      isConsumeLater: false,
      isContinuing: false,
      isAbandoned: false,
      rating: null,
      hasReview: false,
    }
  );
}
