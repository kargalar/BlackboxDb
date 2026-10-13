'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UserList } from '@/services/graphql/listTypes';
import { PosterCard } from '@/components/atoms/PosterCard';
import {
  CollaboratorAvatarGroup,
  getContentTypeInfo,
} from '@/components/organisms/profile/ProfileListCard';
import { getContentImageUrl, getPersonImageUrl } from '@/lib/image-utils';
import {
  ChevronUp,
  ChevronDown,
  FolderOpen,
  Globe2,
  Lock,
  ListOrdered,
  List,
  Clock,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return 'Şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  if (weeks < 4) return `${weeks} hafta önce`;
  return date.toLocaleDateString('tr-TR');
}

// ==========================================
// VOTE BUTTON COMPONENT
// ==========================================

export function VoteButtons({
  list,
  onVote,
  disabled,
}: {
  list: UserList;
  onVote: (listId: number, voteType: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="inline-flex min-w-[44px] flex-col items-center gap-0.5 self-start">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote(list.id, list.userVote === 1 ? 0 : 1);
        }}
        disabled={disabled}
        className={`rounded-lg p-1 transition-all duration-200 ${
          list.userVote === 1 ? 'text-orange-400' : 'text-white/30 hover:text-orange-400'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        title="Olumlu oy"
      >
        <ChevronUp size={22} strokeWidth={2.5} />
      </button>

      <span
        className={`text-sm font-bold tabular-nums min-w-[24px] text-center ${
          list.score > 0 ? 'text-orange-400' : list.score < 0 ? 'text-blue-400' : 'text-white/40'
        }`}
      >
        {list.score}
      </span>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onVote(list.id, list.userVote === -1 ? 0 : -1);
        }}
        disabled={disabled}
        className={`rounded-lg p-1 transition-all duration-200 ${
          list.userVote === -1 ? 'text-blue-400' : 'text-white/30 hover:text-blue-400'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        title="Olumsuz oy"
      >
        <ChevronDown size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function BrowseListPreview({ list }: { list: UserList }) {
  const previewItems = [...(list.items ?? [])]
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
    )
    .slice(0, 5);

  if (previewItems.length === 0) {
    return (
      <div className="flex h-[160px] w-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 text-center xl:w-[210px] xl:shrink-0">
        <div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-gray-500">
            <FolderOpen size={20} />
          </div>
          <p className="text-sm font-medium text-gray-300">Henüz içerik yok</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            İçerikler eklendikçe görseller burada görünecek.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[160px] w-full items-end overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04]  px-4 pt-4 xl:w-[210px] xl:shrink-0">
      {previewItems.map((item, index) => (
        <div key={item.id} className="relative -ml-2 first:ml-0" style={{ zIndex: index + 1 }}>
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
            className="h-[132px] w-[62px] border-white/10 bg-gray-900"
            fallback={
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-900 px-2 text-center text-[10px] text-gray-500">
                <FolderOpen size={14} />
                <span className="line-clamp-2">{item.content.title}</span>
              </div>
            }
          />
        </div>
      ))}
    </div>
  );
}

// ==========================================
// LIST CARD COMPONENT
// ==========================================

export function PublicListCard({
  list,
  onVote,
  voteDisabled,
  isOwner,
}: {
  list: UserList;
  onVote: (listId: number, voteType: number) => void;
  voteDisabled: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('ProfileListCard');
  const contentInfo = getContentTypeInfo(list.contentTypeId, t);
  const contributorUsers = [
    list.owner,
    ...(list.collaborators?.map((collaborator) => collaborator.user) ?? []),
  ].filter(
    (user, index, array) => array.findIndex((candidate) => candidate.id === user.id) === index
  );
  const hasContributors = contributorUsers.length > 1;

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-gray-800/70 bg-surface-page transition-all duration-300 hover:-translate-y-1 hover:border-gray-700 hover:bg-surface-panel"
      onClick={() => router.push(`/lists/${list.owner.username}/${list.id}` as any)}
    >
      <div className={`pointer-events-none absolute inset-0  ${contentInfo.glowClassName}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%)] opacity-60" />

      <div className="relative z-10 flex h-full flex-col gap-5 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${contentInfo.badgeClassName}`}
              >
                {contentInfo.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-gray-300">
                <span className="font-semibold text-white">{list.itemCount}</span>
                içerik
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-xl font-semibold text-white transition-colors group-hover:text-violet-300">
                  {list.name}
                </h3>
                <p className="line-clamp-3 min-h-[3.75rem] text-sm leading-6 text-gray-400">
                  {list.description?.trim() || 'Bu liste için henüz bir açıklama eklenmemiş.'}
                </p>
              </div>

              {!isOwner ? (
                <VoteButtons list={list} onVote={onVote} disabled={voteDisabled} />
              ) : (
                <div className="inline-flex min-w-[44px] flex-col items-center self-start">
                  <span
                    className={`text-sm font-bold tabular-nums text-center ${
                      list.score > 0
                        ? 'text-orange-400'
                        : list.score < 0
                          ? 'text-blue-400'
                          : 'text-white/40'
                    }`}
                  >
                    {list.score}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/25">
                    oy
                  </span>
                </div>
              )}
            </div>

            <Link
              href={`/profile/${list.owner.username}` as any}
              className="inline-flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-gray-300 transition-colors hover:text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-9 w-9 overflow-hidden rounded-full ring-1 ring-white/10">
                <PosterCard
                  src={
                    list.owner.picturePath
                      ? getPersonImageUrl(list.owner.picturePath, 45)
                      : undefined
                  }
                  alt={list.owner.username}
                  aspectClassName="aspect-square"
                  hoverZoom={false}
                  useNextImage={false}
                  className="h-9 w-9 rounded-full border-0 bg-gray-800"
                  imageClassName="rounded-full"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white">
                      {list.owner.username.charAt(0).toUpperCase()}
                    </div>
                  }
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Oluşturan</p>
                <p className="truncate font-medium text-white">{list.owner.username}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 text-sm text-gray-300">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]"
                title={list.isPublic ? 'Herkese açık' : 'Gizli'}
              >
                {list.isPublic ? (
                  <Globe2 size={15} className="text-emerald-300" />
                ) : (
                  <Lock size={15} className="text-amber-300" />
                )}
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]"
                title={list.isOrdered ? 'Sıralı' : 'Serbest'}
              >
                {list.isOrdered ? (
                  <ListOrdered size={15} className="text-blue-300" />
                ) : (
                  <List size={15} className="text-gray-300" />
                )}
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <Clock size={15} className="text-gray-400" />
                <span>{formatRelativeTime(list.createdAt)}</span>
              </div>
            </div>

            {hasContributors && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
                  <Users size={13} />
                  Katkıda bulunanlar
                </div>
                <CollaboratorAvatarGroup users={contributorUsers} />
              </div>
            )}
          </div>

          <BrowseListPreview list={list} />
        </div>
      </div>
    </div>
  );
}
