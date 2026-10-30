'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { History, ListPlus, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginRequired } from '@/components/atoms/LoginRequiredDialog';
import ActionButton from './ActionButton';
import Stars from './Stars';
import LogHistoryModal from './LogHistoryModal';
import AddLogDialog from './AddLogDialog';
import RecommendDialog from './RecommendDialog';
import AdminActions from './AdminActions';
import AddToListModal from './AddToListModal';
import { emitDebugEvent } from '@/lib/debug-events';
import { useTranslations } from 'next-intl';

import { useUserContentActions } from '../hooks/useUserContentActions';
import PlaytimeControl from './actions/PlaytimeControl';
import ReadingFormatControl from './actions/ReadingFormatControl';
import QuickTagsEditor from './actions/QuickTagsEditor';

interface UserContentActionsProps {
  isFavorite: boolean;
  setIsFavorite: (v: boolean) => void;
  isConsumed: boolean;
  setIsConsumed: (v: boolean) => void;
  isLater: boolean;
  setIsLater: (v: boolean) => void;
  isReleaseNotificationEnabled: boolean;
  setIsReleaseNotificationEnabled: (v: boolean) => void;
  showReleaseNotificationButton: boolean;
  isContinuing: boolean;
  setIsContinuing: (v: boolean) => void;
  isAbandoned: boolean;
  setIsAbandoned: (v: boolean) => void;
  userRating: number | null;
  setUserRating: (v: number | null) => void;
  userRatingDetails?: Record<string, number> | null;
  setUserRatingDetails?: (v: Record<string, number> | null) => void;
  userTags?: string[];
  userTaggedUsers?: any[];
  playtimeMinutes: number;
  bookFormat?: string | null;
  setBookFormat?: (format: string | null) => void;
  defaultBookPublicationId?: number | null;
  setStats: React.Dispatch<React.SetStateAction<any>>;
  actionErrors: Record<string, string>;
  setActionErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearError: (k: string) => void;
  id: string;
  type: string;
  contentTypeId: number;
  additionalRatingCategories?: string[];
  toggleFavorite: (id: string) => Promise<void>;
  refreshStats: () => Promise<void>;
  logMovieWatch: (id: string) => Promise<void>;
  unlogMovieWatch: (id: string) => Promise<void>;
  logBookRead: (id: string) => Promise<void>;
  unlogBookRead: (id: string) => Promise<void>;
  refreshUserLog: () => Promise<void>;
  refreshEpisodes?: () => Promise<void>;
  updateUserContentLog: (id: string, data: any) => Promise<{ data: boolean; error?: any }>;
  rateMovie: (id: string, rating: number | null) => Promise<void>;
  toggleContinuing: (id: string) => Promise<{ isContinuing: boolean; error?: any }>;
  toggleAbandoned: (id: string) => Promise<{ isAbandoned: boolean; error?: any }>;
  supportedPlatforms?: Array<{ id: number; name: string }>;
}

