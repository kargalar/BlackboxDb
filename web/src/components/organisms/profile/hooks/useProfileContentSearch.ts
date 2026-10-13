/**
 * Profile Content Search Hook
 *
 * Kullanıcının tükettiği içerikleri filtreleme ve sıralama için
 * explore page ile aynı filter/sort mantığını kullanır
 */

import { useMemo } from 'react';
import type { FilterState } from '@/app/explore/[type]/components/FilterSidebar';
import type { ProfileSortOption } from '@/components/organisms/profile/components/ProfileSortingBar';

interface ProfileContentItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  date?: string;
  user_date?: string; // İzlenme tarihi
  userDate?: string; // İzlenme tarihi (camelCase)
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
}

export function useProfileContentSearch(
  content: ProfileContentItem[],
  filters: FilterState,
  sortBy: ProfileSortOption,
  sortOrder: 'asc' | 'desc' | 'none'
) {
  const filteredAndSorted = useMemo(() => {
    console.log('[useProfileContentSearch] Starting filter/sort', {
      totalItems: content.length,
      filters,
      sortBy,
      sortOrder,
    });

    let result = [...content];

    // Apply genre filter
    if (filters.genres.length > 0) {
      result = result.filter((item) =>
        item.genres?.some((g) => filters.genres.includes(g.id.toString()))
      );
      console.log(`[useProfileContentSearch] After genre filter: ${result.length} items`);
    }

    // Apply rating filter (user_rating 1-10 scale)
    if (filters.rating.min !== '' && filters.rating.max !== '') {
      const minRating = Number(filters.rating.min);
      const maxRating = Number(filters.rating.max);
      if (minRating > 0 || maxRating < 10) {
        result = result.filter((item) => {
          const rating = item.user_rating || 0;
          return rating >= minRating && rating <= maxRating;
        });
        console.log(`[useProfileContentSearch] After rating filter: ${result.length} items`);
      }
    }

    // Apply year filter
    if (filters.year.min !== '' && filters.year.max !== '') {
      const minYear = Number(filters.year.min);
      const maxYear = Number(filters.year.max);
      if (minYear > 1900 || maxYear < new Date().getFullYear()) {
        result = result.filter((item) => {
          const dateStr = item.date || item.releaseDate;
          if (!dateStr) return false;
          const year = new Date(dateStr).getFullYear();
          return year >= minYear && year <= maxYear;
        });
        console.log(`[useProfileContentSearch] After year filter: ${result.length} items`);
      }
    }

    // Apply actor filter
    if (filters.actors && filters.actors.length > 0) {
      result = result.filter((item) =>
        item.people?.some((p) => {
          const r = p.role?.toLowerCase();
          return (
            (r === 'actor' || r === 'voice' || r === 'voice_actor') &&
            filters.actors?.includes(p.person.id)
          );
        })
      );
      console.log(`[useProfileContentSearch] After actor filter: ${result.length} items`);
    }

    // Apply director filter
    if (filters.directors && filters.directors.length > 0) {
      result = result.filter((item) =>
        item.people?.some(
          (p) => p.role?.toLowerCase() === 'director' && filters.directors?.includes(p.person.id)
        )
      );
      console.log(`[useProfileContentSearch] After director filter: ${result.length} items`);
    }

    // Apply hide filters
    if (filters.hideWatched === 'show') {
      result = result.filter((item) => {
        const isConsumed = item.isConsumed ?? item.is_consumed ?? false;
        return isConsumed;
      });
      console.log(
        `[useProfileContentSearch] After hideWatched (show) filter: ${result.length} items`
      );
    } else if (filters.hideWatched === 'hide') {
      result = result.filter((item) => {
        const isConsumed = item.isConsumed ?? item.is_consumed ?? false;
        return !isConsumed;
      });
      console.log(
        `[useProfileContentSearch] After hideWatched (hide) filter: ${result.length} items`
      );
    }

    if (filters.hideWatchlist === 'show') {
      result = result.filter((item) => {
        const isConsumeLater = item.isConsumeLater ?? item.is_consume_later ?? false;
        return isConsumeLater;
      });
      console.log(
        `[useProfileContentSearch] After hideWatchlist (show) filter: ${result.length} items`
      );
    } else if (filters.hideWatchlist === 'hide') {
      result = result.filter((item) => {
        const isConsumeLater = item.isConsumeLater ?? item.is_consume_later ?? false;
        return !isConsumeLater;
      });
      console.log(
        `[useProfileContentSearch] After hideWatchlist (hide) filter: ${result.length} items`
      );
    }

    if (filters.hideContinuing === 'show') {
      result = result.filter((item) => {
        const isContinuing = item.isContinuing ?? item.is_continuing ?? false;
        return isContinuing;
      });
      console.log(
        `[useProfileContentSearch] After hideContinuing (show) filter: ${result.length} items`
      );
    } else if (filters.hideContinuing === 'hide') {
      result = result.filter((item) => {
        const isContinuing = item.isContinuing ?? item.is_continuing ?? false;
        return !isContinuing;
      });
      console.log(
        `[useProfileContentSearch] After hideContinuing (hide) filter: ${result.length} items`
      );
    }

    if (filters.hideFavorites === 'show') {
      result = result.filter((item) => {
        const isFavorite = item.isFavorite ?? item.is_favorite ?? false;
        return isFavorite;
      });
      console.log(
        `[useProfileContentSearch] After hideFavorites (show) filter: ${result.length} items`
      );
    } else if (filters.hideFavorites === 'hide') {
      result = result.filter((item) => {
        const isFavorite = item.isFavorite ?? item.is_favorite ?? false;
        return !isFavorite;
      });
      console.log(
        `[useProfileContentSearch] After hideFavorites (hide) filter: ${result.length} items`
      );
    }

    // Apply sorting (only if sortOrder is not 'none')
    if (sortOrder !== 'none') {
      result.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case 'popularity':
            // For profile, we can't use consumeCount/favoriteCount (we don't have that data)
            // So use user_rating as a proxy for popularity
            const ratingA = a.user_rating || 0;
            const ratingB = b.user_rating || 0;
            comparison = ratingB - ratingA;
            break;

          case 'rating':
            const userRatingA = a.user_rating || 0;
            const userRatingB = b.user_rating || 0;
            comparison = userRatingB - userRatingA;
            break;

          case 'title':
            const titleA = (a.title || a.name || '').toLowerCase();
            const titleB = (b.title || b.name || '').toLowerCase();
            comparison = titleA.localeCompare(titleB, 'tr');
            break;

          case 'releaseDate': {
            // Sort by release date
            const dateA = a.releaseDate || a.date;
            const dateB = b.releaseDate || b.date;
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            comparison = timeB - timeA;
            break;
          }

          case 'userDate': {
            // Sort by watch date (user_date / userDate)
            const watchDateA = a.userDate || a.user_date;
            const watchDateB = b.userDate || b.user_date;
            const timeA = watchDateA ? new Date(watchDateA).getTime() : 0;
            const timeB = watchDateB ? new Date(watchDateB).getTime() : 0;
            comparison = timeB - timeA;
            break;
          }
        }

        return sortOrder === 'asc' ? -comparison : comparison;
      });
      console.log(`[useProfileContentSearch] Sorted by ${sortBy} (${sortOrder})`);
    }

    console.log(`[useProfileContentSearch] Final result: ${result.length} items`);
    return result;
  }, [content, filters, sortBy, sortOrder]);

  return filteredAndSorted;
}
