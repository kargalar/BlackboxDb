interface BackupFileHandle {
  createWritable(): Promise<WritableStream<Uint8Array>>;
}

interface BackupSaveOptions {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}

type BackupDownloadWindow = Window & {
  showSaveFilePicker?: (options: BackupSaveOptions) => Promise<BackupFileHandle>;
};

export interface SystemBackupProgress {
  phase:
    | 'database'
    | 'copying'
    | 'checksums'
    | 'archiving'
    | 'downloading'
    | 'completed'
    | 'failed';
  percent: number;
  completedBytes: number;
  totalBytes: number;
  error?: string;
}

type ReportProgress = (progress: SystemBackupProgress) => void;
const PROGRESS_POLL_INTERVAL_MS = 1000;
const PROGRESS_START_TIMEOUT_MS = 30_000;
const DOWNLOAD_START_PERCENT = 80;

async function monitorPreparation(
  url: string,
  signal: AbortSignal,
  onProgress: ReportProgress
): Promise<void> {
  const startedAt = Date.now();
  while (!signal.aborted) {
    const response = await fetch(url, { credentials: 'include', cache: 'no-store', signal });
    if (signal.aborted) return;
    if (response.status !== 404 || Date.now() - startedAt >= PROGRESS_START_TIMEOUT_MS) {
      if (!response.ok) throw new Error('Backup progress could not be retrieved');
      const progress = (await response.json()) as SystemBackupProgress;
      if (signal.aborted) return;
      if (progress.phase === 'failed')
        throw new Error(progress.error || 'Backup preparation failed');
      onProgress(progress);
      if (progress.phase === 'completed') return;
    }
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', finish);
        resolve();
      };
      const timer = setTimeout(finish, PROGRESS_POLL_INTERVAL_MS);
      signal.addEventListener('abort', finish, { once: true });
    });
  }
}

function createDownloadMeter(
  totalBytes: number,
  onProgress: ReportProgress
): TransformStream<Uint8Array, Uint8Array> {
  let completedBytes = 0;
  let lastPercent = DOWNLOAD_START_PERCENT;
  onProgress({ phase: 'downloading', percent: DOWNLOAD_START_PERCENT, completedBytes, totalBytes });
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      completedBytes += chunk.byteLength;
      const fraction = totalBytes > 0 ? Math.min(completedBytes / totalBytes, 1) : 0;
      const percent = Math.min(
        99,
        Math.floor(DOWNLOAD_START_PERCENT + (100 - DOWNLOAD_START_PERCENT) * fraction)
      );
      if (percent !== lastPercent) {
        onProgress({ phase: 'downloading', percent, completedBytes, totalBytes });
        lastPercent = percent;
      }
      controller.enqueue(chunk);
    },
  });
}

async function saveBackupResponse(
  response: Response,
  handle: BackupFileHandle,
  onProgress?: ReportProgress
): Promise<void> {
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.error || response.statusText || 'Backup download failed');
  }
  if (!response.body) throw new Error('Backup download stream is unavailable');
  try {
    const destination = await handle.createWritable();
    const source = onProgress
      ? response.body.pipeThrough(
          createDownloadMeter(Number(response.headers.get('Content-Length')) || 0, onProgress)
        )
      : response.body;
    await source.pipeTo(destination);
  } catch (error) {
    if (!response.body.locked) await response.body.cancel().catch(() => {});
    throw error;
  }
}

/** Stream large backups directly to disk; let the browser handle unsupported file pickers. */
export async function downloadSystemBackup(
  url: string,
  filename: string,
  onProgress?: ReportProgress
): Promise<void> {
  const downloadWindow = window as BackupDownloadWindow;
  const handle = await downloadWindow.showSaveFilePicker?.({
    suggestedName: filename,
    types: [{ description: 'BlackboxDB backup', accept: { 'application/gzip': ['.gz'] } }],
  });
  const controller = new AbortController();
  const monitorController = new AbortController();
  let downloadUrl = url;
  let monitoringError: unknown;
  let monitoring = Promise.resolve();
  if (onProgress) {
    const id = crypto.randomUUID();
    const endpoint = new URL(url, window.location.href);
    endpoint.searchParams.set('backupId', id);
    downloadUrl = endpoint.toString();
    const progressUrl = new URL(endpoint);
    progressUrl.pathname = `${progressUrl.pathname.replace(/\/$/, '')}/progress/${id}`;
    progressUrl.search = '';
    onProgress({ phase: 'database', percent: 0, completedBytes: 0, totalBytes: 0 });
    monitoring = monitorPreparation(
      progressUrl.toString(),
      monitorController.signal,
      (progress) => {
        // The file writer reports download progress after the preparation phase.
        // Native browser downloads use the server's transfer measurements.
        if (!handle || (progress.phase !== 'downloading' && progress.phase !== 'completed'))
          onProgress(progress);
      }
    ).catch((error: unknown) => {
      if (!monitorController.signal.aborted) {
        monitoringError = error;
        controller.abort();
      }
    });
  }

  try {
    if (!handle) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      await monitoring;
    } else {
      const response = await fetch(downloadUrl, {
        credentials: 'include',
        signal: controller.signal,
      });
      monitorController.abort();
      await saveBackupResponse(response, handle, onProgress);
    }
    if (monitoringError) throw monitoringError;
    if (handle)
      onProgress?.({ phase: 'completed', percent: 100, completedBytes: 0, totalBytes: 0 });
  } catch (error) {
    throw monitoringError ?? error;
  } finally {
    controller.abort();
    monitorController.abort();
    await monitoring;
  }
}
