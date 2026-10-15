'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  FolderOpen,
  Globe2,
  List,
  ListOrdered,
  Lock,
  Trash2,
  Users,
} from 'lucide-react';
import { PosterCard } from '@/components/atoms/PosterCard';
import { getContentImageUrl, getPersonImageUrl } from '@/lib/image-utils';
import { deleteList, type UserList, type UserListOwner } from '@/services/graphql/list';
import { useTranslations, useLocale } from 'next-intl';

interface ProfileListCardProps {
  list: UserList;
  isOwnProfile: boolean;
  isSaved: boolean;
  canSave: boolean;
  onToggleSave: (listId: number) => void;
  onDelete: (id: number) => void;
}

export const getContentTypeInfo = (contentTypeId: number, t: any) => {
  switch (contentTypeId) {
    case 1:
      return {
        name: t('contentTypes.movie'),
        badgeClassName: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        glowClassName: 'bg-blue-500/16  ',
      };
    case 2:
      return {
        name: t('contentTypes.tv'),
        badgeClassName: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        glowClassName: 'bg-purple-500/16  ',
      };
    case 3:
      return {
        name: t('contentTypes.game'),
        badgeClassName: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        glowClassName: 'bg-emerald-500/16  ',
      };
    case 4:
      return {
        name: t('contentTypes.book'),
        badgeClassName: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        glowClassName: 'bg-amber-500/16  ',
      };
    default:
      return {
        name: t('contentTypes.general'),
        badgeClassName: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
        glowClassName: 'bg-gray-500/16  ',
      };
  }
};

const getContributorUsers = (list: UserList): UserListOwner[] => {
  const users = [
    list.owner,
    ...(list.collaborators?.map((collaborator) => collaborator.user) ?? []),
  ].filter(Boolean);

  return users.filter(
    (user, index, array) => array.findIndex((candidate) => candidate.id === user.id) === index
  );
};

const formatRelativeTime = (dateString: string, t: any, locale: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutes', { count: minutes });
  if (hours < 24) return t('time.hours', { count: hours });
  if (days < 7) return t('time.days', { count: days });
  if (weeks < 4) return t('time.weeks', { count: weeks });
  return date.toLocaleDateString(locale);
};

export function CollaboratorAvatarGroup({ users }: { users: UserListOwner[] }) {
  const visibleUsers = users.slice(0, 4);
  const extraCount = users.length - visibleUsers.length;
  const t = useTranslations('ProfileListCard');

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {visibleUsers.map((user) => (
          <div
            key={user.id}
            className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-[#0b0b0f] shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
            title={user.username}
          >
            <PosterCard
              src={user.picturePath ? getPersonImageUrl(user.picturePath, 45) : undefined}
              alt={`${user.username} avatar`}
              aspectClassName="aspect-square"
              hoverZoom={false}
              useNextImage={false}
              className="h-9 w-9 rounded-full border-0 bg-gray-800"
              imageClassName="rounded-full"
              fallback={
                <div className="flex h-full w-full items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
              }
            />
          </div>
        ))}
      </div>

      {extraCount > 0 && (
        <span className="text-xs font-medium text-gray-500">
          {t('extraUsers', { count: extraCount })}
        </span>
      )}
    </div>
  );
}

export function PosterPreviewStack({ list }: { list: UserList }) {
  const t = useTranslations('ProfileListCard');
  const previewItems = useMemo(
    () =>
      [...(list.items ?? [])]
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder ||
            new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
        )
        .slice(0, 5),
    [list]
  );

  return (
    <div className="relative h-44 w-[190px] shrink-0 sm:h-48 sm:w-[210px]">
      <div className="absolute inset-0 rounded-[28px] border border-white/5 bg-white/[0.04]  " />

      {previewItems.length > 0 ? (
        previewItems.map((item, index) => (
          <div
            key={item.id}
            className="absolute bottom-0 top-4 w-[72px] overflow-hidden rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,0.42)] ring-1 ring-white/10"
            style={{ left: `${index * 28}px`, zIndex: index + 1 }}
          >
            <PosterCard
              src={
                item.content.posterUrl
                  ? getContentImageUrl(item.content.posterUrl, 185, 'poster')
                  : undefined
              }
              alt={item.content.title}
              hoverZoom={false}
              useNextImage={false}
              rounded="xl"
              className="h-full w-full border-0 bg-gray-900"
              fallback={
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-900 px-2 text-center text-[11px] text-gray-500">
                  <FolderOpen size={16} />
                  <span className="line-clamp-2">{item.content.title}</span>
                </div>
              }
            />
          </div>
        ))
      ) : (
        <div className="absolute inset-3 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-gray-500">
            <FolderOpen size={20} />
          </div>
          <p className="text-sm font-medium text-gray-300">{t('empty')}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">{t('emptyDesc')}</p>
        </div>
      )}
    </div>
  );
}

