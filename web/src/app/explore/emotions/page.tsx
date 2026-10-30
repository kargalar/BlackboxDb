'use client';

import { useEffect, useState } from 'react';
import type { Route } from 'next';
import ContentCard from '@/components/atoms/ContentCard';
import { CONTENT_EMOTIONS, type ContentEmotion } from '@/services/graphql/emotions';
import { getEmotionContents } from '@/services/emotionService';
import { useTranslations } from 'next-intl';

const CONTENT_TYPES = [
  'all',
  'movie',
  'tv',
  'game',
  'book',
  'music',
  'podcast',
  'theater',
  'concert',
] as const;

export default function EmotionDiscoveryPage() {
  const t = useTranslations('EmotionDiscovery');
  const [emotion, setEmotion] = useState<ContentEmotion>('scary');
  const [contentType, setContentType] = useState<(typeof CONTENT_TYPES)[number]>('all');
  const [result, setResult] = useState<{
    key: string;
    items: Awaited<ReturnType<typeof getEmotionContents>>;
  } | null>(null);
  const queryKey = `${emotion}:${contentType}`;
  const loading = result?.key !== queryKey;
  const items = loading ? [] : result.items;
  const selectedEmotion = CONTENT_EMOTIONS.find((item) => item.id === emotion)!;

  useEffect(() => {
    let active = true;
    getEmotionContents(emotion, contentType === 'all' ? undefined : contentType)
      .then((result) => {
        if (active) setResult({ key: queryKey, items: result });
      })
      .catch((error) => {
        console.error('Could not load emotion discovery results', error);
        if (active) setResult({ key: queryKey, items: [] });
      });
    return () => {
      active = false;
    };
  }, [contentType, emotion, queryKey]);

  return (
    <main className="page-shell min-h-screen">
      <header className="mb-7">
        <p className="mb-2 text-sm font-medium text-violet-300">{t('eyebrow')}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">{t('title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">{t('description')}</p>
      </header>

      <section className="mb-7 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">{t('chooseEmotion')}</h2>
        <div className="flex flex-wrap gap-2">
          {CONTENT_EMOTIONS.map(({ id, emoji }) => (
            <button
              key={id}
              type="button"
              aria-pressed={emotion === id}
              onClick={() => setEmotion(id)}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                emotion === id
                  ? 'border-violet-400/60 bg-violet-500/15 text-white'
                  : 'border-neutral-800 bg-neutral-950/50 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <span className="mr-2">{emoji}</span>
              {t(`emotions.${id}`)}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">
              <span className="mr-2">{selectedEmotion.emoji}</span>
              {t(`emotions.${emotion}`)}
            </h2>
            <p className="mt-1 text-sm text-white/50">{t('rankedBy')}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/60">
            <span>{t('contentType')}</span>
            <select
              value={contentType}
              onChange={(event) =>
                setContentType(event.target.value as (typeof CONTENT_TYPES)[number])
              }
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white"
            >
              {CONTENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <p className="py-12 text-center text-sm text-white/50">{t('loading')}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 py-14 text-center">
          <div className="mb-3 text-4xl">{selectedEmotion.emoji}</div>
          <p className="text-white/70">{t('empty')}</p>
          <p className="mt-1 text-sm text-white/40">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {items.map(({ content, reactionCount }, index) => (
            <div key={content.id} className="relative">
              <span className="absolute left-2 top-2 z-20 rounded-lg border border-white/10 bg-black/75 px-2 py-1 text-xs font-semibold text-white">
                #{index + 1} · {selectedEmotion.emoji} {reactionCount}
              </span>
              <ContentCard
                href={`/content/${content.contentType.slug}/${content.id}` as Route}
                title={content.title}
                subtitle={content.releaseDate?.slice(0, 4) ?? content.contentType.name}
                posterSrc={content.posterUrl}
                communityRating={{
                  ratingDistribution: content.ratingDistribution,
                  tmdbRating: content.tmdbRating,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
