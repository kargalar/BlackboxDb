'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_REPORTS, UPDATE_REPORT_STATUS } from '@/services/graphql/admin/adminReport';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportsAdminPage() {
  const [filter, setFilter] = useState<string>('pending');
  const t = useTranslations('AdminReportsPage');
  const locale = useLocale();
  const { isPrivileged } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_REPORTS, {
    variables: { status: filter === 'all' ? null : filter, limit: 100 },
    fetchPolicy: 'network-only',
  });

  const [updateStatus] = useMutation(UPDATE_REPORT_STATUS);

  const handleUpdateStatus = async (reportId: number, status: string) => {
    try {
      await updateStatus({ variables: { reportId, status } });
      refetch();
    } catch (e) {
      console.error('Failed to update report status:', e);
      alert('Failed to update report status.');
    }
  };

  if (!isPrivileged) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Erişim Reddedildi</h1>
          <p className="text-white/50">Bu sayfayı görüntülemek için yetkiniz yok.</p>
        </div>
      </div>
    );
  }

  const reports = (data as any)?.getReports || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'resolved':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'rejected':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default:
        return 'text-white/60 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rapor Yönetimi</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {['pending', 'resolved', 'rejected', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status ? 'bg-red-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 flex items-center justify-center text-red-400">
          Raporlar yüklenirken bir hata oluştu: {error.message}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/60">Bu filtreye uygun rapor bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <div key={report.id} className="glass-card p-5 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative">
                    {report.reporter?.picturePath ? (
                      <Image
                        src={report.reporter.picturePath}
                        alt={report.reporter.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/60">
                        {report.reporter?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {report.reporter?.username || 'Bilinmeyen Kullanıcı'}
                    </p>
                    <p className="text-xs text-white/40">
                      {new Intl.DateTimeFormat(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(report.createdAt))}
                    </p>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded border text-xs font-medium uppercase ${getStatusColor(report.status)}`}
                >
                  {report.status}
                </div>
              </div>

              <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                <div className="flex gap-2 mb-2">
                  <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                    {report.targetType}
                  </span>
                  <span className="text-xs text-white/60">{report.targetId}</span>
                </div>
                <p className="text-sm text-white/90 whitespace-pre-wrap">{report.reason}</p>
              </div>

              {report.status === 'pending' && (
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleUpdateStatus(report.id, 'rejected')}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg transition-colors text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Reddet
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(report.id, 'resolved')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Çözüldü
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