export default function ProfileListCard({
  list,
  isOwnProfile,
  isSaved,
  canSave,
  onToggleSave,
  onDelete,
}: ProfileListCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);
  const t = useTranslations('ProfileListCard');
  const locale = useLocale();
  const typeInfo = getContentTypeInfo(list.contentTypeId, t);
  const contributorUsers = getContributorUsers(list);
  const shouldShowContributors = contributorUsers.length > 1;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    setIsDeleting(true);
    const { success } = await deleteList(list.id);
    if (success) {
      console.log('✅ [ProfileListCard] Liste silindi:', list.id);
      onDelete(list.id);
    } else {
      console.error('❌ [ProfileListCard] Liste silinemedi:', list.id);
    }
    setIsDeleting(false);
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canSave || isTogglingSave) {
      return;
    }

    setIsTogglingSave(true);
    try {
      await onToggleSave(list.id);
      console.log('✅ [ProfileListCard] Kaydet durumu güncellendi:', list.id);
    } catch (error) {
      console.error('❌ [ProfileListCard] Kaydet durumu güncellenemedi:', error);
    } finally {
      setIsTogglingSave(false);
    }
  };

  return (
    <Link href={`/lists/${list.owner.username}/${list.id}` as any} className="block h-full">
      <article className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-800/70 bg-surface-page transition-all duration-300 hover:-translate-y-1 hover:border-gray-700 hover:bg-surface-panel">
        <div className={`pointer-events-none absolute inset-0  ${typeInfo.glowClassName}`} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%)] opacity-60" />

        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {!isOwnProfile && canSave && (
            <button
              onClick={handleToggleSave}
              disabled={isTogglingSave}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                isSaved
                  ? 'border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : 'border-gray-700/80 bg-black/40 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
              title={isSaved ? t('unsave') : t('save')}
            >
              {isTogglingSave ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              ) : isSaved ? (
                <BookmarkCheck size={15} />
              ) : (
                <Bookmark size={15} />
              )}
            </button>
          )}

          {isOwnProfile && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300 transition-all hover:bg-red-500/20"
              title={t('deleteList')}
            >
              {isDeleting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              ) : (
                <Trash2 size={15} />
              )}
            </button>
          )}
        </div>

        <div className="relative z-10 flex h-full flex-col gap-5 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4 pr-12 lg:pr-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${typeInfo.badgeClassName}`}
                >
                  {typeInfo.name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-gray-300">
                  <span className="font-semibold text-white">{list.itemCount}</span>
                  {t('items')}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white transition-colors group-hover:text-blue-300">
                  {list.name}
                </h3>
                <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-6 text-gray-400">
                  {list.description?.trim() || t('noDesc')}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]"
                  title={list.isPublic ? t('visibility.public') : t('visibility.private')}
                >
                  {list.isPublic ? (
                    <Globe2 size={15} className="text-emerald-300" />
                  ) : (
                    <Lock size={15} className="text-amber-300" />
                  )}
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]"
                  title={list.isOrdered ? t('order.ordered') : t('order.unordered')}
                >
                  {list.isOrdered ? (
                    <ListOrdered size={15} className="text-blue-300" />
                  ) : (
                    <List size={15} className="text-gray-300" />
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                  <Clock size={15} className="text-gray-400" />
                  <span>{formatRelativeTime(list.createdAt, t, locale)}</span>
                </div>
              </div>

              {shouldShowContributors && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                    <Users size={13} />
                    {t('contributors')}
                  </div>
                  <CollaboratorAvatarGroup users={contributorUsers} />
                </div>
              )}
            </div>

            <PosterPreviewStack list={list} />
          </div>
        </div>
      </article>
    </Link>
  );
}
