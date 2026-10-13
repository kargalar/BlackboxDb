'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import JSZip from 'jszip';
import { apolloClient } from '@/lib/apollo-client';
import {
  IMPORT_LETTERBOXD_DATA,
  ImportLetterboxdData,
  LetterboxdImportResult,
  GET_IMPORT_JOB_STATUS,
  GetImportJobStatusData,
  GET_ACTIVE_IMPORT_JOB,
  GetActiveImportJobData,
  CANCEL_IMPORT_JOB,
  ImportJobStatus,
} from '@/services/graphql/userContent';

type ImportPhase = 'idle' | 'extracting' | 'uploading' | 'processing' | 'done' | 'error';
type UiImportPhase = ImportPhase | 'queued';

interface ImportState {
  phase: UiImportPhase;
  progress: string;
  result: LetterboxdImportResult | null;
  error: string | null;
}

/**
 * Letterboxd ZIP import hook
 * ZIP dosyasını extract eder, CSV'leri parse eder ve backend'e gönderir
 */
export function useLetterboxdImport() {
  const t = useTranslations('LetterboxdImport');
  const [state, setState] = useState<ImportState>({
    phase: 'idle',
    progress: '',
    result: null,
    error: null,
  });

  const [jobStatus, setJobStatus] = useState<ImportJobStatus | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const reset = useCallback(() => {
    setState({ phase: 'idle', progress: '', result: null, error: null });
    setJobStatus(null);
    setIsCancelling(false);
  }, []);

  // Check for active job on mount
  useEffect(() => {
    let cancelled = false;

    const checkActiveJob = async () => {
      try {
        const { data } = await apolloClient.query<GetActiveImportJobData>({
          query: GET_ACTIVE_IMPORT_JOB,
          fetchPolicy: 'network-only',
        });

        if (!cancelled && data?.getActiveImportJob) {
          const job = data.getActiveImportJob;
          setJobStatus(job);
          setState({
            phase: 'queued',
            progress: '',
            result: {
              success: true,
              jobId: job.id,
              totalMovies: 0,
              matchedMovies: 0,
              unmatchedMovies: [],
              watchedImported: 0,
              ratingsImported: 0,
              reviewsImported: 0,
              watchlistImported: 0,
              listsImported: 0,
              errors: [],
            },
            error: null,
          });
        }
      } catch (err) {
        console.error('Failed to fetch active job:', err);
      }
    };

    // Only check if we are currently idle
    if (state.phase === 'idle') {
      void checkActiveJob();
    }

    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  const activeJobId = state.result?.jobId;

  // Polling effect
  useEffect(() => {
    const jobId = activeJobId;
    if (state.phase !== 'queued' || !jobId) return;

    let active = true;
    let requestInFlight = false;
    let interval: ReturnType<typeof setInterval>;

    const poll = async () => {
      if (requestInFlight) return;
      requestInFlight = true;

      try {
        const { data } = await apolloClient.query<GetImportJobStatusData>({
          query: GET_IMPORT_JOB_STATUS,
          variables: { jobId },
          fetchPolicy: 'network-only',
        });

        if (active && data?.getImportJobStatus) {
          const status = data.getImportJobStatus;
          setJobStatus(status);

          if (status.status === 'COMPLETED') {
            setState((prev) => ({ ...prev, phase: 'done' }));
            clearInterval(interval);
          } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
            setState((prev) => ({
              ...prev,
              phase: 'error',
              error: status.errors?.join(', ') || t('errors.failed'),
            }));
            clearInterval(interval);
          }
        }
      } catch (err) {
        if (active) console.error('Polling error:', err);
      } finally {
        requestInFlight = false;
      }
    };

    interval = setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeJobId, state.phase, t]);

  const importZip = useCallback(
    async (file: File, testLimit?: number) => {
      setState({
        phase: 'extracting',
        progress: t('progress.extracting'),
        result: null,
        error: null,
      });
      console.log('📦 [LetterboxdImport] Extracting ZIP file:', file.name);

      try {
        // 1. Extract ZIP
        const zip = await JSZip.loadAsync(file);
        console.log('📦 [LetterboxdImport] ZIP contents:', Object.keys(zip.files));

        // 2. Read CSV files from ZIP
        const csvData: Record<string, string> = {};
        const csvFiles = [
          'diary.csv',
          'ratings.csv',
          'reviews.csv',
          'watched.csv',
          'watchlist.csv',
        ];

        for (const csvFile of csvFiles) {
          // Try root level first, then look in any subfolder
          let fileEntry = zip.file(csvFile);
          if (!fileEntry) {
            // Search in subfolders
            const found = zip.file(new RegExp(`${csvFile}$`))?.[0];
            fileEntry = found || null;
          }

          if (fileEntry) {
            const content = await fileEntry.async('string');
            const key = csvFile.replace('.csv', '');
            csvData[key] = content;
            console.log(`✅ [LetterboxdImport] Extracted ${csvFile}: ${content.length} chars`);
          } else {
            console.log(`⚠️ [LetterboxdImport] ${csvFile} not found in ZIP`);
          }
        }

        // Letterboxd stores liked films in likes/films.csv
        const likedPaths = ['likes/films.csv', 'liked.csv'];
        for (const likedPath of likedPaths) {
          let fileEntry = zip.file(likedPath);
          if (!fileEntry) {
            const found = zip.file(new RegExp(String.raw`likes[/\\]films\.csv$`))?.[0];
            fileEntry = found || null;
          }
          if (fileEntry) {
            const content = await fileEntry.async('string');
            csvData['liked'] = content;
            console.log(
              `✅ [LetterboxdImport] Extracted liked films (${likedPath}): ${content.length} chars`
            );
            break;
          }
        }
        if (!csvData['liked']) {
          console.log('⚠️ [LetterboxdImport] liked/films.csv not found in ZIP');
        }

        // Extract list CSVs from lists/ folder
        const listFiles: { name: string; csv: string }[] = [];
        for (const [path, file] of Object.entries(zip.files)) {
          if (path.startsWith('lists/') && path.endsWith('.csv') && !file.dir) {
            const content = await file.async('string');
            // List name from filename: "lists/my-list.csv" → "my-list"
            const listName = path
              .replace(/^lists\//, '')
              .replace(/\.csv$/, '')
              .replace(/-/g, ' ');
            listFiles.push({ name: listName, csv: content });
            console.log(
              `✅ [LetterboxdImport] Extracted list "${listName}": ${content.length} chars`
            );
          }
        }
        if (listFiles.length > 0) {
          csvData['lists'] = JSON.stringify(listFiles);
          console.log(`✅ [LetterboxdImport] Found ${listFiles.length} list(s)`);
        }

        if (Object.keys(csvData).length === 0) {
          throw new Error(t('errors.missingCsv'));
        }

        setState({
          phase: 'uploading',
          progress: t('progress.foundFiles', { count: Object.keys(csvData).length }),
          result: null,
          error: null,
        });
        console.log('📤 [LetterboxdImport] Sending CSV data to server...');

        // 3. Send to GraphQL backend
        setState({
          phase: 'processing',
          progress: t('progress.processing'),
          result: null,
          error: null,
        });

        const { data } = await apolloClient.mutate<ImportLetterboxdData>({
          mutation: IMPORT_LETTERBOXD_DATA,
          variables: {
            csvData,
            ...(testLimit ? { testLimit } : {}),
          },
          fetchPolicy: 'no-cache',
        });

        if (data?.importLetterboxdData) {
          const result = data.importLetterboxdData;
          console.log('✅ [LetterboxdImport] Import completed:', result);

          setState({
            phase: result.success && result.jobId ? 'queued' : result.success ? 'done' : 'error',
            progress: '',
            result,
            error: result.success ? null : result.message || t('errors.failed'),
          });
        } else {
          throw new Error(t('errors.unexpectedResponse'));
        }
      } catch (error: any) {
        console.error('❌ [LetterboxdImport] Error:', error);
        setState({
          phase: 'error',
          progress: '',
          result: null,
          error: error.message || t('errors.failed'),
        });
      }
    },
    [t]
  );

  const cancelImport = useCallback(async () => {
    if (!state.result?.jobId || isCancelling) return;

    setIsCancelling(true);
    try {
      const { data } = await apolloClient.mutate<{ cancelImportJob: boolean }>({
        mutation: CANCEL_IMPORT_JOB,
        variables: { jobId: state.result.jobId },
      });

      if (data?.cancelImportJob) {
        setState((prev) => ({
          ...prev,
          phase: 'error',
          error: t('errors.cancelled'),
        }));
        setJobStatus((prev) => (prev ? { ...prev, status: 'FAILED' } : null));
      } else {
        toast.error(t('errors.cancelFailed'));
      }
    } catch (err) {
      console.error('İptal işlemi başarısız:', err);
      toast.error(t('errors.cancelFailed'));
    } finally {
      setIsCancelling(false);
    }
  }, [isCancelling, state.result?.jobId, t]);

  return { state, jobStatus, importZip, reset, cancelImport, isCancelling };
}
