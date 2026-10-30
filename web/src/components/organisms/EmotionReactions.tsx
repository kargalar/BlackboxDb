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
      className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4"
      aria-label={t('title')}
    >
      <div className="mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          {t('title')}
        </h4>
        <p className="mt-1 text-xs text-gray-500">{t('description')}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
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
              aria-label={`${label}, ${count} tepki${selected ? ', seçili' : ''}`}
              onClick={() => void handleEmotion(id)}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors disabled:opacity-50 ${
                selected
                  ? 'border-violet-400/60 bg-violet-500/15 text-white'
                  : 'border-neutral-800 bg-neutral-950/50 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800'
              }`}
              title={t(`descriptions.${id}`)}
            >
              <span className="text-xl" aria-hidden="true">
                {emoji}
              </span>
              <span className="text-[10px]">
                {label} · {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
