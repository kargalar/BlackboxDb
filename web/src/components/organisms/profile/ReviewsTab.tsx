'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SpoilerBadge from '@/components/atoms/SpoilerBadge';
import SpoilerSwitch from '@/components/atoms/SpoilerSwitch';
import SpoilerText from '@/components/atoms/SpoilerText';
import VisibilityBadge from '@/components/atoms/VisibilityBadge';
import VisibilitySwitch from '@/components/atoms/VisibilitySwitch';
import { Pagination } from '@/components/molecules/Pagination';
import ReviewSortingBar, {
  type ReviewSortField,
  type ReviewSortOrder,
} from './components/ReviewSortingBar';
import { getProfileContentRoute, getProfileContentTypeLabel } from './profileContentUtils';
import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { MoreVertical, Edit2, Trash2, Flag } from 'lucide-react';
import type { Route } from 'next';
import { formatRelativeTime } from '@/lib/date-utils';
import ReportModal from '../ReportModal';
import { useTranslations } from 'next-intl';

// GraphQL query for user comments
const GET_USER_COMMENTS = gql`
  query GetUserComments($userId: String!, $limit: Int, $offset: Int) {
    userComments(userId: $userId, limit: $limit, offset: $offset) {
      id
      description
      isPublic
      isSpoiler
      createdAt
      upvoteCount
      downvoteCount
      commentCount
      score
      authorRating
      authorIsFavorite
      authorIsAbandoned
      content {
        id
        title
        posterUrl
        contentType {
          id
          name
          slug
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
      isPublic
      isSpoiler
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
  description: string;
  isPublic: boolean;
  isSpoiler: boolean;
  createdAt: string;
  upvoteCount: number;
  downvoteCount: number;
  commentCount: number;
  score: number;
  authorRating?: number;
  authorIsFavorite?: boolean;
  authorIsAbandoned?: boolean;
  content?: {
    id: string;
    title: string;
    posterUrl?: string;
    contentType?: {
      id: number;
      name: string;
      slug: string;
    };
  };
  author: {
    id: string;
    username: string;
    picturePath?: string;
  };
}

interface ReviewsTabProps {
  userId: string;
  username: string;
}

const REVIEWS_FETCH_BATCH_SIZE = 100;
const REVIEWS_PER_PAGE = 20;

export default function ReviewsTab({ userId, username }: ReviewsTabProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [comments, setComments] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'errorLoading' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<ReviewSortField>('date');
  const [sortOrder, setSortOrder] = useState<ReviewSortOrder>('none');
  const t = useTranslations('ProfileReviewsTab');

  // Action states
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCommentIsPublic, setEditCommentIsPublic] = useState(true);
  const [editCommentIsSpoiler, setEditCommentIsSpoiler] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [revealedSpoilerIds, setRevealedSpoilerIds] = useState<Set<number>>(new Set());
  const [reportingComment, setReportingComment] = useState<Discussion | null>(null);

  const sortedComments = useMemo(() => {
    const nextComments = [...comments];

    if (sortOrder === 'none') {
      return nextComments;
    }

    nextComments.sort((left, right) => {
      switch (sortBy) {
        case 'score':
          return sortOrder === 'desc' ? right.score - left.score : left.score - right.score;
        case 'date':
        default:
          return sortOrder === 'desc'
            ? new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
            : new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      }
    });

    return nextComments;
  }, [comments, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedComments.length / REVIEWS_PER_PAGE);
  const paginatedComments = useMemo(() => {
    const start = (currentPage - 1) * REVIEWS_PER_PAGE;

    return sortedComments.slice(start, start + REVIEWS_PER_PAGE);
  }, [currentPage, sortedComments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder, userId]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    let isCurrent = true;

    async function loadComments() {
      if (!userId) {
        setComments([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('💬 [ReviewsTab] Loading comments for user:', userId);

        const allComments: Discussion[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await apolloClient.query<{ userComments: Discussion[] }>({
            query: GET_USER_COMMENTS,
            variables: { userId, limit: REVIEWS_FETCH_BATCH_SIZE, offset },
            fetchPolicy: 'network-only',
            errorPolicy: 'all',
          });

          if (!isCurrent) return;

          if (error) {
            console.error('❌ [ReviewsTab] GraphQL error:', error, { offset });
            setError('errorLoading');
            return;
          }

          const pageComments = data?.userComments || [];
          allComments.push(...pageComments);
          console.log('✅ [ReviewsTab] Loaded comments page:', {
            offset,
            pageCount: pageComments.length,
            totalLoaded: allComments.length,
          });

          hasMore = pageComments.length === REVIEWS_FETCH_BATCH_SIZE;
          offset += pageComments.length;
        }

        console.log('✅ [ReviewsTab] Loaded all comments:', allComments.length);
        if (!isCurrent) return;
        setComments(allComments);
      } catch (e) {
        if (!isCurrent) return;
        console.error('❌ [ReviewsTab] Error loading comments:', e);
        setError('errorLoading');
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void loadComments();

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

  if (!comments || comments.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <div className="text-4xl mb-4">💬</div>
        <p className="mb-2">{t('emptyState')}</p>
        <p className="text-sm text-gray-500">{t('emptyStateDesc')}</p>
      </div>
    );
  }

  // Action Handlers
  const handleEditStart = (
    commentId: number,
    currentContent: string,
    currentIsPublic: boolean,
    currentIsSpoiler: boolean
  ) => {
    setEditingCommentId(commentId);
    setEditContent(currentContent || '');
    setEditCommentIsPublic(currentIsPublic);
    setEditCommentIsSpoiler(currentIsSpoiler);
    setActiveDropdown(null);
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditContent('');
    setEditCommentIsPublic(true);
    setEditCommentIsSpoiler(false);
  };

  const handleEditSubmit = async (commentId: number) => {
    if (!editContent.trim()) return;

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
      const { data } = await apolloClient.mutate<{ updateDiscussion: Partial<Discussion> }>({
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
      alert(t('errorUpdating'));
      setComments(originalComments);
    }
  };

  const handleDelete = async (commentId: number) => {
    setActiveDropdown(null);
    setDeleteConfirmId(null);

    const originalComments = [...comments];
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    try {
      await apolloClient.mutate<{ deleteDiscussion: boolean }>({
        mutation: DELETE_DISCUSSION,
        variables: { id: Number(commentId) },
      });
    } catch (e) {
      console.error('Error deleting comment:', e);
      alert(t('errorDeleting'));
      setComments(originalComments);
    }
  };

  const handleReport = (comment: Discussion) => {
    setActiveDropdown(null);
    setReportingComment(comment);
  };

  const handleSortChange = (nextSortBy: ReviewSortField, nextSortOrder: ReviewSortOrder) => {
    console.log('🔃 [ReviewsTab] Sort changed:', {
      username,
      userId,
      sortBy: nextSortBy,
      sortOrder: nextSortOrder,
    });
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
  };

  const revealSpoilerComment = (commentId: number) => {
    console.log('👁️ [ReviewsTab] Spoiler comment revealed:', commentId);
    setRevealedSpoilerIds((prev) => new Set(prev).add(commentId));
  };

  const handleCommentCardClick = (event: React.MouseEvent<HTMLDivElement>, comment: Discussion) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-mention-link="true"]')) {
      return;
    }

    if (!comment.isSpoiler) {
      return;
    }

    if (!revealedSpoilerIds.has(comment.id)) {
      event.preventDefault();
      revealSpoilerComment(comment.id);
      return;
    }

    router.push(`/discussion/${comment.id}`);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-400">
          <span className="text-white font-semibold">{comments.length}</span> {t('comments')}
          {totalPages > 1 && (
            <span className="ml-2 text-gray-500">
              • {t('pageInfo', { current: currentPage, total: totalPages })}
            </span>
          )}
        </div>
        <ReviewSortingBar
          currentSort={sortBy}
          currentOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Comments list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedComments.map((comment) => {
          const hasContent = comment.content && comment.content.id;
          const hasPoster = hasContent && comment.content?.posterUrl;

          return (
            <div
              key={comment.id}
              className="relative block bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-all"
              onClick={(event) => handleCommentCardClick(event, comment)}
            >
              <div className="flex gap-4">
                {/* Content poster (if linked to content) */}
                {hasContent && (
                  <div className="flex-shrink-0 w-[150px] h-[225px] relative z-20">
                    <Link
                      href={getProfileContentRoute(
                        comment.content?.id || '',
                        comment.content?.contentType?.id,
                        comment.content?.contentType?.slug
                      )}
                      className="block w-full h-full bg-white/10 rounded overflow-hidden"
                    >
                      {hasPoster ? (
                        <Image
                          src={comment.content!.posterUrl!}
                          alt={comment.content!.title}
                          width={150}
                          height={225}
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
                    </Link>
                  </div>
                )}

                {/* Comment content */}
                <div className="flex-1 min-w-0 relative">
                  {/* Dropdown menu */}
                  {user && (
                    <div className="absolute -top-2 right-0 z-30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setActiveDropdown(activeDropdown === comment.id ? null : comment.id);
                          setDeleteConfirmId(null);
                        }}
                        className="text-white/40 hover:text-white p-1 rounded transition-colors"
                        title={t('more')}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeDropdown === comment.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-surface-raised border border-white/10 rounded-lg shadow-xl overflow-hidden z-40">
                          {user.id === comment.author.id ? (
                            <>
                              {deleteConfirmId === comment.id ? (
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
                                        handleDelete(comment.id);
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
                                        comment.id,
                                        comment.description,
                                        comment.isPublic,
                                        comment.isSpoiler
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
                                      setDeleteConfirmId(comment.id);
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
                                handleReport(comment);
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
                    <div className="flex flex-col gap-1 mb-2 pr-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {getProfileContentTypeLabel(
                            comment.content!.contentType?.id,
                            comment.content!.id,
                            comment.content!.contentType?.slug
                          )}
                        </span>
                        {!comment.isPublic && <VisibilityBadge isPublic={false} />}
                        <span className="text-sm font-bold text-gray-200 truncate">
                          {comment.content!.title}
                        </span>

                        {(comment.authorRating ||
                          comment.authorIsFavorite ||
                          comment.authorIsAbandoned) && (
                          <div className="flex items-center gap-1.5 ml-0.5">
                            {comment.authorRating && (
                              <span
                                className="flex items-center text-xs text-gray-400 font-medium"
                                title="Puan"
                              >
                                <svg
                                  className="w-3 h-3 mr-0.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {comment.authorRating}
                              </span>
                            )}
                            {comment.authorIsFavorite && (
                              <span className="flex items-center text-gray-400" title="Favori">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                            {comment.authorIsAbandoned && (
                              <span
                                className="flex items-center text-red-400"
                                title="Yarıda Bırakıldı"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-1 pr-6 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                        {t('generalComment')}
                      </span>
                      {!comment.isPublic && <VisibilityBadge isPublic={false} />}
                    </div>
                  )}

                  {editingCommentId === comment.id ? (
                    <div className="mb-3 pr-8 relative z-30">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500 resize-none text-sm"
                        rows={3}
                      />
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
                            handleEditSubmit(comment.id);
                          }}
                          className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Link
                        href={`/discussion/${comment.id}` as Route}
                        className="before:absolute before:inset-0 before:z-10 focus:outline-none pr-8 block"
                      >
                        {comment.description && (
                          <SpoilerText
                            text={comment.description}
                            isSpoiler={comment.isSpoiler}
                            revealed={revealedSpoilerIds.has(comment.id)}
                            onReveal={() => revealSpoilerComment(comment.id)}
                            mentionMode="action"
                            className="whitespace-pre-line text-[17px] leading-7 text-white/80 line-clamp-8 mb-2 pr-8"
                          />
                        )}
                      </Link>
                    </>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {/* Date */}
                    <span>{formatRelativeTime(comment.createdAt)}</span>

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
                          comment.score > 0
                            ? 'text-green-400'
                            : comment.score < 0
                              ? 'text-red-400'
                              : ''
                        }
                      >
                        {comment.score}
                      </span>
                    </div>

                    {/* Replies (if any logic added later, keeping for structure) */}
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{comment.commentCount || 0}</span>
                      {comment.isSpoiler && <SpoilerBadge />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {reportingComment && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportingComment(null)}
          targetId={reportingComment.id.toString()}
          targetType="DISCUSSION"
          targetTitle={t('thisComment')}
        />
      )}
    </div>
  );
}
