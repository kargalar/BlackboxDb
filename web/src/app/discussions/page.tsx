'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Plus,
  Film,
  Tv,
  Gamepad2,
  BookOpen,
  Music,
  Globe,
  X,
} from 'lucide-react';
import { getCommentCountClass, getCommentCountWeight } from '@/lib/comment-count-utils';
import MentionText from '@/components/atoms/MentionText';

const GET_ALL_DISCUSSIONS = gql`
  query GetAllDiscussions($sortBy: String, $limit: Int, $offset: Int, $contentType: String) {
    allDiscussions(sortBy: $sortBy, limit: $limit, offset: $offset, contentType: $contentType) {
      id
      contentId
      authorId
      title
      description
      upvoteCount
      downvoteCount
      commentCount
      score
      userVote
      createdAt
      author {
        id
        username
        picturePath
      }
      content {
        id
        title
        contentTypeId
        posterUrl
      }
    }
  }
`;

const GET_ALL_COMMENTS = gql`
  query GetAllComments($sortBy: String, $limit: Int, $offset: Int, $contentType: String) {
    allComments(sortBy: $sortBy, limit: $limit, offset: $offset, contentType: $contentType) {
      id
      contentId
      authorId
      description
      upvoteCount
      downvoteCount
      commentCount
      score
      userVote
      createdAt
      author {
        id
        username
        picturePath
      }
      content {
        id
        title
        contentTypeId
        posterUrl
      }
    }
  }
`;

const CREATE_DISCUSSION = gql`
  mutation CreateDiscussion($input: CreateDiscussionInput!) {
    createDiscussion(input: $input) {
      id
      contentId
      title
      description
      upvoteCount
      downvoteCount
      commentCount
      score
      userVote
      createdAt
      author {
        id
        username
        picturePath
      }
      content {
        id
        title
      }
    }
  }
`;

const VOTE_DISCUSSION = gql`
  mutation VoteDiscussion($id: Int!, $voteType: Int!) {
    voteDiscussion(id: $id, voteType: $voteType) {
      id
      upvoteCount
      downvoteCount
      score
      userVote
    }
  }
`;

const GET_DISCUSSION_VOTERS = gql`
  query GetDiscussionVoters($discussionId: Int!) {
    discussionVoters(discussionId: $discussionId) {
      id
      username
      picturePath
      voteType
    }
  }
`;

interface Discussion {
  id: number;
  contentId: string | null;
  authorId: string;
  title?: string;
  description: string;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  score: number;
  userVote: number | null;
  createdAt: string;
  author: {
    id: string;
    username: string;
    picturePath: string | null;
  };
  content: {
    id: string;
    title: string;
    contentTypeId?: number;
    posterUrl?: string;
  } | null;
}

interface Voter {
  id: string;
  username: string;
  picturePath: string | null;
  voteType: number;
}

import { useTranslations, useLocale } from 'next-intl';

type ContentTypeFilter = 'general' | 'movie' | 'tv' | 'game' | 'book' | 'music';

const contentTypeFilters: { key: ContentTypeFilter; icon: React.ReactNode }[] = [
  { key: 'general', icon: <Globe size={16} /> },
  { key: 'movie', icon: <Film size={16} /> },
  { key: 'tv', icon: <Tv size={16} /> },
  { key: 'game', icon: <Gamepad2 size={16} /> },
  { key: 'book', icon: <BookOpen size={16} /> },
  { key: 'music', icon: <Music size={16} /> },
];

