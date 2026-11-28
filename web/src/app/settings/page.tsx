'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { resolvePosterIconsPosition, type PosterIconsPosition } from '@/hooks/useUserPreferences';
import { getAllUserContentLogs, deleteAllUserContentLogs } from '@/services/userContentService';
import { apolloClient } from '@/lib/apollo-client';
import { UPDATE_PREFERENCES } from '@/services/graphql/auth';
import { LIST_PLATFORMS } from '@/services/graphql/admin/adminCategories';

import { useQuery, useMutation } from '@apollo/client/react';
import { LetterboxdImportSection } from '@/features/import/LetterboxdImportSection';
import { CsvImportSection } from '@/features/import/CsvImportSection';
import toast from 'react-hot-toast';
import { Bell, Check, ChevronDown, Monitor, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

type SettingsTab = 'data' | 'preferences' | 'notifications' | 'integrations';

const CONTENT_TYPE_OPTIONS = [
  { id: 1, translation: 'movies', icon: '🎬' },
  { id: 2, translation: 'tvShows', icon: '📺' },
  { id: 3, translation: 'games', icon: '🎮' },
  { id: 4, translation: 'books', icon: '📚' },
];

const GRID_COLUMN_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];
const GRID_ROW_OPTIONS = [4, 5, 6, 7, 8, 9, 10];
const NOTIFICATION_TOGGLE_DEFAULT = true;

const NOTIFICATION_OPTIONS = [
  'notifyOnFollows',
  'notifyOnContentRequestUpdates',
  'notifyOnCommentVotes',
  'notifyOnCommentReplies',
  'notifyOnMentions',
  'notifyOnRecommendations',
  'notifyOnNewSeasons',
  'notifyOnContentReleased',
  'notifyOnRoleUpdates',
] as const;

