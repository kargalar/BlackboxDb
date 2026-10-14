'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCurrentUserProfile } from '@/services/database/userService';
import {
  getLogs,
  getRequestCounts,
  resetRequestCounts,
  formatLogForClipboard,
  formatAllLogsForClipboard,
  formatLogsAsJSON,
} from '@/lib/requestLogger';
import { resetAllData, deleteAllUsers, deleteAllContentByType } from '@/services/adminService';
import type { Route } from 'next';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useGlobalSettings } from '@/contexts/GlobalSettingsContext';
import { useTranslations } from 'next-intl';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql\/?$/, '') ||
  'http://localhost:4000'
).replace(/\/$/, '');

const UPDATE_GLOBAL_THEME = gql`
  mutation UpdateGlobalTheme($theme: String!) {
    updateGlobalTheme(theme: $theme) {
      id
      theme
    }
  }
`;

const UPDATE_BOOK_MODULE_STATUS = gql`
  mutation UpdateBookModuleStatus($isEnabled: Boolean!) {
    updateBookModuleStatus(isEnabled: $isEnabled) {
      id
      isBookEnabled
    }
  }
`;

const IMPORT_WEEKLY_POPULAR_MOVIES = gql`
  mutation ImportWeeklyPopularMovies {
    importWeeklyPopularMovies {
      success
      jobId
      message
    }
  }
`;

const GET_IMPORT_JOB_STATUS = gql`
  query GetImportJobStatus($jobId: String!) {
    getImportJobStatus(jobId: $jobId) {
      id
      status
      totalItems
      processedItems
      currentItem
      errors
    }
  }
`;

interface LogEntry {
  id: number;
  type: 'api' | 'graphql' | 'ui';
  endpoint: string;
  operation: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

export default function AdminHome() {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [counts, setCounts] = useState({ apiRequests: 0 });
  const [isResettingData, setIsResettingData] = useState(false);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUpdatingTheme, setIsUpdatingTheme] = useState(false);

  const { settings } = useGlobalSettings();
  const [updateGlobalTheme] = useMutation(UPDATE_GLOBAL_THEME);
  const [updateBookModuleStatus] = useMutation(UPDATE_BOOK_MODULE_STATUS);
  const [importWeeklyPopularMovies] = useMutation<{
    importWeeklyPopularMovies: {
      success: boolean;
      jobId?: string;
      message?: string;
    };
  }>(IMPORT_WEEKLY_POPULAR_MOVIES);
  const [isUpdatingBookModule, setIsUpdatingBookModule] = useState(false);
  const [isImportingPopular, setIsImportingPopular] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations('AdminPage');

  const { data: jobData } = useQuery<{
    getImportJobStatus: {
      id: string;
      status: string;
      totalItems: number;
      processedItems: number;
      currentItem?: string;
      errors: string[];
    } | null;
  }>(GET_IMPORT_JOB_STATUS, {
    variables: { jobId: activeJobId || '' },
    skip: !activeJobId,
    pollInterval: 1000,
  });

