'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginRequired } from '@/components/atoms/LoginRequiredDialog';
import SpoilerBadge from '@/components/atoms/SpoilerBadge';
import SpoilerSwitch from '@/components/atoms/SpoilerSwitch';
import SpoilerText from '@/components/atoms/SpoilerText';
import VisibilityBadge from '@/components/atoms/VisibilityBadge';
import VisibilitySwitch from '@/components/atoms/VisibilitySwitch';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  Flag,
  Clock,
  Star,
  Heart,
} from 'lucide-react';
import { getCommentCountClass, getCommentCountWeight } from '@/lib/comment-count-utils';
import { useMention, collectMentionedUserIds, type MentionUser } from '@/hooks/useMention';
import MentionDropdown from '@/components/atoms/MentionDropdown';
import { formatRelativeTime } from '@/lib/date-utils';
import ReportModal from '@/components/organisms/ReportModal';
import { useTranslations } from 'next-intl';

// GraphQL Queries
const GET_COMMENTS = gql`
  query GetComments($contentId: String!, $sortBy: String) {
    commentsByContent(contentId: $contentId, sortBy: $sortBy) {
      id
      contentId
      authorId
      type
      isPublic
      isSpoiler
      title
      description
      upvoteCount
      downvoteCount
      commentCount
      score
      userVote
      authorPlaytimeMinutes
      authorRating
      authorIsFavorite
      createdAt
      author {
        id
        username
        picturePath
      }
    }
  }
`;

const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      contentId
      authorId
      type
      isPublic
      isSpoiler
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

const UPDATE_DISCUSSION = gql`
  mutation UpdateDiscussion($input: UpdateDiscussionInput!) {
    updateDiscussion(input: $input) {
      id
      isPublic
      isSpoiler
      description
      updatedAt
    }
  }
`;

const DELETE_DISCUSSION = gql`
  mutation DeleteDiscussion($id: Int!) {
    deleteDiscussion(id: $id)
  }
`;

const REPORT_DISCUSSION = gql`
  mutation ReportDiscussion($id: Int!, $reason: String!) {
    reportDiscussion(id: $id, reason: $reason)
  }
`;

const GET_DISCUSSION_REPLIES = gql`
  query GetDiscussionReplies($discussionId: Int!) {
    discussionComments(discussionId: $discussionId) {
      id
      discussionId
      authorId
      text
      parentId
      createdAt
      author {
        id
        username
        picturePath
      }
      replies {
        id
        discussionId
        authorId
        text
        parentId
        createdAt
        author {
          id
          username
          picturePath
        }
      }
    }
  }
`;

const CREATE_DISCUSSION_REPLY = gql`
  mutation CreateDiscussionReply($input: CreateDiscussionCommentInput!) {
    createDiscussionComment(input: $input) {
      id
      discussionId
      authorId
      text
      parentId
      createdAt
      author {
        id
        username
        picturePath
      }
    }
  }
`;

interface DiscussionReply {
  id: number;
  discussionId: number;
  authorId: string;
  text: string;
  parentId: number | null;
  createdAt: string;
  author: { id: string; username: string; picturePath: string | null };
  replies?: DiscussionReply[];
}

interface Comment {
  id: number;
  contentId: string;
  authorId: string;
  type: string;
  isPublic: boolean;
  isSpoiler: boolean;
  title: string | null;
  description: string;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  score: number;
  userVote: number | null;
  authorPlaytimeMinutes: number | null;
  authorRating: number | null;
  authorIsFavorite: boolean | null;
  createdAt: string;
  author: {
    id: string;
    username: string;
    picturePath: string | null;
  };
}

interface ContentCommentsProps {
  contentId: string;
  isConsumed?: boolean;
  onSwitchTab?: () => void;
  discussionsCount?: number;
}

