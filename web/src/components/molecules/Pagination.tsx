'use client';

import React, { useMemo } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Called when user clicks a page. Receives the target page number. */
  onPageChange: (page: number) => void;
}

/**
 * Shared pagination component with first/last, prev/next, and ±2 page buttons.
 * Styled consistently across all pages.
 */
export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
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
    <div className="flex items-center justify-center gap-2 mt-6">
      {/* First page */}
      <button
        onClick={() => handleClick(1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="İlk sayfa"
      >
        «
      </button>

      {/* Previous page */}
      <button
        onClick={() => handleClick(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Önceki sayfa"
      >
        ‹ Önceki
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
        aria-label="Sonraki sayfa"
      >
        Sonraki ›
      </button>

      {/* Last page */}
      <button
        onClick={() => handleClick(totalPages)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Son sayfa"
      >
        »
      </button>
    </div>
  );
}
