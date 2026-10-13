'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { emitDebugEvent } from '@/lib/debug-events';
import { getFollowing } from '@/services/database/userService';
import { recommendContent } from '@/services/graphql/recommendations';
import { useTranslations } from 'next-intl';

type FollowingUser = {
  id: string;
  username: string;
  picturePath?: string | null;
};

type RecommendDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle?: string;
  currentUsername: string;
};

export default function RecommendDialog({ isOpen, ...props }: RecommendDialogProps) {
  if (!isOpen) return null;

  return <RecommendDialogContent key={`${props.contentId}:${props.currentUsername}`} {...props} />;
}

function RecommendDialogContent({
  onClose,
  contentId,
  contentTitle,
  currentUsername,
}: Omit<RecommendDialogProps, 'isOpen'>) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const t = useTranslations('RecommendDialog');

  useEffect(() => {
    let isCurrent = true;

    (async () => {
      try {
        const result = await getFollowing(currentUsername);
        if (!isCurrent) return;
        if (result.error) {
          console.error('❌ [RecommendDialog] getFollowing failed', result.error);
          emitDebugEvent({
            level: 'error',
            scope: 'Recommend',
            message: 'Takip edilen kullanıcılar yüklenemedi',
            data: { error: result.error },
          });
          toast.error(t('toast.loadFailed'));
          setFollowing([]);
        } else {
          const users = (result.data || []).map((u: any) => ({
            id: u.id,
            username: u.username,
            picturePath: u.picturePath ?? null,
          }));
          setFollowing(users);
          emitDebugEvent({
            level: 'info',
            scope: 'Recommend',
            message: 'Takip edilen kullanıcılar yüklendi',
            data: { count: users.length },
          });
        }
      } catch (error) {
        if (!isCurrent) return;
        console.error('[RecommendDialog] Failed to load followed users', error);
        emitDebugEvent({
          level: 'error',
          scope: 'Recommend',
          message: 'Failed to load followed users',
          data: { error },
        });
        toast.error(t('toast.loadFailed'));
        setFollowing([]);
      } finally {
        if (isCurrent) setLoading(false);
      }
    })();
    return () => {
      isCurrent = false;
    };
  }, [currentUsername, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return following;
    return following.filter((u) => u.username.toLowerCase().includes(q));
  }, [following, query]);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSubmit = async () => {
    const recipientUserIds = Array.from(selected);

    if (recipientUserIds.length === 0) {
      toast.error(t('toast.selectAtLeastOne'));
      return;
    }

    setSubmitting(true);

    const result = await recommendContent(contentId, recipientUserIds);

    if (result.error) {
      console.error('❌ [RecommendDialog] recommendContent failed', result.error);
      emitDebugEvent({
        level: 'error',
        scope: 'Recommend',
        message: 'Öneri gönderilemedi',
        data: { contentId, recipientUserIds, error: result.error },
      });
      toast.error(t('toast.recommendFailed'));
      setSubmitting(false);
      return;
    }

    emitDebugEvent({
      level: 'success',
      scope: 'Recommend',
      message: 'Öneri gönderildi',
      data: { contentId, count: result.count },
    });

    toast.success(t('toast.recommendSuccess', { count: result.count }));
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{t('title')}</h2>
            <p className="mt-1 text-sm text-gray-300">
              {t('desc', { title: contentTitle || '...' })}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPh')}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-gray-700">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-300">{t('empty')}</div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {filtered.map((u) => {
                const checked = selected.has(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggle(u.id)}
                      className="w-full px-3 py-2 hover:bg-gray-700/50 flex items-center gap-3"
                    >
                      <input type="checkbox" checked={checked} readOnly className="h-4 w-4" />
                      <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {u.picturePath ? (
                          <Image
                            src={u.picturePath}
                            alt={u.username}
                            width={32}
                            height={32}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {u.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-white font-medium truncate">{u.username}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-400">{t('selected', { count: selected.size })}</div>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting ? t('recommending') : t('recommend')}
          </button>
        </div>
      </div>
    </div>
  );
}
