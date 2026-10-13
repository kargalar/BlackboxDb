import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Explore');
  return createRouteMetadata(t('Person.title'), t('description'), '/explore/person/');
}

export default function ExplorePersonLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
