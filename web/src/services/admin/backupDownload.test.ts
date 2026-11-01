import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadSystemBackup } from './backupDownload';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/backup', { credentials: 'include' });
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
});
