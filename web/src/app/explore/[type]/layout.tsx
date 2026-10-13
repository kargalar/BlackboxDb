import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

const CONTENT_TYPES = ['movie', 'tv', 'game', 'book', 'music', 'podcast', 'theater'] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

function isContentType(value: string): value is ContentType {
  return CONTENT_TYPES.includes(value as ContentType);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const t = await getTranslations('Explore');

  if (!isContentType(type)) {
    return { title: t('mainTitle'), robots: { index: false, follow: false } };
  }

  return createRouteMetadata(t(`title.${type}`), t('description'), `/explore/${type}/`);
}

export default function ExploreTypeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
