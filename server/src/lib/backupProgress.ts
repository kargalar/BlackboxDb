export type BackupPhase =
  | "database"
  | "copying"
  | "checksums"
  | "archiving"
  | "downloading"
  | "completed"
  | "failed";

export interface BackupProgress {
  phase: BackupPhase;
  percent: number;
  completedBytes: number;
  totalBytes: number;
  error?: string;
}

// Each phase occupies a fixed share so the overall percentage never resets.
const PHASE_RANGES = {
  database: [0, 10],
  copying: [10, 35],
  checksums: [35, 50],
  archiving: [50, 80],
  downloading: [80, 100],
} as const;

export function measureBackupProgress(
  phase: keyof typeof PHASE_RANGES,
  completedBytes = 0,
  totalBytes = 0,
): BackupProgress {
  const [start, end] = PHASE_RANGES[phase];
  const fraction =
    totalBytes > 0 ? Math.min(completedBytes / totalBytes, 1) : 0;
  // Only the completion event may report 100%, after the final stream is closed.
  const percent = Math.min(99, Math.floor(start + (end - start) * fraction));
  return { phase, percent, completedBytes, totalBytes };
}
