import { useState, useEffect } from 'react';
import { explorePersons, type PersonData } from '@/services/graphql/person';
import { type PersonSortOption, type SortOrder } from '../components/PersonSortingBar';
import { type PersonFilterState } from '../components/PersonFilterSidebar';

export function usePersonSearch(
  query: string,
  filters: PersonFilterState,
  sortBy: PersonSortOption,
  sortOrder: SortOrder,
  page: number = 1,
  itemsPerPage: number = 20
) {
  const [items, setItems] = useState<PersonData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        let minYear: number | undefined;
        let maxYear: number | undefined;
        if (filters.birthYearRange) {
          minYear = filters.birthYearRange[0] !== null ? filters.birthYearRange[0] : undefined;
          maxYear = filters.birthYearRange[1] !== null ? filters.birthYearRange[1] : undefined;
        }

        const res = await explorePersons({
          search: query.trim() || undefined,
          page,
          limit: itemsPerPage,
          sortBy: sortOrder !== 'none' ? sortBy : undefined,
          sortOrder: sortOrder !== 'none' ? sortOrder : undefined,
          gender: filters.gender || undefined,
          status: filters.status || undefined,
          minYear,
          maxYear,
          roles: filters.roles && filters.roles.length > 0 ? filters.roles : undefined,
        });

        if (!isCurrentRequest) return;
        setItems(res.items);
        setTotalPages(Math.max(1, Math.ceil(res.totalCount / itemsPerPage)));
      } catch (error) {
        if (!isCurrentRequest) return;
        console.error('Error fetching persons:', error);
        setItems([]);
        setTotalPages(1);
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      void fetchData();
    }, 500);

    return () => {
      isCurrentRequest = false;
      clearTimeout(debounceTimer);
    };
  }, [query, filters, sortBy, sortOrder, page, itemsPerPage]);

  return {
    items,
    totalPages,
    loading,
  };
}
