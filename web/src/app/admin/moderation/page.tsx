'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronUp, ChevronDown, Trash2, ShieldX, ChevronRight } from 'lucide-react';
import { getCurrentUserProfile } from '@/services/database/userService';
import {
  listModerationComments,
  deleteModerationComment,
  dismissReports,
} from '@/services/adminService';
import type { ModerationComment } from '@/services/adminService';
import { useTranslations, useLocale } from 'next-intl';

type FilterTab = 'all' | 'reported' | 'comments' | 'replies';

/** Relative date formatter */
function formatDate(dateString: string, t: any, locale: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return t('date.now');
  if (hours < 24) return t('date.hoursAgo', { hours });
  if (days < 7) return t('date.daysAgo', { days });
  return new Intl.DateTimeFormat(locale).format(date);
}

/** Check if a tree node or any descendant has a report */
function treeHasReport(node: ModerationComment): boolean {
  if (node.isReported) return true;
  return (node.replies || []).some(treeHasReport);
}

export default function AdminModerationPage() {
  const [allowed, setAllowed] = useState(false);
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const t = useTranslations('AdminModerationPage');
  const locale = useLocale();

  const load = async () => {
    setLoading(true);
    try {
      const prof = await getCurrentUserProfile();
      const can = !!prof.data?.isAdmin || !!prof.data?.isModerator;
      setAllowed(can);
      if (can) {
        const { data, error } = await listModerationComments();
        if (error) console.error('❌ [Moderation] Failed to load comments:', error);
        setComments(data || []);
        console.log(`✅ [Moderation] Loaded ${data?.length || 0} comment trees`);
      }
    } catch (err) {
      console.error('❌ [Moderation] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /** Remove a node from the tree recursively */
  const removeFromTree = (
    nodes: ModerationComment[],
    id: number | string,
    type: string
  ): ModerationComment[] =>
    nodes
      .filter((c) => !(c.id == id && c.type === type))
      .map((c) => ({ ...c, replies: c.replies ? removeFromTree(c.replies, id, type) : [] }));

  /** Update a node in the tree recursively */
  const updateInTree = (
    nodes: ModerationComment[],
    id: number | string,
    type: string,
    updater: (c: ModerationComment) => ModerationComment
  ): ModerationComment[] =>
    nodes.map((c) => {
      const updated = c.id == id && c.type === type ? updater(c) : c;
      return {
        ...updated,
        replies: updated.replies ? updateInTree(updated.replies, id, type, updater) : [],
      };
    });

  const handleDelete = async (id: number | string, type: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const { error } = await deleteModerationComment(id, type);
    if (!error) {
      setComments((prev) => removeFromTree(prev, id, type));
      console.log(`✅ [Moderation] Deleted ${type}:${id}`);
    } else {
      console.error(`❌ [Moderation] Failed to delete ${type}:${id}`, error);
      alert(t('deleteFailed'));
    }
  };

  const handleDismissReports = async (targetId: number | string, targetType: string) => {
    if (!confirm(t('dismissConfirm'))) return;
    const { error } = await dismissReports(targetId, targetType);
    if (!error) {
      setComments((prev) =>
        updateInTree(prev, targetId, targetType, (c) => ({
          ...c,
          isReported: false,
          reportCount: 0,
          reports: [],
        }))
      );
      console.log(`✅ [Moderation] Dismissed reports for ${targetType}:${targetId}`);
    } else {
      console.error(`❌ [Moderation] Failed to dismiss reports`, error);
      alert(t('dismissFailed'));
    }
  };

  const toggleReportDetails = (key: string) => {
    setExpandedReports((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /** Filter top-level trees */
  const filteredComments = comments.filter((c) => {
    if (activeTab === 'reported') return treeHasReport(c);
    if (activeTab === 'comments') return c.type === 'comment';
    if (activeTab === 'replies') return c.type === 'discussionComment';
    return true;
  });

  const reportedCount = comments.filter((c) => treeHasReport(c)).length;

  // ==========================================
  // AVATAR COMPONENT
  // ==========================================
  const Avatar = ({
    picturePath,
    username,
    size = 20,
  }: {
    picturePath?: string | null;
    username: string;
    size?: number;
  }) => (
    <div
      className="rounded-full bg-violet-500 overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {picturePath ? (
        <Image
          src={picturePath}
          alt={username}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <span
          className="flex items-center justify-center w-full h-full text-white"
          style={{ fontSize: size * 0.5 }}
        >
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  // ==========================================
  // VOTE DISPLAY
  // ==========================================
  const VoteDisplay = ({
    score,
    upvoteCount,
    downvoteCount,
  }: {
    score: number;
    upvoteCount: number;
    downvoteCount: number;
  }) => (
    <div className="flex flex-col items-center gap-0.5 min-w-[28px]">
      <div className={`p-0.5 ${upvoteCount > 0 ? 'text-orange-500' : 'text-white/20'}`}>
        <ChevronUp size={16} />
      </div>
      <span
        className={`text-xs font-semibold ${
          score > 0 ? 'text-orange-500' : score < 0 ? 'text-blue-500' : 'text-white/40'
        }`}
      >
        {score}
      </span>
      <div className={`p-0.5 ${downvoteCount > 0 ? 'text-blue-500' : 'text-white/20'}`}>
        <ChevronDown size={16} />
      </div>
    </div>
  );

  // ==========================================
  // RECURSIVE COMMENT RENDERER
  // ==========================================
  const renderComment = (c: ModerationComment, depth: number = 0) => {
    const key = `${c.type}:${c.id}`;
    const isExpanded = expandedReports.has(key);
    const hasReplies = c.replies && c.replies.length > 0;

    return (
      <div key={key} className={`${depth > 0 ? 'ml-8 border-l border-white/10 pl-4' : ''}`}>
        <div className={`py-3 ${c.isReported ? 'relative' : ''}`}>
          {/* Report badge - floating */}
          {c.isReported && (
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                  🚩 {c.reportCount} {t('reports')}
                </span>
                <button
                  onClick={() => toggleReportDetails(key)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  {isExpanded ? t('hide') : t('details')}
                </button>
              </div>
              {isExpanded && (
                <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 space-y-1.5">
                  {c.reports.map((r) => (
                    <div key={r.id} className="flex items-start gap-2 text-xs">
                      <span className="text-red-400 font-medium">{r.reporterUsername}:</span>
                      <span className="text-white/70">{r.reason}</span>
                      <span className="text-white/30 ml-auto flex-shrink-0">
                        {formatDate(r.createdAt, t, locale)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            {/* Vote display */}
            <VoteDisplay
              score={c.score}
              upvoteCount={c.upvoteCount}
              downvoteCount={c.downvoteCount}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Author row */}
              <div className="flex items-center gap-2 mb-1">
                <Avatar picturePath={c.authorPicturePath} username={c.authorUsername} size={20} />
                <span className="text-sm font-medium text-white/80">{c.authorUsername}</span>
                <span className="text-white/30">•</span>
                <span className="text-xs text-white/40">{formatDate(c.createdAt, t, locale)}</span>
                {/* Type + context badges */}
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] rounded ${
                    c.type === 'comment'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/20'
                  }`}
                >
                  {c.type === 'comment' ? t('comment') : t('reply')}
                </span>
              </div>

              {/* Context info (content or discussion title) */}
              {(c.contentTitle || c.discussionTitle) && (
                <div className="flex items-center gap-1.5 mb-1.5 text-xs text-white/40">
                  <ChevronRight size={12} />
                  {c.contentTitle && <span className="text-violet-400">{c.contentTitle}</span>}
                  {c.discussionTitle && (
                    <span className="text-emerald-400">{c.discussionTitle}</span>
                  )}
                </div>
              )}

              {/* Comment text */}
              <p className="text-sm text-white/80 whitespace-pre-wrap">{c.text}</p>

              {/* Vote summary + Actions */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[11px] text-white/30">
                  👍 {c.upvoteCount} · 👎 {c.downvoteCount}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {c.isReported && (
                    <button
                      onClick={() => handleDismissReports(c.id, c.type)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                    >
                      <ShieldX size={12} /> {t('dismissReport')}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id, c.type)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={12} /> {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nested replies - recursive */}
        {hasReplies && (
          <div className="mt-0">{c.replies!.map((reply) => renderComment(reply, depth + 1))}</div>
        )}
      </div>
    );
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================
  if (!allowed && !loading)
    return <div className="max-w-4xl mx-auto p-6 text-white/60">{t('accessDenied')}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          {t('title')}
          {reportedCount > 0 && (
            <span className="ml-3 px-2.5 py-1 text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
              {t('reportedCount', { count: reportedCount })}
            </span>
          )}
        </h1>
        <span className="text-sm text-white/40">
          {t('showingCount', { count: filteredComments.length })}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all' as FilterTab, label: t('tabs.all') },
          { key: 'reported' as FilterTab, label: t('tabs.reported', { count: reportedCount }) },
          { key: 'comments' as FilterTab, label: t('tabs.comments') },
          { key: 'replies' as FilterTab, label: t('tabs.replies') },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card divide-y divide-white/10">
          {filteredComments.map((c) => {
            const hasReport = treeHasReport(c);
            return (
              <div key={`${c.type}:${c.id}`} className={`px-4 ${hasReport ? 'bg-red-500/5' : ''}`}>
                {renderComment(c, 0)}
              </div>
            );
          })}
          {filteredComments.length === 0 && (
            <div className="py-12 text-center text-white/40 text-sm">
              {activeTab === 'reported' ? t('emptyReported') : t('emptyComments')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
