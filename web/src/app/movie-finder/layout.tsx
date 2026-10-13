import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MovieFinder');
  return createRouteMetadata(t('title'), t('description'), '/movie-finder/');
}

export default function MovieFinderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
