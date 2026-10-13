'use client';

import { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination as SharedPagination } from '@/components/molecules/Pagination';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  contentType: string;
}

export function Pagination({ currentPage, totalPages, contentType }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    startTransition(() => {
      router.push(`/explore/${contentType}?${params.toString()}` as any, { scroll: false });
    });
  };

  return (
    <SharedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
  );
}
