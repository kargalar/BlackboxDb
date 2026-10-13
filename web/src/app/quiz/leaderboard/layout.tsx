import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Quiz');
  return createRouteMetadata(t('leaderboard.title'), t('description'), '/quiz/leaderboard/');
}

export default function QuizLeaderboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
