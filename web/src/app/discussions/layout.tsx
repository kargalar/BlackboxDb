import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('DiscussionsPage');
  return createRouteMetadata(t('seoTitle'), t('seoDescription'), '/discussions/');
}

export default function DiscussionsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
