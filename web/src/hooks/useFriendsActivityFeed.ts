import { useEffect, useState } from 'react';
import { logApiRequest } from '@/lib/requestLogger';
import { getFriendsActivityFeed } from '@/services/userContentService';
import { loadItemStates } from '@/app/explore/[type]/hooks/itemStates';

export type FriendsActivityFeedItem = any;

interface UseFriendsActivityFeedOptions {
  limit?: number;
  enabled?: boolean;
}

interface UseFriendsActivityFeedResult {
  activities: FriendsActivityFeedItem[];
  statusActivities: FriendsActivityFeedItem[];
  reviewActivities: FriendsActivityFeedItem[];
  itemStates: Record<string, any>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches friends activity feed for the logged-in user.
 * Provides unified activities containing both status actions (watched/played/etc., ratings)
 * and reviews.
 */
export function useFriendsActivityFeed(
  options: UseFriendsActivityFeedOptions = {}
): UseFriendsActivityFeedResult {
  const { limit = 20, enabled = true } = options;

  const [activities, setActivities] = useState<FriendsActivityFeedItem[]>([]);
  const [statusActivities, setStatusActivities] = useState<FriendsActivityFeedItem[]>([]);
  const [reviewActivities, setReviewActivities] = useState<FriendsActivityFeedItem[]>([]);
  const [itemStates, setItemStates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    if (!enabled) {
      console.log('👥📰 [FriendsActivityFeed] disabled, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('👥📰 [FriendsActivityFeed] fetching...', { limit });
      const { data, error: fetchError } = await getFriendsActivityFeed(limit);

      if (fetchError) {
        const message =
          fetchError instanceof Error ? fetchError.message : 'Friends activity feed fetch failed';
        console.error('❌ 👥📰 [FriendsActivityFeed] fetch error:', fetchError);
        logApiRequest('GraphQL:friendsActivityFeed', 'QUERY', false, message);
        setError(message);
        setActivities([]);
        setStatusActivities([]);
        setReviewActivities([]);
        return;
      }

      logApiRequest('GraphQL:friendsActivityFeed', 'QUERY', true);
      const all = data || [];

      // Collect all friend activities (status updates + reviews)
      const feedItems: FriendsActivityFeedItem[] = [];
      const reviews: FriendsActivityFeedItem[] = [];

      for (const item of all) {
        const a = item as any;
        if (
          a.contentId &&
          (a.isConsumed ||
            a.isContinuing ||
            a.isConsumeLater ||
            a.isFavorite ||
            a.rating ||
            a.review ||
            a.isStandaloneReview)
        ) {
          feedItems.push(item);
        }
        if (a.review || a.isStandaloneReview) {
          reviews.push(item);
        }
      }

      console.log('✅ 👥📰 [FriendsActivityFeed] result:', {
        total: all.length,
        feedCount: feedItems.length,
        reviewCount: reviews.length,
      });

      setActivities(feedItems);
      setStatusActivities(feedItems);
      setReviewActivities(reviews);

      // Load item states for the logged-in user
      try {
        const contentIds = all.map((item: any) => item.contentId).filter(Boolean);
        // unique ids
        const uniqueIds = Array.from(new Set(contentIds));
        const states = await loadItemStates(uniqueIds as string[]);
        setItemStates(states);
      } catch (err) {
        console.error('👥📰 [FriendsActivityFeed] Error loading item states', err);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Friends activity feed fetch failed';
      console.error('❌ 👥📰 [FriendsActivityFeed] unexpected error:', e);
      logApiRequest('GraphQL:friendsActivityFeed', 'QUERY', false, message);
      setError(message);
      setActivities([]);
      setStatusActivities([]);
      setReviewActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, enabled]);

  return {
    activities,
    statusActivities,
    reviewActivities,
    itemStates,
    loading,
    error,
    refresh: fetchFeed,
  };
}
