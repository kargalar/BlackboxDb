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

export function formatDaysUntil(dateInput: string, locale = 'en', now = new Date()): string | null {
  const days = getDaysUntil(dateInput, now);
  if (days === null || days < 0) return null;
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day');
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

export function formatRelativeTime(dateString: string | Date | number, locale = 'en', now = new Date()): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  if (elapsedMinutes < 60) return relativeTime.format(-elapsedMinutes, 'minute');
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return relativeTime.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days <= 5) return relativeTime.format(-days, 'day');

  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}
