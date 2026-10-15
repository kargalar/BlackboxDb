'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { MoreVertical, Edit2, Trash2, Flag } from 'lucide-react';
import { getCommentCountClass, getCommentCountWeight } from '@/lib/comment-count-utils';
import type { Route } from 'next';
import MentionText from '@/components/atoms/MentionText';
import { formatRelativeTime } from '@/lib/date-utils';
import ReportModal from '../ReportModal';
import { useTranslations } from 'next-intl';

// GraphQL query for user discussions
const GET_USER_DISCUSSIONS = gql`
  query GetUserDiscussions($userId: String!, $limit: Int, $offset: Int) {
    userDiscussions(userId: $userId, limit: $limit, offset: $offset) {
      id
      title
      description
      createdAt
      upvoteCount
      downvoteCount
      commentCount
      score
      content {
        id
        title
        posterUrl
        contentType {
          id
          name
        }
      }
      author {
        id
        username
        picturePath
      }
    }
  }
`;

// Mutations
const UPDATE_DISCUSSION = gql`
  mutation UpdateDiscussion($input: UpdateDiscussionInput!) {
    updateDiscussion(input: $input) {
      id
      description
      title
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

interface Discussion {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  score: number;
  content?: {
    id: string;
    title: string;
    posterUrl?: string;
    contentType?: {
      id: number;
      name: string;
    };
  };
  author: {
    id: string;
    username: string;
    picturePath?: string;
  };
}

interface DiscussionsTabProps {
  userId: string;
  username: string;
}

export default function DiscussionsTab({ userId, username }: DiscussionsTabProps) {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'errorLoading' | null>(null);
  const t = useTranslations('ProfileDiscussionsTab');

  // Action states
  const [editingDiscussionId, setEditingDiscussionId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [reportingDiscussion, setReportingDiscussion] = useState<Discussion | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadDiscussions() {
      if (!userId) {
        setDiscussions([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('💬 [DiscussionsTab] Loading discussions for user:', userId);

        const { data, error } = await apolloClient.query<{ userDiscussions: Discussion[] }>({
          query: GET_USER_DISCUSSIONS,
          variables: { userId, limit: 50, offset: 0 },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });

        if (!isCurrent) return;

        if (error) {
          console.error('❌ [DiscussionsTab] GraphQL error:', error);
          setError('errorLoading');
          return;
        }

        console.log('✅ [DiscussionsTab] Loaded discussions:', data?.userDiscussions?.length);
        setDiscussions(data?.userDiscussions || []);
      } catch (e) {
        if (!isCurrent) return;
        console.error('❌ [DiscussionsTab] Error loading discussions:', e);
        setError('errorLoading');
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void loadDiscussions();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
            <div className="h-5 bg-white/10 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-1/2 mb-3"></div>
            <div className="h-3 bg-white/10 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-8">
        <p>{t(error)}</p>
      </div>
    );
  }

  if (!discussions || discussions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-4">💬</div>
        <p className="mb-2">{t('emptyTitle')}</p>
        <p className="text-sm text-gray-500">{t('emptyDesc')}</p>
      </div>
    );
  }

  // Helper function to get content type label from contentTypeId or contentId
  const getContentTypeLabel = (contentTypeId?: number, contentId?: string) => {
    // First try contentTypeId
    if (contentTypeId) {
      switch (contentTypeId) {
        case 1:
          return t('contentTypes.movie');
        case 2:
          return t('contentTypes.tv');
        case 3:
          return t('contentTypes.game');
        case 4:
          return t('contentTypes.book');
      }
    }
    // Fallback: try to extract from contentId (format: "1-xxx" where 1 is contentTypeId)
    if (contentId) {
      const typeFromId = parseInt(contentId.split('-')[0]);
      switch (typeFromId) {
        case 1:
          return t('contentTypes.movie');
        case 2:
          return t('contentTypes.tv');
        case 3:
          return t('contentTypes.game');
        case 4:
          return t('contentTypes.book');
      }
    }
    return t('contentTypes.general');
  };

  // Helper function to get content type route
  const getContentRoute = (contentId: string, contentTypeId?: number) => {
    // First try contentTypeId
    if (contentTypeId) {
      switch (contentTypeId) {
        case 1:
          return `/content/movie/${contentId}` as Route;
        case 2:
          return `/content/tv/${contentId}` as Route;
        case 3:
          return `/content/game/${contentId}` as Route;
        case 4:
          return `/content/book/${contentId}` as Route;
      }
    }
    // Fallback: try to extract from contentId
    const typeFromId = parseInt(contentId.split('-')[0]);
    switch (typeFromId) {
      case 1:
        return `/content/movie/${contentId}` as Route;
      case 2:
        return `/content/tv/${contentId}` as Route;
      case 3:
        return `/content/game/${contentId}` as Route;
      case 4:
        return `/content/book/${contentId}` as Route;
      default:
        return `/discussions` as Route;
    }
  };

  // Action Handlers
  const handleEditStart = (discussionId: number, currentTitle: string, currentContent: string) => {
    setEditingDiscussionId(discussionId);
    setEditTitle(currentTitle || '');
    setEditContent(currentContent || '');
    setActiveDropdown(null);
  };

  const handleEditCancel = () => {
    setEditingDiscussionId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleEditSubmit = async (discussionId: number) => {
    if (!editContent.trim()) return;

    const originalDiscussions = [...discussions];
    setDiscussions((prev) =>
      prev.map((d) =>
        d.id === discussionId
          ? { ...d, title: editTitle.trim(), description: editContent.trim() }
          : d
      )
    );
    setEditingDiscussionId(null);

    try {
      const { data } = await apolloClient.mutate<{ updateDiscussion: Partial<Discussion> }>({
        mutation: UPDATE_DISCUSSION,
        variables: {
          input: {
            id: Number(discussionId),
            title: editTitle.trim(),
            description: editContent.trim(),
          },
        },
      });
      if (data?.updateDiscussion) {
        setDiscussions((prev) =>
          prev.map((d) => (d.id === discussionId ? { ...d, ...data.updateDiscussion } : d))
        );
      }
    } catch (e) {
      console.error('Error updating discussion:', e);
      alert(t('errorUpdating'));
      setDiscussions(originalDiscussions);
    }
  };

  const handleDelete = async (discussionId: number) => {
    setActiveDropdown(null);
    setDeleteConfirmId(null);

    const originalDiscussions = [...discussions];
    setDiscussions((prev) => prev.filter((d) => d.id !== discussionId));

    try {
      await apolloClient.mutate<{ deleteDiscussion: boolean }>({
        mutation: DELETE_DISCUSSION,
        variables: { id: Number(discussionId) },
      });
    } catch (e) {
      console.error('Error deleting discussion:', e);
      alert(t('errorDeleting'));
      setDiscussions(originalDiscussions);
    }
  };

  const handleReport = (discussion: Discussion) => {
    setActiveDropdown(null);
    setReportingDiscussion(discussion);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-4 mb-6">
        <div className="text-sm text-gray-400">
          <span className="text-white font-semibold">{discussions.length}</span> {t('stats')}
        </div>
      </div>

      {/* Discussions list */}
      {discussions.map((discussion) => {
        const hasContent = discussion.content && discussion.content.id;
        const hasPoster = hasContent && discussion.content?.posterUrl;

        return (
          <Link
            key={discussion.id}
            href={`/discussion/${discussion.id}` as Route}
            className="block bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all"
          >
            <div className="flex gap-4">
              {/* Content poster (if linked to content) */}
              {hasContent && (
                <div className="flex-shrink-0 w-[50px] h-[75px] bg-white/10 rounded overflow-hidden">
                  {hasPoster ? (
                    <Image
                      src={discussion.content!.posterUrl!}
                      alt={discussion.content!.title}
                      width={50}
                      height={75}
                      className="rounded object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              )}

              {/* Discussion content */}
              <div className="flex-1 min-w-0 relative">
                {/* Dropdown menu */}
                {user && (
                  <div className="absolute -top-2 right-0 z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveDropdown(activeDropdown === discussion.id ? null : discussion.id);
                        setDeleteConfirmId(null);
                      }}
                      className="text-white/40 hover:text-white p-1 rounded transition-colors"
                      title={t('more')}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeDropdown === discussion.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-surface-raised border border-white/10 rounded-lg shadow-xl overflow-hidden z-40">
                        {user.id === discussion.author.id ? (
                          <>
                            {deleteConfirmId === discussion.id ? (
                              <div className="p-3 text-xs text-center border-t border-white/10">
                                <p className="mb-2 text-white/80">{t('areYouSure')}</p>
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                                  >
                                    {t('cancel')}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDelete(discussion.id);
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
                                    handleEditStart(
                                      discussion.id,
                                      discussion.title,
                                      discussion.description
                                    );
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
                                    setDeleteConfirmId(discussion.id);
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
                              handleReport(discussion);
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

                {/* Content badge */}
                {hasContent ? (
                  <div className="flex items-center gap-2 mb-1 pr-6">
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {getContentTypeLabel(
                        discussion.content!.contentType?.id,
                        discussion.content!.id
                      )}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {discussion.content!.title}
                    </span>
                  </div>
                ) : (
                  <div className="mb-1 pr-6">
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {t('generalDiscussion')}
                    </span>
                  </div>
                )}

                {editingDiscussionId === discussion.id ? (
                  <div className="mb-3 pr-8 relative z-30">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder={t('titlePlaceholder')}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 mb-2 text-sm font-semibold"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end mt-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditCancel();
                        }}
                        className="px-3 py-1.5 text-xs bg-white/5 text-white/80 rounded hover:bg-white/10 transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditSubmit(discussion.id);
                        }}
                        className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors"
                      >
                        {t('save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Title */}
                    <h3 className="font-semibold text-white mb-1 line-clamp-1 pr-8">
                      {discussion.title}
                    </h3>

                    {/* Description preview */}
                    {discussion.description && (
                      <MentionText
                        text={discussion.description}
                        as="p"
                        className="text-sm text-gray-400 line-clamp-2 mb-2 pr-8"
                      />
                    )}
                  </>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {/* Date */}
                  <span>{formatRelativeTime(discussion.createdAt)}</span>

                  {/* Votes */}
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span
                      className={
                        discussion.score > 0
                          ? 'text-green-400'
                          : discussion.score < 0
                            ? 'text-red-400'
                            : ''
                      }
                    >
                      {discussion.score}
                    </span>
                  </div>

                  {/* Comments */}
                  <div
                    className={`flex items-center gap-1 ${getCommentCountClass(discussion.commentCount || 0)} ${getCommentCountWeight(discussion.commentCount || 0)}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{discussion.commentCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}

      {reportingDiscussion && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportingDiscussion(null)}
          targetId={reportingDiscussion.id.toString()}
          targetType="DISCUSSION"
          targetTitle={t('thisDiscussion')}
        />
      )}
    </div>
  );
}
