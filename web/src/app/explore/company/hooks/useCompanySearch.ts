import { useState, useEffect } from 'react';
import { exploreCompanies, type CompanyData } from '@/services/graphql/company';
import { type CompanySortOption, type SortOrder } from '../components/CompanySortingBar';
import { type CompanyFilterState } from '../components/CompanyFilterSidebar';

export function useCompanySearch(
  query: string,
  filters: CompanyFilterState,
  sortBy: CompanySortOption,
  sortOrder: SortOrder,
  page: number = 1,
  itemsPerPage: number = 20
) {
  const [items, setItems] = useState<CompanyData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        let minYear: number | undefined;
        let maxYear: number | undefined;
        if (filters.foundingYearRange) {
          minYear =
            filters.foundingYearRange[0] !== null ? filters.foundingYearRange[0] : undefined;
          maxYear =
            filters.foundingYearRange[1] !== null ? filters.foundingYearRange[1] : undefined;
        }

        let minContentCount: number | undefined;
        let maxContentCount: number | undefined;
        if (filters.contentVolume) {
          if (filters.contentVolume === '1-10') {
            minContentCount = 1;
            maxContentCount = 10;
          } else if (filters.contentVolume === '11-50') {
            minContentCount = 11;
            maxContentCount = 50;
          } else if (filters.contentVolume === '50+') {
            minContentCount = 51;
          }
        }

        const res = await exploreCompanies({
          search: query.trim() || undefined,
          page,
          limit: itemsPerPage,
          sortBy: sortOrder !== 'none' ? sortBy : undefined,
          sortOrder: sortOrder !== 'none' ? sortOrder : undefined,
          minYear,
          maxYear,
          minContentCount,
          maxContentCount,
          roles:
            filters.roles && filters.roles.length > 0
              ? filters.roles.map((r) => parseInt(r, 10))
              : undefined,
        });

        if (!isCurrentRequest) return;
        setItems(res.items);
        setTotalPages(Math.max(1, Math.ceil(res.totalCount / itemsPerPage)));
      } catch (error) {
        if (!isCurrentRequest) return;
        console.error('Error fetching companies:', error);
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
