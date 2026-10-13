import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site-url';

export function createRouteMetadata(title: string, description: string, path: string): Metadata {
  const canonical = new URL(path, SITE_URL).toString();
  const brandedTitle = `${title} | Blackbox`;

  return {
    title: { absolute: brandedTitle },
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title: brandedTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description,
    },
  };
}
