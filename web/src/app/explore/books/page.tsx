"use client";

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import BookCard from '@/components/BookCard';
import ExploreLayout from '@/components/layouts/ExploreLayout'
import { booksSearch, type GoogleBook } from '@/services/api/books';

function BooksExploreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [books, setBooks] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchQuery = useMemo(() => (searchParams.get('search') || '').trim(), [searchParams]);
  const query = searchQuery || 'harry potter';

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await booksSearch(query, 24);
        if (!cancelled) setBooks(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Books hata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [query]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get('search') || '').trim();
    router.push((`/explore/books${next ? `?search=${encodeURIComponent(next)}` : ''}`) as Route);
  };

  return (
    <ExploreLayout title="Kitapları Keşfet" subtitle="Google Books üzerinden popüler ve aradığınız kitapları bulun">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          name="search"
          defaultValue={searchQuery}
          placeholder="Kitap ara..."
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500/20"
        />
        <button className="rounded-lg bg-gray-700 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors">
          Ara
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))
          : books.map((b) => <BookCard key={b.id} book={b} size="large" />)}
      </div>
    </ExploreLayout>
  );
}

export default function BooksExplorePage() {
  return (
    <Suspense fallback={<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}> 
      <BooksExploreInner />
    </Suspense>
  );
}