export default function ContentComments({
  contentId,
  isConsumed = false,
  onSwitchTab,
  discussionsCount = 0,
}: ContentCommentsProps) {
  const t = useTranslations('ContentComments');
  const { user } = useAuth();
  const { showLoginDialog } = useLoginRequired();
  const requireAuth = useCallback(
    (action: string) => {
      showLoginDialog(
        t('loginRequired', { action }),
        typeof window !== 'undefined' ? window.location.pathname : undefined
      );
    },
    [showLoginDialog, t]
  );
  const router = useRouter();
  const commentsLoadRequestId = useRef(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  type SortOption = 'newest' | 'oldest' | 'top' | 'bottom' | 'highest_rated' | 'lowest_rated';
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newCommentIsPublic, setNewCommentIsPublic] = useState(true);
  const [newCommentIsSpoiler, setNewCommentIsSpoiler] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newCommentMentions, setNewCommentMentions] = useState<MentionUser[]>([]);
  const [editCommentMentions, setEditCommentMentions] = useState<MentionUser[]>([]);

  // Mention hooks — biri yeni yorum, biri düzenleme için
  const newMention = useMention(user?.id);
  const editMention = useMention(user?.id);

  // Action states
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCommentIsPublic, setEditCommentIsPublic] = useState(true);
  const [editCommentIsSpoiler, setEditCommentIsSpoiler] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [revealedSpoilerIds, setRevealedSpoilerIds] = useState<Set<number>>(new Set());
  const [reportingComment, setReportingComment] = useState<Comment | null>(null);
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<number>>(new Set());
  const [repliesByCommentId, setRepliesByCommentId] = useState<Record<number, DiscussionReply[]>>(
    {}
  );
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const toggleReplies = async (comment: Comment) => {
    if (expandedReplyIds.has(comment.id)) {
      setExpandedReplyIds((previous) => {
        const next = new Set(previous);
        next.delete(comment.id);
        return next;
      });
      return;
    }

    if (repliesByCommentId[comment.id] === undefined) {
      try {
        const { data } = await apolloClient.query<{
          discussionComments: DiscussionReply[];
        }>({
          query: GET_DISCUSSION_REPLIES,
          variables: { discussionId: comment.id },
          fetchPolicy: 'network-only',
        });
        setRepliesByCommentId((previous) => ({
          ...previous,
          [comment.id]: data?.discussionComments || [],
        }));
      } catch (error) {
        console.error('Error loading replies:', error);
        return;
      }
    }

    setExpandedReplyIds((previous) => new Set(previous).add(comment.id));
  };

  const submitReply = async (comment: Comment) => {
    if (!replyText.trim() || !user) return;

    setReplySubmitting(true);
    try {
      const { data } = await apolloClient.mutate<{
        createDiscussionComment: DiscussionReply;
      }>({
        mutation: CREATE_DISCUSSION_REPLY,
        variables: {
          input: {
            discussionId: comment.id,
            text: replyText.trim(),
            parentId: comment.id,
          },
        },
      });

      const newReply = data?.createDiscussionComment;
      if (!newReply) return;

      setRepliesByCommentId((previous) => ({
        ...previous,
        [comment.id]: [...(previous[comment.id] || []), { ...newReply, replies: [] }],
      }));
      setComments((previous) =>
        previous.map((item) =>
          item.id === comment.id ? { ...item, commentCount: item.commentCount + 1 } : item
        )
      );
      setExpandedReplyIds((previous) => new Set(previous).add(comment.id));
      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error('Error creating reply:', error);
      toast.error(t('errors.create'));
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleSortClick = (category: 'date' | 'vote' | 'rating') => {
    if (category === 'date') {
      setSortBy(sortBy === 'newest' ? 'oldest' : 'newest');
    } else if (category === 'vote') {
      setSortBy(sortBy === 'top' ? 'bottom' : 'top');
    } else if (category === 'rating') {
      setSortBy(sortBy === 'highest_rated' ? 'lowest_rated' : 'highest_rated');
    }
  };

  // Load comments
  const loadComments = useCallback(async () => {
    const requestId = ++commentsLoadRequestId.current;
    setLoading(true);
    try {
      console.log('💬 [ContentComments] Loading comments:', { contentId, sortBy });
      const { data } = await apolloClient.query<{ commentsByContent: Comment[] }>({
        query: GET_COMMENTS,
        variables: { contentId, sortBy },
        fetchPolicy: 'network-only',
      });
      if (requestId !== commentsLoadRequestId.current) return;
      setComments(data?.commentsByContent || []);
      console.log('✅ [ContentComments] Comments loaded:', data?.commentsByContent?.length || 0);
    } catch (e) {
      if (requestId === commentsLoadRequestId.current) {
        console.error('❌ [ContentComments] Error loading comments:', e);
      }
    } finally {
      if (requestId === commentsLoadRequestId.current) {
        setLoading(false);
      }
    }
  }, [contentId, sortBy]);

  useEffect(() => {
    loadComments();

    // Listen for internal app events to refetch comments
    const handleRefetch = () => {
      loadComments();
    };

    window.addEventListener('refetchComments', handleRefetch);
    return () => {
      commentsLoadRequestId.current += 1;
      window.removeEventListener('refetchComments', handleRefetch);
    };
  }, [loadComments]);

  // Create new comment
  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const mentionedUserIds = collectMentionedUserIds(newComment, newCommentMentions);
    setSubmitting(true);
    try {
      const { data } = await apolloClient.mutate<{ createComment: Comment }>({
        mutation: CREATE_COMMENT,
        variables: {
          input: {
            contentId,
            text: newComment.trim(),
            isPublic: newCommentIsPublic,
            isSpoiler: newCommentIsSpoiler,
            ...(mentionedUserIds.length > 0 && { mentionedUserIds }),
          },
        },
      });
      if (data?.createComment) {
        setComments((prev) => [data.createComment, ...prev]);
        setNewComment('');
        setNewCommentIsPublic(true);
        setNewCommentIsSpoiler(false);
        setNewCommentMentions([]);
        setShowCreateForm(false);
        newMention.closeMention();
        const textarea = document.getElementById('comment-input');
        if (textarea) {
          (textarea as HTMLTextAreaElement).style.height = 'auto';
        }
        console.log('✅ [ContentComments] Comment created:', {
          commentId: data.createComment.id,
          isPublic: data.createComment.isPublic,
          isSpoiler: data.createComment.isSpoiler,
        });
      }
    } catch (e) {
      console.error('❌ [ContentComments] Error creating comment:', e);
      toast.error(t('errors.create'));
    } finally {
      setSubmitting(false);
    }
  };

  // Vote on comment
  const handleVote = async (commentId: number, voteType: number) => {
    if (!user) return;

    try {
      const { data } = await apolloClient.mutate<{ voteDiscussion: Partial<Comment> }>({
        mutation: VOTE_DISCUSSION,
        variables: { id: Number(commentId), voteType },
      });
      if (data?.voteDiscussion) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, ...data.voteDiscussion } : c))
        );
      }
    } catch (e) {
      console.error('Error voting:', e);
    }
  };

  // Action Handlers
  const handleEditStart = (
    commentId: number,
    currentContent: string,
    currentIsPublic: boolean,
    currentIsSpoiler: boolean
  ) => {
    setEditingCommentId(commentId);
    setEditContent(currentContent);
    setEditCommentIsPublic(currentIsPublic);
    setEditCommentIsSpoiler(currentIsSpoiler);
    setEditCommentMentions([]);
    setActiveDropdown(null);
    editMention.closeMention();
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditContent('');
    setEditCommentIsPublic(true);
    setEditCommentIsSpoiler(false);
    setEditCommentMentions([]);
    editMention.closeMention();
  };

  const handleEditSubmit = async (commentId: number) => {
    if (!editContent.trim()) return;

    // Optimistic update
    const originalComments = [...comments];
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              description: editContent.trim(),
              isPublic: editCommentIsPublic,
              isSpoiler: editCommentIsSpoiler,
            }
          : c
      )
    );
    setEditingCommentId(null);

    try {
      const { data } = await apolloClient.mutate<{ updateDiscussion: Partial<Comment> }>({
        mutation: UPDATE_DISCUSSION,
        variables: {
          input: {
            id: Number(commentId),
            description: editContent.trim(),
            isPublic: editCommentIsPublic,
            isSpoiler: editCommentIsSpoiler,
          },
        },
      });
      if (data?.updateDiscussion) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, ...data.updateDiscussion } : c))
        );
      }
    } catch (e) {
      console.error('Error updating comment:', e);
      toast.error(t('errors.update'));
      setComments(originalComments);
    }
  };

  const handleDelete = async (commentId: number) => {
    setActiveDropdown(null);
    setDeleteConfirmId(null);

    // Optimistic update
    const originalComments = [...comments];
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    try {
      await apolloClient.mutate<{ deleteDiscussion: boolean }>({
        mutation: DELETE_DISCUSSION,
        variables: { id: Number(commentId) },
      });
    } catch (e) {
      console.error('Error deleting comment:', e);
      toast.error(t('errors.delete'));
      setComments(originalComments);
    }
  };

  const handleReport = (comment: Comment) => {
    setActiveDropdown(null);
    setReportingComment(comment);
  };

  const formatPlaytime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return t('timeFormats.hoursAndMins', { h, m });
    if (h > 0) return t('timeFormats.hours', { h });
    return t('timeFormats.mins', { m });
  };

  const revealSpoilerComment = (commentId: number) => {
    console.log('👁️ [ContentComments] Spoiler comment revealed:', commentId);
    setRevealedSpoilerIds((prev) => new Set(prev).add(commentId));
  };

  const handleCommentCardClick = (event: React.MouseEvent<HTMLDivElement>, comment: Comment) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-mention-link="true"]')) {
      return;
    }

    const isHiddenSpoiler = comment.isSpoiler && !isConsumed && !revealedSpoilerIds.has(comment.id);

    if (isHiddenSpoiler) {
      event.preventDefault();
      revealSpoilerComment(comment.id);
      return;
    }

    router.push(`/discussion/${comment.id}`);
  };

  const openCreateCommentForm = useCallback(() => {
    if (!user) {
      requireAuth(t('actions.comment'));
      return;
    }

    setShowCreateForm(true);
    setTimeout(() => {
      const input = document.getElementById('comment-input');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [user, requireAuth, t]);

  return (
    <div className="content-review-section mb-8">
      <div className="content-review-panel glass-card overflow-hidden">
      <div className="content-review-header p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Reviews &amp; discussions</h2>
          </div>
          <div className="content-review-counts">
            <span>{comments.length} reviews</span>
            <span>{discussionsCount} discussions</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSortClick('date')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                sortBy === 'newest' || sortBy === 'oldest'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              {t('sort.date')}
              {(sortBy === 'newest' || sortBy === 'oldest') &&
                (sortBy === 'newest' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
            </button>

            <button
              onClick={() => handleSortClick('vote')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                sortBy === 'top' || sortBy === 'bottom'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              {t('sort.votes')}
              {(sortBy === 'top' || sortBy === 'bottom') &&
                (sortBy === 'top' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
            </button>

            <button
              onClick={() => handleSortClick('rating')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                sortBy === 'highest_rated' || sortBy === 'lowest_rated'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              {t('sort.rating')}
              {(sortBy === 'highest_rated' || sortBy === 'lowest_rated') &&
                (sortBy === 'highest_rated' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onSwitchTab && (
              <button
                onClick={onSwitchTab}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
              >
                {discussionsCount > 0
                  ? t('viewDiscussionsCount', { count: discussionsCount })
                  : t('viewDiscussions')}
              </button>
            )}

            {user ? (
              <button
                onClick={() => {
                  if (showCreateForm) {
                    setShowCreateForm(false);
                    return;
                  }

                  openCreateCommentForm();
                }}
                className="flex items-center gap-2 px-4 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
              >
                {t('newComment')}
              </button>
            ) : (
              <button
                onClick={() => requireAuth(t('actions.comment'))}
                className="flex items-center gap-2 px-4 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
              >
                {t('newComment')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create Comment Form - Compact */}
      {user && showCreateForm && (
        <form onSubmit={handleCreateComment} className="glass-card p-5">
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
              <div className="relative bg-black/20 rounded-xl border border-white/10 focus-within:border-violet-500 transition-colors shadow-inner">
                <textarea
                  id="comment-input"
                  value={newComment}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewComment(val);
                    newMention.onTextChange(val, e.target.selectionStart ?? val.length);
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 240)}px`;
                  }}
                  onBlur={() => setTimeout(newMention.closeMention, 150)}
                  placeholder={t('placeholder')}
                  rows={3}
                  className="w-full px-4 pt-3 pb-14 bg-transparent text-white placeholder-white/40 focus:outline-none resize-none overflow-y-auto"
                  style={{ minHeight: '100px' }}
                />
                <MentionDropdown
                  active={newMention.mentionActive}
                  query={newMention.mentionQuery}
                  results={newMention.mentionResults}
                  loading={newMention.mentionLoading}
                  onSelect={(u) =>
                    newMention.selectUser(u, newComment, setNewComment, setNewCommentMentions)
                  }
                />

                <div className="absolute bottom-2 right-2 flex items-center justify-end gap-3 z-10">
                  <VisibilitySwitch
                    isPublic={newCommentIsPublic}
                    onChange={setNewCommentIsPublic}
                    disabled={submitting}
                    className="shrink-0"
                    iconOnly
                  />
                  <SpoilerSwitch
                    isSpoiler={newCommentIsSpoiler}
                    onChange={setNewCommentIsSpoiler}
                    disabled={submitting}
                    className="shrink-0"
                    iconOnly
                    variant="checkbox"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-1.5 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {t('actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newComment.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-md"
                  >
                    <Send size={14} />
                    {submitting ? t('actions.sending') : t('actions.send')}
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
      {!loading && comments.length === 0 && (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-4">💬</div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('emptyState.title')}</h3>
          <p className="text-white/60 mb-6">{t('emptyState.description')}</p>
          <button
            onClick={openCreateCommentForm}
            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            {t('actions.addComment')}
          </button>
        </div>
      )}

      {/* Comments List */}
      {!loading && comments.length > 0 && (
        <div className="content-review-list divide-y divide-white/10">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="content-review-item p-5 sm:p-6 hover:bg-white/5 transition-colors cursor-pointer group"
              onClick={(event) => handleCommentCardClick(event, comment)}
            >
              <div className="flex gap-4">
                {/* Vote Buttons */}
                <div className="flex flex-col items-center justify-center gap-1 self-stretch w-8">
                  {user?.id !== comment.authorId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(comment.id, comment.userVote === 1 ? 0 : 1);
                      }}
                      disabled={!user}
                      className={`p-1 rounded transition-colors ${
                        comment.userVote === 1
                          ? 'text-orange-500'
                          : 'text-white/40 hover:text-orange-500'
                      } ${!user && 'opacity-50 cursor-not-allowed'}`}
                    >
                      <ChevronUp size={24} />
                    </button>
                  )}
                  <span
                    className={`text-sm font-semibold ${
                      comment.score > 0
                        ? 'text-orange-500'
                        : comment.score < 0
                          ? 'text-blue-500'
                          : 'text-white/60'
                    }`}
                  >
                    {comment.score}
                  </span>
                  {user?.id !== comment.authorId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(comment.id, comment.userVote === -1 ? 0 : -1);
                      }}
                      disabled={!user}
                      className={`p-1 rounded transition-colors ${
                        comment.userVote === -1
                          ? 'text-blue-500'
                          : 'text-white/40 hover:text-blue-500'
                      } ${!user && 'opacity-50 cursor-not-allowed'}`}
                    >
                      <ChevronDown size={24} />
                    </button>
                  )}
                </div>

                {/* Content & Actions */}
                <div className="flex-1 min-w-0 relative">
                  {/* Dropdown menu */}
                  {user && (
                    <div className="absolute -top-1 right-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === comment.id ? null : comment.id);
                          setDeleteConfirmId(null);
                        }}
                        className={`text-white/40 hover:text-white p-1 rounded transition-opacity ${activeDropdown === comment.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title={t('moreOptions')}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeDropdown === comment.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-surface-raised border border-white/10 rounded-lg shadow-xl overflow-hidden z-20">
                          {user.id === comment.authorId ? (
                            <>
                              {deleteConfirmId === comment.id ? (
                                <div className="p-3 text-xs text-center border-t border-white/10">
                                  <p className="mb-2 text-white/80">{t('areYouSure')}</p>
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(null);
                                      }}
                                      className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                                    >
                                      {t('actions.cancel')}
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(comment.id);
                                      }}
                                      className="px-3 py-1 bg-red-500/80 text-white rounded hover:bg-red-500 transition-colors"
                                    >
                                      {t('actions.delete')}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEditStart(
                                        comment.id,
                                        comment.description,
                                        comment.isPublic,
                                        comment.isSpoiler
                                      );
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 flex items-center gap-2"
                                  >
                                    <Edit2 size={14} />
                                    {t('actions.edit')}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDeleteConfirmId(comment.id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2"
                                  >
                                    <Trash2 size={14} />
                                    {t('actions.delete')}
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleReport(comment);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-orange-400/10 flex items-center gap-2"
                            >
                              <Flag size={14} />
                              {t('actions.report')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="content-review-author mb-3 flex items-center gap-3 pr-8">
                    <Link
                      href={`/profile/${comment.author.username}`}
                      onClick={(event) => event.stopPropagation()}
                      className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors"
                    >
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-violet-500 ring-1 ring-white/10">
                        {comment.author.picturePath ? (
                          <Image
                            src={comment.author.picturePath}
                            alt={comment.author.username}
                            width={32}
                            height={32}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                            {comment.author.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {comment.author.username}
                    </Link>
                    <span className="text-xs text-white/35">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                    {comment.authorRating != null && (
                      <span
                        className="flex items-center gap-1 text-xs text-amber-300"
                        title={t('tooltips.givenRating')}
                      >
                        <Star size={13} className="fill-current" />
                        {comment.authorRating}
                      </span>
                    )}
                    {comment.authorIsFavorite && (
                      <span title={t('tooltips.addedToFavorites')}>
                        <Heart size={13} className="fill-current text-pink-400" />
                      </span>
                    )}
                  </div>

                  {editingCommentId === comment.id ? (
                    <div className="mb-3 pr-8" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <textarea
                          value={editContent}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditContent(val);
                            editMention.onTextChange(val, e.target.selectionStart ?? val.length);
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${Math.min(target.scrollHeight, 240)}px`;
                          }}
                          onBlur={() => setTimeout(editMention.closeMention, 150)}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none text-sm overflow-y-auto"
                          rows={3}
                          style={{ minHeight: '88px' }}
                        />
                        <MentionDropdown
                          active={editMention.mentionActive}
                          query={editMention.mentionQuery}
                          results={editMention.mentionResults}
                          loading={editMention.mentionLoading}
                          onSelect={(u) =>
                            editMention.selectUser(
                              u,
                              editContent,
                              setEditContent,
                              setEditCommentMentions
                            )
                          }
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <VisibilitySwitch
                          isPublic={editCommentIsPublic}
                          onChange={setEditCommentIsPublic}
                          className="mr-auto"
                          iconOnly
                        />
                        <SpoilerSwitch
                          isSpoiler={editCommentIsSpoiler}
                          onChange={setEditCommentIsSpoiler}
                          iconOnly
                          variant="checkbox"
                        />
                        <button
                          onClick={handleEditCancel}
                          className="px-3 py-1.5 text-xs bg-white/5 text-white/80 rounded hover:bg-white/10 transition-colors"
                        >
                          {t('actions.cancel')}
                        </button>
                        <button
                          onClick={() => handleEditSubmit(comment.id)}
                          className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors"
                        >
                          {t('actions.save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 pr-8">
                      {!comment.isPublic && user?.id === comment.authorId && (
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <VisibilityBadge isPublic={false} />
                        </div>
                      )}
                      <SpoilerText
                        text={comment.description}
                        isSpoiler={comment.isSpoiler}
                        revealByDefault={isConsumed}
                        revealed={isConsumed || revealedSpoilerIds.has(comment.id)}
                        onReveal={() => revealSpoilerComment(comment.id)}
                        className="text-white/80 text-[15px] whitespace-pre-wrap"
                      />
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/40">
                    {comment.authorPlaytimeMinutes != null && (
                      <span className="flex items-center gap-1" title={t('tooltips.playtime')}>
                        <Clock size={13} />
                        {formatPlaytime(comment.authorPlaytimeMinutes)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void toggleReplies(comment);
                      }}
                      className={`flex items-center gap-1 hover:text-white/80 transition-colors ${getCommentCountClass(comment.commentCount)} ${getCommentCountWeight(comment.commentCount)}`}
                    >
                      <MessageSquare size={14} />
                      {expandedReplyIds.has(comment.id)
                        ? t('hideReplies')
                        : t('replies', { count: comment.commentCount })}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!user) {
                          requireAuth('reply');
                          return;
                        }
                        setReplyingTo(replyingTo === comment.id ? null : comment.id);
                        setReplyText('');
                        if (!expandedReplyIds.has(comment.id)) {
                          if (repliesByCommentId[comment.id] === undefined) {
                            void toggleReplies(comment);
                          } else {
                            setExpandedReplyIds((previous) => new Set(previous).add(comment.id));
                          }
                        }
                      }}
                      className="text-sm text-violet-300 hover:text-violet-200 transition-colors"
                    >
                      {t('actions.reply')}
                    </button>
                    <Link
                      href={`/discussion/${comment.id}` as any}
                      onClick={(event) => event.stopPropagation()}
                      className="text-sm text-white/40 hover:text-white/80 transition-colors"
                    >
                      Discussion
                    </Link>
                    {comment.isSpoiler && <SpoilerBadge />}
                  </div>
                </div>
              </div>
              {expandedReplyIds.has(comment.id) && (
                <div
                  className="mt-4 ml-12 space-y-3 border-l border-white/10 pl-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  {(repliesByCommentId[comment.id] || []).map((reply) => (
                    <div key={reply.id} className="rounded-lg bg-white/[0.03] p-3">
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <span className="font-semibold text-white/80">{reply.author.username}</span>
                        <span className="text-white/35">{formatRelativeTime(reply.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-white/70">{reply.text}</p>
                      {reply.replies?.map((nestedReply) => (
                        <div
                          key={nestedReply.id}
                          className="mt-2 ml-4 border-l border-white/10 pl-3"
                        >
                          <div className="mb-1 flex items-center gap-2 text-xs">
                            <span className="font-semibold text-white/80">
                              {nestedReply.author.username}
                            </span>
                            <span className="text-white/35">
                              {formatRelativeTime(nestedReply.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-white/70">
                            {nestedReply.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                  {replyingTo === comment.id && (
                    <div className="flex items-end gap-2">
                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        rows={2}
                        placeholder={t('replyPlaceholder')}
                        className="min-h-10 flex-1 resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-violet-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void submitReply(comment)}
                        disabled={replySubmitting || !replyText.trim()}
                        className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {replySubmitting ? t('actions.sending') : t('actions.send')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </div>

      {reportingComment && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportingComment(null)}
          targetId={reportingComment.id.toString()}
          targetType="DISCUSSION"
          targetTitle={t('reportTarget')}
        />
      )}
    </div>
  );
}
