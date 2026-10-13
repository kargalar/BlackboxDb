import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ConcertsPage');
  return createRouteMetadata(t('title'), t('description'), '/concerts/');
}

export default function ConcertsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
