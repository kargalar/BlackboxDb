'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import React, { useMemo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Called when user clicks a page. Receives the target page number. */
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Shared pagination component with first/last, prev/next, and ±2 page buttons.
 * Styled consistently across all pages.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = 'mt-6',
}: PaginationProps) {
  const translateUi = useUiTranslations('Ui');
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5; // current + 2 before + 2 after

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  const handleClick = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* First page */}
      <button
        onClick={() => handleClick(1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label={translateUi("ilk_sayfa_8d7a093")}
      >
        «
      </button>

      {/* Previous page */}
      <button
        onClick={() => handleClick(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label={translateUi("onceki_sayfa_739180f")}
      >
        {translateUi("onceki_5f9fd62")}
      </button>

      {/* Page numbers */}
      {pageNumbers.map((pageNum) => (
        <button
          key={pageNum}
          onClick={() => handleClick(pageNum)}
          aria-current={currentPage === pageNum ? 'page' : undefined}
          className={`w-9 h-9 text-sm rounded-lg transition-colors ${
            currentPage === pageNum
              ? 'bg-violet-600 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          {pageNum}
        </button>
      ))}

      {/* Next page */}
      <button
        onClick={() => handleClick(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label={translateUi("sonraki_sayfa_d82b57e")}
      >
        {translateUi("sonraki_59807ab")}
      </button>

      {/* Last page */}
      <button
        onClick={() => handleClick(totalPages)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label={translateUi("son_sayfa_eb7d6ee")}
      >
        »
      </button>
    </div>
  );
}
