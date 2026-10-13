'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, X, Pin, PinOff } from 'lucide-react';

export interface CompanyFilterState {
  foundingYearRange: [number | null, number | null];
  contentVolume: string;
  roles: string[];
}

interface CompanyFilterSidebarProps {
  filters: CompanyFilterState;
  onFilterChange: (filters: CompanyFilterState) => void;
}

const FILTER_SIDEBAR_PINNED_STORAGE_KEY = 'explore-company-filter-sidebar-pinned';

export function CompanyFilterSidebar({ filters, onFilterChange }: CompanyFilterSidebarProps) {
  const t = useTranslations('Explore.Company');
  const tSidebar = useTranslations('Explore.Company.sidebar');

  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasInitializedPinnedState, setHasInitializedPinnedState] = useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = useState(false);

  useEffect(() => {
    let frameId: number | null = null;
    try {
      const savedPinnedState = localStorage.getItem(FILTER_SIDEBAR_PINNED_STORAGE_KEY);
      if (savedPinnedState !== null) {
        setIsPinned(savedPinnedState === 'true');
      }
    } catch (error) {
    } finally {
      setHasInitializedPinnedState(true);
      frameId = window.requestAnimationFrame(() => {
        setTransitionsEnabled(true);
      });
    }
    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!hasInitializedPinnedState) return;
    try {
      localStorage.setItem(FILTER_SIDEBAR_PINNED_STORAGE_KEY, String(isPinned));
    } catch (error) {}
  }, [hasInitializedPinnedState, isPinned]);

  const handleRoleToggle = (role: string) => {
    const newRoles = filters.roles.includes(role)
      ? filters.roles.filter((r) => r !== role)
      : [...filters.roles, role];
    onFilterChange({ ...filters, roles: newRoles });
  };

  const handleYearChange = (index: 0 | 1, value: string) => {
    const numValue = value === '' ? null : parseInt(value, 10);
    const newRange = [...filters.foundingYearRange] as [number | null, number | null];
    newRange[index] = numValue;
    onFilterChange({ ...filters, foundingYearRange: newRange });
  };

  const activeFiltersCount =
    (filters.foundingYearRange[0] || filters.foundingYearRange[1] ? 1 : 0) +
    (filters.contentVolume ? 1 : 0) +
    filters.roles.length;

  const handleClearFilters = () => {
    onFilterChange({ foundingYearRange: [null, null], contentVolume: '', roles: [] });
  };

  const isVisible = isPinned || isHovered;
  const transitionClass = transitionsEnabled ? 'transition-all duration-300' : 'transition-none';

  return (
    <div
      className={`relative ${transitionClass} z-20 ${isPinned ? 'w-80' : 'w-12'} hidden lg:block`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute top-0 right-0 h-full ${transitionClass} bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 overflow-hidden flex flex-col ${
          isVisible
            ? 'w-80 opacity-100 shadow-2xl'
            : 'w-12 opacity-80 cursor-pointer hover:bg-zinc-900'
        }`}
      >
        {!isVisible ? (
          <div className="flex flex-col items-center py-6 gap-6 h-full text-white/50 hover:text-white/90">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">
              <Filter className="w-4 h-4" />
            </div>
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full absolute top-3 right-1">
                {activeFiltersCount}
              </span>
            )}
            <div
              className="flex flex-col items-center gap-2 mt-4 opacity-50"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              <span className="tracking-widest uppercase text-xs font-semibold">
                {tSidebar('title')}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-5 h-full overflow-y-auto w-80">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                  <Filter className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold gradient-text">{tSidebar('title')}</h2>
                {activeFiltersCount > 0 && (
                  <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 text-sm text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    isPinned
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Founding Year Range Filter */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                {tSidebar('foundingYearRange')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={tSidebar('minYear')}
                  value={filters.foundingYearRange[0] || ''}
                  onChange={(e) => handleYearChange(0, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder={tSidebar('maxYear')}
                  value={filters.foundingYearRange[1] || ''}
                  onChange={(e) => handleYearChange(1, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Content Volume Filter */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                {tSidebar('contentVolume')}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '', label: tSidebar('all') },
                  { id: '1-10', label: t('filters.volumes.1-10') },
                  { id: '11-50', label: t('filters.volumes.11-50') },
                  { id: '50+', label: t('filters.volumes.50+') },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onFilterChange({ ...filters, contentVolume: opt.id })}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      filters.contentVolume === opt.id
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Filter (Multi-select) */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                {tSidebar('roles')}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '1', label: t('filters.roleLabels.1') },
                  { id: '2', label: t('filters.roleLabels.2') },
                ].map((opt) => {
                  const isSelected = filters.roles.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleRoleToggle(opt.id)}
                      className={`px-4 py-2 rounded-full text-sm transition-all border ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-500 font-medium'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
