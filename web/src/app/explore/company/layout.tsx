import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Explore');
  return createRouteMetadata(t('Company.title'), t('description'), '/explore/company/');
}

export default function ExploreCompanyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
