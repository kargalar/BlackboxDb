import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LandingPageClient from './LandingPageClient';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Landing');
  const title = `${t('hero.titlePart1')} — ${t('hero.titlePart2')}`;
  return createRouteMetadata(title, t('hero.subtitle'), '/');
}

export default function HomePage() {
  return <LandingPageClient />;
}
