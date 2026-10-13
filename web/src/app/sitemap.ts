import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    changeFrequency: 'daily' | 'weekly';
    priority: number;
  }> = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/explore/', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/explore/movie/', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/explore/tv/', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/explore/game/', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/explore/book/', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/explore/person/', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/explore/company/', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/quiz/', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/quiz/leaderboard/', changeFrequency: 'daily', priority: 0.6 },
    { path: '/leaderboard/', changeFrequency: 'daily', priority: 0.6 },
    { path: '/movie-finder/', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/concerts/', changeFrequency: 'weekly', priority: 0.5 },
    { path: '/discussions/', changeFrequency: 'daily', priority: 0.6 },
  ];

  return routes.map(({ path, ...metadata }) => ({
    url: new URL(path, SITE_URL).toString(),
    ...metadata,
  }));
}
