import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createRouteMetadata } from '@/lib/route-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Quiz');
  return createRouteMetadata(t('title'), t('description'), '/quiz/');
}

export default function QuizLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
