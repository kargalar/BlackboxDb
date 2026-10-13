'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginRequired } from '@/components/atoms/LoginRequiredDialog';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { ChevronUp, ChevronDown, MessageSquare } from 'lucide-react';
import { getCommentCountClass, getCommentCountWeight } from '@/lib/comment-count-utils';
import { useMention, type MentionUser } from '@/hooks/useMention';
import MentionDropdown from '@/components/atoms/MentionDropdown';
import MentionText from '@/components/atoms/MentionText';
import { formatRelativeTime } from '@/lib/date-utils';
import { useTranslations } from 'next-intl';

// GraphQL Queries
const GET_DISCUSSIONS = gql`
  query GetDiscussions($contentId: String!, $sortBy: String) {
    discussionsByContent(contentId: $contentId, sortBy: $sortBy) {
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
    }
  }
`;

const CREATE_DISCUSSION = gql`
  mutation CreateDiscussion($input: CreateDiscussionInput!) {
    createDiscussion(input: $input) {
      id
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

interface Discussion {
  id: number;
  contentId: string;
  authorId: string;
  title: string;
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
}

interface ContentDiscussionsProps {
  contentId: string;
  onSwitchTab?: () => void;
  commentsCount?: number;
}

export default function ContentDiscussions({
  contentId,
  onSwitchTab,
  commentsCount = 0,
}: ContentDiscussionsProps) {
  const t = useTranslations('ContentDiscussions');
  const { user } = useAuth();
  const { showLoginDialog } = useLoginRequired();
  const requireAuth = (action: string) => {
    showLoginDialog(
      t('loginRequired', { action }),
      typeof window !== 'undefined' ? window.location.pathname : undefined
    );
  };
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'top'>('newest');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [descMentions, setDescMentions] = useState<MentionUser[]>([]);
  const descMention = useMention(user?.id);

  // Load discussions
  useEffect(() => {
    async function loadDiscussions() {
      setLoading(true);
      try {
        const { data } = await apolloClient.query<{ discussionsByContent: Discussion[] }>({
          query: GET_DISCUSSIONS,
          variables: { contentId, sortBy },
          fetchPolicy: 'network-only',
        });
        setDiscussions(data?.discussionsByContent || []);
      } catch (e) {
        console.error('Error loading discussions:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDiscussions();
  }, [contentId, sortBy]);

  // Create new discussion
  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await apolloClient.mutate<{ createDiscussion: Discussion }>({
        mutation: CREATE_DISCUSSION,
        variables: {
          input: {
            contentId,
            title: newTitle.trim(),
            description: newDescription.trim(),
          },
        },
      });
      if (data?.createDiscussion) {
        setDiscussions((prev) => [data.createDiscussion, ...prev]);
        setNewTitle('');
        setNewDescription('');
        setDescMentions([]);
        descMention.closeMention();
        setShowCreateForm(false);
      }
    } catch (e) {
      console.error('Error creating discussion:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // Vote on discussion
  const handleVote = async (discussionId: number, voteType: number) => {
    if (!user) return;

    try {
      const { data } = await apolloClient.mutate<{ voteDiscussion: Partial<Discussion> }>({
        mutation: VOTE_DISCUSSION,
        variables: { id: Number(discussionId), voteType },
      });
      if (data?.voteDiscussion) {
        setDiscussions((prev) =>
          prev.map((d) => (d.id === discussionId ? { ...d, ...data.voteDiscussion } : d))
        );
      }
    } catch (e) {
      console.error('Error voting:', e);
    }
  };

  return (
    <div className="mb-8">
      {/* Header with Sort Buttons and Switch Tab Button */}
      <div className="flex items-center justify-between glass-card p-3">
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'newest'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            {t('sort.newest')}
          </button>
          <button
            onClick={() => setSortBy('top')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === 'top'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            {t('sort.topRated')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {onSwitchTab && (
            <button
              onClick={onSwitchTab}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
            >
              {commentsCount > 0
                ? t('viewCommentsCount', { count: commentsCount })
                : t('viewComments')}
            </button>
          )}

          {user ? (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
            >
              {t('actions.newDiscussion')}
            </button>
          ) : (
            <button
              onClick={() => requireAuth(t('actions.startDiscussion'))}
              className="flex items-center gap-2 px-4 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
            >
              {t('actions.newDiscussion')}
            </button>
          )}
        </div>
      </div>

      {/* Create Discussion Form */}
      {showCreateForm && user && (
        <form onSubmit={handleCreateDiscussion} className="glass-card p-5">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-violet-500 overflow-hidden flex-shrink-0 shadow-lg mt-1">
              {user.picturePath ? (
                <Image
                  src={user.picturePath}
                  alt={user.username}
                  width={40}
                  height={40}
                  className="object-cover"
                />
              ) : (
                <span className="flex items-center justify-center w-full h-full text-white text-sm font-medium">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="mb-4">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('placeholders.title')}
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-violet-500 transition-colors shadow-inner font-medium"
                  maxLength={255}
                />
              </div>
              <div className="relative bg-black/20 rounded-xl border border-white/10 focus-within:border-violet-500 transition-colors shadow-inner">
                <textarea
                  value={newDescription}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewDescription(val);
                    descMention.onTextChange(val, e.target.selectionStart ?? val.length);
                  }}
                  onBlur={() => setTimeout(descMention.closeMention, 150)}
                  placeholder={t('placeholders.description')}
                  rows={4}
                  className="w-full px-4 pt-3 pb-14 bg-transparent text-white placeholder-white/40 focus:outline-none resize-none"
                  style={{ minHeight: '120px' }}
                />
                <MentionDropdown
                  active={descMention.mentionActive}
                  query={descMention.mentionQuery}
                  results={descMention.mentionResults}
                  loading={descMention.mentionLoading}
                  onSelect={(u) =>
                    descMention.selectUser(u, newDescription, setNewDescription, setDescMentions)
                  }
                />

                <div className="absolute bottom-2 right-2 flex items-center justify-end gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-1.5 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {t('actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newTitle.trim() || !newDescription.trim()}
                    className="px-4 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
                  >
                    {submitting ? t('actions.sending') : t('actions.share')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {/* Empty State */}
      {!loading && discussions.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-4">🗣️</div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('emptyState.title')}</h3>
          <p className="text-white/60">{t('emptyState.description')}</p>
        </div>
      )}

      {/* Discussions List */}
      {!loading && discussions.length > 0 && (
        <div className="glass-card divide-y divide-white/10">
          {discussions.map((discussion) => (
            <div key={discussion.id} className="p-5 hover:bg-white/5 transition-colors">
              <div className="flex gap-4">
                {/* Vote Buttons */}
                <div className="flex flex-col items-center gap-1">
                  {user?.id !== discussion.authorId ? (
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
                  ) : (
                    <div className="h-8" />
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      discussion.score > 0
                        ? 'text-orange-500'
                        : discussion.score < 0
                          ? 'text-blue-500'
                          : 'text-white/60'
                    }`}
                  >
                    {discussion.score}
                  </span>
                  {user?.id !== discussion.authorId ? (
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
                  ) : (
                    <div className="h-8" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Link href={`/discussion/${discussion.id}` as any} className="block group">
                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors mb-2">
                      {discussion.title}
                    </h3>
                    <MentionText
                      text={discussion.description}
                      as="p"
                      mentionMode="action"
                      className="text-white/80 text-[15px] line-clamp-2 mb-3"
                    />
                  </Link>

                  {/* Footer */}
                  <div className="flex items-center gap-4 text-sm text-white/40">
                    <Link
                      href={`/profile/${discussion.author.username}`}
                      className="flex items-center gap-2 hover:text-white/60 transition-colors"
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
                    <span>{formatRelativeTime(discussion.createdAt)}</span>
                    <Link
                      href={`/discussion/${discussion.id}` as any}
                      className={`flex items-center gap-1 hover:text-white/80 transition-colors ${getCommentCountClass(discussion.commentCount)} ${getCommentCountWeight(discussion.commentCount)}`}
                    >
                      <MessageSquare size={14} />
                      {t('commentsCount', { count: discussion.commentCount })}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