const UserContentActions: React.FC<UserContentActionsProps> = ({
  isFavorite,
  setIsFavorite,
  isConsumed,
  setIsConsumed,
  isLater,
  setIsLater,
  isReleaseNotificationEnabled,
  setIsReleaseNotificationEnabled,
  showReleaseNotificationButton,
  isContinuing,
  setIsContinuing,
  isAbandoned,
  setIsAbandoned,
  userRating,
  setUserRating,
  userRatingDetails,
  setUserRatingDetails,
  userTags,
  userTaggedUsers,
  playtimeMinutes,
  bookFormat,
  setBookFormat,
  defaultBookPublicationId,
  setStats,
  actionErrors,
  setActionErrors,
  clearError,
  id,
  type,
  contentTypeId,
  additionalRatingCategories = [],
  toggleFavorite,
  refreshStats,
  logMovieWatch,
  unlogMovieWatch,
  logBookRead,
  unlogBookRead,
  refreshUserLog,
  refreshEpisodes,
  updateUserContentLog,
  rateMovie,
  toggleContinuing,
  toggleAbandoned,
  supportedPlatforms = [],
}) => {
  const { isPrivileged, user } = useAuth();
  const { showLoginDialog } = useLoginRequired();
  const t = useTranslations('UserContentActions');

  const requireAuth = (action: string) => {
    showLoginDialog(
      t('loginRequired', { action }),
      typeof window !== 'undefined' ? window.location.pathname : undefined
    );
  };

  const [showLogModal, setShowLogModal] = useState(false);
  const [showAddLogDialog, setShowAddLogDialog] = useState(false);
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showRecommendDialog, setShowRecommendDialog] = useState(false);
  const [isInAnyList, setIsInAnyList] = useState(false);

  const {
    localPlaytime,
    setLocalPlaytime,
    handlePlaytimeChange,
    handleConsumeToggle,
    handleFavoriteToggle,
    handleLaterToggle,
    handleContinuingToggle,
    handleAbandonedToggle,
    handleRatingChange,
  } = useUserContentActions({
    id,
    type,
    user,
    t,
    requireAuth,
    isConsumed,
    setIsConsumed,
    isFavorite,
    setIsFavorite,
    isLater,
    setIsLater,
    isContinuing,
    setIsContinuing,
    isAbandoned,
    setIsAbandoned,
    userRating,
    setUserRating,
    userRatingDetails,
    setUserRatingDetails,
    playtimeMinutes,
    bookFormat,
    defaultBookPublicationId,
    setStats,
    setActionErrors,
    clearError,
    updateUserContentLog,
    refreshStats,
    refreshUserLog,
    rateMovie,
  });

  const releaseNotificationLabel = t('buttons.notifyRelease');
  const userId = user?.id;

  React.useEffect(() => {
    let isMounted = true;
    const checkLists = async () => {
      if (!userId || !id) return;
      try {
        const { getMyLists } = await import('@/services/graphql/list');
        const { data } = await getMyLists();
        if (!isMounted) return;
        const filteredLists = (data || []).filter((l: any) => l.contentTypeId === contentTypeId);
        const inList = filteredLists.some((list: any) =>
          list.items?.some((item: any) => item.contentId === id)
        );
        setIsInAnyList(inList);
      } catch (e) {
        console.error('Error checking lists:', e);
      }
    };
    checkLists();

    const handleListUpdate = () => checkLists();
    window.addEventListener('refetchLists', handleListUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('refetchLists', handleListUpdate);
    };
  }, [userId, id, contentTypeId]);

  const handleAddNewLog = async (logData: any) => {
    console.log('🧪[UserContentActions] Yeni log ekleniyor', { id, logData });
    const { createUserContentLog } = await import('@/services/userContentService');
    const selectedDate = logData.date;
    const now = new Date();
    const dateWithTime = new Date(selectedDate);
    dateWithTime.setHours(
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );

    await createUserContentLog(id, {
      ...logData,
      date: dateWithTime.toISOString(),
    });

    if (logData.is_favorite !== undefined) setIsFavorite(logData.is_favorite);
    if (logData.is_consumed !== undefined) setIsConsumed(logData.is_consumed);
    if (logData.is_consume_later !== undefined) setIsLater(logData.is_consume_later);
    if (logData.is_continuing !== undefined) {
      setIsContinuing(logData.is_continuing);
      if (logData.is_continuing) {
        setIsAbandoned(false);
        setIsConsumed(false);
      }
    }
    if (logData.is_abandoned !== undefined) {
      setIsAbandoned(logData.is_abandoned);
      if (logData.is_abandoned) {
        setIsContinuing(false);
        setIsConsumed(false);
      }
    }
    if (logData.rating !== undefined && logData.rating > 0) setUserRating(logData.rating);

    if (
      logData.is_consumed ||
      logData.is_favorite ||
      logData.is_continuing ||
      logData.is_abandoned
    ) {
      setIsLater(false);
    }

    await refreshStats();
    window.dispatchEvent(new Event('refetchComments'));
    console.log('✅[UserContentActions] Log eklendi ve UI güncellendi');
  };

  return (
    <aside className="w-full flex flex-col gap-5">
      {isPrivileged && <AdminActions id={id} type={type} />}

      <div className="glass-card p-5">
        {type === 'game' && playtimeMinutes > 0 && (
          <div className="mb-5 flex justify-end">
            <div
              className="text-xs font-semibold bg-neutral-900 text-neutral-400 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-neutral-800"
              title={t('labels.totalPlaytime')}
            >
              <span className="text-sm leading-none opacity-80">🎮</span>
              {Math.floor(playtimeMinutes / 60) > 0 ? `${Math.floor(playtimeMinutes / 60)}s ` : ''}
              {playtimeMinutes % 60}dk
            </div>
          </div>
        )}
        <div className="space-y-6">
          <div>
            <div className="grid grid-cols-3 justify-items-center gap-2">
              <ActionButton
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                }
                label={
                  type === 'book'
                    ? t('buttons.read')
                    : type === 'game'
                      ? t('buttons.played')
                      : t('buttons.watched')
                }
                active={isConsumed}
                tone="consumed"
                onClick={handleConsumeToggle}
              />
              <ActionButton
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                }
                label={t('buttons.favorite')}
                active={isFavorite}
                tone="favorite"
                onClick={handleFavoriteToggle}
              />
              <ActionButton
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                label={t('buttons.watchLater')}
                active={isLater}
                tone="later"
                onClick={handleLaterToggle}
              />
              {type !== 'movie' && type !== 'music' && (
                <div className="col-span-3 grid grid-cols-2 gap-2">
                  <ActionButton
                    icon={
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                    label={t('buttons.continuing')}
                    active={isContinuing}
                    tone="continuing"
                    onClick={handleContinuingToggle}
                  />
                  <ActionButton
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                    }
                    label={t('buttons.abandoned')}
                    active={isAbandoned}
                    tone="abandoned"
                    onClick={handleAbandonedToggle}
                  />
                </div>
              )}
            </div>
            {showReleaseNotificationButton && (
              <button
                onClick={() => {
                  if (!user) {
                    requireAuth(t('actions.notification'));
                    return;
                  }

                  const newState = !isReleaseNotificationEnabled;
                  setIsReleaseNotificationEnabled(newState);

                  updateUserContentLog(id, { notify_on_release: newState }).catch((e) => {
                    console.error('❌ Release notification toggle hata', e);
                    setIsReleaseNotificationEnabled(!newState);
                    setActionErrors((p) => ({
                      ...p,
                      releaseNotification: t('errors.notification'),
                    }));
                    clearError('releaseNotification');
                  });
                }}
                className={`mt-4 w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                  isReleaseNotificationEnabled
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                    : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      isReleaseNotificationEnabled
                        ? 'bg-amber-400/15 text-amber-300'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M14.857 17.082a23.848 23.848 0 0 1 5.454 1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.142 23.848 23.848 0 0 1 5.454-1.31m5.715 0a24.255 24.255 0 0 0-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{releaseNotificationLabel}</div>
                    <div className="text-xs text-neutral-400">{t('buttons.sendNotification')}</div>
                  </div>
                </div>
              </button>
            )}
          </div>

          {type === 'book' && (isConsumed || isContinuing || isAbandoned) && (
            <ReadingFormatControl
              t={t}
              user={user}
              requireAuth={requireAuth}
              id={id}
              bookFormat={bookFormat}
              setBookFormat={setBookFormat}
              defaultBookPublicationId={defaultBookPublicationId}
              updateUserContentLog={updateUserContentLog}
              setActionErrors={setActionErrors}
              clearError={clearError}
            />
          )}

          {type === 'game' && (isConsumed || isContinuing || isAbandoned) && (
            <PlaytimeControl
              t={t}
              localPlaytime={localPlaytime}
              playtimeMinutes={playtimeMinutes}
              setLocalPlaytime={setLocalPlaytime}
              handlePlaytimeChange={handlePlaytimeChange}
            />
          )}

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {t('titles.yourRating')}
            </h4>
            <div className="bg-neutral-900/50 rounded-2xl p-4 border border-neutral-800 flex items-center w-full">
              <Stars size="md" value={userRating} onChange={handleRatingChange} />
            </div>

            {user && (
              <QuickTagsEditor
                userTags={userTags ?? []}
                userTaggedUsers={userTaggedUsers ?? []}
                onSave={async (tags, taggedUserIds) => {
                  await updateUserContentLog(id, { tags, taggedUserIds });
                }}
              />
            )}

            {((userTags && userTags.length > 0) ||
              (userTaggedUsers && userTaggedUsers.length > 0)) && (
              <div className="mt-3 flex flex-col gap-2">
                {userTags && userTags.filter((t) => !t.startsWith('with:')).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {userTags
                      .filter((t) => !t.startsWith('with:'))
                      .map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="bg-purple-900/30 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}

                {((userTags && userTags.some((t) => t.startsWith('with:'))) ||
                  (userTaggedUsers && userTaggedUsers.length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">{t('labels.with')}</span>

                    {userTags &&
                      userTags
                        .filter((t) => t.startsWith('with:'))
                        .map((tag: string, index: number) => (
                          <div
                            key={`custom-${index}`}
                            className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 px-2 py-1 rounded-full text-xs text-gray-300"
                          >
                            <div className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-[8px] font-bold">
                              #
                            </div>
                            <span>{tag.substring(5)}</span>
                          </div>
                        ))}

                    {userTaggedUsers &&
                      userTaggedUsers
                        .filter((user: any) => typeof user === 'object' && user.id && user.username)
                        .map((user: any) => (
                          <div
                            key={user.id}
                            className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 px-2 py-1 rounded-full text-xs text-gray-300"
                          >
                            {user.picturePath ? (
                              <Image
                                src={user.picturePath}
                                alt={user.username}
                                width={16}
                                height={16}
                                unoptimized
                                className="h-4 w-4 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-neutral-700 flex items-center justify-center text-[8px] font-bold">
                                {user.username?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{user.username}</span>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <button
              onClick={() => {
                if (!user) {
                  requireAuth(t('actions.log'));
                  return;
                }
                console.log('🧪[UserContentActions] Yeni log dialog açılıyor');
                setShowAddLogDialog(true);
              }}
              className="w-full bg-neutral-100 hover:bg-white text-neutral-950 rounded-2xl px-4 py-3.5 transition-all duration-200 flex items-center justify-center gap-2.5 font-semibold text-sm shadow-lg shadow-neutral-100/10 hover:shadow-neutral-100/20 hover:-translate-y-0.5"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {t('buttons.addNewLog')}
            </button>
          </div>
          <div className="mt-2 flex items-start justify-center gap-2 border-t border-neutral-800 pt-4">
            {user && (
              <div className="flex w-[78px] flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label={t('buttons.recommend')}
                  title={t('buttons.recommend')}
                  aria-haspopup="dialog"
                  onClick={() => {
                    emitDebugEvent({
                      level: 'info',
                      scope: 'Recommend',
                      message: 'Öner dialog açıldı',
                      data: { contentId: id },
                    });
                    setShowRecommendDialog(true);
                  }}
                  className="content-action-shortcut flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors"
                >
                  <Send size={20} aria-hidden="true" />
                </button>
                <span className="text-center text-[10px] leading-tight text-neutral-400">
                  {t('buttons.recommend')}
                </span>
              </div>
            )}
            <div className="flex w-[78px] flex-col items-center gap-1">
              <button
                type="button"
                aria-label={t('buttons.addToList')}
                title={t('buttons.addToList')}
                aria-haspopup="dialog"
                data-active={isInAnyList}
                onClick={() => {
                  if (!user) {
                    requireAuth(t('actions.list'));
                    return;
                  }
                  setShowAddToListModal(true);
                }}
                className="content-action-shortcut flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors"
              >
                <ListPlus size={20} aria-hidden="true" />
              </button>
              <span className="text-center text-[10px] leading-tight text-neutral-400">
                {t('buttons.addToList')}
              </span>
            </div>
            <div className="flex w-[78px] flex-col items-center gap-1">
              <button
                type="button"
                aria-label={t('buttons.viewLogHistory')}
                title={t('buttons.viewLogHistory')}
                onClick={() => setShowLogModal(true)}
                className="content-action-shortcut flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors"
              >
                <History size={20} aria-hidden="true" />
              </button>
              <span className="text-center text-[10px] leading-tight text-neutral-400">
                {t('buttons.viewLogHistory')}
              </span>
            </div>
          </div>
          {Object.keys(actionErrors).length > 0 && (
            <div className="space-y-2">
              {Object.entries(actionErrors).map(([k, msg]) => (
                <div
                  key={k}
                  className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded text-xs"
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LogHistoryModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        contentId={id}
        contentType={type}
        additionalRatingCategories={additionalRatingCategories}
        supportedPlatforms={supportedPlatforms}
        onLogUpdate={async () => {
          console.log('🧪[UserContentActions] Log güncellendi, parent state refresh');
          await refreshUserLog();
          await refreshStats();
          if (refreshEpisodes) await refreshEpisodes();
        }}
      />

      <AddLogDialog
        isOpen={showAddLogDialog}
        onClose={() => setShowAddLogDialog(false)}
        onSave={handleAddNewLog}
        onGlobalUpdate={async () => {
          await refreshUserLog();
          await refreshStats();
          if (refreshEpisodes) await refreshEpisodes();
        }}
        contentType={type}
        additionalRatingCategories={additionalRatingCategories}
        contentId={id}
        supportedPlatforms={supportedPlatforms}
      />

      {user && (
        <RecommendDialog
          isOpen={showRecommendDialog}
          onClose={() => setShowRecommendDialog(false)}
          contentId={id}
          contentTitle={undefined}
          currentUsername={user.username}
        />
      )}

      <AddToListModal
        isOpen={showAddToListModal}
        onClose={() => setShowAddToListModal(false)}
        contentId={id}
        contentType={type}
        contentTypeId={contentTypeId}
      />
    </aside>
  );
};

export default UserContentActions;
