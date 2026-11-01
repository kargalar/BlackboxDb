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

/** Stream large backups directly to disk; let the browser handle unsupported file pickers. */
export async function downloadSystemBackup(url: string, filename: string): Promise<void> {
  const downloadWindow = window as BackupDownloadWindow;
  if (!downloadWindow.showSaveFilePicker) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const handle = await downloadWindow.showSaveFilePicker({
    suggestedName: filename,
    types: [{ description: 'BlackboxDB backup', accept: { 'application/gzip': ['.gz'] } }],
  });
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.error || response.statusText || 'Backup download failed');
  }
  if (!response.body) throw new Error('Backup download stream is unavailable');
  try {
    const destination = await handle.createWritable();
    await response.body.pipeTo(destination);
  } catch (error) {
    if (!response.body.locked) await response.body.cancel().catch(() => {});
    throw error;
  }
}
