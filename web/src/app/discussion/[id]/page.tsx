'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import SpoilerBadge from '@/components/atoms/SpoilerBadge';
import SpoilerSwitch from '@/components/atoms/SpoilerSwitch';
import SpoilerText from '@/components/atoms/SpoilerText';
import VisibilityBadge from '@/components/atoms/VisibilityBadge';
import VisibilitySwitch from '@/components/atoms/VisibilitySwitch';
import { apolloClient } from '@/lib/apollo-client';
import { gql } from '@apollo/client';
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Send,
  Clock,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  Flag,
} from 'lucide-react';
import { getCommentCountClass, getCommentCountWeight } from '@/lib/comment-count-utils';
import ReportModal from '@/components/organisms/ReportModal';
import { useTranslations, useLocale } from 'next-intl';

const SEARCH_USERS = gql`
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      picturePath
    }
  }
`;

// GraphQL Queries
const GET_DISCUSSION = gql`
  query GetDiscussion($id: Int!) {
    discussion(id: $id) {
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
      createdAt
      author {
        id
        username
        picturePath
      }
      content {
        id
        title
        posterUrl
        contentTypeId
      }
    }
  }
`;

const GET_DISCUSSION_COMMENTS = gql`
  query GetDiscussionComments($discussionId: Int!) {
    discussionComments(discussionId: $discussionId) {
      id
      discussionId
      authorId
      text
      parentId
      upvoteCount
      downvoteCount
      score
      userVote
      createdAt
      author {
        id
        username
        picturePath
      }
      mentions {
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
        upvoteCount
        downvoteCount
        score
        userVote
        createdAt
        author {
          id
          username
          picturePath
        }
        mentions {
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
          upvoteCount
          downvoteCount
          score
          userVote
          createdAt
          author {
            id
            username
            picturePath
          }
          mentions {
            id
            username
            picturePath
          }
        }
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

const CREATE_COMMENT = gql`
  mutation CreateDiscussionComment($input: CreateDiscussionCommentInput!) {
    createDiscussionComment(input: $input) {
      id
      discussionId
      authorId
      text
      parentId
      upvoteCount
      downvoteCount
      score
      userVote
      createdAt
      author {
        id
        username
        picturePath
      }
      mentions {
        id
        username
        picturePath
      }
    }
  }