export default function SettingsPage() {
  const translateUi = useUiTranslations('Ui');
  const letterboxdExportT = useTranslations('LetterboxdExport');
  const settingsT = useTranslations('Settings');
  const { user, updateUserPreferences } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('data');
  const [isExporting, setIsExporting] = useState(false);
  const [isLetterboxdExporting, setIsLetterboxdExporting] = useState(false);
  const [letterboxdExportCount, setLetterboxdExportCount] = useState(10);
  const [isImporting, setIsImporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Preferences state
  const [selectedContentTypes, setSelectedContentTypes] = useState<number[]>([]);
  const [gridColumns, setGridColumns] = useState(5);
  const [gridRows, setGridRows] = useState(4);
  const [posterZoomEnabled, setPosterZoomEnabled] = useState(true);
  const [posterIconsPosition, setPosterIconsPosition] = useState<PosterIconsPosition>('below');
  const [posterRatingEnabled, setPosterRatingEnabled] = useState(false);
  const [showSensitiveContent, setShowSensitiveContent] = useState(false);
  const [pendingTitlePreference, setPendingTitlePreference] = useState<boolean | null>(null);
  const [preferredGamePlatformIds, setPreferredGamePlatformIds] = useState<number[]>([]);
  const [splitHomePopularSections, setSplitHomePopularSections] = useState(false);
  const [notifyOnFollows, setNotifyOnFollows] = useState(NOTIFICATION_TOGGLE_DEFAULT);
  const [notifyOnContentRequestUpdates, setNotifyOnContentRequestUpdates] = useState(
    NOTIFICATION_TOGGLE_DEFAULT
  );
  const [notifyOnCommentVotes, setNotifyOnCommentVotes] = useState(NOTIFICATION_TOGGLE_DEFAULT);
  const [notifyOnCommentReplies, setNotifyOnCommentReplies] = useState(NOTIFICATION_TOGGLE_DEFAULT);
  const [notifyOnMentions, setNotifyOnMentions] = useState(NOTIFICATION_TOGGLE_DEFAULT);
  const [notifyOnRecommendations, setNotifyOnRecommendations] = useState(
    NOTIFICATION_TOGGLE_DEFAULT
  );
  const [notifyOnNewSeasons, setNotifyOnNewSeasons] = useState(NOTIFICATION_TOGGLE_DEFAULT);
  const [notifyOnContentReleased, setNotifyOnContentReleased] = useState(
    NOTIFICATION_TOGGLE_DEFAULT
  );
  const [notifyOnRoleUpdates, setNotifyOnRoleUpdates] = useState(NOTIFICATION_TOGGLE_DEFAULT);
  const hasLoadedPrefs = useRef(false);
  const platformPreferenceRef = useRef<HTMLDivElement>(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);

  const { data: platformsData } = useQuery<any>(LIST_PLATFORMS, {
    variables: { limit: 100, offset: 0 },
  });
  const platforms = platformsData?.listPlatforms ?? [];

  const toggleOriginalTitles = async () => {
    if (!user || pendingTitlePreference !== null) return;
    const showOriginalTitles = !user.showOriginalTitles;
    setPendingTitlePreference(showOriginalTitles);
    try {
      const result = await apolloClient.mutate<{ updatePreferences: { showOriginalTitles: boolean } }>({
        mutation: UPDATE_PREFERENCES,
        variables: { showOriginalTitles },
      });
      if (result.error || result.data?.updatePreferences.showOriginalTitles !== showOriginalTitles) {
        throw result.error ?? new Error('Title preference was not saved');
      }
      updateUserPreferences(result.data.updatePreferences);
      await apolloClient.resetStore();
    } catch {
      toast.error(settingsT('titlePreference.saveError'));
    } finally {
      setPendingTitlePreference(null);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTabFromUrl = () => {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'data' || tabParam === 'preferences' || tabParam === 'notifications') {
        setActiveTab(tabParam);
      }
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);

  // Load preferences from user
  useEffect(() => {
    if (user) {
      setSelectedContentTypes(
        user.preferredContentTypes?.length ? user.preferredContentTypes : [1, 2, 3, 4, 5]
      );
      setGridColumns(user.gridColumns || 5);
      setGridRows(user.gridRows || 4);
      setPosterZoomEnabled(user.posterZoomEnabled !== false);
      setPosterIconsPosition(
        resolvePosterIconsPosition(user.posterIconsPosition, user.posterIconsBelow)
      );
      setPosterRatingEnabled(user.posterRatingEnabled === true);
      setShowSensitiveContent(user.showSensitiveContent === true);
      setPreferredGamePlatformIds(
        user.preferredGamePlatformIds?.length
          ? user.preferredGamePlatformIds
          : user.preferredGamePlatformId
            ? [user.preferredGamePlatformId]
            : []
      );
      setSplitHomePopularSections(user.splitHomePopularSections === true);
      setNotifyOnFollows(user.notifyOnFollows !== false);
      setNotifyOnContentRequestUpdates(user.notifyOnContentRequestUpdates !== false);
      setNotifyOnCommentVotes(user.notifyOnCommentVotes !== false);
      setNotifyOnCommentReplies(user.notifyOnCommentReplies !== false);
      setNotifyOnMentions(user.notifyOnMentions !== false);
      setNotifyOnRecommendations(user.notifyOnRecommendations !== false);
      setNotifyOnNewSeasons(user.notifyOnNewSeasons !== false);
      setNotifyOnContentReleased(user.notifyOnContentReleased !== false);
      setNotifyOnRoleUpdates(user.notifyOnRoleUpdates !== false);
      // Mark as loaded after a tick so the au effect skips the initial load
      setTimeout(() => {
        hasLoadedPrefs.current = true;
      }, 100);
    }
  }, [user]);

  // Au preferences with debounce
  const savePreferences = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await apolloClient.mutate<{
        updatePreferences: {
          posterRatingEnabled?: boolean;
          posterIconsPosition?: PosterIconsPosition;
          posterIconsBelow?: boolean;
        };
      }>({
        mutation: UPDATE_PREFERENCES,
        variables: {
          preferredContentTypes: selectedContentTypes,
          gridColumns,
          gridRows,
          posterZoomEnabled,
          posterIconsBelow: posterIconsPosition === 'below',
          posterIconsPosition,
          posterRatingEnabled,
          showSensitiveContent,
          preferredGamePlatformId: preferredGamePlatformIds[0] ?? null,
          preferredGamePlatformIds,
          splitHomePopularSections,
          notifyOnFollows,
          notifyOnContentRequestUpdates,
          notifyOnCommentVotes,
          notifyOnCommentReplies,
          notifyOnMentions,
          notifyOnRecommendations,
          notifyOnNewSeasons,
          notifyOnContentReleased,
          notifyOnRoleUpdates,
        },
      });
      const currentPosterIconsPosition = resolvePosterIconsPosition(
        user.posterIconsPosition,
        user.posterIconsBelow
      );
      if (
        posterRatingEnabled !== (user.posterRatingEnabled === true) ||
        posterIconsPosition !== currentPosterIconsPosition
      ) {
        hasLoadedPrefs.current = false;
        if (data?.updatePreferences) updateUserPreferences(data.updatePreferences);
      }
      toast.success(translateUi("preferences_saved_c7c1686"));
    } catch (error) {
      toast.error(translateUi("failed_to_save_preferences_67f0605"));
      console.error('❌ Error saving preferences:', error);
    }
  }, [
    user,
    selectedContentTypes,
    gridColumns,
    gridRows,
    posterZoomEnabled,
    posterIconsPosition,
    posterRatingEnabled,
    updateUserPreferences,
    showSensitiveContent,
    preferredGamePlatformIds,
    splitHomePopularSections,
    notifyOnFollows,
    notifyOnContentRequestUpdates,
    notifyOnCommentVotes,
    notifyOnCommentReplies,
    notifyOnMentions,
    notifyOnRecommendations,
    notifyOnNewSeasons,
    notifyOnContentReleased,
    notifyOnRoleUpdates,
  ]);

  useEffect(() => {
    if (!hasLoadedPrefs.current) return;
    const timer = setTimeout(() => {
      savePreferences();
    }, 500);
    return () => clearTimeout(timer);
  }, [savePreferences]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        platformPreferenceRef.current &&
        !platformPreferenceRef.current.contains(event.target as Node)
      ) {
        setShowPlatformDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePreferredPlatform = (platformId: number) => {
    setPreferredGamePlatformIds((prev) =>
      prev.includes(platformId) ? prev.filter((id) => id !== platformId) : [...prev, platformId]
    );
  };

  const selectedPlatforms = platforms.filter((platform: any) =>
    preferredGamePlatformIds.includes(platform.id)
  );

  const notificationState = {
    notifyOnFollows,
    notifyOnContentRequestUpdates,
    notifyOnCommentVotes,
    notifyOnCommentReplies,
    notifyOnMentions,
    notifyOnRecommendations,
    notifyOnNewSeasons,
    notifyOnContentReleased,
    notifyOnRoleUpdates,
  };

  const notificationSetters = {
    notifyOnFollows: setNotifyOnFollows,
    notifyOnContentRequestUpdates: setNotifyOnContentRequestUpdates,
    notifyOnCommentVotes: setNotifyOnCommentVotes,
    notifyOnCommentReplies: setNotifyOnCommentReplies,
    notifyOnMentions: setNotifyOnMentions,
    notifyOnRecommendations: setNotifyOnRecommendations,
    notifyOnNewSeasons: setNotifyOnNewSeasons,
    notifyOnContentReleased: setNotifyOnContentReleased,
    notifyOnRoleUpdates: setNotifyOnRoleUpdates,
  } as const;

  const handleExport = async () => {
    if (!user) return;

    try {
      setIsExporting(true);
      setExportMessage(translateUi("exporting_data_1716606"));

      const { data: userLogs, error } = await getAllUserContentLogs(user.id);
      if (error) {
        throw new Error('Could not retrieve user content logs');
      }

      const exportData = {
        userContentLogs: userLogs,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
      const exportFileDefaultName = `blackboxdb-export-${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      window.setTimeout(() => URL.revokeObjectURL(dataUri), 1000);

      setExportMessage(translateUi("data_exported_successfully_decb659"));
    } catch (error) {
      setExportMessage(translateUi("an_error_occurred_during_export_90eb0f4"));
      console.error('❌ Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleLetterboxdExport = async () => {
    if (!user) return;

    const requestedCount = Number(letterboxdExportCount);
    if (!Number.isSafeInteger(requestedCount) || requestedCount < 1) {
      toast.error(letterboxdExportT('errors.invalidCount'));
      return;
    }

    try {
      setIsLetterboxdExporting(true);
      const { data: logs, error } = await getAllUserContentLogs(user.id);
      if (error) {
        toast.error(letterboxdExportT('errors.loadFailed'));
        return;
      }

      const movieLogs = logs
        .filter((log) => log.isConsumed && log.content?.contentTypeId === 1)
        .slice(0, requestedCount);

      if (movieLogs.length === 0) {
        toast.error(letterboxdExportT('errors.noMovies'));
        return;
      }

      const csvEscape = (value: unknown) => {
        const text = value == null ? '' : String(value);
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
      };
      const calendarDate = (value?: Date | string | null) => {
        if (!value) return '';
        const text = value instanceof Date ? value.toISOString() : String(value);
        return /^\d{4}-\d{2}-\d{2}/.exec(text)?.[0] ?? '';
      };
      const columns = ['Title', 'Year', 'Directors', 'Rating10', 'WatchedDate', 'Tags', 'Review'];
      const rows = movieLogs.map((log) => {
        const content = log.content;
        const directors = (content?.people ?? [])
          .filter((person) => {
            const role = `${person.job ?? ''} ${person.personRole?.label ?? ''}`;
            return /director/i.test(role);
          })
          .map((person) => person.person?.name)
          .filter((name): name is string => Boolean(name));
        const releaseDate = content?.releaseDate
          ? String(
              content.releaseDate instanceof Date
                ? content.releaseDate.toISOString()
                : content.releaseDate
            )
          : '';
        const year = /^\d{4}/.exec(releaseDate)?.[0] ?? '';

        return [
          content?.title ?? '',
          year,
          directors.join(', '),
          log.rating ?? '',
          calendarDate(log.date),
          (log.tags ?? []).join(', '),
          log.review ?? '',
        ]
          .map(csvEscape)
          .join(',');
      });
      const csv = `\uFEFF${[columns.join(','), ...rows].join('\r\n')}`;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `blackboxdb-letterboxd-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(letterboxdExportT('success', { count: movieLogs.length }));
    } catch (error) {
      console.error('❌ Letterboxd export error:', error);
      toast.error(letterboxdExportT('errors.exportFailed'));
    } finally {
      setIsLetterboxdExporting(false);
    }
  };

  const handleResetTrackingData = async () => {
    if (!user || isExporting) return;

    try {
      setIsExporting(true);
      setExportMessage(settingsT('resettingTrackingDataStatus'));

      const { success, error } = await deleteAllUserContentLogs();

      if (!success || error) {
        throw new Error('Could not reset data');
      }

      setExportMessage(settingsT('trackingResetSuccess'));
      setShowResetConfirm(false);
    } catch (error) {
      setExportMessage(settingsT('trackingResetError'));
      console.error('❌ Reset error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsImporting(true);
      setImportMessage(translateUi("this_feature_is_currently_unavailable_ba25a6d"));

      setTimeout(() => {
        setIsImporting(false);
        setImportMessage('');
      }, 3000);
    } catch (error) {
      setImportMessage(translateUi("import_process_failed_439fac5"));
      console.error('❌ Import error:', error);
      setIsImporting(false);
    }
  };

  const tabs = [
    { id: 'data' as SettingsTab, label: settingsT('tabs.data'), icon: '📊' },
    { id: 'preferences' as SettingsTab, label: settingsT('tabs.preferences'), icon: '⚙️' },
    { id: 'notifications' as SettingsTab, label: settingsT('tabs.notifications'), icon: '🔔' },
    { id: 'integrations' as SettingsTab, label: settingsT('tabs.integrations'), icon: '🔗' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8">
            <h1 className="text-2xl font-bold mb-4">{translateUi("settings_c7f73bb")}</h1>
            <p className="text-white/60">{translateUi("you_must_log_in_to_access_b3aaf61")}</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'data':
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">{translateUi("data_export_fd36993")}</h2>
              <p className="text-white/50 mb-4">
                {translateUi("export_your_watch_logs_ratings_and_15f832f")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="btn-gradient disabled:opacity-50"
                >
                  {isExporting ? translateUi("exporting_d16aded") : translateUi("export_data_f601e90")}
                </button>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isExporting}
                  className="px-6 py-3 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                >
                  {settingsT('resetTrackingData')}
                </button>
              </div>
              {exportMessage && (
                <p
                  className={`mt-3 text-sm ${isExporting ? 'text-blue-400' : exportMessage.toLowerCase().includes('successfully') || exportMessage.includes('başarıyla') ? 'text-green-400' : 'text-red-400'}`}
                >
                  {exportMessage}
                </p>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">{letterboxdExportT('title')}</h2>
              <p className="text-white/50 mb-4">{letterboxdExportT('description')}</p>
              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="letterboxd-export-count" className="text-sm text-white/70">
                  {letterboxdExportT('countLabel')}
                </label>
                <input
                  id="letterboxd-export-count"
                  type="number"
                  min={1}
                  step={1}
                  value={letterboxdExportCount}
                  onChange={(event) =>
                    setLetterboxdExportCount(
                      event.target.value === '' ? 0 : Number(event.target.value)
                    )
                  }
                  className="w-24 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white"
                />
                <button
                  onClick={handleLetterboxdExport}
                  disabled={isLetterboxdExporting}
                  className="btn-gradient disabled:opacity-50"
                >
                  {isLetterboxdExporting
                    ? letterboxdExportT('preparing')
                    : letterboxdExportT('export')}
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">{translateUi("data_import_0c25356")}</h2>
              <p className="text-white/50 mb-4">
                {translateUi("build_your_library_by_importing_data_1e13995")}
              </p>

              {/* Letterboxd Import */}
              <LetterboxdImportSection />

              {/* CSV Import (Games & Series) */}
              <div className="mt-6">
                <CsvImportSection />
              </div>

              {/* Legacy JSON Import */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-white/40 mb-2">{translateUi("json_import_c4e14b0")}</h3>
                <label className="glass-card inline-flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-white/10 transition-colors">
                  <svg
                    className="w-5 h-5 text-white/60"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-white/80">{translateUi("select_json_file_1743581")}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>
              {importMessage && (
                <p
                  className={`mt-3 text-sm ${importMessage.includes('successfully') ? 'text-green-400' : 'text-amber-400'}`}
                >
                  {importMessage}
                </p>
              )}
            </div>
          </div>
        );
      case 'preferences':
        return (
          <div className="space-y-6">
            <label className="glass-card flex cursor-pointer items-center justify-between gap-4 p-6">
              <span>
                <span className="block text-xl font-semibold">{settingsT('titlePreference.label')}</span>
                <span className="mt-1 block text-sm text-white/60">{settingsT('titlePreference.description')}</span>
              </span>
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-blue-500"
                checked={pendingTitlePreference ?? (user?.showOriginalTitles === true)}
                disabled={pendingTitlePreference !== null}
                onChange={toggleOriginalTitles}
              />
            </label>
            {/* Content Type Preferences */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-2">{translateUi("content_type_preferences_7f71aa9")}</h2>
              <p className="text-white/50 text-sm mb-4">
                {translateUi("select_the_content_types_you_want_06490b9")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CONTENT_TYPE_OPTIONS.map((ct) => {
                  const isSelected = selectedContentTypes.includes(ct.id);
                  return (
                    <button
                      key={ct.id}
                      onClick={() => {
                        setSelectedContentTypes((prev) =>
                          isSelected ? prev.filter((id) => id !== ct.id) : [...prev, ct.id]
                        );
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/20 text-white'
                          : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                      }`}
                    >
                      <span className="text-2xl">{ct.icon}</span>
                      <span className="text-sm font-medium">{settingsT(`contentTypes.${ct.translation}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Home Popular Sections */}
            <div className="glass-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">{translateUi("home_page_list_separation_9b51406")}</h2>
                  <p className="text-white/50 text-sm">
                    {translateUi("display_popular_sections_on_the_home_646cfb1")}
                  </p>
                </div>
                <button
                  onClick={() => setSplitHomePopularSections((prev) => !prev)}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${
                    splitHomePopularSections ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                  aria-pressed={splitHomePopularSections}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      splitHomePopularSections ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Grid Columns */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-2">{translateUi("grid_column_count_2aba546")}</h2>
              <p className="text-white/50 text-sm mb-4">
                {translateUi("how_many_columns_should_be_shown_8da9764")}
              </p>
              <div className="flex items-center gap-3">
                {GRID_COLUMN_OPTIONS.map((col) => (
                  <button
                    key={col}
                    onClick={() => setGridColumns(col)}
                    className={`w-12 h-12 rounded-xl font-bold text-lg transition-all duration-200 ${
                      gridColumns === col
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-1">
                {Array.from({ length: gridColumns }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 bg-blue-500/30 rounded flex-1 border border-blue-500/50"
                  />
                ))}
              </div>
            </div>

            {/* Grid Rows */}
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold mb-2">{translateUi("grid_row_count_0695e16")}</h2>
              <p className="text-white/50 text-sm mb-4">
                {translateUi("how_many_rows_should_be_shown_d2b2fd4")}
              </p>
              <div className="flex items-center gap-3">
                {GRID_ROW_OPTIONS.map((row) => (
                  <button
                    key={row}
                    onClick={() => setGridRows(row)}
                    className={`w-12 h-12 rounded-xl font-bold text-lg transition-all duration-200 ${
                      gridRows === row
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {row}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 id="poster-rating-label" className="text-xl font-semibold mb-1">
                    {settingsT('posterRating')}
                  </h2>
                  <p id="poster-rating-description" className="text-white/50 text-sm">
                    {settingsT('posterRatingDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={posterRatingEnabled}
                  aria-labelledby="poster-rating-label"
                  aria-describedby="poster-rating-description"
                  onClick={() => setPosterRatingEnabled((previous) => !previous)}
                  className={`relative w-14 h-7 shrink-0 rounded-full transition-colors duration-200 ${
                    posterRatingEnabled ? 'bg-blue-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                      posterRatingEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Poster Icons Position */}
            <div className="glass-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">{translateUi("poster_icons_position_5ed2ea7")}</h2>
                  <p className="text-white/50 text-sm">
                    {translateUi("show_status_icons_watched_favorite_etc_5a25104")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(
                    [
                      { value: 'above', label: settingsT('posterIconPosition.above') },
                      { value: 'below', label: settingsT('posterIconPosition.below') },
                      { value: 'off', label: settingsT('posterIconPosition.off') },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={posterIconsPosition === option.value}
                      onClick={() => setPosterIconsPosition(option.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        posterIconsPosition === option.value
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/30'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Poster Zoom — Admin only */}
            {user?.isAdmin && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{translateUi("poster_hover_zoom_5d32cf1")}</h2>
                    <p className="text-white/50 text-sm">
                      {translateUi("zoom_effect_when_hovering_over_the_4681ed9")}
                    </p>
                  </div>
                  <button
                    onClick={() => setPosterZoomEnabled((prev) => !prev)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                      posterZoomEnabled ? 'bg-blue-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                        posterZoomEnabled ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Hassas İçerik Toggle */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-1">{translateUi("sensitive_content_77a120e")}</h2>
                  <p className="text-white/50 text-sm">
                    {translateUi("automatically_show_screenshots_marked_as_spoilers_79df705")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs ${showSensitiveContent ? 'text-white/40' : 'text-white/80'}`}
                  >
                    {translateUi("hide_34d8b60")}
                  </span>
                  <button
                    onClick={() => setShowSensitiveContent((prev) => !prev)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                      showSensitiveContent ? 'bg-orange-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
                        showSensitiveContent ? 'translate-x-7' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs ${showSensitiveContent ? 'text-white/80' : 'text-white/40'}`}
                  >
                    {translateUi("show_d97d1ee")}
                  </span>
                </div>
              </div>
            </div>

            {/* Oyun Platformu Tercihi */}
            <div className="glass-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">{translateUi("game_platform_preference_6ae7a99")}</h2>
                  <p className="text-white/50 text-sm">
                    {translateUi("always_show_only_games_that_exist_7a821f0")}
                  </p>
                </div>
                <div
                  ref={platformPreferenceRef}
                  className="relative w-full sm:w-[26rem] flex flex-col gap-3"
                >
                  <button
                    type="button"
                    onClick={() => setShowPlatformDropdown((prev) => !prev)}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      showPlatformDropdown
                        ? 'border-violet-500 bg-white/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80">
                        <Monitor className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white">
                          {selectedPlatforms.length > 0
                            ? translateUi("value1_platforms_selected_c7cf97b", { value1: String(selectedPlatforms.length) })
                            : translateUi("select_platforms_839079d")}
                        </div>
                        <div className="text-xs text-white/45">
                          {selectedPlatforms.length > 0
                            ? translateUi("your_selections_will_be_applied_as_21edfa3")
                            : translateUi("if_left_empty_all_platforms_will_b075196")}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 text-white/60 transition-transform ${
                        showPlatformDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <div className="flex flex-wrap gap-2">
                    {selectedPlatforms.length > 0 ? (
                      selectedPlatforms.map((platform: any) => (
                        <span
                          key={platform.id}
                          className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200"
                        >
                          {platform.name}
                          <button
                            type="button"
                            onClick={() => togglePreferredPlatform(platform.id)}
                            className="rounded-full p-0.5 text-violet-200/80 transition-colors hover:bg-violet-500/20 hover:text-white"
                            aria-label={translateUi("remove_value1_selection_cae37a8", { value1: String(platform.name) })}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-white/40">
                        {translateUi("no_platform_selected_all_platforms_will_1d13452")}
                      </span>
                    )}
                  </div>

                  {showPlatformDropdown && (
                    <div className="absolute top-full z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-white/10 bg-surface-panel shadow-2xl backdrop-blur">
                      <button
                        type="button"
                        onClick={() => {
                          setPreferredGamePlatformIds([]);
                          setShowPlatformDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm transition-colors ${
                          preferredGamePlatformIds.length === 0
                            ? 'bg-violet-500/10 text-violet-200'
                            : 'text-white/75 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{translateUi("all_6a72085")}</div>
                          <div className="text-xs text-white/45">{translateUi("do_not_apply_platform_filter_7324ca2")}</div>
                        </div>
                        {preferredGamePlatformIds.length === 0 && <Check className="h-4 w-4" />}
                      </button>

                      <div className="max-h-72 overflow-y-auto py-1">
                        {platforms.map((platform: any) => {
                          const isSelected = preferredGamePlatformIds.includes(platform.id);

                          return (
                            <button
                              key={platform.id}
                              type="button"
                              onClick={() => togglePreferredPlatform(platform.id)}
                              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors ${
                                isSelected
                                  ? 'bg-violet-500/10 text-violet-200'
                                  : 'text-white/75 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className="font-medium">{platform.name}</span>
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                                  isSelected
                                    ? 'border-violet-400 bg-violet-500 text-white'
                                    : 'border-white/15 bg-white/5 text-transparent'
                                }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2">{translateUi("notification_preferences_a92e15b")}</h2>
                  <p className="text-white/50 text-sm">
                    {translateUi("specify_here_which_events_you_want_2f69bd9")}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {NOTIFICATION_OPTIONS.map((option) => {
                const enabled = notificationState[option];
                const setEnabled = notificationSetters[option];

                return (
                  <div key={option} className="glass-card p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{settingsT(`notificationPreferences.${option}.title`)}</h3>
                        <p className="text-sm text-white/50">{settingsT(`notificationPreferences.${option}.description`)}</p>
                      </div>
                      <button
                        onClick={() => setEnabled((prev) => !prev)}
                        className={`relative h-7 w-14 rounded-full transition-colors duration-200 ${
                          enabled ? 'bg-blue-500' : 'bg-white/20'
                        }`}
                        aria-pressed={enabled}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
                            enabled ? 'translate-x-7' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'integrations':
        return <div className="space-y-6"></div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="gradient-text">{translateUi("settings_c7f73bb")}</span>
        </h1>
        <p className="text-white/50">{translateUi("manage_your_account_and_application_preferences_00b8555")}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="glass-card p-4 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">{renderContent()}</div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-tracking-title"
            aria-describedby="reset-tracking-description"
            className="glass-card p-8 max-w-md w-full"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 id="reset-tracking-title" className="text-xl font-semibold text-center mb-4">
              {settingsT('resetTrackingData')}
            </h3>
            <p id="reset-tracking-description" className="text-white/60 text-center mb-6">
              {settingsT('resetTrackingWarning')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isExporting}
                className="flex-1 btn-secondary disabled:opacity-50"
              >
                {settingsT('cancel')}
              </button>
              <button
                onClick={handleResetTrackingData}
                disabled={isExporting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isExporting
                  ? settingsT('resettingTrackingData')
                  : settingsT('confirmTrackingReset')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
