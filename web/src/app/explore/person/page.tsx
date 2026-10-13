'use client';

import React, { Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { UserIcon } from '@/components/atoms/icons/SidebarIcons';
import { SearchBar } from '../[type]/components/SearchBar';
import { X } from 'lucide-react';
import { PersonCard } from '@/components/molecules/PersonCard';
import { usePersonSearch } from './hooks/usePersonSearch';
import {
  PersonSortingBar,
  type PersonSortOption,
  type SortOrder,
} from './components/PersonSortingBar';
import { PersonFilterSidebar, type PersonFilterState } from './components/PersonFilterSidebar';
import { Pagination } from '../[type]/components/Pagination';
import { useTranslations } from 'next-intl';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export default function PersonExplorePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white" />}>
      <PersonExplorePageInner />
    </Suspense>
  );
}

function PersonExplorePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const searchParamsString = searchParams.toString();
  const filters = useMemo<PersonFilterState>(() => {
    const params = new URLSearchParams(searchParamsString);
    const minYear = params.get('birthYearMin');
    const maxYear = params.get('birthYearMax');
    return {
      gender: params.get('gender') || '',
      status: params.get('status') || '',
      birthYearRange: [
        minYear ? parseInt(minYear, 10) : null,
        maxYear ? parseInt(maxYear, 10) : null,
      ],
      roles: params.getAll('role'),
    };
  }, [searchParamsString]);

  const requestedSort = searchParams.get('sortBy');
  const sortBy: PersonSortOption = requestedSort === 'name' ? 'name' : 'roleCount';
  const requestedOrder = searchParams.get('sortOrder');
  const sortOrder: SortOrder = ['asc', 'desc', 'none'].includes(requestedOrder || '')
    ? (requestedOrder as SortOrder)
    : query
      ? 'none'
      : 'desc';

  const t = useTranslations('Explore.Person');
  const preferences = useUserPreferences();
  const itemsPerPage = (preferences?.gridColumns || 5) * (preferences?.gridRows || 4);

  const { items, totalPages, loading } = usePersonSearch(
    query,
    filters,
    sortBy,
    sortOrder,
    page,
    itemsPerPage
  );

  const pushToUrl = (
    newFilters: PersonFilterState,
    newSortBy: PersonSortOption,
    newSortOrder: SortOrder
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    params.delete('gender');
    if (newFilters.gender) params.set('gender', newFilters.gender);

    params.delete('status');
    if (newFilters.status) params.set('status', newFilters.status);

    params.delete('birthYearMin');
    params.delete('birthYearMax');
    if (newFilters.birthYearRange[0] !== null)
      params.set('birthYearMin', newFilters.birthYearRange[0].toString());
    if (newFilters.birthYearRange[1] !== null)
      params.set('birthYearMax', newFilters.birthYearRange[1].toString());

    params.delete('role');
    if (newFilters.roles && newFilters.roles.length > 0) {
      newFilters.roles.forEach((role) => params.append('role', role));
    }

    params.set('sortBy', newSortBy);
    params.set('sortOrder', newSortOrder);

    router.push(`/explore/person?${params.toString()}`, { scroll: false });
  };

  const updateFilters = (newFilters: PersonFilterState) => {
    pushToUrl(newFilters, sortBy, sortOrder);
  };

  const updateSort = (sort: PersonSortOption, order: SortOrder) => {
    pushToUrl(filters, sort, order);
  };

  const getActiveFilters = () => {
    const active = [];
    if (filters.gender) {
      active.push({
        id: 'gender',
        label: `${t('filters.gender')}: ${t(`filters.genders.${filters.gender}`, { fallback: filters.gender })}`,
      });
    }
    if (filters.status) {
      active.push({
        id: 'status',
        label: `${t('filters.status')}: ${t(`filters.statuses.${filters.status}`, { fallback: filters.status })}`,
      });
    }
    if (filters.birthYearRange[0] !== null || filters.birthYearRange[1] !== null) {
      const min = filters.birthYearRange[0] || '...';
      const max = filters.birthYearRange[1] || '...';
      active.push({ id: 'birthYear', label: `${t('filters.birthYear')}: ${min} - ${max}` });
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
    if (id === 'gender') updateFilters({ ...filters, gender: '' });
    if (id === 'status') updateFilters({ ...filters, status: '' });
    if (id === 'birthYear') updateFilters({ ...filters, birthYearRange: [null, null] });
    if (id === 'roles') updateFilters({ ...filters, roles: [] });
  };

  const clearAllFilters = () => {
    updateFilters({ gender: '', status: '', birthYearRange: [null, null], roles: [] });
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-6">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-4xl text-amber-500">
                <UserIcon className="w-8 h-8" />
              </span>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
              {!loading && (
                <span className="text-sm text-gray-400 ml-1">
                  ({items.length} {t('results')})
                </span>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <SearchBar contentType="person" placeholder={t('searchPlaceholder')} />
            </div>
          </div>
        </div>
      </div>

      <PersonSortingBar
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20"
                  >
                    {filter.label}
                    <button
                      onClick={() => removeFilter(filter.id)}
                      className="hover:bg-amber-500/20 p-0.5 rounded-full transition-colors"
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
                    <div className="bg-gray-800 aspect-[2/3] rounded-lg mb-2"></div>
                    <div className="bg-gray-800 h-4 w-3/4 rounded mb-1"></div>
                    <div className="bg-gray-800 h-3 w-1/2 rounded"></div>
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {items.map((person) => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 mb-4 border-t border-gray-800 pt-8">
                    <Pagination currentPage={page} totalPages={totalPages} contentType="person" />
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('notFound')}</h2>
                <p className="text-gray-400 max-w-md mx-auto">{t('notFoundDesc')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filter Sidebar */}
        <PersonFilterSidebar filters={filters} onFilterChange={updateFilters} />
      </div>
    </div>
  );
}
