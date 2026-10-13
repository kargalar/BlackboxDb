'use client';

import { MediaEventList } from '@/app/content/components/MediaEventList';
import { useTranslations } from 'next-intl';

export default function ConcertsPage() {
  const t = useTranslations('ConcertsPage');

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="mb-2 text-sm uppercase tracking-widest text-pink-300">{t('eyebrow')}</p>
        <h1 className="mb-3 text-4xl font-bold">{t('title')}</h1>
        <p className="mb-8 max-w-2xl text-white/60">{t('description')}</p>
        <MediaEventList eventType="CONCERT" heading={t('calendarTitle')} searchable />
      </div>
    </div>
  );
}
