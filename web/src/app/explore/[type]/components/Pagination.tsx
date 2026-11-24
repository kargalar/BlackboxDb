'use client';

import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Pagination as SharedPagination } from '@/components/molecules/Pagination';
import {
  GRID_COLUMN_OPTIONS,
  GRID_ROW_OPTIONS,
  useUserPreferences,
} from '@/hooks/useUserPreferences';
import { updateExploreUrl } from '../../exploreUrl';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const t = useTranslations('Explore.Pagination');
  const { gridColumns, gridRows, setGridLayout } = useUserPreferences();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    if (page === 1) params.delete('page');
    else params.set('page', page.toString());
    updateExploreUrl(params);
  };

  const handleGridChange = async (nextColumns: number, nextRows: number) => {
    const oldItemsPerPage = gridColumns * gridRows;
    const newItemsPerPage = nextColumns * nextRows;
    const firstItemIndex = Math.max(0, (currentPage - 1) * oldItemsPerPage);
    const nextPage = Math.floor(firstItemIndex / newItemsPerPage) + 1;

    if (nextPage !== currentPage) {
      const params = new URLSearchParams(window.location.search);
      if (nextPage <= 1) params.delete('page');
      else params.set('page', nextPage.toString());
      updateExploreUrl(params, true);
    }

    const saved = await setGridLayout({ gridColumns: nextColumns, gridRows: nextRows });
    if (!saved) {
      toast.error(t('saveError'));
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <SharedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        className="mt-0"
      />

      {totalPages > 1 && <div className="hidden sm:block h-5 w-px bg-white/10" aria-hidden="true" />}

      <div className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70">
        <label className="inline-flex items-center gap-1.5">
          <span className="text-xs text-white/55">{t('columns')}</span>
          <select
            aria-label={t('columnsLabel')}
            value={gridColumns}
            onChange={(e) => {
              void handleGridChange(Number(e.target.value), gridRows);
            }}
            className="rounded-lg border border-white/15 bg-neutral-950 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none"
          >
            {GRID_COLUMN_OPTIONS.map((col) => (
              <option key={col} value={col} className="bg-neutral-950 text-white">
                {col}
              </option>
            ))}
          </select>
        </label>

        <span className="text-white/30" aria-hidden="true">
          ×
        </span>

        <label className="inline-flex items-center gap-1.5">
          <span className="text-xs text-white/55">{t('rows')}</span>
          <select
            aria-label={t('rowsLabel')}
            value={gridRows}
            onChange={(e) => {
              void handleGridChange(gridColumns, Number(e.target.value));
            }}
            className="rounded-lg border border-white/15 bg-neutral-950 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none"
          >
            {GRID_ROW_OPTIONS.map((row) => (
              <option key={row} value={row} className="bg-neutral-950 text-white">
                {row}
              </option>
            ))}
          </select>
        </label>

        <span className="text-xs text-white/40">{t('perPage', { count: gridColumns * gridRows })}</span>
      </div>
    </div>
  );
}
