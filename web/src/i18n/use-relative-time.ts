'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { formatRelativeTime } from '@/lib/date-utils';
import { formattingLocale } from './locales';

export function useRelativeTime() {
  const locale = formattingLocale(useLocale());
  return useCallback(
    (value: Parameters<typeof formatRelativeTime>[0], now?: Date) => formatRelativeTime(value, locale, now),
    [locale],
  );
}
