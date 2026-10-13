const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcStartOfDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseToUtcStartOfDay(dateInput: string): number | null {
  if (!dateInput) return null;

  // If API returns a date-only string (YYYY-MM-DD), force UTC midnight to avoid TZ drift.
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
  const date = isDateOnly ? new Date(`${dateInput}T00:00:00.000Z`) : new Date(dateInput);

  if (Number.isNaN(date.getTime())) return null;
  return toUtcStartOfDay(date);
}

export function getDaysUntil(dateInput: string, now: Date = new Date()): number | null {
  const targetUtcStart = parseToUtcStartOfDay(dateInput);
  if (targetUtcStart === null) return null;

  const nowUtcStart = toUtcStartOfDay(now);
  const diffMs = targetUtcStart - nowUtcStart;

  // We want an integer number of whole days remaining, inclusive of partial days.
  return Math.ceil(diffMs / MS_PER_DAY);
}

export function formatDaysUntil(dateInput: string, now: Date = new Date()): string | null {
  const days = getDaysUntil(dateInput, now);
  if (days === null) return null;
  if (days < 0) return null;
  if (days === 0) return 'Bugün';
  return `${days} gün kaldı`;
}

export function getPreciseTimeUntil(
  dateInput: string,
  now: Date = new Date()
): { days: number; hours: number; minutes: number; isReleased: boolean } | null {
  if (!dateInput) return null;

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
  const date = isDateOnly ? new Date(`${dateInput}T00:00:00.000Z`) : new Date(dateInput);

  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return { days: 0, hours: 0, minutes: 0, isReleased: true };

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const remainingMsAfterDays = diffMs % (1000 * 60 * 60 * 24);
  const hours = Math.floor(remainingMsAfterDays / (1000 * 60 * 60));

  return { days, hours, minutes: Math.ceil(diffMs / (1000 * 60)), isReleased: false };
}

export function formatCountdownUntil(dateInput: string, now: Date = new Date()): string | null {
  const timeUntil = getPreciseTimeUntil(dateInput, now);
  if (!timeUntil) return null;

  if (timeUntil.days === 0 && timeUntil.hours === 0) return 'Bugün';
  if (timeUntil.days === 0) return `${timeUntil.hours} saat kaldı`;
  if (timeUntil.hours === 0) return `${timeUntil.days} gün kaldı`;
  return `${timeUntil.days} gün ${timeUntil.hours} saat kaldı`;
}

export function formatRelativeTime(dateString: string | Date | number): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'şimdi';
  if (minutes < 60) return `${minutes} dk önce`;
  if (hours < 24) return `${hours} sa önce`;
  if (days <= 5) return `${days} gün önce`;

  const isCurrentYear = date.getFullYear() === now.getFullYear();
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (!isCurrentYear) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString('tr-TR', options);
}
