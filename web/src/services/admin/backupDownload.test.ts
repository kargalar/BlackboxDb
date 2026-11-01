import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import { downloadSystemBackup, type SystemBackupProgress } from './backupDownload';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('system backup downloads', () => {
  it('pipes the response to disk without buffering a blob', async () => {
    const destination = {};
    const pipeTo = vi.fn().mockResolvedValue(undefined);
    const blob = vi.fn();
    const createWritable = vi.fn().mockResolvedValue(destination);
    const picker = vi.fn().mockResolvedValue({ createWritable });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: { pipeTo }, blob });
    vi.stubGlobal('showSaveFilePicker', picker);
    vi.stubGlobal('fetch', fetchMock);

    await downloadSystemBackup('/api/admin/backup', 'backup.tar.gz');

    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: 'backup.tar.gz' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/backup',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(pipeTo).toHaveBeenCalledWith(destination);
    expect(blob).not.toHaveBeenCalled();
  });

  it('does not start a backup when the save dialog is cancelled', async () => {
    const error = new DOMException('Cancelled', 'AbortError');
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockRejectedValue(error));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(downloadSystemBackup('/api/admin/backup', 'backup.tar.gz')).rejects.toBe(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports preparation errors without writing an error response into the backup file', async () => {
    const createWritable = vi.fn();
    vi.stubGlobal('showSaveFilePicker', vi.fn().mockResolvedValue({ createWritable }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'pg_dump failed' }),
      })
    );
    await expect(downloadSystemBackup('/api/admin/backup', 'backup.tar.gz')).rejects.toThrow(
      'pg_dump failed'
    );
    expect(createWritable).not.toHaveBeenCalled();
  });

  it('uses a native browser download when a writable file picker is unavailable', async () => {
    vi.stubGlobal('showSaveFilePicker', undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await downloadSystemBackup('/api/admin/backup', 'backup.tar.gz');
    expect(click).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.querySelector('a[download="backup.tar.gz"]')).toBeNull();
  });

  it('measures streamed bytes and reports 100 only after the file writer closes', async () => {
    vi.stubGlobal('TransformStream', TransformStream);
    let releaseClose!: () => void;
    let notifyClosing!: () => void;
    const closeGate = new Promise<void>((resolve) => {
      releaseClose = resolve;
    });
    const closing = new Promise<void>((resolve) => {
      notifyClosing = resolve;
    });
    const bytes: number[] = [];
    const destination = new WritableStream<Uint8Array>({
      write(chunk) {
        bytes.push(...chunk);
      },
      async close() {
        notifyClosing();
        await closeGate;
      },
    });
    vi.stubGlobal(
      'showSaveFilePicker',
      vi.fn().mockResolvedValue({ createWritable: async () => destination })
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/progress/'))
          return {
            ok: true,
            status: 200,
            json: async () => ({
              phase: 'archiving',
              percent: 65,
              completedBytes: 5,
              totalBytes: 10,
            }),
          };
        expect(url).toContain('backupId=');
        return {
          ok: true,
          headers: new Headers({ 'Content-Length': '4' }),
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new Uint8Array([1, 2]));
              controller.enqueue(new Uint8Array([3, 4]));
              controller.close();
            },
          }),
        };
      })
    );
    const progress: SystemBackupProgress[] = [];
    const download = downloadSystemBackup('/api/admin/backup', 'backup.tar.gz', (update) =>
      progress.push(update)
    );
    await closing;
    expect(progress.at(-1)?.percent).toBe(99);
    expect(progress.some((update) => update.percent === 100)).toBe(false);
    releaseClose();
    await download;
    expect(bytes).toEqual([1, 2, 3, 4]);
    expect(
      progress.filter((update) => update.phase === 'downloading').map((update) => update.percent)
    ).toEqual([80, 90, 99]);
    expect(progress.at(-1)).toMatchObject({ phase: 'completed', percent: 100 });
  });

  it('polls preparation and native download progress until the server finishes', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('showSaveFilePicker', undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const statuses = [
      { phase: 'archiving', percent: 65 },
      { phase: 'downloading', percent: 90 },
      { phase: 'completed', percent: 100 },
    ];
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => statuses.shift(),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const progress: SystemBackupProgress[] = [];
    const download = downloadSystemBackup('/api/admin/backup', 'backup.tar.gz', (update) =>
      progress.push(update)
    );
    await vi.runAllTimersAsync();
    await download;
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(progress.map((update) => update.percent)).toEqual([0, 65, 90, 100]);
  });

  it('reports preparation failures without displaying a completed progress bar', async () => {
    vi.stubGlobal('showSaveFilePicker', undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ phase: 'failed', percent: 10, error: 'Disk is full' }),
      })
    );
    const progress: SystemBackupProgress[] = [];
    await expect(
      downloadSystemBackup('/api/admin/backup', 'backup.tar.gz', (update) => progress.push(update))
    ).rejects.toThrow('Disk is full');
    expect(progress.some((update) => update.percent === 100)).toBe(false);
  });
});
