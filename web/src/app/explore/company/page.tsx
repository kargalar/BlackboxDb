'use client';

import React, { Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BuildingIcon } from '@/components/atoms/icons/SidebarIcons';
import { SearchBar } from '../[type]/components/SearchBar';
import { X } from 'lucide-react';
import { CompanyCard } from '@/components/molecules/CompanyCard';
import { useCompanySearch } from './hooks/useCompanySearch';
import {
  CompanySortingBar,
  type CompanySortOption,
  type SortOrder,
} from './components/CompanySortingBar';
import { CompanyFilterSidebar, type CompanyFilterState } from './components/CompanyFilterSidebar';
import { Pagination } from '../[type]/components/Pagination';
import { useTranslations } from 'next-intl';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export default function CompanyExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white" />}>
      <CompanyExplorePageInner />
    </Suspense>
  );
}

function CompanyExplorePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchParamsString = searchParams.toString();
  const filters = useMemo<CompanyFilterState>(() => {
    const params = new URLSearchParams(searchParamsString);
    const minYear = params.get('foundingYearMin');
    const maxYear = params.get('foundingYearMax');
    return {
      foundingYearRange: [
        minYear ? parseInt(minYear, 10) : null,
        maxYear ? parseInt(maxYear, 10) : null,
      ],
      contentVolume: params.get('contentVolume') || '',
      roles: params.getAll('role'),
    };
  }, [searchParamsString]);
  const requestedSort = searchParams.get('sortBy');
  const sortBy: CompanySortOption = ['name', 'foundingYear'].includes(requestedSort || '')
    ? (requestedSort as CompanySortOption)
    : 'contentCount';
  const requestedOrder = searchParams.get('sortOrder');
  const sortOrder: SortOrder = ['asc', 'desc', 'none'].includes(requestedOrder || '')
    ? (requestedOrder as SortOrder)
    : query
      ? 'none'
      : 'desc';

  const t = useTranslations('Explore.Company');
  const preferences = useUserPreferences();
  const itemsPerPage = (preferences?.gridColumns || 5) * (preferences?.gridRows || 4);

  const { items, totalPages, loading } = useCompanySearch(
    query,
    filters,
    sortBy,
    sortOrder,
    page,
    itemsPerPage
  );

  const pushToUrl = (
    newFilters: CompanyFilterState,
    newSortBy: CompanySortOption,
    newSortOrder: SortOrder
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    params.delete('foundingYearMin');
    params.delete('foundingYearMax');
    if (newFilters.foundingYearRange[0] !== null)
      params.set('foundingYearMin', newFilters.foundingYearRange[0].toString());
    if (newFilters.foundingYearRange[1] !== null)
      params.set('foundingYearMax', newFilters.foundingYearRange[1].toString());

    params.delete('contentVolume');
    if (newFilters.contentVolume) params.set('contentVolume', newFilters.contentVolume);

    params.delete('role');
    if (newFilters.roles && newFilters.roles.length > 0) {
      newFilters.roles.forEach((role) => params.append('role', role));
    }

    params.set('sortBy', newSortBy);
    params.set('sortOrder', newSortOrder);

    router.push(`/explore/company?${params.toString()}`, { scroll: false });
  };

  const updateFilters = (newFilters: CompanyFilterState) => {
    pushToUrl(newFilters, sortBy, sortOrder);
  };

  const updateSort = (sort: CompanySortOption, order: SortOrder) => {
    pushToUrl(filters, sort, order);
  };

  const getActiveFilters = () => {
    const active = [];
    if (filters.foundingYearRange[0] !== null || filters.foundingYearRange[1] !== null) {
      const min = filters.foundingYearRange[0] || '...';
      const max = filters.foundingYearRange[1] || '...';
      active.push({ id: 'foundingYear', label: `${t('filters.foundingYear')}: ${min} - ${max}` });
    }
    if (filters.contentVolume) {
      active.push({
        id: 'contentVolume',
        label: `${t('filters.contentVolume')}: ${t(`filters.volumes.${filters.contentVolume}`, { fallback: filters.contentVolume })}`,
      });
    }
    if (filters.roles.length > 0) {
      const roleLabels = filters.roles
        .map((r) => t(`filters.roleLabels.${r}`, { fallback: r }))
        .join(', ');
      active.push({ id: 'roles', label: `${t('filters.roles')}: ${roleLabels}` });
    }
    return active;
  };

  const removeFilter = (id: string) => {
    if (id === 'foundingYear') updateFilters({ ...filters, foundingYearRange: [null, null] });
    if (id === 'contentVolume') updateFilters({ ...filters, contentVolume: '' });
    if (id === 'roles') updateFilters({ ...filters, roles: [] });
  };

  const clearAllFilters = () => {
    updateFilters({ foundingYearRange: [null, null], contentVolume: '', roles: [] });
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-6">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-4xl text-indigo-500">
                <BuildingIcon className="w-8 h-8" />
              </span>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
              {!loading && (
                <span className="text-sm text-gray-400 ml-1">
                  ({items.length} {t('results')})
                </span>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <SearchBar contentType="company" placeholder={t('searchPlaceholder')} />
            </div>
          </div>
        </div>
      </div>

      <CompanySortingBar
        currentSort={sortBy}
        currentOrder={sortOrder}
        onSortChange={(sort, order) => {
          updateSort(sort, order);
        }}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content Grid Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-[1920px] mx-auto">
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800/50">
                <span className="text-sm text-gray-400 mr-2">{t('activeFilters')}</span>
                {activeFilters.map((filter) => (
                  <span
                    key={filter.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                  >
                    {filter.label}
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="hover:bg-indigo-500/20 p-0.5 rounded-full transition-colors"
                      aria-label={t('removeFilter', { filter: filter.label })}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-400 hover:text-white ml-2 underline decoration-gray-600 underline-offset-4 transition-colors"
                >
                  {t('clearAll')}
                </button>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-800 aspect-square rounded-lg mb-2"></div>
                    <div className="bg-gray-800 h-4 w-3/4 rounded mb-1"></div>
                    <div className="bg-gray-800 h-3 w-1/2 rounded"></div>
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {items.map((company) => (
                    <CompanyCard key={company.id} company={company} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 mb-4 border-t border-gray-800 pt-8">
                    <Pagination currentPage={page} totalPages={totalPages} contentType="company" />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BuildingIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('notFound')}</h2>
                <p className="text-gray-400 max-w-md mx-auto">{t('notFoundDesc')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filter Sidebar */}
        <CompanyFilterSidebar filters={filters} onFilterChange={updateFilters} />
      </div>
    </div>
  );
}
