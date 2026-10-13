'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUserProfile } from '@/services/database/userService';
import { listPendingContentRequests, rejectContentRequest } from '@/services/adminService';
import type { ContentRequest } from '@/services/graphql/admin';
import { refreshPendingContentRequestsBadge } from '@/features/admin/hooks/usePendingContentRequestsCount';
import { apolloClient } from '@/lib/apollo-client';
import {
  GET_PENDING_CONTRIBUTIONS,
  REVIEW_CONTRIBUTION,
  type Contribution,
} from '@/services/graphql/contribution';
import { GET_CONTENT_REPORTS, REVIEW_CONTENT_REPORTS } from '@/services/graphql/report';
import { ContributionDiffViewer } from '@/features/admin/components/ContributionDiffViewer';
import { ShieldX, Trash2, Edit2, ChevronRight, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

type Tab = 'new_content' | 'edits' | 'reports';

type ContentReportItem = {
  report: {
    id: string | number;
    reason: string;
    status: string;
    createdAt: string;
    targetId: string;
  };
  contentTitle: string;
  reporterUsername: string;
};

export default function AdminContentRequestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('new_content');
  const [items, setItems] = useState<ContentRequest[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [reports, setReports] = useState<ContentReportItem[]>([]);

  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectMessage, setRejectMessage] = useState('');

  const [rejectingContribId, setRejectingContribId] = useState<number | null>(null);
  const [rejectContribMessage, setRejectContribMessage] = useState('');

  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [rejectReportMessage, setRejectReportMessage] = useState('');

  const [approvingReportId, setApprovingReportId] = useState<string | null>(null);
  const [approveReportMessage, setApproveReportMessage] = useState('');

  const [isPrivileged, setIsPrivileged] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const t = useTranslations('AdminContentRequestsPage');
  const locale = useLocale();

  const loadNewContent = useCallback(async () => {
    const { data } = await listPendingContentRequests();
    setItems(data || []);
  }, []);

  const loadContributions = useCallback(async () => {
    try {
      const { data } = await apolloClient.query<{
        getPendingContributions: Contribution[];
      }>({
        query: GET_PENDING_CONTRIBUTIONS,
        fetchPolicy: 'network-only',
      });
      if (data?.getPendingContributions) {
        setContributions(data.getPendingContributions);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const { data } = await apolloClient.query<{
        getContentReports: ContentReportItem[];
      }>({
        query: GET_CONTENT_REPORTS,
        fetchPolicy: 'network-only',
      });
      if (data?.getContentReports) {
        setReports(data.getContentReports);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const prof = await getCurrentUserProfile();
      const can = !!prof.data?.isAdmin || !!prof.data?.isModerator;
      setIsPrivileged(can);
      if (can) {
        await Promise.all([loadNewContent(), loadContributions(), loadReports()]);
      }
    } catch (error) {
      console.error('Failed to load moderation requests:', error);
    } finally {
      setLoading(false);
    }
  }, [loadNewContent, loadContributions, loadReports]);

  useEffect(() => {
    void load();
  }, [load]);

  // =====================================
  // Handlers
  // =====================================
  const handleApproveNewContent = (item: ContentRequest) => {
    const params = new URLSearchParams({ requestId: String(item.id) });
    router.push(`/add-content?${params.toString()}`);
  };

  const handleRejectNewContent = async (id: number) => {
    setBusyId(id);
    const { error } = await rejectContentRequest(id, rejectMessage.trim() || undefined);
    if (!error) {
      setItems((prev) => prev.filter((x) => x.id !== id));
      refreshPendingContentRequestsBadge();
      setRejectingId(null);
      setRejectMessage('');
    } else {
      alert(t('rejectFailed'));
    }
    setBusyId(null);
  };

  const handleReviewContribution = (c: Contribution) => {
    // Send moderator to add-content page with pre-filled contribution payload
    if (!c.content?.id) return;
    const params = new URLSearchParams({
      id: String(c.content.id),
      contributionId: String(c.id),
    });
    router.push(`/add-content?${params.toString()}`);
  };

  const handleRejectContribution = async (id: number) => {
    setBusyId(`contrib-${id}`);
    try {
      await apolloClient.mutate({
        mutation: REVIEW_CONTRIBUTION,
        variables: {
          id,
          status: 'REJECTED',
          pointsEarned: 0,
          updatedPayload: rejectContribMessage.trim()
            ? { rejectionReason: rejectContribMessage.trim() }
            : undefined,
        },
      });
      setContributions((prev) => prev.filter((c) => c.id !== id));
      refreshPendingContentRequestsBadge();
      setRejectingContribId(null);
      setRejectContribMessage('');
    } catch (e) {
      console.error(e);
      alert(t('rejectFailed'));
    }
    setBusyId(null);
  };

  const handleDirectApproveContribution = async (contribution: Contribution) => {
    if (!contribution.payload?.__updateInput) {
      handleReviewContribution(contribution);
      return;
    }

    const { id } = contribution;
    setBusyId(`contrib-${id}`);
    try {
      await apolloClient.mutate({
        mutation: REVIEW_CONTRIBUTION,
        variables: {
          id,
          status: 'APPROVED',
          pointsEarned: 1,
        },
      });
      setContributions((prev) => prev.filter((c) => c.id !== id));
      refreshPendingContentRequestsBadge();
      alert(t('approveSuccess') || 'Talep başarıyla onaylandı ve değişiklikler uygulandı.');
    } catch (e) {
      console.error(e);
      alert(t('operationFailed') || 'İşlem başarısız oldu.');
    }
    setBusyId(null);
  };

  const handleReviewReport = async (
    targetId: string,
    status: 'APPROVED' | 'REJECTED',
    reason: string
  ) => {
    setBusyId(`report-${targetId}`);
    try {
      await apolloClient.mutate({
        mutation: REVIEW_CONTENT_REPORTS,
        variables: { targetId, status, reason: reason.trim() || undefined },
      });
      setReports((prev) => prev.filter((r) => r.report.targetId !== targetId));
      setRejectingReportId(null);
      setRejectReportMessage('');
      setApprovingReportId(null);
      setApproveReportMessage('');
    } catch (e) {
      console.error(e);
      alert(t('operationFailed'));
    }
    setBusyId(null);
  };

  const handleDeleteContent = (contentId: string) => {
    router.push(`/content/movie/${contentId}`); // Veya type'a göre dinamik router.push
  };

  // =====================================
  // UI Helpers
  // =====================================
  const typeLabel = (id: number) => {
    switch (id) {
      case 1:
        return t('types.movie');
      case 2:
        return t('types.tv');
      case 3:
        return t('types.game');
      case 4:
        return t('types.book');
      case 5:
        return t('types.music');
      default:
        return t('types.unknown');
    }
  };

  const typeIcon = (id: number) => {
    switch (id) {
      case 1:
        return '🎬';
      case 2:
        return '📺';
      case 3:
        return '🎮';
      case 4:
        return '📚';
      case 5:
        return '🎵';
      default:
        return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPrivileged) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white/50">
          {t('accessDenied')}
          <br />
          <Link href="/" className="text-violet-400 hover:text-violet-300 mt-2 block">
            {t('returnHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-white/40 text-sm mt-1">{t('desc')}</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            {t('backToAdmin')}
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('new_content')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'new_content'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('tabs.newContent', { count: items.length })}
          </button>
          <button
            onClick={() => setActiveTab('edits')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'edits'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('tabs.edits', { count: contributions.length })}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reports'
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t('tabs.reports', { count: reports.length })}
          </button>
        </div>

        {/* Tab Content: New Content */}
        {activeTab === 'new_content' && (
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-white/50">
                {t('newContent.empty')}
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-2xl flex-shrink-0">
                      {typeIcon(item.contentTypeId)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white text-lg">{item.title}</h3>
                        <span className="px-2 py-0.5 text-xs rounded bg-white/10 text-white/50">
                          {typeLabel(item.contentTypeId)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-white/50 text-sm mb-2">{item.description}</p>
                      )}
                      {item.reason && (
                        <p className="text-white/30 text-xs italic mb-2">
                          {t('newContent.userNote', { note: item.reason })}
                        </p>
                      )}
                      <div className="text-white/30 text-xs">{formatDate(item.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveNewContent(item)}
                        disabled={busyId === item.id}
                        className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 transition-colors text-sm font-medium border border-violet-500/20"
                      >
                        {t('newContent.review')}
                      </button>
                      <button
                        onClick={() =>
                          setRejectingId((curr) => (curr === item.id ? null : item.id))
                        }
                        className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm border border-white/10"
                      >
                        {t('newContent.reject')}
                      </button>
                    </div>
                  </div>

                  {rejectingId === item.id && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <textarea
                        value={rejectMessage}
                        onChange={(e) => setRejectMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
                        placeholder={t('newContent.rejectReasonPh')}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setRejectingId(null)}
                          className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/10"
                        >
                          {t('newContent.cancel')}
                        </button>
                        <button
                          onClick={() => handleRejectNewContent(item.id)}
                          disabled={busyId === item.id}
                          className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        >
                          {t('newContent.confirmReject')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: Edits */}
        {activeTab === 'edits' && (
          <div className="space-y-3">
            {contributions.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-white/50">
                {t('edits.empty')}
              </div>
            ) : (
              contributions.map((c) => (
                <div
                  key={c.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-white/10">
                      {c.content?.posterUrl ? (
                        <Image
                          src={c.content.posterUrl}
                          alt={c.content.title}
                          fill
                          sizes="48px"
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20">
                          <Edit2 size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-white text-lg">
                          {c.content?.title || t('edits.unknownContent')}
                        </h3>
                        <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">
                          {t('edits.editBadge')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {c.user.picturePath ? (
                          <Image
                            src={c.user.picturePath}
                            alt={c.user.username}
                            width={20}
                            height={20}
                            unoptimized
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/20" />
                        )}
                        <span className="text-white/60 text-sm">{c.user.username}</span>
                        <span className="text-white/30 text-xs ml-2">
                          {formatDate(c.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleReviewContribution(c)}
                        disabled={busyId === `contrib-${c.id}`}
                        className="px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 hover:bg-violet-600/40 transition-colors text-sm font-medium border border-violet-500/20"
                      >
                        {t('edits.reviewApply')}
                      </button>
                      <button
                        onClick={() => handleDirectApproveContribution(c)}
                        disabled={busyId === `contrib-${c.id}`}
                        className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors text-sm font-medium border border-green-500/20"
                      >
                        Hızlı Onayla
                      </button>
                      <button
                        onClick={() =>
                          setRejectingContribId((curr) => (curr === c.id ? null : c.id))
                        }
                        className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm border border-white/10"
                      >
                        {t('edits.reject')}
                      </button>
                    </div>
                  </div>

                  {c.content?.id && (
                    <ContributionDiffViewer contentId={c.content.id} payload={c.payload} />
                  )}

                  {rejectingContribId === c.id && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <textarea
                        value={rejectContribMessage}
                        onChange={(e) => setRejectContribMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
                        placeholder={t('edits.rejectReasonPh')}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setRejectingContribId(null)}
                          className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/10"
                        >
                          {t('edits.cancel')}
                        </button>
                        <button
                          onClick={() => handleRejectContribution(c.id)}
                          disabled={busyId === `contrib-${c.id}`}
                          className="px-3 py-1.5 rounded-lg text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        >
                          {t('edits.confirmReject')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Content: Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-white/50">
                {t('reports.empty')}
              </div>
            ) : (
              reports.map((r) => (
                <div
                  key={r.report.id}
                  className="bg-red-500/5 border border-red-500/20 rounded-xl p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                      🚩
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-red-400 font-medium">{t('reports.reported')}</span>
                        <h3 className="font-medium text-white text-lg">
                          {r.contentTitle || t('reports.unknownContent')}
                        </h3>
                      </div>
                      <p className="text-white/70 text-sm mb-2">{r.report.reason}</p>
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        <span>
                          {t('reports.reportedBy')}
                          <span className="text-white/60">{r.reporterUsername}</span>
                        </span>
                        <span>•</span>
                        <span>{formatDate(r.report.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setRejectingReportId(null);
                          setApprovingReportId((curr) =>
                            curr === r.report.targetId ? null : r.report.targetId
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors text-sm flex items-center gap-1"
                      >
                        <Check size={14} /> {t('reports.approve')}
                      </button>
                      <button
                        onClick={() => {
                          setApprovingReportId(null);
                          setRejectingReportId((curr) =>
                            curr === r.report.targetId ? null : r.report.targetId
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors text-sm flex items-center gap-1"
                      >
                        <ShieldX size={14} /> {t('reports.reject')}
                      </button>
                      <button
                        onClick={() => handleDeleteContent(r.report.targetId)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-sm flex items-center gap-1"
                      >
                        <Trash2 size={14} /> {t('reports.goToContent')}
                      </button>
                    </div>
                  </div>

                  {rejectingReportId === r.report.targetId && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <textarea
                        value={rejectReportMessage}
                        onChange={(e) => setRejectReportMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
                        placeholder={t('reports.rejectReasonPh')}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setRejectingReportId(null)}
                          className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/10"
                        >
                          {t('reports.cancel')}
                        </button>
                        <button
                          onClick={() =>
                            handleReviewReport(r.report.targetId, 'REJECTED', rejectReportMessage)
                          }
                          disabled={busyId === `report-${r.report.targetId}`}
                          className="px-3 py-1.5 rounded-lg text-sm bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border border-yellow-500/20"
                        >
                          {t('reports.confirmReject')}
                        </button>
                      </div>
                    </div>
                  )}

                  {approvingReportId === r.report.targetId && (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <textarea
                        value={approveReportMessage}
                        onChange={(e) => setApproveReportMessage(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30"
                        placeholder={t('reports.approveMessagePh')}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setApprovingReportId(null)}
                          className="px-3 py-1.5 rounded-lg text-sm text-white/60 hover:bg-white/10"
                        >
                          {t('reports.cancel')}
                        </button>
                        <button
                          onClick={() =>
                            handleReviewReport(r.report.targetId, 'APPROVED', approveReportMessage)
                          }
                          disabled={busyId === `report-${r.report.targetId}`}
                          className="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20"
                        >
                          {t('reports.confirmApprove')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
