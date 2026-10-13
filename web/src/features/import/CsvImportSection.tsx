'use client';

import { useRef, useState } from 'react';
import { useCsvImport } from './useCsvImport';
import { CsvImportStatCard } from './CsvImportStatCard';

/**
 * CSV Import Section
 * Ayarlar sayfasındaki Games/Series CSV import UI bileşeni
 */
export function CsvImportSection() {
  const { state, importCsv, reset } = useCsvImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contentType, setContentType] = useState<'game' | 'series'>('game');
  const [testMode, setTestMode] = useState(false);
  const [testCount, setTestCount] = useState(5);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Lütfen bir CSV dosyası seçin.');
      return;
    }

    importCsv(file, contentType, testMode ? testCount : undefined);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isProcessing = state.phase === 'reading' || state.phase === 'processing';
  const typeLabel = contentType === 'game' ? 'Oyun' : 'Dizi';
  const typeEmoji = contentType === 'game' ? '🎮' : '📺';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-purple-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">CSV Import</h3>
          <p className="text-white/40 text-sm">
            Notion&apos;dan dışa aktardığın oyun veya dizi CSV dosyasını yükle
          </p>
        </div>
      </div>

      <div className="glass-card p-5 border border-white/5">
        {/* Content type selector */}
        {(state.phase === 'idle' ||
          state.phase === 'done' ||
          state.phase === 'queued' ||
          state.phase === 'error') && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setContentType('game')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                contentType === 'game'
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20'
              }`}
            >
              🎮 Oyunlar
            </button>
            <button
              type="button"
              onClick={() => setContentType('series')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                contentType === 'series'
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                  : 'bg-white/5 text-white/40 border border-white/10 hover:border-white/20'
              }`}
            >
              📺 Diziler
            </button>
          </div>
        )}

        {/* Info text */}
        <div className="flex items-start gap-3 mb-4 text-white/50 text-sm">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <p>
            Notion&apos;dan CSV formatında dışa aktarın. {typeEmoji} {typeLabel} CSV dosyanız{' '}
            {contentType === 'game' ? 'IGDB ile eşleştirilerek' : 'TMDB ile eşleştirilerek'}{' '}
            içerikler otomatik oluşturulacak.
          </p>
        </div>

        {/* Upload button */}
        {state.phase === 'idle' && (
          <label
            className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl transition-all border ${backupConfirmed ? 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 cursor-pointer border-purple-500/20 hover:border-purple-500/40' : 'bg-white/5 text-white/30 cursor-not-allowed border-white/10'}`}
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
            <span className="font-medium">
              {typeEmoji} {typeLabel} CSV Yükle
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={backupConfirmed ? handleFileSelect : undefined}
              disabled={!backupConfirmed}
              className="hidden"
            />
          </label>
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
              className="mt-0.5 accent-purple-500"
            />
            <span>
              Import oncesi veritabani yedegini aldim ve once test mode ile kontrol edebilecegimi
              biliyorum.
            </span>
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
            <span className={`text-sm ${testMode ? 'text-yellow-400' : 'text-white/40'}`}>
              Test Mode
            </span>
            {testMode && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={testCount}
                  onChange={(e) =>
                    setTestCount(Math.max(1, Math.min(500, Number(e.target.value) || 1)))
                  }
                  className="w-16 px-2 py-1 text-sm text-center bg-white/5 border border-yellow-500/30 rounded-lg text-yellow-400 focus:outline-none focus:border-yellow-500/60"
                />
                <span className="text-white/30 text-xs">{typeLabel.toLowerCase()}</span>
              </div>
            )}
          </div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/70">{state.progress}</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full animate-pulse"
                style={{
                  width: state.phase === 'reading' ? '20%' : '70%',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Queued state */}
        {state.phase === 'queued' && state.result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
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
                  d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
                />
              </svg>
              <span className="font-semibold">Import sıraya alındı</span>
            </div>

            <p className="text-white/60 text-sm">
              İşleminiz kısa süre içerisinde tamamlanacak. İçerikler arka planda sırayla içe
              aktarılıyor.
            </p>

            <button
              onClick={reset}
              className="text-sm text-white/40 hover:text-white/60 transition-colors underline"
            >
              Yeni import yap
            </button>
          </div>
        )}

        {/* Success state */}
        {state.phase === 'done' && state.result && (
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
              <span className="font-semibold">Import Tamamlandı!</span>
            </div>

            {state.result.message && (
              <p className="text-white/60 text-sm">{state.result.message}</p>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <CsvImportStatCard
                label={`Eşleşen ${typeLabel}`}
                value={state.result.matchedItems}
                total={state.result.totalItems}
              />
              <CsvImportStatCard label="Log" value={state.result.logsCreated} color="blue" />
              <CsvImportStatCard label="Puan" value={state.result.ratingsImported} color="yellow" />
            </div>

            {/* Unmatched items */}
            {state.result.unmatchedItems.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-white/40 text-sm hover:text-white/60 transition-colors">
                  ⚠️ {state.result.unmatchedItems.length} {typeLabel.toLowerCase()} eşleştirilemedi
                </summary>
                <div className="mt-2 max-h-40 overflow-y-auto text-white/30 text-xs space-y-1 pl-6">
                  {state.result.unmatchedItems.map((item, i) => (
                    <div key={i}>• {item}</div>
                  ))}
                </div>
              </details>
            )}

            {/* Errors */}
            {state.result.errors.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-red-400/60 text-sm hover:text-red-400/80 transition-colors">
                  ❌ {state.result.errors.length} hata oluştu
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
              Yeni import yap
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
              <span className="font-semibold">Import Başarısız</span>
            </div>
            <p className="text-red-400/60 text-sm">{state.error}</p>
            <button
              onClick={reset}
              className="text-sm text-white/40 hover:text-white/60 transition-colors underline"
            >
              Tekrar dene
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