  const handleThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value;
    setIsUpdatingTheme(true);
    try {
      await updateGlobalTheme({ variables: { theme: newTheme } });
      document.documentElement.setAttribute('data-global-theme', newTheme);
      alert(t('alerts.themeSuccess'));
    } catch (err: any) {
      console.error(err);
      alert(t('alerts.themeError') + err.message);
    } finally {
      setIsUpdatingTheme(false);
    }
  };

  const handleBookModuleToggle = async () => {
    const newValue = !(settings?.isBookEnabled ?? true);
    setIsUpdatingBookModule(true);
    try {
      await updateBookModuleStatus({ variables: { isEnabled: newValue } });
      alert(newValue ? 'Kitap modülü aktifleştirildi.' : 'Kitap modülü devre dışı bırakıldı.');
    } catch (err: any) {
      console.error(err);
      alert('Hata: ' + err.message);
    } finally {
      setIsUpdatingBookModule(false);
    }
  };

  const handleReset = () => {
    try {
      resetRequestCounts();
      setLogs([]);
      setCounts({ apiRequests: 0 });
    } catch (error) {
      console.warn('[Admin] Failed to reset:', error);
    }
  };

  const handleResetAllData = async () => {
    if (!window.confirm(t('alerts.resetWarning').replace(/\\n/g, '\n'))) return;
    if (!window.confirm(t('alerts.finalWarning').replace(/\\n/g, '\n'))) return;

    setIsResettingData(true);
    try {
      const result = await resetAllData();
      if (result.error) {
        alert(t('alerts.error') + (result.error.message || 'Bilinmeyen'));
      } else {
        alert(t('alerts.dataReset'));
        window.location.reload();
      }
    } finally {
      setIsResettingData(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    if (!window.confirm(t('alerts.usersWarning'))) return;
    if (!window.confirm(t('alerts.finalWarning').replace(/\\n/g, '\n'))) return;

    setIsDeletingUsers(true);
    try {
      const result = await deleteAllUsers();
      if (result.error) {
        alert(t('alerts.error') + (result.error.message || 'Bilinmeyen'));
      } else {
        alert(t('alerts.usersDeleted'));
        window.location.reload();
      }
    } finally {
      setIsDeletingUsers(false);
    }
  };

  const [isDeletingType, setIsDeletingType] = useState<string | null>(null);

  const handleDeleteContentByType = async (typeSlug: string, typeName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete ALL ${typeName} content? This action cannot be undone.`
      )
    )
      return;
    if (
      !window.confirm(
        `FINAL WARNING: This will permanently erase all ${typeName} from the database. Proceed?`
      )
    )
      return;

    setIsDeletingType(typeSlug);
    try {
      const result = await deleteAllContentByType(typeSlug);
      if (result.error) {
        alert('Hata: ' + (result.error.message || 'Bilinmeyen'));
      } else {
        alert(`Tüm ${typeName} içerikleri başarıyla silindi.`);
        window.location.reload();
      }
    } finally {
      setIsDeletingType(null);
    }
  };

  const handleBackupDatabase = async () => {
    setIsBackingUp(true);
    try {
      console.log('💾 [Admin] Starting database backup stream...');
      const response = await fetch(`${API_BASE_URL}/api/admin/backup`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error(t('alerts.backupFailed'));

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `blackboxdb-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      // Small delay to remove loading state after triggering download
      setTimeout(() => {
        console.log('✅ [Admin] Backup download triggered successfully');
        setIsBackingUp(false);
      }, 1500);
    } catch (err: any) {
      console.error('❌ [Admin] Backup error:', err);
      alert(t('alerts.backupFailed') + err.message);
      setIsBackingUp(false);
    }
  };

  const handleRestoreDatabase = async () => {
    // Create a file input to select the backup .dump
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.dump,.sql';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!window.confirm(t('alerts.restoreWarning').replace(/\\n/g, '\n'))) return;
      if (!window.confirm(t('alerts.restoreFinalWarning').replace(/\\n/g, '\n'))) return;

      setIsRestoring(true);
      try {
        console.log('♻️ [Admin] Starting restore upload...');
        const response = await fetch(`${API_BASE_URL}/api/admin/restore`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: file,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || response.statusText || 'Bilinmeyen Hata');
        }

        console.log('✅ [Admin] Database restored successfully');
        alert(t('alerts.restoreSuccess'));
        window.location.reload();
      } catch (err: any) {
        console.error('❌ [Admin] Restore error:', err);
        alert(t('alerts.restoreFailed') + err.message);
      } finally {
        setIsRestoring(false);
      }
    };
    fileInput.click();
  };

  const handleImportPopularMovies = async () => {
    setIsImportingPopular(true);
    try {
      const { data } = await importWeeklyPopularMovies();
      if (data?.importWeeklyPopularMovies?.success && data.importWeeklyPopularMovies.jobId) {
        setActiveJobId(data.importWeeklyPopularMovies.jobId);
        setIsModalOpen(true);
      } else {
        alert('İşlem başlatılamadı.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Hata: ' + err.message);
    } finally {
      setIsImportingPopular(false);
    }
  };

  const copyLogToClipboard = (log: LogEntry) => {
    navigator.clipboard.writeText(formatLogForClipboard(log));
  };

  const copyAllLogsToClipboard = () => {
    navigator.clipboard.writeText(formatAllLogsForClipboard(logs));
  };

  const copyLogsAsJSON = () => {
    navigator.clipboard.writeText(formatLogsAsJSON(logs));
  };

  useEffect(() => {
    getCurrentUserProfile().then((r) => {
      setAllowed(!!r.data?.isAdmin || !!r.data?.isModerator);
    });
  }, []);

  useEffect(() => {
    if (allowed) {
      setLogs(getLogs().slice(-5));
      setCounts(getRequestCounts());
      const interval = setInterval(() => {
        setLogs(getLogs().slice(-5));
        setCounts(getRequestCounts());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [allowed]);

  const adminLinks = [
    {
      href: '/admin/content-requests',
      icon: '📥',
      title: t('links.requests.title'),
      desc: t('links.requests.desc'),
    },
    {
      href: '/admin/showcase',
      icon: '✨',
      title: 'Editörün Seçtikleri (Vitrin)',
      desc: 'Ana sayfa üst vitrininde gösterilecek içerikleri (her tür için en fazla 5 adet) yönetin.',
      highlight: true,
    },
    {
      href: '/admin/content',
      icon: '📁',
      title: t('links.content.title'),
      desc: t('links.content.desc'),
    },
    {
      href: '/admin/users',
      icon: '👥',
      title: t('links.users.title'),
      desc: t('links.users.desc'),
    },
    {
      href: '/admin/moderation',
      icon: '🛡️',
      title: t('links.moderation.title'),
      desc: t('links.moderation.desc'),
    },
    {
      href: '/admin/expansions',
      icon: '🎮',
      title: t('links.expansions.title'),
      desc: t('links.expansions.desc'),
    },
    {
      href: '/admin/quiz',
      icon: '🎯',
      title: t('links.quiz.title'),
      desc: t('links.quiz.desc'),
      highlight: true,
    },
    {
      href: '/admin/debug-logs',
      icon: '🔍',
      title: t('links.debugLogs.title'),
      desc: t('links.debugLogs.desc'),
    },
    {
      href: '/admin/categories',
      icon: '🏷️',
      title: t('links.categories.title'),
      desc: t('links.categories.desc'),
    },
    {
      href: '/admin/reports',
      icon: '🚩',
      title: 'Raporlar',
      desc: 'Kullanıcı bildirimlerini ve şikayetleri yönetin.',
    },
  ];

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold mb-2">{t('accessDenied')}</h1>
          <p className="text-white/50">{t('accessDeniedDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">
          <span className="gradient-text">{t('title')}</span>
        </h1>
        <p className="text-white/50">{t('description')}</p>
      </div>

      {/* Admin Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href as Route}
            className={`glass-card p-5 group hover:bg-white/10 transition-all ${
              link.highlight ? 'border border-yellow-500/30 bg-yellow-500/5' : ''
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  link.highlight ? 'bg-yellow-500/20' : 'bg-white/10'
                }`}
              >
                {link.icon}
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-white/40 mt-1">{link.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Popular Movies Import Section */}
      <div className="glass-card p-6 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-purple-400">Popüler İçerik İçe Aktarma</h2>
            <p className="text-sm text-white/40">
              Harici kaynaklardan popüler içerikleri sisteminize aktarın.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleImportPopularMovies}
            disabled={isImportingPopular}
            className="p-4 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-colors disabled:opacity-50 text-left"
          >
            <div className="font-semibold text-purple-400 flex items-center gap-2">
              {isImportingPopular ? (
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>🎬</span>
              )}
              Haftalık Popüler Filmleri İçe Aktar
            </div>
            <p className="text-sm text-white/40 mt-1">
              IMDb ve Letterboxd üzerinde son 1 haftadaki en popüler filmleri çeker, eksik olanları
              TMDB ile veritabanına ekler.
            </p>
          </button>
        </div>
      </div>

      {/* Dangerous Operations */}
      <div className="glass-card p-6 border border-red-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-red-400">{t('dangerous.title')}</h2>
            <p className="text-sm text-white/40">{t('dangerous.desc')}</p>
          </div>
        </div>

        {/* Backup & Restore Row */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white/60 mb-3 uppercase tracking-wider">
            {t('dangerous.backupRestore')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleBackupDatabase}
              disabled={isBackingUp}
              className="p-4 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-semibold text-blue-400 flex items-center gap-2">
                {isBackingUp ? (
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>💾</span>
                )}
                {t('dangerous.backup')}
              </div>
              <p className="text-sm text-white/40 mt-1">{t('dangerous.backupDesc')}</p>
            </button>

            <button
              onClick={handleRestoreDatabase}
              disabled={isRestoring}
              className="p-4 rounded-xl bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600/30 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-semibold text-amber-400 flex items-center gap-2">
                {isRestoring ? (
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>♻️</span>
                )}
                {t('dangerous.restore')}
              </div>
              <p className="text-sm text-white/40 mt-1">{t('dangerous.restoreDesc')}</p>
            </button>
          </div>
        </div>

        {/* Destructive Operations Row */}
        <div>
          <h3 className="text-sm font-medium text-red-400/60 mb-3 uppercase tracking-wider">
            {t('dangerous.deletion')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleResetAllData}
              disabled={isResettingData}
              className="p-4 rounded-xl bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-semibold text-red-400 flex items-center gap-2">
                {isResettingData ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>🗑️</span>
                )}
                {t('dangerous.resetData')}
              </div>
              <p className="text-sm text-white/40 mt-1">{t('dangerous.resetDataDesc')}</p>
            </button>

            <button
              onClick={handleDeleteAllUsers}
              disabled={isDeletingUsers}
              className="p-4 rounded-xl bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-semibold text-red-400 flex items-center gap-2">
                {isDeletingUsers ? (
                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>👥</span>
                )}
                {t('dangerous.deleteUsers')}
              </div>
              <p className="text-sm text-white/40 mt-1">{t('dangerous.deleteUsersDesc')}</p>
            </button>
          </div>
        </div>

        {/* Content Type Deletion */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-red-400/60 mb-3 uppercase tracking-wider">
            İçerik Türüne Göre Silme
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { slug: 'movie', name: 'Filmler', icon: '🎬' },
              { slug: 'tv', name: 'Diziler', icon: '📺' },
              { slug: 'game', name: 'Oyunlar', icon: '🎮' },
              { slug: 'book', name: 'Kitaplar', icon: '📚' },
            ].map((type) => (
              <button
                key={type.slug}
                onClick={() => handleDeleteContentByType(type.slug, type.name)}
                disabled={isDeletingType !== null}
                className="p-3 rounded-xl bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 transition-colors disabled:opacity-50 text-center"
              >
                <div className="font-semibold text-red-400 flex flex-col items-center gap-2">
                  {isDeletingType === type.slug ? (
                    <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-2xl">{type.icon}</span>
                  )}
                  <span className="text-sm">Tüm {type.name}i Sil</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="glass-card p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-xl">🎨</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{t('theme.title')}</h2>
              <p className="text-sm text-white/40">{t('theme.desc')}</p>
            </div>
          </div>
          <div>
            <select
              value={settings?.theme || 'default'}
              onChange={handleThemeChange}
              disabled={isUpdatingTheme}
              className="bg-black border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="default">{t('theme.default')}</option>
              <option value="red">{t('theme.red')}</option>
              <option value="green">{t('theme.green')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Module Settings */}
      <div className="glass-card p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-xl">📚</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                Kitap Modülü (Sadece Adminler İçin)
              </h2>
              <p className="text-sm text-white/40">
                Kitap içerik türünü sistem genelinde açıp kapatın.
              </p>
            </div>
          </div>
          <div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings?.isBookEnabled ?? true}
                onChange={handleBookModuleToggle}
                disabled={isUpdatingBookModule}
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            <span className="gradient-text">{t('stats.title')}</span>
          </h2>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors text-sm"
          >
            {t('stats.reset')}
          </button>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm">{t('stats.apiRequests')}</p>
              <p className="text-3xl font-bold text-blue-400">{counts.apiRequests}</p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        {logs.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="font-medium">{t('logs.title')}</h3>
              <div className="flex gap-2">
                <button
                  onClick={copyAllLogsToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-colors"
                >
                  {t('logs.text')}
                </button>
                <button
                  onClick={copyLogsAsJSON}
                  className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/30 transition-colors"
                >
                  {t('logs.json')}
                </button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 border-b border-white/5 last:border-b-0 flex justify-between items-center ${
                    log.success ? 'bg-green-500/5' : 'bg-red-500/5'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {log.type.toUpperCase()} - {log.operation}
                    </p>
                    <p className="text-xs text-white/40">{log.timestamp.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        log.success
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {log.success ? '✓' : '✗'}
                    </span>
                    <button
                      onClick={() => copyLogToClipboard(log)}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                    >
                      📋
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal / Dialog */}
      {isModalOpen &&
        (() => {
          let parsedProgress = {
            title: 'Bekleniyor...',
            year: null,
            imported: 0,
            skipped: 0,
            failed: 0,
          };

          if (jobData?.getImportJobStatus?.currentItem) {
            try {
              parsedProgress = JSON.parse(jobData.getImportJobStatus.currentItem);
            } catch (e) {
              parsedProgress.title = jobData.getImportJobStatus.currentItem;
            }
          }

          const jobStatus = jobData?.getImportJobStatus?.status || 'PENDING';
          const total = jobData?.getImportJobStatus?.totalItems || 0;
          const processed = jobData?.getImportJobStatus?.processedItems || 0;
          const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
          const errors = jobData?.getImportJobStatus?.errors || [];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-card w-full max-w-lg border border-purple-500/30 p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto bg-surface-panel">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                    <span>🔥</span> Popüler İçerik İçe Aktarılıyor
                  </h3>
                  {(jobStatus === 'COMPLETED' || jobStatus === 'FAILED') && (
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setActiveJobId(null);
                      }}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Content / Stats */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1 text-center bg-white/5 p-3 rounded-xl">
                    <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">
                      Aktif İşlem
                    </span>
                    <span className="font-medium text-white truncate max-w-full block">
                      {parsedProgress.title} {parsedProgress.year ? `(${parsedProgress.year})` : ''}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs text-white/50">
                      <span>
                        İlerleme: {processed} / {total}
                      </span>
                      <span>{percent}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <span className="text-2xl">📥</span>
                      <span className="text-sm font-semibold text-green-400 mt-1">
                        {parsedProgress.imported}
                      </span>
                      <span className="text-xs text-white/40">Aktarılan</span>
                    </div>

                    <div className="flex flex-col items-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <span className="text-2xl">✓</span>
                      <span className="text-sm font-semibold text-blue-400 mt-1">
                        {parsedProgress.skipped}
                      </span>
                      <span className="text-xs text-white/40">Zaten Var</span>
                    </div>

                    <div className="flex flex-col items-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <span className="text-2xl">⚠️</span>
                      <span className="text-sm font-semibold text-red-400 mt-1">
                        {parsedProgress.failed}
                      </span>
                      <span className="text-xs text-white/40">Hata</span>
                    </div>
                  </div>

                  {/* Errors List */}
                  {errors.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-red-400 font-semibold">
                        Oluşan Hatalar ({errors.length})
                      </span>
                      <div className="max-h-24 overflow-y-auto bg-red-950/20 border border-red-500/10 rounded-lg p-2 text-xs text-red-400 flex flex-col gap-1">
                        {errors.slice(-5).map((err, idx) => (
                          <div key={idx} className="truncate">
                            {err}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-white/10 pt-3">
                  {jobStatus === 'COMPLETED' || jobStatus === 'FAILED' ? (
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setActiveJobId(null);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 transition-colors text-white rounded-xl text-sm font-medium"
                    >
                      Kapat
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <div className="w-3.5 h-3.5 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                      İçe aktarım devam ediyor...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
