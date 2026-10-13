'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useTranslations } from 'next-intl';
import {
  CalendarDays,
  Clock3,
  Gamepad2,
  Heart,
  Bookmark,
  MessageSquareText,
  Pencil,
  Trash2,
  Trophy,
  BookOpen,
} from 'lucide-react';
import { getContentLogHistory, UserContentLog } from '@/services/graphql/content';
import { deleteContentWatch } from '@/services/userContentService';
import AddLogDialog from './AddLogDialog';
import Stars from './Stars';

const EMPTY_SUPPORTED_PLATFORMS: Array<{ id: number; name: string }> = [];

interface LogHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: string;
  additionalRatingCategories?: string[];
  supportedPlatforms?: Array<{ id: number; name: string }>;
  onLogUpdate: () => void;
}

const LogHistoryModal: React.FC<LogHistoryModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  additionalRatingCategories = [],
  supportedPlatforms = EMPTY_SUPPORTED_PLATFORMS,
  onLogUpdate,
}) => {
  const [logs, setLogs] = useState<UserContentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [editingLog, setEditingLog] = useState<UserContentLog | null>(null);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const latestLoadRequestRef = useRef(0);
  const t = useTranslations('LogHistoryModal');

  const loadLogs = useCallback(async () => {
    const requestId = ++latestLoadRequestRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await getContentLogHistory(contentId);
      if (requestId !== latestLoadRequestRef.current) return;
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      if (requestId !== latestLoadRequestRef.current) return;
      console.error('Log history load failed:', error);
      setLoadError(true);
    } finally {
      if (requestId === latestLoadRequestRef.current) setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    if (!isOpen) return;
    void loadLogs();
    return () => {
      latestLoadRequestRef.current += 1;
    };
  }, [isOpen, loadLogs]);

  const handleEditLog = (log: UserContentLog) => {
    setEditingLog({ ...log });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (formData: any) => {
    if (!editingLog) return;

    if (formData.is_consumed === false) {
      window.dispatchEvent(new Event('clearOptimisticConsumed'));
    }

    const statusChanged =
      editingLog.isConsumed !== formData.is_consumed ||
      editingLog.isContinuing !== formData.is_continuing ||
      editingLog.isAbandoned !== formData.is_abandoned ||
      editingLog.isConsumeLater !== formData.is_consume_later ||
      editingLog.isFavorite !== formData.is_favorite;

    try {
      const { updateUserContentLog } = await import('@/services/userContentService');

      const { data, error } = await updateUserContentLog(contentId, {
        rating: formData.rating === null ? null : (formData.rating ?? undefined),
        is_favorite: formData.is_favorite,
        is_consume_later: formData.is_consume_later ?? undefined,
        is_consumed: formData.is_consumed ?? undefined,
        is_continuing: formData.is_continuing ?? undefined,
        is_abandoned: formData.is_abandoned ?? undefined,
        date: statusChanged
          ? formData.date
            ? new Date(formData.date).toISOString()
            : undefined
          : editingLog.date
            ? new Date(editingLog.date).toISOString()
            : undefined,
        playtime_minutes: formData.playtime_minutes ?? undefined,
        platformId: formData.platformId === null ? null : (formData.platformId ?? undefined),
        bookFormat: formData.bookFormat === null ? null : (formData.bookFormat ?? undefined),
        review: formData.review !== (editingLog.review || '') ? formData.review : undefined,
        ratingDetails: formData.ratingDetails !== undefined ? formData.ratingDetails : undefined,
        tags: formData.tags ?? undefined,
        taggedUserIds: formData.taggedUserIds ?? undefined,
      });

      if (error || !data) {
        console.error('Log güncelleme hatası:', error);
        toast.error(t('errors.updateFailed', { error: error?.message || 'Unknown error' }));
        return;
      }

      await loadLogs();
      onLogUpdate();
      setIsEditDialogOpen(false);
      setEditingLog(null);
      toast.success(t('success.updated'));
    } catch (error: any) {
      console.error('Beklenmeyen güncelleme hatası:', error?.message);
      toast.error(t('errors.updateFailed', { error: error?.message || 'Unknown error' }));
    }
  };

  const confirmDeleteLog = async () => {
    if (!logToDelete) return;

    window.dispatchEvent(new Event('clearOptimisticConsumed'));

    try {
      const { success, error } = await deleteContentWatch(Number(logToDelete));

      if (!success || error) {
        console.error('Log silme hatası:', error);
        toast.error(t('errors.deleteFailed'));
      } else {
        await loadLogs();
        onLogUpdate();
        toast.success(t('success.deleted'));
      }
    } catch (error) {
      console.error('Beklenmeyen silme hatası:', error);
      toast.error(t('errors.deleteFailed'));
    } finally {
      setLogToDelete(null);
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPlaytime = (minutes: number) => {
    if (minutes >= 60) {
      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const totalPlaytime = React.useMemo(
    () => logs.reduce((sum, log) => sum + (log.playtimeMinutes || 0), 0),
    [logs]
  );

  const platformMap = React.useMemo(
    () => new Map(supportedPlatforms.map((platform) => [platform.id, platform.name])),
    [supportedPlatforms]
  );
  const bookFormatLabels: Record<string, string> = {
    physical: 'Physical Book',
    ebook: 'E-book',
    audiobook: 'Audiobook',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
        <div className="border-b border-neutral-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">{t('title')}</h2>
              {contentType === 'game' && totalPlaytime > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-200">
                  <Clock3 className="h-4 w-4 text-emerald-300" />
                  {t('totalPlaytime', { time: formatPlaytime(totalPlaytime) })}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 transition-colors hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto p-6">
          {loading ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <p className="text-neutral-400">{t('loading')}</p>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center" role="alert">
              <p className="text-red-300">{t('errors.loadFailed')}</p>
              <button
                type="button"
                onClick={() => void loadLogs()}
                className="mt-3 rounded-lg bg-neutral-700 px-4 py-2 text-sm text-white hover:bg-neutral-600"
              >
                {t('actions.retry')}
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-neutral-400">{t('empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-2xl border border-neutral-700/70 bg-neutral-900 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
                        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950/70 px-3 py-1.5 text-neutral-300">
                          <CalendarDays className="h-4 w-4 text-neutral-500" />
                          {formatDate(log.date)}
                        </span>
                        {log.isConsumed && (
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
                            {contentType === 'book'
                              ? t('statuses.read')
                              : contentType === 'game'
                                ? t('statuses.played')
                                : contentType === 'music'
                                  ? t('statuses.listened')
                                  : t('statuses.watched')}
                          </span>
                        )}
                        {log.isContinuing && (
                          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/20">
                            {t('statuses.continuing')}
                          </span>
                        )}
                        {log.isAbandoned && (
                          <span className="rounded-full bg-neutral-600/30 px-3 py-1 text-xs font-semibold text-neutral-200 ring-1 ring-neutral-500/30">
                            {t('statuses.abandoned')}
                          </span>
                        )}
                        {log.isFavorite && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/20">
                            <Heart className="h-3.5 w-3.5" />
                            {t('statuses.favorite')}
                          </span>
                        )}
                        {log.isConsumeLater && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20">
                            <Bookmark className="h-3.5 w-3.5" />
                            {contentType === 'book'
                              ? t('statuses.watchLaterBook')
                              : contentType === 'game'
                                ? t('statuses.watchLaterGame')
                                : t('statuses.watchLater')}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {log.rating != null && log.rating > 0 && (
                          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                            <Trophy className="h-4 w-4 text-amber-300" />
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-wide text-amber-200/80">
                                {t('rating')}
                              </span>
                              <Stars size="sm" value={log.rating} />
                            </div>
                          </div>
                        )}
                        {contentType === 'game' &&
                          log.platformId != null &&
                          platformMap.get(log.platformId) && (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                              <Gamepad2 className="h-4 w-4 text-sky-300" />
                              <span>{platformMap.get(log.platformId)}</span>
                            </div>
                          )}
                        {contentType === 'book' && log.bookFormat && (
                          <div className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-sm text-violet-100">
                            <BookOpen className="h-4 w-4 text-violet-300" />
                            <span>{bookFormatLabels[log.bookFormat] || log.bookFormat}</span>
                          </div>
                        )}
                        {contentType === 'game' &&
                          !!log.playtimeMinutes &&
                          log.playtimeMinutes > 0 && (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                              <Clock3 className="h-4 w-4 text-emerald-300" />
                              <span>{formatPlaytime(log.playtimeMinutes)}</span>
                            </div>
                          )}
                      </div>

                      {log.review && log.review.trim().length > 0 && (
                        <div className="rounded-xl border border-neutral-700/80 bg-black/20 p-4">
                          <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-neutral-300">
                            <MessageSquareText className="h-4 w-4 text-neutral-500" />
                            {t('review')}
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-200">
                            {log.review}
                          </p>
                        </div>
                      )}

                      {log.tags &&
                        log.tags.filter((t: string) => !t.startsWith('with:')).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {log.tags
                              .filter((t: string) => !t.startsWith('with:'))
                              .map((tag: string, index: number) => (
                                <span
                                  key={index}
                                  className="rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-xs text-neutral-300"
                                >
                                  #{tag}
                                </span>
                              ))}
                          </div>
                        )}

                      {((log.tags && log.tags.some((t: string) => t.startsWith('with:'))) ||
                        (log.taggedUsers && log.taggedUsers.length > 0)) && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                            {t('with')}
                          </span>
                          {log.tags &&
                            log.tags
                              .filter((t: string) => t.startsWith('with:'))
                              .map((tag: string, index: number) => (
                                <div
                                  key={`custom-${index}`}
                                  className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-xs text-neutral-300"
                                >
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-bold text-neutral-200">
                                    #
                                  </div>
                                  <span>{tag.substring(5)}</span>
                                </div>
                              ))}
                          {log.taggedUsers &&
                            log.taggedUsers.map((user: any) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-1 text-xs text-neutral-300"
                              >
                                {user.picturePath ? (
                                  <Image
                                    src={user.picturePath}
                                    alt={user.username}
                                    width={20}
                                    height={20}
                                    unoptimized
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-bold text-neutral-200">
                                    {user.username?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span>@{user.username}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2 self-start">
                      <button
                        onClick={() => handleEditLog(log)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20"
                        title={t('actions.edit')}
                      >
                        <Pencil className="h-4 w-4" />
                        {t('actions.edit')}
                      </button>
                      <button
                        onClick={() => setLogToDelete(log.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
                        title={t('actions.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('actions.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {logToDelete && (
            <div className="absolute inset-0 z-50 flex items-center justify-center rounded-b-2xl bg-black/70 p-4">
              <div className="w-full max-w-sm rounded-xl border border-neutral-700 bg-neutral-800 p-6 shadow-2xl">
                <h3 className="mb-2 text-lg font-bold text-white">
                  {t('actions.confirmDeleteTitle')}
                </h3>
                <p className="mb-6 text-sm text-neutral-300">{t('actions.confirmDeleteDesc')}</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setLogToDelete(null)}
                    className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-600"
                  >
                    {t('actions.cancel')}
                  </button>
                  <button
                    onClick={confirmDeleteLog}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                  >
                    {t('actions.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingLog && (
        <AddLogDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingLog(null);
          }}
          onSave={handleSaveEdit}
          onGlobalUpdate={async () => {
            await loadLogs();
            onLogUpdate();
          }}
          contentType={contentType}
          additionalRatingCategories={additionalRatingCategories}
          contentId={contentId}
          supportedPlatforms={supportedPlatforms}
          initialData={{
            rating: editingLog.rating ?? null,
            ratingDetails: editingLog.ratingDetails || null,
            is_favorite: editingLog.isFavorite,
            is_consume_later: editingLog.isConsumeLater,
            is_consumed: editingLog.isConsumed,
            is_continuing: editingLog.isContinuing,
            is_abandoned: editingLog.isAbandoned,
            date: editingLog.date
              ? typeof editingLog.date === 'string'
                ? editingLog.date.split('T')[0]
                : (editingLog.date as Date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            playtime_minutes: editingLog.playtimeMinutes || '',
            platformId: editingLog.platformId ?? null,
            bookFormat: editingLog.bookFormat ?? null,
            review: editingLog.review || '',
            tags: editingLog.tags || [],
            taggedUsers: editingLog.taggedUsers || [],
          }}
        />
      )}
    </div>
  );
};

export default LogHistoryModal;