function DiscussionsPageContent() {
  const t = useTranslations('DiscussionsPage');
  const locale = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') === 'reviews' ? 'reviews' : 'discussions';
  const [postType, setPostType] = useState<'discussions' | 'reviews'>(initialType);

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('newest');
  const [contentType, setContentType] = useState<ContentTypeFilter>('general');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votersDialogOpen, setVotersDialogOpen] = useState(false);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);

  useEffect(() => {
    async function loadDiscussions() {
      setLoading(true);
      try {
        const query = postType === 'reviews' ? GET_ALL_COMMENTS : GET_ALL_DISCUSSIONS;
        const { data } = await apolloClient.query({
          query,
          variables: { sortBy, limit: 50, offset: 0, contentType },
          fetchPolicy: 'network-only',
        });
        const result =
          postType === 'reviews'
            ? (data as { allComments: Discussion[] }).allComments
            : (data as { allDiscussions: Discussion[] }).allDiscussions;
        setDiscussions(result || []);
      } catch (e) {
        console.error(`Error loading ${postType}:`, e);
      } finally {
        setLoading(false);
      }
    }
    loadDiscussions();
  }, [sortBy, contentType, postType]);

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setSubmitting(true);
    try {
      const { data } = (await apolloClient.mutate({
        mutation: CREATE_DISCUSSION,
        variables: {
          input: {
            title: newTitle.trim(),
            description: newDescription.trim(),
            // contentId is null for general discussions
          },
        },
      })) as { data: { createDiscussion: Discussion } | null };
      if (data?.createDiscussion) {
        setDiscussions((prev) => [data.createDiscussion, ...prev]);
        setNewTitle('');
        setNewDescription('');
        setShowCreateForm(false);
      }
    } catch (e) {
      console.error('Error creating discussion:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (discussionId: number, voteType: number) => {
    if (!user) return;
    try {
      const { data } = (await apolloClient.mutate({
        mutation: VOTE_DISCUSSION,
        variables: { id: Number(discussionId), voteType },
      })) as { data: { voteDiscussion: Partial<Discussion> } | null };
      if (data?.voteDiscussion) {
        setDiscussions((prev) =>
          prev.map((d) => (d.id === discussionId ? { ...d, ...data.voteDiscussion } : d))
        );
      }
    } catch (e) {
      console.error('Error voting:', e);
    }
  };

  const handleOpenVotersDialog = async (discussionId: number) => {
    setVotersDialogOpen(true);
    setLoadingVoters(true);
    try {
      const { data } = await apolloClient.query({
        query: GET_DISCUSSION_VOTERS,
        variables: { discussionId: Number(discussionId) },
        fetchPolicy: 'network-only',
      });
      setVoters((data as { discussionVoters: Voter[] })?.discussionVoters || []);
    } catch (e) {
      console.error('Error loading voters:', e);
      setVoters([]);
    } finally {
      setLoadingVoters(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return t('timeFormats.justNow');
    if (minutes < 60) return t('timeFormats.minutesAgo', { count: minutes });
    if (hours < 24) return t('timeFormats.hoursAgo', { count: hours });
    if (days <= 5) return t('timeFormats.daysAgo', { count: days });

    const isCurrentYear = date.getFullYear() === now.getFullYear();
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    if (!isCurrentYear) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString(locale, options);
  };

  const getContentTypeSlug = (contentTypeId?: number): string => {
    switch (contentTypeId) {
      case 1:
        return 'movie';
      case 2:
        return 'tv';
      case 3:
        return 'game';
      case 4:
        return 'book';
      case 5:
        return 'music';
      default:
        return 'movie';
    }
  };

  const getContentTypeIcon = (contentTypeId?: number) => {
    switch (contentTypeId) {
      case 1:
        return <Film size={14} className="text-red-400" />;
      case 2:
        return <Tv size={14} className="text-blue-400" />;
      case 3:
        return <Gamepad2 size={14} className="text-purple-400" />;
      case 4:
        return <BookOpen size={14} className="text-amber-400" />;
      case 5:
        return <Music size={14} className="text-pink-400" />;
      default:
        return <Globe size={14} className="text-emerald-400" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          <span className="gradient-text">
            {postType === 'discussions' ? t('discussionsTitle') : t('reviewsTitle')}
          </span>
        </h1>

        {user && postType === 'discussions' && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {t('newDiscussion')}
          </button>
        )}
      </div>

      {/* Create Discussion Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateDiscussion} className="glass-card p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('startDiscussionTitle')}</h3>
          <div className="mb-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('discussionTitlePlaceholder')}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500"
              maxLength={255}
            />
          </div>
          <div className="mb-4">
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={t('discussionDescPlaceholder')}
              rows={4}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-white/60 hover:text-white transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || !newTitle.trim() || !newDescription.trim()}
              className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t('sending') : t('share')}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Post Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setPostType('discussions')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              postType === 'discussions'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('tabDiscussions')}
          </button>
          <button
            onClick={() => setPostType('reviews')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              postType === 'reviews'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('tabReviews')}
          </button>
        </div>

        <div className="w-px h-8 bg-white/10 hidden sm:block self-center" />
        {/* Content Type Filter */}
        <div className="flex flex-wrap gap-2">
          {contentTypeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setContentType(filter.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                contentType === filter.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {filter.icon}
              {t(`contentTypes.${filter.key}`)}
            </button>
          ))}
        </div>

        {/* Sort Filter */}
        <div className="flex gap-2 sm:ml-auto">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              sortBy === 'newest'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('newest')}
          </button>
          <button
            onClick={() => setSortBy('top')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              sortBy === 'top'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('topRated')}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && discussions.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">{postType === 'discussions' ? '🗣️' : '⭐'}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {postType === 'discussions'
              ? t('emptyState.titleDiscussions')
              : t('emptyState.titleReviews')}
          </h2>
          <p className="text-white/60">
            {contentType === 'general'
              ? postType === 'discussions'
                ? t('emptyState.descDiscussions')
                : t('emptyState.descReviews')
              : t('emptyState.filtered', {
                  postType:
                    postType === 'discussions'
                      ? t('tabDiscussions').toLowerCase()
                      : t('tabReviews').toLowerCase(),
                })}
          </p>
        </div>
      )}

      {!loading && discussions.length > 0 && (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <div
              key={discussion.id}
              className="glass-card p-4 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => router.push(`/discussion/${discussion.id}` as any)}
            >
              <div className="flex gap-4">
                {/* Vote Buttons */}
                <div
                  className="flex flex-col items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => handleVote(discussion.id, discussion.userVote === 1 ? 0 : 1)}
                    disabled={!user}
                    className={`p-1 rounded transition-colors ${
                      discussion.userVote === 1
                        ? 'text-orange-500'
                        : 'text-white/40 hover:text-orange-500'
                    } ${!user && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <ChevronUp size={24} />
                  </button>
                  <button
                    onClick={() => handleOpenVotersDialog(discussion.id)}
                    className={`text-sm font-semibold hover:underline cursor-pointer ${
                      discussion.score > 0
                        ? 'text-orange-500'
                        : discussion.score < 0
                          ? 'text-blue-500'
                          : 'text-white/60'
                    }`}
                  >
                    {discussion.score}
                  </button>
                  <button
                    onClick={() => handleVote(discussion.id, discussion.userVote === -1 ? 0 : -1)}
                    disabled={!user}
                    className={`p-1 rounded transition-colors ${
                      discussion.userVote === -1
                        ? 'text-blue-500'
                        : 'text-white/40 hover:text-blue-500'
                    } ${!user && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <ChevronDown size={24} />
                  </button>
                </div>

                {/* Content Poster */}
                {discussion.contentId && discussion.content && (
                  <div className="flex-shrink-0 w-16 h-24 sm:w-[90px] sm:h-[135px] relative z-20">
                    <Link
                      href={
                        `/content/${getContentTypeSlug(discussion.content?.contentTypeId)}/${discussion.contentId}` as any
                      }
                      className="block w-full h-full bg-white/10 rounded overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {discussion.content.posterUrl ? (
                        <Image
                          src={discussion.content.posterUrl}
                          alt={discussion.content.title}
                          width={90}
                          height={135}
                          className="rounded object-cover w-full h-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          {getContentTypeIcon(discussion.content.contentTypeId)}
                        </div>
                      )}
                    </Link>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {discussion.title && (
                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors mb-1">
                      {discussion.title}
                    </h3>
                  )}

                  {/* Content link or General badge */}
                  {discussion.contentId && discussion.content ? (
                    <Link
                      href={
                        `/content/${getContentTypeSlug(discussion.content?.contentTypeId)}/${discussion.contentId}` as any
                      }
                      className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 mb-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getContentTypeIcon(discussion.content?.contentTypeId)}
                      {discussion.content.title}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400 mb-2">
                      <Globe size={14} />
                      {t('badges.generalDiscussion')}
                    </span>
                  )}

                  <MentionText
                    text={discussion.description}
                    as="p"
                    mentionMode="action"
                    className="text-white/60 text-sm line-clamp-2 mb-3"
                  />

                  {/* Footer */}
                  <div className="flex items-center gap-4 text-sm text-white/40">
                    <Link
                      href={`/profile/${discussion.author.username}` as any}
                      className="flex items-center gap-2 hover:text-white/60 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="w-5 h-5 rounded-full bg-violet-500 overflow-hidden">
                        {discussion.author.picturePath ? (
                          <Image
                            src={discussion.author.picturePath}
                            alt={discussion.author.username}
                            width={20}
                            height={20}
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-white text-xs">
                            {discussion.author.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {discussion.author.username}
                    </Link>
                    <span>{formatDate(discussion.createdAt)}</span>
                    <span
                      className={`flex items-center gap-1 ${getCommentCountClass(discussion.commentCount)} ${getCommentCountWeight(discussion.commentCount)}`}
                    >
                      <MessageSquare size={14} />
                      {t('commentsCount', { count: discussion.commentCount })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Voters Dialog */}
      {votersDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setVotersDialogOpen(false)}
        >
          <div
            className="glass-card p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{t('voters.title')}</h3>
              <button
                onClick={() => setVotersDialogOpen(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {loadingVoters ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : voters.length === 0 ? (
              <p className="text-white/60 text-center py-8">{t('voters.empty')}</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {/* Up voters */}
                {voters.filter((v) => v.voteType === 1).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-1">
                      <ChevronUp size={16} />{' '}
                      {t('voters.upvotes', {
                        count: voters.filter((v) => v.voteType === 1).length,
                      })}
                    </h4>
                    <div className="space-y-2">
                      {voters
                        .filter((v) => v.voteType === 1)
                        .map((voter) => (
                          <Link
                            key={voter.id}
                            href={`/profile/${voter.username}`}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                            onClick={() => setVotersDialogOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-full bg-violet-500 overflow-hidden">
                              {voter.picturePath ? (
                                <Image
                                  src={voter.picturePath}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex items-center justify-center w-full h-full text-white text-sm">
                                  {voter.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-white">{voter.username}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

                {/* Down voters */}
                {voters.filter((v) => v.voteType === -1).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-1">
                      <ChevronDown size={16} />{' '}
                      {t('voters.downvotes', {
                        count: voters.filter((v) => v.voteType === -1).length,
                      })}
                    </h4>
                    <div className="space-y-2">
                      {voters
                        .filter((v) => v.voteType === -1)
                        .map((voter) => (
                          <Link
                            key={voter.id}
                            href={`/profile/${voter.username}`}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
                            onClick={() => setVotersDialogOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-full bg-violet-500 overflow-hidden">
                              {voter.picturePath ? (
                                <Image
                                  src={voter.picturePath}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex items-center justify-center w-full h-full text-white text-sm">
                                  {voter.username.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-white">{voter.username}</span>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiscussionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-white">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
        </div>
      }
    >
      <DiscussionsPageContent />
    </Suspense>
  );
}
