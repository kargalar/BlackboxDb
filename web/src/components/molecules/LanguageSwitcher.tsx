'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { isLocale, localeCookie, localeNames } from '@/i18n/locales';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('Sidebar');

  return (
    <label className="relative flex h-11 w-full min-w-10 items-center gap-2 rounded-lg px-3 text-sm text-white/75 hover:bg-white/10 focus-within:bg-white/10">
      <Globe className="size-5 shrink-0" aria-hidden="true" />
      <span className="sidebar-text truncate">{isLocale(locale) ? localeNames[locale] : locale}</span>
      <select
        aria-label={t('language')}
        value={locale}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => {
          const next = event.target.value;
          if (!isLocale(next) || next === locale) return;
          document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
          // Reload the server-rendered UI and the locale-specific Apollo cache together.
          window.location.reload();
        }}
      >
        {Object.entries(localeNames).map(([code, name]) => (
          <option key={code} value={code} lang={code} className="bg-neutral-900 text-white">
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
