import { getRequestConfig } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale, localeCookie } from './locales';
import english from '../../messages/en.json';

function withEnglishFallback(
  fallback: AbstractIntlMessages,
  localized: AbstractIntlMessages,
): AbstractIntlMessages {
  return Object.fromEntries(Object.entries(fallback).map(([key, source]) => {
    const translation = localized[key];
    if (typeof source === 'string') return [key, typeof translation === 'string' ? translation : source];
    return [key, withEnglishFallback(source, typeof translation === 'object' ? translation : {})];
  }));
}

export default getRequestConfig(async () => {
  const selected = (await cookies()).get(localeCookie)?.value;
  const locale = isLocale(selected) ? selected : defaultLocale;
  const messages = locale === defaultLocale
    ? english
    : withEnglishFallback(english, (await import(`../../messages/${locale}.json`)).default);

  return { locale, messages };
});
