import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { type FilterState, type FilterCounts } from '../components/FilterSidebar';
import { type SortOption } from '../components/SortingBar';
import { getFilterCounts } from './contentSearch';
import { useAuth } from '@/contexts/AuthContext';

export function useExploreFilters(contentType: string, contentTypeId: number) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const [filterCounts, setFilterCounts] = useState<FilterCounts | undefined>(undefined);

  const queryParam = searchParams.get('q');
  const searchParamsString = searchParams.toString();

  const filters: FilterState = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    return {
      genres: params.getAll('genre'),
      themes: params.getAll('theme'),
      moods: params.getAll('mood'),
      ageRatings: params.getAll('ageRating'),
      platforms: params.getAll('platform'),
      actors: params.getAll('actor'),
      directors: params.getAll('director'),
      companies: params.getAll('company'),
      gameModes: params.getAll('gameMode'),
      perspectives: params.getAll('perspective'),
      language: params.getAll('language'),
      publicationLanguage: params.getAll('publicationLanguage'),
      rating: {
        min: params.has('ratingMin') ? Number(params.get('ratingMin')) : '',
        max: params.has('ratingMax') ? Number(params.get('ratingMax')) : '',
      },
      year: {
        min: params.has('yearMin') ? Number(params.get('yearMin')) : '',
        max: params.has('yearMax') ? Number(params.get('yearMax')) : '',
      },
      duration: {
        min: params.has('durationMin') ? Number(params.get('durationMin')) : '',
        max: params.has('durationMax') ? Number(params.get('durationMax')) : '',
      },
      hideWatched: (params.get('hideWatched') as any) || 'passive',
      hideWatchlist: (params.get('hideWatchlist') as any) || 'passive',
      hideContinuing: (params.get('hideContinuing') as any) || 'passive',
      hideFavorites: (params.get('hideFavorites') as any) || 'passive',
      hideAbandoned: (params.get('hideAbandoned') as any) || 'passive',
      hideInAnyList: (params.get('hideInAnyList') as any) || 'passive',
      hasAwards: params.has('hasAwards') ? params.get('hasAwards') === 'true' : undefined,
    };
  }, [searchParamsString]);

  const sortBy = (searchParams.get('sortBy') as SortOption) || 'popularity';
  const sortOrder =
    (searchParams.get('sortOrder') as 'asc' | 'desc' | 'none') || (queryParam ? 'none' : 'desc');

  const preferencesApplied = useRef(false);

  useEffect(() => {
    if (user && !preferencesApplied.current && contentTypeId === 3) {
      const preferredGamePlatformIds = user?.preferredGamePlatformIds?.length
        ? user.preferredGamePlatformIds
        : user?.preferredGamePlatformId
          ? [user.preferredGamePlatformId]
          : [];

      if (!searchParams.has('platform') && preferredGamePlatformIds.length > 0) {
        const params = new URLSearchParams(searchParams.toString());
        preferredGamePlatformIds.forEach((id) => params.append('platform', String(id)));
        router.replace(`${pathname}?${params.toString()}` as any, { scroll: false });
      }
      preferencesApplied.current = true;
    }
    if (
      user &&
      !preferencesApplied.current &&
      (contentTypeId !== 3 || !user.preferredGamePlatformIds)
    ) {
      preferencesApplied.current = true;
    }
  }, [user, contentTypeId, searchParams, pathname, router]);

  // Yeni arama yapıldığında sıralamayı none olarak değiştir (URL'yi güncellemeye gerek kalmadan computed state olarak handle edilebilir ancak URL'ye yansıtmak daha temiz)
  useEffect(() => {
    if (queryParam && sortOrder !== 'none') {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sortOrder', 'none');
      router.replace(`${pathname}?${params.toString()}` as any, { scroll: false });
    }
  }, [queryParam, sortOrder, pathname, router, searchParams]);

  useEffect(() => {
    const loadFilterCounts = async () => {
      try {
        const counts = await getFilterCounts(contentTypeId);
        setFilterCounts(counts);
      } catch (error) {
        console.error(`[ExploreFilters] Error loading filter counts:`, error);
      }
    };
    loadFilterCounts();
  }, [contentType, contentTypeId]);

  const handleFilterChange = (newFilters: FilterState) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    const arrayKeys = [
      'genre',
      'theme',
      'mood',
      'ageRating',
      'platform',
      'actor',
      'director',
      'company',
      'gameMode',
      'perspective',
      'language',
      'publicationLanguage',
    ];
    arrayKeys.forEach((k) => params.delete(k));

    params.delete('ratingMin');
    params.delete('ratingMax');
    params.delete('yearMin');
    params.delete('yearMax');
    params.delete('durationMin');
    params.delete('durationMax');

    [
      'hideWatched',
      'hideWatchlist',
      'hideContinuing',
      'hideFavorites',
      'hideAbandoned',
      'hideInAnyList',
    ].forEach((k) => params.delete(k));
    params.delete('hasAwards');

    newFilters.genres?.forEach((v) => params.append('genre', v));
    newFilters.themes?.forEach((v) => params.append('theme', v));
    newFilters.moods?.forEach((v) => params.append('mood', v));
    newFilters.ageRatings?.forEach((v) => params.append('ageRating', v));
    newFilters.platforms?.forEach((v) => params.append('platform', v));
    newFilters.actors?.forEach((v) => params.append('actor', String(v)));
    newFilters.directors?.forEach((v) => params.append('director', String(v)));
    newFilters.companies?.forEach((v) => params.append('company', String(v)));
    newFilters.gameModes?.forEach((v) => params.append('gameMode', v));
    newFilters.perspectives?.forEach((v) => params.append('perspective', v));
    newFilters.language?.forEach((v) => params.append('language', v));
    newFilters.publicationLanguage?.forEach((v) => params.append('publicationLanguage', v));

    if (newFilters.rating.min !== '') params.set('ratingMin', String(newFilters.rating.min));
    if (newFilters.rating.max !== '') params.set('ratingMax', String(newFilters.rating.max));
    if (newFilters.year.min !== '') params.set('yearMin', String(newFilters.year.min));
    if (newFilters.year.max !== '') params.set('yearMax', String(newFilters.year.max));
    if (newFilters.duration.min !== '') params.set('durationMin', String(newFilters.duration.min));
    if (newFilters.duration.max !== '') params.set('durationMax', String(newFilters.duration.max));

    if (newFilters.hideWatched && newFilters.hideWatched !== 'passive')
      params.set('hideWatched', newFilters.hideWatched);
    if (newFilters.hideWatchlist && newFilters.hideWatchlist !== 'passive')
      params.set('hideWatchlist', newFilters.hideWatchlist);
    if (newFilters.hideContinuing && newFilters.hideContinuing !== 'passive')
      params.set('hideContinuing', newFilters.hideContinuing);
    if (newFilters.hideFavorites && newFilters.hideFavorites !== 'passive')
      params.set('hideFavorites', newFilters.hideFavorites);
    if (newFilters.hideAbandoned && newFilters.hideAbandoned !== 'passive')
      params.set('hideAbandoned', newFilters.hideAbandoned);
    if (newFilters.hideInAnyList && newFilters.hideInAnyList !== 'passive')
      params.set('hideInAnyList', newFilters.hideInAnyList);

    if (newFilters.hasAwards !== undefined) params.set('hasAwards', String(newFilters.hasAwards));

    router.push(`${pathname}?${params.toString()}` as any, { scroll: false });
  };

  const handleSortChange = (newSortBy: SortOption, newSortOrder: 'asc' | 'desc' | 'none') => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    params.set('sortBy', newSortBy);
    params.set('sortOrder', newSortOrder);
    router.push(`${pathname}?${params.toString()}` as any, { scroll: false });
  };

  return {
    filters,
    filterCounts,
    sortBy,
    sortOrder,
    handleFilterChange,
    handleSortChange,
  };
}
