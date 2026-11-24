'use client';

import { Pagination as SharedPagination } from '@/components/molecules/Pagination';
import { updateExploreUrl } from '../../exploreUrl';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    if (page === 1) params.delete('page');
    else params.set('page', page.toString());
    updateExploreUrl(params);
  };

  return (
    <SharedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
  );
}
