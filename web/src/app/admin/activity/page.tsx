'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import Image from 'next/image';
import { GET_ADMIN_ACTIVITY_LOGS } from '@/services/graphql/admin/adminContent';
import type { AdminContentEditHistoryResponse } from '@/services/graphql/admin/adminContent';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  AuditSnapshotView,
  formatAuditFieldLabel,
} from '@/app/admin/content/components/AuditSnapshotView';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-500 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ROLLBACK: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const CONTENT_TYPE_SLUGS: Record<number, string> = {
  1: 'movie',
  2: 'tv',
  3: 'game',
  4: 'book',
  5: 'music',
};

export default function AdminActivityPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 20;

  const { data, loading, error } = useQuery<{
    adminContentActivityLogs: AdminContentEditHistoryResponse;
  }>(GET_ADMIN_ACTIVITY_LOGS, {
    variables: { page, limit, search },
    fetchPolicy: 'cache-and-network',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  useEffect(() => {
    if (!error) return;
    toast.error('Aktiviteler yüklenirken bir hata oluştu.');
  }, [error]);

  const logs = data?.adminContentActivityLogs.items || [];
  const totalPages = data?.adminContentActivityLogs.totalPages || 1;
  const total = data?.adminContentActivityLogs.total || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Aktivite İzleme</h1>
          <p className="text-white/60">
            Sistemdeki içerik değişikliklerini ve eklemelerini takip edin.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="İçerik adı veya ID ara..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
          >
            Ara
          </button>
        </form>
      </div>

      <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-white/60 text-sm">
                <th className="p-4 font-medium">Tarih</th>
                <th className="p-4 font-medium">Kullanıcı</th>
                <th className="p-4 font-medium">İşlem</th>
                <th className="p-4 font-medium">İçerik</th>
                <th className="p-4 font-medium">Detay</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-white/5">
              {loading && !logs.length ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      Yükleniyor...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/40">
                    Aktivite kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                logs.map((log) => <ActivityRow key={log.id} log={log} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm text-white/40">
              Toplam {total} kayıttan {(page - 1) * limit + 1}-{Math.min(page * limit, total)} arası
              gösteriliyor
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
              >
                Önceki
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm transition-colors"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ log }: { log: any }) {
  const t = useTranslations('AdminContentPage');
  const [expanded, setExpanded] = useState(false);

  const date = new Date(Number(log.createdAt) || log.createdAt);
  const formattedDate = date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const actionColorClass = ACTION_COLORS[log.action] || 'bg-white/10 text-white/80 border-white/20';

  return (
    <>
      <tr className="hover:bg-white/[0.02] transition-colors group">
        <td className="p-4 text-white/60 whitespace-nowrap">{formattedDate}</td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center overflow-hidden flex-shrink-0">
              {log.actor?.picturePath ? (
                <Image
                  src={log.actor.picturePath}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-medium text-xs">
                  {(log.actor?.username || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="text-white font-medium">{log.actor?.username || 'Bilinmeyen'}</div>
              <div className="text-white/40 text-xs">{log.actor?.email}</div>
            </div>
          </div>
        </td>
        <td className="p-4">
          <span
            className={`px-2.5 py-1 text-xs font-medium rounded-full border ${actionColorClass}`}
          >
            {log.action}
          </span>
        </td>
        <td className="p-4">
          {log.content ? (
            <div className="flex items-center gap-3">
              {log.content.posterUrl && (
                <Image
                  src={log.content.posterUrl}
                  alt=""
                  width={32}
                  height={48}
                  unoptimized
                  className="h-12 w-8 rounded object-cover shadow-sm"
                />
              )}
              <div>
                {log.content.isDeleted ? (
                  <span className="text-white font-medium">{log.content.title}</span>
                ) : (
                  <Link
                    href={
                      `/content/${CONTENT_TYPE_SLUGS[log.content.contentTypeId] || 'movie'}/${log.content.id}` as any
                    }
                    className="text-white font-medium hover:text-violet-400 transition-colors"
                  >
                    {log.content.title}
                  </Link>
                )}
                {log.content.originalTitle && log.content.originalTitle !== log.content.title && (
                  <div className="text-white/40 text-xs">{log.content.originalTitle}</div>
                )}
                {log.content.isDeleted && (
                  <span className="mt-1 inline-flex rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
                    {t('deletedContent')}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-white/40 italic">İçerik Bulunamadı ({log.contentId})</span>
          )}
        </td>
        <td className="p-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors"
          >
            {expanded ? 'Gizle' : 'Detayları Gör'}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-black/40 border-b border-white/5">
          <td colSpan={5} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white/80 font-medium mb-3 text-sm">Değişen Alanlar</h4>
                {log.changedFields?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {log.changedFields.map((field: string) => (
                      <span
                        key={field}
                        className="px-2 py-1 bg-white/10 text-white/80 rounded text-xs"
                      >
                        {formatAuditFieldLabel(field)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-white/40 text-sm italic">Belirtilmemiş</span>
                )}

                {log.summary && (
                  <div className="mt-4">
                    <h4 className="text-white/80 font-medium mb-2 text-sm">Özet</h4>
                    <p className="text-white/60 text-sm">{log.summary}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {log.before && Object.keys(log.before).length > 0 && (
                  <div>
                    <h4 className="text-red-400 font-medium mb-2 text-sm">Önceki Değerler</h4>
                    <AuditSnapshotView
                      value={log.before}
                      comparisonValue={log.after}
                      side="before"
                    />
                  </div>
                )}

                {log.after && Object.keys(log.after).length > 0 && (
                  <div>
                    <h4 className="text-green-400 font-medium mb-2 text-sm">Yeni Değerler</h4>
                    <AuditSnapshotView
                      value={log.after}
                      comparisonValue={log.before}
                      side="after"
                    />
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
