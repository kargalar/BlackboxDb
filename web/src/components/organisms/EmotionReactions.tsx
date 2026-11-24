'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginRequired } from '@/components/atoms/LoginRequiredDialog';
import { useTranslations } from 'next-intl';
import { CONTENT_EMOTIONS, type ContentEmotion } from '@/services/graphql/emotions';
import {
  getContentEmotionSummary,
  setContentEmotion,
  type EmotionSummary,
} from '@/services/emotionService';

interface EmotionReactionsProps {
  contentId: string;
}

export default function EmotionReactions({ contentId }: EmotionReactionsProps) {
  const { user } = useAuth();
  const { showLoginDialog } = useLoginRequired();
  const t = useTranslations('EmotionReactions');
  const [summary, setSummary] = useState<EmotionSummary>({ myEmotion: null, counts: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getContentEmotionSummary(contentId)
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((error) => console.error('Could not load emotion reactions', error));
    return () => {
      active = false;
    };
  }, [contentId]);

  const handleEmotion = useCallback(
    async (emotion: ContentEmotion) => {
      if (!user) {
        showLoginDialog(t('loginRequired'), window.location.pathname);
        return;
      }
      setSaving(true);
      try {
        const updated = await setContentEmotion(
          contentId,
          summary.myEmotion === emotion ? null : emotion
        );
        setSummary(updated);
      } catch (error) {
        console.error('Could not save emotion reaction', error);
      } finally {
        setSaving(false);
      }
    },
    [contentId, showLoginDialog, summary.myEmotion, t, user]
  );

  return (
    <section
      className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-3 py-2.5"
      aria-label={t('title')}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-300">
          {t('title')}
        </h4>
        <p className="text-[11px] text-gray-500">{t('description')}</p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {CONTENT_EMOTIONS.map(({ id, emoji }) => {
          const count = summary.counts.find((item) => item.emotion === id)?.count ?? 0;
          const selected = summary.myEmotion === id;
          const label = t(`emotions.${id}`);
          return (
            <button
              key={id}
              type="button"
              disabled={saving}
              aria-pressed={selected}
              aria-label={`${t('reactionAria', { label, count })}${selected ? t('selectedSuffix') : ''}`}
              onClick={() => void handleEmotion(id)}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 transition-colors disabled:opacity-50 sm:flex-row sm:gap-1.5 sm:px-2.5 sm:py-1.5 ${
                selected
                  ? 'border-violet-400/60 bg-violet-500/15 text-white'
                  : 'border-neutral-800 bg-neutral-950/50 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800'
              }`}
              title={t(`descriptions.${id}`)}
            >
              <span className="shrink-0 text-base leading-none" aria-hidden="true">
                {emoji}
              </span>
              <span className="max-w-full truncate text-[10px] font-medium leading-tight sm:flex-1 sm:text-left sm:text-[11px]">
                {label}
              </span>
              <span
                className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium tabular-nums leading-none ${
                  selected
                    ? 'bg-violet-500/25 text-violet-200'
                    : 'bg-white/5 text-neutral-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
