export const localeNames = {
  en: 'English',
  zh: '简体中文',
  hi: 'हिन्दी',
  es: 'Español',
  ar: 'العربية',
  fr: 'Français',
  bn: 'বাংলা',
  pt: 'Português',
  id: 'Bahasa Indonesia',
  ur: 'اردو',
  ru: 'Русский',
  de: 'Deutsch',
  ja: '日本語',
  pcm: 'Naijá',
  arz: 'العربية المصرية',
  tr: 'Türkçe',
} as const;

export type Locale = keyof typeof localeNames;
export const defaultLocale: Locale = 'en';
export const localeCookie = 'NEXT_LOCALE';

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && Object.hasOwn(localeNames, value);
}

export function isRightToLeft(locale: string) {
  return locale === 'ar' || locale === 'arz' || locale === 'ur';
}

export function formattingLocale(locale: string) {
  if (locale === 'arz') return 'ar-EG';
  if (locale === 'pt') return 'pt-BR';
  return locale;
}
