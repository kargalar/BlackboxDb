'use client';

import { useEffect, useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, CircleSlash, Heart, Play, Star, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFormatter, useTranslations } from 'next-intl';
import { apolloClient } from '@/lib/apollo-client';
import { formatRating } from '@/lib/formatRating';
import {
  GET_FRIENDS_ACTIVITY_FOR_CONTENT,
  type GetFriendsActivityForContentData,
} from '@/services/graphql/userContent';

type FriendActivity = GetFriendsActivityForContentData['friendsActivityForContent'][number];

interface ContentFriendsActivityProps {
  contentId: string;
}

const FRIEND_ACTIVITY_LIMIT = 20;
const INITIAL_VISIBLE_FRIENDS = 6;
const STATUS_OPTIONS = [
  { field: 'isAbandoned', key: 'abandoned', Icon: CircleSlash },
  { field: 'isContinuing', key: 'continuing', Icon: Play },
  { field: 'isConsumed', key: 'consumed', Icon: Check },
] as const;

function FriendsPanel({ friends }: { friends: FriendActivity[] }) {
  const t = useTranslations('ContentFriendsActivity');
  const format = useFormatter();
  const headingId = useId();
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const [now] = useState(() => new Date());
  const visibleFriends = expanded ? friends : friends.slice(0, INITIAL_VISIBLE_FRIENDS);

  const formatActivityDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? t('recently') : format.relativeTime(date, now);
  };

  return (
    <section aria-labelledby={headingId}>
      <div className="content-friends-panel rounded-2xl p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Users size={18} className="shrink-0 text-neutral-400" aria-hidden="true" />
            <h3 id={headingId} className="text-sm font-semibold text-neutral-100">
              {t('title')}
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {t('friendCount', { count: friends.length })}
          </span>
        </div>

        <ul id={listId} className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visibleFriends.map((friend) => {
            const status = STATUS_OPTIONS.find((option) => friend[option.field]);
            return (
              <li key={friend.userId} className="min-w-0">
                <Link
                  href={`/profile/${encodeURIComponent(friend.user.username)}`}
                  className="content-friend-row group flex min-w-0 items-center gap-3 rounded-xl p-3 transition-colors"
                >
                  <span className="content-friend-avatar relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-neutral-300">
                    {friend.user.picturePath ? (
                      <Image
                        src={friend.user.picturePath}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      friend.user.username.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="truncate text-sm font-medium text-neutral-200 group-hover:text-white"
                        title={friend.user.username}
                      >
                        {friend.user.username}
                      </span>
                      {friend.isFavorite && (
                        <span className="shrink-0 text-rose-400" title={t('status.favorite')}>
                          <Heart size={12} fill="currentColor" aria-hidden="true" />
                          <span className="sr-only">{t('status.favorite')}</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      {status && (
                        <span
                          className="content-friend-status inline-flex items-center gap-1"
                          data-status={status.key}
                        >
                          <status.Icon size={12} aria-hidden="true" />
                          <span>{t(`status.${status.key}`)}</span>
                        </span>
                      )}
                      <span className="hidden text-neutral-500 sm:inline">
                        {formatActivityDate(friend.updatedAt)}
                      </span>
                    </div>
                  </div>
                  {friend.rating != null && (
                    <span
                      className="content-friend-rating inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium tabular-nums"
                      aria-label={t('ratingLabel', { rating: formatRating(friend.rating) })}
                    >
                      <Star size={12} fill="currentColor" aria-hidden="true" />
                      <span>{formatRating(friend.rating)}</span>
                      <span className="text-[10px] text-neutral-500" aria-hidden="true">
                        /10
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {friends.length > INITIAL_VISIBLE_FRIENDS && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={listId}
            onClick={() => setExpanded((value) => !value)}
            className="content-friends-toggle mx-auto mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-neutral-400 transition-colors hover:text-neutral-100"
          >
            {expanded
              ? t('showLess')
              : t('showMore', { count: friends.length - INITIAL_VISIBLE_FRIENDS })}
            {expanded ? (
              <ChevronUp size={14} aria-hidden="true" />
            ) : (
              <ChevronDown size={14} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </section>
  );
}

export default function ContentFriendsActivity({ contentId }: ContentFriendsActivityProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const [activity, setActivity] = useState<{
    contentId: string;
    userId: string;
    friends: FriendActivity[];
  } | null>(null);

  useEffect(() => {
    if (!userId || !contentId) return;
    let active = true;
    const fetchFriendsActivity = async () => {
      try {
        const { data } = await apolloClient.query<GetFriendsActivityForContentData>({
          query: GET_FRIENDS_ACTIVITY_FOR_CONTENT,
          variables: { contentId, limit: FRIEND_ACTIVITY_LIMIT },
          fetchPolicy: 'network-only',
        });
        if (!active) return;
        // Repeat consumption logs should not create multiple rows for the same friend.
        const uniqueFriends = new Map<string, FriendActivity>();
        for (const friend of data?.friendsActivityForContent ?? []) {
          if (friend.user && !uniqueFriends.has(friend.userId))
            uniqueFriends.set(friend.userId, friend);
        }
        setActivity({ contentId, userId, friends: [...uniqueFriends.values()] });
      } catch (error) {
        if (active) console.error('[ContentFriendsActivity] Error:', error);
      }
    };
    void fetchFriendsActivity();
    return () => {
      active = false;
    };
  }, [userId, contentId]);

  if (
    !userId ||
    activity?.userId !== userId ||
    activity?.contentId !== contentId ||
    !activity.friends.length
  )
    return null;
  return <FriendsPanel key={`${userId}:${contentId}`} friends={activity.friends} />;
}
