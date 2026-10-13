'use client';

import { useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLetterboxdImport } from './useLetterboxdImport';

/**
 * Letterboxd Import Section
 * Ayarlar sayfasındaki Letterboxd import UI bileşeni
 */
export function LetterboxdImportSection() {
  const t = useTranslations('LetterboxdImport');
  const { state, jobStatus, importZip, reset, cancelImport, isCancelling } = useLetterboxdImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testModeLabelId = useId();
  const testCountLabelId = useId();
  const [testMode, setTestMode] = useState(false);
  const [testCount, setTestCount] = useState(5);
  const [backupConfirmed, setBackupConfirmed] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    if (!backupConfirmed) {
      setFileError(t('backupRequired'));
      input.value = '';
      return;
    }

    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setFileError(t('zipOnly'));
      input.value = '';
      return;
    }

    setFileError(null);
    importZip(file, testMode ? testCount : undefined);

    // Reset file input
    input.value = '';
  };

  const isProcessing =
    state.phase === 'extracting' || state.phase === 'uploading' || state.phase === 'processing';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-green-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <p className="text-white/40 text-sm">{t('description')}</p>
        </div>
      </div>

      <div className="glass-card p-5 border border-white/5">
        {/* Info text */}
        <div className="flex items-start gap-3 mb-4 text-white/50 text-sm">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p>{t('info')}</p>
        </div>

        <input
          id="letterboxd-upload-input"
          ref={fileInputRef}
          type="file"
          accept=".zip,.ZIP,application/zip"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload button */}
        {state.phase === 'idle' && (
          <label
            htmlFor={backupConfirmed ? 'letterboxd-upload-input' : undefined}
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl transition-all border ${backupConfirmed ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 cursor-pointer border-green-500/20 hover:border-green-500/40' : 'bg-white/5 text-white/30 cursor-not-allowed border-white/10'}`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span className="font-medium">{t('upload')}</span>
          </label>
        )}

        {fileError && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {fileError}
          </p>
        )}

        {(state.phase === 'idle' ||
          state.phase === 'done' ||
          state.phase === 'queued' ||
          state.phase === 'error') && (
          <label className="mt-3 flex items-start gap-2 text-xs text-white/50">
            <input
              type="checkbox"
              checked={backupConfirmed}
              onChange={(event) => setBackupConfirmed(event.target.checked)}
              className="mt-0.5 accent-green-500"
            />
            <span>{t('backupConfirmed')}</span>
          </label>
        )}

        {/* Test mode toggle */}
        {(state.phase === 'idle' ||
          state.phase === 'done' ||
          state.phase === 'queued' ||
          state.phase === 'error') && (
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              role="switch"
              aria-checked={testMode}
              aria-labelledby={testModeLabelId}
              onClick={() => setTestMode(!testMode)}
              className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500/40
                ${testMode ? 'bg-yellow-500' : 'bg-white/10'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform
                  transition duration-200 ease-in-out
                  ${testMode ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
            <span
              id={testModeLabelId}
              className={`text-sm ${testMode ? 'text-yellow-400' : 'text-white/40'}`}
            >
              {t('testMode')}
            </span>
            {testMode && (
              <div className="flex items-center gap-2">
                <label htmlFor={testCountLabelId} className="sr-only">
                  {t('testCount')}
                </label>
                <input
                  id={testCountLabelId}
                  type="number"
                  min={1}
                  max={500}
                  value={testCount}
                  onChange={(e) =>
                    setTestCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
                  }
                  className="w-16 px-2 py-1 text-sm text-center bg-white/5 border border-yellow-500/30 rounded-lg text-yellow-400 focus:outline-none focus:border-yellow-500/60"
                />
                <span className="text-white/30 text-xs">{t('testFilm')}</span>
              </div>
            )}
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="space-y-3" role="status" aria-live="polite" aria-atomic="true">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/70">{state.progress}</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full animate-pulse"
                style={{
                  width:
                    state.phase === 'extracting'
                      ? '20%'
                      : state.phase === 'uploading'
                        ? '40%'
                        : '70%',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Queued state with Live Progress */}
        {(state.phase === 'queued' || (state.phase === 'done' && jobStatus)) && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <svg
                className={`w-6 h-6 ${state.phase === 'done' ? '' : 'animate-spin'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {state.phase === 'done' ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                )}
              </svg>
              <span className="font-semibold">
                {state.phase === 'done' ? t('status.complete') : t('status.importing')}
              </span>
            </div>

            {jobStatus ? (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                      {state.phase === 'done'
                        ? t('status.processedTotal')
                        : t('status.currentlyProcessing')}
                    </div>
                    <div className="text-white font-medium text-lg truncate max-w-[200px] sm:max-w-[300px]">
                      {state.phase === 'done'
                        ? t('status.allImported')
                        : jobStatus.currentItem || t('status.waiting')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 font-bold text-xl">
                      {jobStatus.processedItems}{' '}
                      <span className="text-white/30 text-sm font-normal">
                        / {jobStatus.totalItems}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out relative"
                    style={{
                      width: `${jobStatus.totalItems > 0 ? (jobStatus.processedItems / jobStatus.totalItems) * 100 : 0}%`,
                    }}
                  >
                    {state.phase !== 'done' && (
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                  </div>
                </div>

                {state.phase !== 'done' && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={cancelImport}
                      disabled={isCancelling}
                      className="text-xs font-medium text-red-400 hover:text-red-300 disabled:cursor-wait disabled:opacity-50 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20"
                    >
                      {isCancelling ? t('actions.cancelling') : t('actions.cancel')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/60">{t('status.queued')}</p>
            )}

            {state.phase === 'done' && (
              <button
                onClick={reset}
                className="text-sm text-white/40 hover:text-white/60 transition-colors underline"
              >
                {t('actions.newImport')}
              </button>
            )}
          </div>
        )}

        {/* Success state (Fallback for synchronous or instant imports) */}
        {state.phase === 'done' && state.result && !jobStatus && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-green-400">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold">{t('status.complete')}</span>
            </div>

            {state.result.message && (
              <p className="text-sm text-white/60">{state.result.message}</p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label={t('results.matched')}
                value={state.result.matchedMovies}
                total={state.result.totalMovies}
              />
              <StatCard
                label={t('results.watched')}
                value={state.result.watchedImported}
                color="blue"
              />
              <StatCard
                label={t('results.ratings')}
                value={state.result.ratingsImported}
                color="yellow"
              />
              <StatCard
                label={t('results.reviews')}
                value={state.result.reviewsImported}
                color="purple"
              />
              <StatCard
                label={t('results.watchlist')}
                value={state.result.watchlistImported}
                color="cyan"
              />
              <StatCard
                label={t('results.lists')}
                value={state.result.listsImported}
                color="green"
              />
            </div>

            {/* Unmatched movies */}
            {state.result.unmatchedMovies.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-white/40 text-sm hover:text-white/60 transition-colors">
                  ⚠️ {t('results.unmatched', { count: state.result.unmatchedMovies.length })}
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto text-white/30 text-xs space-y-1 pl-6">
                  {state.result.unmatchedMovies.map((movie, i) => (
                    <div key={i}>• {movie}</div>
                  ))}
                </div>
              </details>
            )}

            {/* Errors */}
            {state.result.errors.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-red-400/60 text-sm hover:text-red-400/80 transition-colors">
                  ❌ {t('results.errorCount', { count: state.result.errors.length })}
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto text-red-400/40 text-xs space-y-1 pl-6">
                  {state.result.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              </details>
            )}

            <button
              onClick={reset}
              className="text-sm text-white/40 hover:text-white/60 transition-colors underline"
            >
              {t('actions.newImport')}
            </button>
          </div>
        )}

        {/* Error state */}
        {state.phase === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-red-400">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold">{t('errors.failed')}</span>
            </div>
            <p className="text-red-400/60 text-sm">{state.error}</p>
            <button
              onClick={reset}
              className="text-sm text-white/40 hover:text-white/60 transition-colors underline"
            >
              {t('actions.retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper component ───

function StatCard({
  label,
  value,
  total,
  color = 'green',
}: {
  label: string;
  value: number;
  total?: number;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    cyan: 'text-cyan-400',
  };

  return (
    <div className="bg-white/5 rounded-xl p-3 text-center">
      <div className={`text-xl font-bold ${colorMap[color] || 'text-white'}`}>
        {value}
        {total !== undefined && <span className="text-white/30 text-sm">/{total}</span>}
      </div>
      <div className="text-white/40 text-xs mt-1">{label}</div>
    </div>
  );
}