`;

const VOTE_COMMENT = gql`
  mutation VoteDiscussionComment($id: Int!, $voteType: Int!) {
    voteDiscussionComment(id: $id, voteType: $voteType) {
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
      title
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

const UPDATE_COMMENT = gql`
  mutation UpdateDiscussionComment($input: UpdateDiscussionCommentInput!) {
    updateDiscussionComment(input: $input) {
      id
      text
      updatedAt
      mentions {
        id
        username
        picturePath
      }
    }
  }
`;

const DELETE_COMMENT = gql`
  mutation DeleteDiscussionComment($id: Int!) {
    deleteDiscussionComment(id: $id)
  }
`;

const REPORT_COMMENT = gql`
  mutation ReportDiscussionComment($id: Int!, $reason: String!) {
    reportDiscussionComment(id: $id, reason: $reason)
  }
`;

const GET_USER_CONTENT_LOG = gql`
  query GetUserContentLog($contentId: String!) {
    userContentLog(contentId: $contentId) {
      id
      isConsumed
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

const GET_COMMENT_VOTERS = gql`
  query GetCommentVoters($commentId: Int!) {
    discussionCommentVoters(commentId: $commentId) {
      id
      username
      picturePath
      voteType
    }
  }
`;

interface Author {
  id: string;
  username: string;
  picturePath: string | null;
}

interface MentionRange {
  start: number;
  end: number;
}

interface DiscussionComment {
  id: number;
  discussionId: number;
  authorId: string;
  text: string;
  parentId: number | null;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  userVote: number | null;
  createdAt: string;
  author: Author;
  mentions?: Author[];
  replies?: DiscussionComment[];
}

interface Discussion {
  id: number;
  contentId: string | null;
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
  createdAt: string;
  author: Author;
  content: {
    id: string;
    title: string;
    posterUrl: string | null;
    contentTypeId?: number;
  } | null;
}

interface Voter {
  id: string;
  username: string;
  picturePath: string | null;
  voteType: number;
}

type MentionTarget = 'new' | 'reply' | 'edit' | null;

const MENTION_REGEX = /@([A-Za-z0-9_.-]+)/g;

function getMentionTrigger(
  text: string,
  caretPosition: number
): (MentionRange & { query: string }) | null {
  const beforeCaret = text.slice(0, caretPosition);
  const match = beforeCaret.match(/(^|\s)@([A-Za-z0-9_.-]*)$/);
  if (!match) return null;

  const query = match[2] ?? '';
  const start = beforeCaret.length - query.length - 1;
  const end = caretPosition;
  return { start, end, query };
}

function collectMentionedUserIds(text: string, selectedUsers: Author[]): string[] {
  const usernamesInText = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    if (match[1]) usernamesInText.add(match[1].toLowerCase());
  }

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const user of selectedUsers) {
    if (usernamesInText.has(user.username.toLowerCase()) && !seen.has(user.id)) {
      seen.add(user.id);
      ids.push(user.id);
    }
  }
  return ids;
}

export default function DiscussionDetailPage() {
  const t = useTranslations('DiscussionDetailPage');
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const discussionId = parseInt(params.id as string, 10);
  const { user } = useAuth();

  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [comments, setComments] = useState<DiscussionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isConsumed, setIsConsumed] = useState(false);
  const [votersDialogOpen, setVotersDialogOpen] = useState(false);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [votingForType, setVotingForType] = useState<'discussion' | 'comment'>('discussion');
  const [votingForId, setVotingForId] = useState<number | null>(null);

  // Action states for Main Discussion
  const [editingDiscussion, setEditingDiscussion] = useState(false);
  const [editDiscussionTitle, setEditDiscussionTitle] = useState('');
  const [editDiscussionContent, setEditDiscussionContent] = useState('');
  const [editDiscussionIsPublic, setEditDiscussionIsPublic] = useState(true);
  const [editDiscussionIsSpoiler, setEditDiscussionIsSpoiler] = useState(false);
  const [discussionDropdownOpen, setDiscussionDropdownOpen] = useState(false);
  const [deleteDiscussionConfirm, setDeleteDiscussionConfirm] = useState(false);
  const [reportingDiscussionId, setReportingDiscussionId] = useState<number | null>(null);

  // Action states for Comments
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [activeCommentDropdown, setActiveCommentDropdown] = useState<number | null>(null);
  const [deleteCommentConfirmId, setDeleteCommentConfirmId] = useState<number | null>(null);
  const [reportingCommentId, setReportingCommentId] = useState<number | null>(null);
  const [newCommentMentions, setNewCommentMentions] = useState<Author[]>([]);
  const [replyMentions, setReplyMentions] = useState<Author[]>([]);
  const [editCommentMentions, setEditCommentMentions] = useState<Author[]>([]);
  const [mentionTarget, setMentionTarget] = useState<MentionTarget>(null);
  const [mentionRange, setMentionRange] = useState<MentionRange | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<Author[]>([]);
  const [collapsedCommentThreads, setCollapsedCommentThreads] = useState<Set<number>>(new Set());
  const [mentionLoading, setMentionLoading] = useState(false);

  const closeMentionMenu = useCallback(() => {
    setMentionTarget(null);
    setMentionRange(null);
    setMentionQuery('');
    setMentionResults([]);
    setMentionLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMentionResults() {
      if (!mentionTarget || mentionQuery.trim().length < 2 || !user) {
        setMentionResults([]);
        setMentionLoading(false);
        return;
      }

      setMentionLoading(true);
      try {
        const { data } = await apolloClient.query<{ searchUsers: Author[] }>({
          query: SEARCH_USERS,
          variables: { query: mentionQuery.trim(), limit: 8 },
          fetchPolicy: 'network-only',
        });

        if (!cancelled) {
          setMentionResults(
            (data?.searchUsers || []).filter((candidate) => candidate.id !== user.id)
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error searching mention users:', error);
          setMentionResults([]);
        }
      } finally {
        if (!cancelled) setMentionLoading(false);
      }
    }

    const timeout = setTimeout(loadMentionResults, 120);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [mentionQuery, mentionTarget, user]);

  // Load discussion and comments
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [discussionRes, commentsRes] = await Promise.all([
          apolloClient.query<{ discussion: Discussion }>({
            query: GET_DISCUSSION,
            variables: { id: discussionId },
            fetchPolicy: 'network-only',
          }),
          apolloClient.query<{ discussionComments: DiscussionComment[] }>({
            query: GET_DISCUSSION_COMMENTS,
            variables: { discussionId },
            fetchPolicy: 'network-only',
          }),
        ]);
        setDiscussion(discussionRes.data?.discussion || null);
        setComments(commentsRes.data?.discussionComments || []);
      } catch (e) {
        console.error('Error loading discussion:', e);
      } finally {
        setLoading(false);
      }
    }
    if (discussionId) load();
  }, [discussionId]);

  // Bildirimden gelen #comment-{id} hash anchor'ına scroll yap
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (!hash) return;
    const targetId = hash.replace('#', '');
    const el = document.getElementById(targetId);
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-comment');
        setTimeout(() => el.classList.remove('highlight-comment'), 2500);
      }, 300);
    }
  }, [loading]);

  // Load consumed status to determine whether spoiler comments should be revealed.
  useEffect(() => {
    async function loadConsumedStatus() {
      if (!user || !discussion?.contentId) return;
      try {
        const { data } = await apolloClient.query<{
          userContentLog: { isConsumed?: boolean | null };
        }>({
          query: GET_USER_CONTENT_LOG,
          variables: { contentId: discussion.contentId },
          fetchPolicy: 'network-only',
        });
        setIsConsumed(Boolean(data?.userContentLog?.isConsumed));
      } catch (e) {
        console.error('Error loading consumed status:', e);
      }
    }
    loadConsumedStatus();
  }, [user, discussion?.contentId]);

  const handleOpenVotersDialog = async (type: 'discussion' | 'comment', id: number) => {
    setVotingForType(type);
    setVotingForId(id);
    setVotersDialogOpen(true);
    setLoadingVoters(true);
    try {
      const query = type === 'discussion' ? GET_DISCUSSION_VOTERS : GET_COMMENT_VOTERS;
      const variable =
        type === 'discussion' ? { discussionId: Number(id) } : { commentId: Number(id) };
      const { data } = await apolloClient.query<{
        discussionVoters: Voter[];
        discussionCommentVoters: Voter[];
      }>({
        query,
        variables: variable,
        fetchPolicy: 'network-only',
      });
      const voterData =
        type === 'discussion' ? data?.discussionVoters : data?.discussionCommentVoters;
      setVoters(voterData || []);
    } catch (e) {
      console.error('Error loading voters:', e);
      setVoters([]);
    } finally {
      setLoadingVoters(false);
    }
  };

  const handleVoteDiscussion = async (voteType: number) => {
    if (!user || !discussion) return;
    try {
      const { data } = await apolloClient.mutate<{ voteDiscussion: Partial<Discussion> }>({
        mutation: VOTE_DISCUSSION,
        variables: { id: Number(discussion.id), voteType },
      });
      if (data?.voteDiscussion) {
        setDiscussion((prev) => (prev ? { ...prev, ...data.voteDiscussion } : null));
      }
    } catch (e) {
      console.error('Error voting:', e);
    }
  };

  const handleVoteComment = async (commentId: number, voteType: number) => {
    if (!user) return;
    try {
      const { data } = await apolloClient.mutate<{
        voteDiscussionComment: Partial<DiscussionComment>;
      }>({
        mutation: VOTE_COMMENT,
        variables: { id: Number(commentId), voteType },
      });
      if (data?.voteDiscussionComment) {
        updateCommentInTree(commentId, data.voteDiscussionComment);
      }
    } catch (e) {
      console.error('Error voting comment:', e);
    }
  };

  const updateCommentInTree = (commentId: number, updates: Partial<DiscussionComment>) => {
    const updateRecursive = (comments: DiscussionComment[]): DiscussionComment[] =>
      comments.map((c) => {
        if (c.id === commentId) {
          return { ...c, ...updates };
        }
        if (c.replies) {
          return { ...c, replies: updateRecursive(c.replies) };
        }
        return c;
      });
    setComments(updateRecursive);
  };

  const updateMentionState = useCallback(
    (target: MentionTarget, text: string, caretPosition: number) => {
      const trigger = getMentionTrigger(text, caretPosition);
      if (!target || !trigger) {
        closeMentionMenu();
        return;
      }

      setMentionTarget(target);
      setMentionRange({ start: trigger.start, end: trigger.end });
      setMentionQuery(trigger.query);
    },
    [closeMentionMenu]
  );

  const handleMentionSelect = (mentionedUser: Author) => {
    if (!mentionTarget || !mentionRange) return;

    const replacement = `@${mentionedUser.username} `;

    const applySelection = (
      currentText: string,
      setText: React.Dispatch<React.SetStateAction<string>>,
      setMentionUsers: React.Dispatch<React.SetStateAction<Author[]>>
    ) => {
      const nextText =
        currentText.slice(0, mentionRange.start) +
        replacement +
        currentText.slice(mentionRange.end);

      setText(nextText);
      setMentionUsers((prev) => {
        if (prev.some((userItem) => userItem.id === mentionedUser.id)) return prev;
        return [...prev, mentionedUser];
      });
    };

    if (mentionTarget === 'new') {
      applySelection(newComment, setNewComment, setNewCommentMentions);
    } else if (mentionTarget === 'reply') {
      applySelection(replyText, setReplyText, setReplyMentions);
    } else if (mentionTarget === 'edit') {
      applySelection(editCommentText, setEditCommentText, setEditCommentMentions);
    }

    closeMentionMenu();
  };

  const renderMentionDropdown = () => {
    if (!mentionTarget || mentionQuery.length < 1) return null;

    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-white/10 bg-surface-raised shadow-xl">
        {mentionLoading ? (
          <div className="px-3 py-2 text-sm text-white/50">{t('searchingUsers')}</div>
        ) : mentionResults.length > 0 ? (
          mentionResults.map((mentionedUser) => (
            <button
              key={mentionedUser.id}
              type="button"
              onClick={() => handleMentionSelect(mentionedUser)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/5"
            >
              <div className="h-7 w-7 overflow-hidden rounded-full bg-violet-500/20">
                {mentionedUser.picturePath ? (
                  <Image
                    src={mentionedUser.picturePath}
                    alt=""
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-violet-300">
                    {mentionedUser.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-sm text-white/85">@{mentionedUser.username}</span>
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-white/50">{t('noMatchingUsers')}</div>
        )}
      </div>
    );
  };

  const renderCommentText = (comment: DiscussionComment) => {
    const mentionMap = new Map(
      (comment.mentions || []).map((mentionedUser) => [
        mentionedUser.username.toLowerCase(),
        mentionedUser,
      ])
    );
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const match of comment.text.matchAll(MENTION_REGEX)) {
      const fullMatch = match[0];
      const username = match[1];
      const index = match.index ?? -1;
      if (index < 0) continue;

      if (index > lastIndex) {
        nodes.push(comment.text.slice(lastIndex, index));
      }

      const mentionedUser = mentionMap.get(username.toLowerCase());
      if (mentionedUser) {
        nodes.push(
          <Link
            key={`${comment.id}-${index}-${username}`}
            href={`/profile/${mentionedUser.username}`}
            className="font-medium text-violet-300 hover:text-violet-200"
          >
            {fullMatch}
          </Link>
        );
      } else {
        nodes.push(fullMatch);
      }

      lastIndex = index + fullMatch.length;
    }

    if (lastIndex < comment.text.length) {
      nodes.push(comment.text.slice(lastIndex));
    }

    return <p className="text-white/80 text-[15px] whitespace-pre-wrap pr-6">{nodes}</p>;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const mentionedUserIds = collectMentionedUserIds(newComment, newCommentMentions);
    setSubmitting(true);
    try {
      const { data } = await apolloClient.mutate<{ createDiscussionComment: DiscussionComment }>({
        mutation: CREATE_COMMENT,
        variables: {
          input: {
            discussionId: Number(discussionId),
            text: newComment.trim(),
            mentionedUserIds,
          },
        },
      });
      if (data?.createDiscussionComment) {
        setComments((prev) => [...prev, { ...data.createDiscussionComment, replies: [] }]);
        setNewComment('');
        setNewCommentMentions([]);
        setReplyingTo(null);
        closeMentionMenu();
      }
    } catch (e) {
      console.error('Error creating comment:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyText.trim() || !user) return;

    const mentionedUserIds = collectMentionedUserIds(replyText, replyMentions);
    setSubmitting(true);
    try {
      const { data } = await apolloClient.mutate<{ createDiscussionComment: DiscussionComment }>({
        mutation: CREATE_COMMENT,
        variables: {
          input: {
            discussionId: Number(discussionId),
            text: replyText.trim(),
            parentId: Number(parentId),
            mentionedUserIds,
          },
        },
      });
      if (data?.createDiscussionComment) {
        // Add reply to the tree
        const addReply = (comments: DiscussionComment[]): DiscussionComment[] =>
          comments.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), { ...data.createDiscussionComment, replies: [] }],
              };
            }
            if (c.replies) {
              return { ...c, replies: addReply(c.replies) };
            }
            return c;
          });
        setComments(addReply);
        setReplyText('');
        setReplyMentions([]);
        setReplyingTo(null);
        closeMentionMenu();
      }
    } catch (e) {
      console.error('Error creating reply:', e);
    } finally {
      setSubmitting(false);
    }
  };

  // Action Handlers for Main Discussion
  const handleEditDiscussionStart = () => {
    if (!discussion) return;
    setEditingDiscussion(true);
    setEditDiscussionTitle(discussion.title || '');
    setEditDiscussionContent(discussion.description);
    setEditDiscussionIsPublic(discussion.isPublic);
    setEditDiscussionIsSpoiler(discussion.isSpoiler);
    setDiscussionDropdownOpen(false);
  };

  const handleEditDiscussionCancel = () => {
    setEditingDiscussion(false);
    setEditDiscussionTitle('');
    setEditDiscussionContent('');
    setEditDiscussionIsPublic(true);
    setEditDiscussionIsSpoiler(false);
  };

  const handleEditDiscussionSubmit = async () => {
    if (!discussion || !editDiscussionContent.trim()) return;

    const originalDiscussion = { ...discussion };
    const newTitle = discussion.title !== null ? editDiscussionTitle.trim() : null;
    setDiscussion({
      ...discussion,
      title: newTitle,
      description: editDiscussionContent.trim(),
      isPublic: editDiscussionIsPublic,
      isSpoiler: editDiscussionIsSpoiler,
    });
    setEditingDiscussion(false);

    try {
      const inputData: any = {
        id: Number(discussion.id),
        description: editDiscussionContent.trim(),
      };
      if (discussion.title !== null) {
        inputData.title = editDiscussionTitle.trim();
      }
      inputData.isPublic = editDiscussionIsPublic;
      inputData.isSpoiler = editDiscussionIsSpoiler;

      const { data } = await apolloClient.mutate<{ updateDiscussion: Partial<Discussion> }>({
        mutation: UPDATE_DISCUSSION,
        variables: { input: inputData },
      });
      if (data?.updateDiscussion) {
        setDiscussion((prev) => (prev ? { ...prev, ...data.updateDiscussion } : null));
      }
    } catch (e) {
      console.error('Error updating discussion:', e);
      alert(t('updateError'));
      setDiscussion(originalDiscussion);
    }
  };

  const handleDeleteDiscussion = async () => {
    if (!discussion) return;
    setDiscussionDropdownOpen(false);
    setDeleteDiscussionConfirm(false);

    try {
      await apolloClient.mutate<{ deleteDiscussion: boolean }>({
        mutation: DELETE_DISCUSSION,
        variables: { id: Number(discussion.id) },
      });
      router.push('/discussions');
    } catch (e) {
      console.error('Error deleting discussion:', e);
      alert(t('deleteError'));
    }
  };

  const handleReportDiscussion = () => {
    if (!discussion) return;
    setDiscussionDropdownOpen(false);
    setReportingDiscussionId(discussion.id);
  };

  // Action Handlers for Comments
  const handleEditCommentStart = (commentId: number, currentText: string) => {
    const findCommentById = (items: DiscussionComment[]): DiscussionComment | null => {
      for (const item of items) {
        if (item.id === commentId) return item;
        if (item.replies?.length) {
          const nested = findCommentById(item.replies);
          if (nested) return nested;
        }
      }
      return null;
    };

    setEditingCommentId(commentId);
    setEditCommentText(currentText);
    setEditCommentMentions(findCommentById(comments)?.mentions || []);
    setActiveCommentDropdown(null);
  };

  const handleEditCommentCancel = () => {
    setEditingCommentId(null);
    setEditCommentText('');
    setEditCommentMentions([]);
    closeMentionMenu();
  };

  const handleEditCommentSubmit = async (commentId: number) => {
    if (!editCommentText.trim()) return;

    updateCommentInTree(commentId, { text: editCommentText.trim() });
    setEditingCommentId(null);
    const mentionedUserIds = collectMentionedUserIds(editCommentText, editCommentMentions);

    try {
      const { data } = await apolloClient.mutate<{
        updateDiscussionComment: Partial<DiscussionComment>;
      }>({
        mutation: UPDATE_COMMENT,
        variables: {
          input: {
            id: Number(commentId),
            text: editCommentText.trim(),
            mentionedUserIds,
          },
        },
      });
      if (data?.updateDiscussionComment) {
        updateCommentInTree(commentId, data.updateDiscussionComment);
      }
      setEditCommentMentions([]);
      closeMentionMenu();
    } catch (e) {
      console.error('Error updating comment:', e);
      alert(t('commentUpdateError'));
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    setActiveCommentDropdown(null);
    setDeleteCommentConfirmId(null);
    closeMentionMenu();

    const deleteFromTree = (comments: DiscussionComment[]): DiscussionComment[] => {
      return comments
        .filter((c) => c.id !== commentId)
        .map((c) => {
          if (c.replies) {
            return { ...c, replies: deleteFromTree(c.replies) };
          }
          return c;
        });
    };
    setComments(deleteFromTree);

    try {
      await apolloClient.mutate<{ deleteDiscussionComment: boolean }>({
        mutation: DELETE_COMMENT,
        variables: { id: Number(commentId) },
      });
    } catch (e) {
      console.error('Error deleting comment:', e);
      alert(t('commentDeleteError'));
    }
  };

  const handleReportComment = (commentId: number) => {
    setActiveCommentDropdown(null);
    closeMentionMenu();
    setReportingCommentId(commentId);
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

  const formatPlaytime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return t('playtimeFormat.hoursAndMins', { hours: h, mins: m });
    if (h > 0) return t('playtimeFormat.hours', { hours: h });
    return t('playtimeFormat.mins', { mins: m });
  };

  const isCommentDiscussion = discussion?.type === 'comment';

  const toggleCommentThread = (commentId: number) => {
    setCollapsedCommentThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const renderComment = (comment: DiscussionComment, depth: number = 0) => {
    const hasReplies = Boolean(comment.replies && comment.replies.length > 0);
    const isCollapsed = collapsedCommentThreads.has(comment.id);

    return (
      <div
        id={`comment-${comment.id}`}
        key={comment.id}
        className={`${depth > 0 ? 'ml-8 border-l border-white/10 pl-4' : ''}`}
      >
        <div
          className={`flex gap-3 py-3 ${hasReplies ? 'cursor-pointer hover:bg-white/5 rounded-lg -mx-2 px-2 transition-colors' : ''}`}
          onClick={(e) => {
            if (!hasReplies) return;
            const target = e.target as HTMLElement;
            if (target.closest('button, a, textarea, input')) return;
            toggleCommentThread(comment.id);
          }}
        >
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-0.5">
            {user && user.id !== comment.authorId ? (
              <button
                onClick={() => handleVoteComment(comment.id, comment.userVote === 1 ? 0 : 1)}
                className={`p-0.5 rounded ${comment.userVote === 1 ? 'text-orange-500' : 'text-white/40 hover:text-orange-500'}`}
              >
                <ChevronUp size={18} />
              </button>
            ) : (
              <div className="h-5" />
            )}
            <button
              onClick={() => handleOpenVotersDialog('comment', comment.id)}
              className={`text-xs font-semibold cursor-pointer hover:underline ${comment.score > 0 ? 'text-orange-500' : comment.score < 0 ? 'text-blue-500' : 'text-white/60'}`}
            >
              {comment.score}
            </button>
            {user && user.id !== comment.authorId ? (
              <button
                onClick={() => handleVoteComment(comment.id, comment.userVote === -1 ? 0 : -1)}
                className={`p-0.5 rounded ${comment.userVote === -1 ? 'text-blue-500' : 'text-white/40 hover:text-blue-500'}`}
              >
                <ChevronDown size={18} />
              </button>
            ) : (
              <div className="h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 relative">
            {/* Dropdown menu */}
            {user && (
              <div className="absolute -top-1 right-0 z-30">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveCommentDropdown(
                      activeCommentDropdown === comment.id ? null : comment.id
                    );
                    setDeleteCommentConfirmId(null);
                  }}
                  className="text-white/40 hover:text-white p-1 rounded transition-colors"
                  title={t('more')}
                >
                  <MoreVertical size={16} />
                </button>
                {activeCommentDropdown === comment.id && (
                  <div className="absolute right-0 mt-1 w-40 bg-surface-raised border border-white/10 rounded-lg shadow-xl overflow-hidden z-40">
                    {user.id === comment.authorId ? (
                      <>
                        {deleteCommentConfirmId === comment.id ? (
                          <div className="p-3 text-xs text-center border-t border-white/10">
                            <p className="mb-2 text-white/80">{t('areYouSure')}</p>
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeleteCommentConfirmId(null);
                                }}
                                className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                              >
                                {t('cancel')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteComment(comment.id);
                                }}
                                className="px-3 py-1 bg-red-500/80 text-white rounded hover:bg-red-500 transition-colors"
                              >
                                {t('delete')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditCommentStart(comment.id, comment.text);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 flex items-center gap-2"
                            >
                              <Edit2 size={14} />
                              {t('edit')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteCommentConfirmId(comment.id);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              {t('delete')}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleReportComment(comment.id);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-orange-400/10 flex items-center gap-2"
                      >
                        <Flag size={14} />
                        {t('report')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-white/60 mb-1 pr-6">
              <Link
                href={`/profile/${comment.author.username}`}
                className="flex items-center gap-1 hover:text-white/80"
              >
                <div className="w-5 h-5 rounded-full bg-violet-500 overflow-hidden">
                  {comment.author.picturePath ? (
                    <Image
                      src={comment.author.picturePath}
                      alt=""
                      width={20}
                      height={20}
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-white text-xs">
                      {comment.author.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="font-medium">{comment.author.username}</span>
              </Link>
              <span>•</span>
              <span>{formatDate(comment.createdAt)}</span>
              {hasReplies && isCollapsed && (
                <span className="inline-flex items-center gap-1 text-xs text-white/40 font-medium">
                  <ChevronRight size={12} />
                  {t('repliesHidden', { count: comment.replies!.length })}
                </span>
              )}
            </div>

            {editingCommentId === comment.id ? (
              <div className="mb-2 pr-6 relative z-30">
                <textarea
                  value={editCommentText}
                  onChange={(e) => {
                    setEditCommentText(e.target.value);
                    updateMentionState(
                      'edit',
                      e.target.value,
                      e.target.selectionStart ?? e.target.value.length
                    );
                  }}
                  className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none"
                  rows={2}
                />
                {mentionTarget === 'edit' && renderMentionDropdown()}
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    onClick={handleEditCommentCancel}
                    className="px-3 py-1 text-white/60 hover:text-white text-xs transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => handleEditCommentSubmit(comment.id)}
                    className="px-3 py-1 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            ) : (
              renderCommentText(comment)
            )}

            {/* Reply button */}
            {user && (
              <button
                onClick={() => {
                  const nextReplyingTo = replyingTo === comment.id ? null : comment.id;
                  setReplyingTo(nextReplyingTo);
                  setReplyText('');
                  setReplyMentions([]);
                  closeMentionMenu();
                }}
                className="mt-2 text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                {t('reply')}
              </button>
            )}

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-2 relative">
                <textarea
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    updateMentionState(
                      'reply',
                      e.target.value,
                      e.target.selectionStart ?? e.target.value.length
                    );
                    e.target.style.height = 'auto';
                    const lineHeight = 20;
                    const maxRows = 10;
                    const minHeight = lineHeight * 2;
                    const newHeight = Math.max(
                      minHeight,
                      Math.min(e.target.scrollHeight, lineHeight * maxRows)
                    );
                    e.target.style.height = `${newHeight}px`;
                  }}
                  placeholder={t('replyPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none mb-2"
                  style={{ minHeight: '40px' }}
                />
                {mentionTarget === 'reply' && renderMentionDropdown()}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText('');
                      setReplyMentions([]);
                      closeMentionMenu();
                    }}
                    className="px-3 py-1 text-white/60 hover:text-white text-xs transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={!replyText.trim() || submitting}
                    className="px-3 py-1 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nested replies */}
        {hasReplies && !isCollapsed && (
          <div className="mt-1">
            {comment.replies!.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t('notFound')}</h1>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
          >
            {t('goBack')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="glass-card p-6">
        {/* Discussion Header */}
        <div className="flex gap-4 pb-6 border-b border-white/10">
          {/* Vote buttons */}
          <div className="flex flex-col items-center gap-1">
            {user && user.id !== discussion.authorId ? (
              <button
                onClick={() => handleVoteDiscussion(discussion.userVote === 1 ? 0 : 1)}
                className={`p-1 rounded ${discussion.userVote === 1 ? 'text-orange-500' : 'text-white/40 hover:text-orange-500'}`}
              >
                <ChevronUp size={28} />
              </button>
            ) : (
              <div className="h-9" />
            )}
            <button
              onClick={() => handleOpenVotersDialog('discussion', discussion.id)}
              className={`text-lg font-bold cursor-pointer hover:underline ${discussion.score > 0 ? 'text-orange-500' : discussion.score < 0 ? 'text-blue-500' : 'text-white/60'}`}
            >
              {discussion.score}
            </button>
            {user && user.id !== discussion.authorId ? (
              <button
                onClick={() => handleVoteDiscussion(discussion.userVote === -1 ? 0 : -1)}
                className={`p-1 rounded ${discussion.userVote === -1 ? 'text-blue-500' : 'text-white/40 hover:text-blue-500'}`}
              >
                <ChevronDown size={28} />
              </button>
            ) : (
              <div className="h-9" />
            )}
          </div>

          {/* Content Poster - if discussion is about specific content */}
          {discussion.contentId && discussion.content && (
            <div className="flex-shrink-0 flex flex-col items-center">
              <Link
                href={`/content/${discussion.content.contentTypeId === 1 ? 'movie' : discussion.content.contentTypeId === 2 ? 'tv' : discussion.content.contentTypeId === 3 ? 'game' : discussion.content.contentTypeId === 4 ? 'book' : 'music'}/${discussion.contentId}`}
                className="group"
              >
                <div className="w-20 sm:w-24 rounded-lg overflow-hidden border border-white/10 group-hover:border-violet-500 transition-colors">
                  {discussion.content.posterUrl ? (
                    <Image
                      src={discussion.content.posterUrl}
                      alt={discussion.content.title}
                      width={96}
                      height={144}
                      className="w-full h-auto object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-white/10" aria-hidden="true" />
                  )}
                </div>
              </Link>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 relative min-w-0">
            {/* Dropdown for discussion */}
            {user && (
              <div className="absolute top-0 right-0 z-30">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDiscussionDropdownOpen(!discussionDropdownOpen);
                    setDeleteDiscussionConfirm(false);
                  }}
                  className="text-white/40 hover:text-white p-2 rounded transition-colors"
                  title={t('more')}
                >
                  <MoreVertical size={20} />
                </button>
                {discussionDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface-raised border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40">
                    {user.id === discussion.authorId ? (
                      <>
                        {deleteDiscussionConfirm ? (
                          <div className="p-4 text-sm text-center border-t border-white/10">
                            <p className="mb-3 text-white/80">{t('deleteConfirm')}</p>
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeleteDiscussionConfirm(false);
                                }}
                                className="px-4 py-1.5 bg-white/10 rounded hover:bg-white/20 transition-colors"
                              >
                                {t('cancel')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteDiscussion();
                                }}
                                className="px-4 py-1.5 bg-red-500/80 text-white rounded hover:bg-red-500 transition-colors"
                              >
                                {t('delete')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleEditDiscussionStart();
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/5 flex items-center gap-3 transition-colors"
                            >
                              <Edit2 size={16} />
                              {t('editDiscussion')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setDeleteDiscussionConfirm(true);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-3 transition-colors"
                            >
                              <Trash2 size={16} />
                              {t('deleteDiscussion')}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleReportDiscussion();
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-orange-400 hover:bg-orange-400/10 flex items-center gap-3 transition-colors"
                      >
                        <Flag size={16} />
                        {t('report')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {editingDiscussion ? (
              <div className="mb-6 relative z-30 pr-8">
                {discussion.title !== null && (
                  <input
                    type="text"
                    value={editDiscussionTitle}
                    onChange={(e) => setEditDiscussionTitle(e.target.value)}
                    className="w-full px-4 py-2 mb-3 bg-white/5 border border-white/10 rounded-lg text-white font-bold text-xl placeholder-white/40 focus:outline-none focus:border-violet-500"
                    placeholder={t('titlePlaceholder')}
                  />
                )}
                <textarea
                  value={editDiscussionContent}
                  onChange={(e) => setEditDiscussionContent(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none min-h-[120px]"
                  placeholder={t('contentPlaceholder')}
                />
                <div className="mt-3 flex items-center justify-end gap-3">
                  {isCommentDiscussion && (
                    <div className="mr-auto flex flex-wrap items-center gap-3">
                      <VisibilitySwitch
                        isPublic={editDiscussionIsPublic}
                        onChange={setEditDiscussionIsPublic}
                        iconOnly
                      />
                      <SpoilerSwitch
                        isSpoiler={editDiscussionIsSpoiler}
                        onChange={setEditDiscussionIsSpoiler}
                        iconOnly
                        variant="checkbox"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleEditDiscussionCancel}
                    className="px-4 py-2 text-white/60 hover:text-white text-sm transition-colors rounded-lg hover:bg-white/5"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleEditDiscussionSubmit}
                    className="px-6 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/20"
                  >
                    {t('save')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {discussion.title !== null && (
                  <h1 className="text-2xl font-bold text-white mb-3 pr-8">{discussion.title}</h1>
                )}
                {isCommentDiscussion && !discussion.isPublic && (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <VisibilityBadge isPublic={false} />
                  </div>
                )}
                <SpoilerText
                  text={discussion.description}
                  isSpoiler={false}
                  className="text-white/80 whitespace-pre-wrap mb-4 pr-8"
                />
              </>
            )}

            <div className="flex items-center gap-4 text-sm text-white/40">
              <Link
                href={`/profile/${discussion.author.username}`}
                className="flex items-center gap-2 hover:text-white/60"
              >
                <div className="w-6 h-6 rounded-full bg-violet-500 overflow-hidden">
                  {discussion.author.picturePath ? (
                    <Image
                      src={discussion.author.picturePath}
                      alt=""
                      width={24}
                      height={24}
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
              {discussion.authorPlaytimeMinutes != null && (
                <span className="flex items-center gap-1" title={t('playtime')}>
                  <Clock size={14} />
                  {formatPlaytime(discussion.authorPlaytimeMinutes)}
                </span>
              )}
              <span
                className={`flex items-center gap-1 ${getCommentCountClass(discussion.commentCount)} ${getCommentCountWeight(discussion.commentCount)}`}
              >
                <MessageSquare size={14} />
                {t('commentsCount', { count: discussion.commentCount })}
                {isCommentDiscussion && discussion.isSpoiler && <SpoilerBadge />}
              </span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="pt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">
              {t('commentsTitle', { count: comments.length })}
            </h2>
            {user && (
              <button
                onClick={() => {
                  const nextReplyingTo = replyingTo === -1 ? null : -1;
                  setReplyingTo(nextReplyingTo);
                  setNewComment('');
                  setNewCommentMentions([]);
                  closeMentionMenu();
                }}
                className="text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                {t('reply')}
              </button>
            )}
          </div>

          {replyingTo === -1 && (
            <form onSubmit={handleSubmitComment} className="mb-4 relative">
              <textarea
                value={newComment}
                onChange={(e) => {
                  setNewComment(e.target.value);
                  updateMentionState(
                    'new',
                    e.target.value,
                    e.target.selectionStart ?? e.target.value.length
                  );
                  e.target.style.height = 'auto';
                  const lineHeight = 24;
                  const maxRows = 10;
                  const newHeight = Math.min(e.target.scrollHeight, lineHeight * maxRows);
                  e.target.style.height = `${newHeight}px`;
                }}
                placeholder={t('replyPlaceholder')}
                rows={3}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none mb-2"
                style={{ minHeight: '72px' }}
              />
              {mentionTarget === 'new' && renderMentionDropdown()}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setReplyingTo(null);
                    setNewComment('');
                    setNewCommentMentions([]);
                    closeMentionMenu();
                  }}
                  className="px-4 py-1.5 text-white/60 hover:text-white text-sm transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? t('sending') : t('reply')}
                </button>
              </div>
            </form>
          )}

          {comments.length === 0 ? (
            <p className="text-white/60 text-center py-8">{t('noComments')}</p>
          ) : (
            <div className="space-y-4">{comments.map((comment) => renderComment(comment))}</div>
          )}
        </div>
      </div>

      {votersDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-raised border border-white/10 rounded-2xl p-6 shadow-2xl relative">
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
