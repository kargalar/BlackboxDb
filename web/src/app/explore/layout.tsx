import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Explore');
  return createRouteMetadata(t('mainTitle'), t('description'), '/explore/');
}

export default function ExploreLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
