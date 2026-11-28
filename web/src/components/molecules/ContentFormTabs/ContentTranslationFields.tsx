'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { localeNames } from '@/i18n/locales';
import type { ContentTranslation } from '@/types/content-translation';

interface Props {
  translations: ContentTranslation[];
  onChange: (translations: ContentTranslation[]) => void;
}

export function ContentTranslationFields({ translations, onChange }: Props) {
  const t = useTranslations('AddContent.translations');
  const locale = useLocale();
  const [language, setLanguage] = useState(locale);
  const entry = translations.find((row) => row.language === language);
  const update = (field: 'title' | 'description', value: string) => {
    const next = { ...entry, language, [field]: value };
    onChange(entry
      ? translations.map((row) => row.language === language ? next : row)
      : [...translations, next]);
  };
  const languages = new Map<string, string>(Object.entries(localeNames));
  const languageNames = new Intl.DisplayNames([locale], { type: 'language' });
  for (const row of translations) {
    if (!languages.has(row.language)) languages.set(row.language, languageNames.of(row.language) ?? row.language);
  }
  const fieldClass = 'w-full rounded-lg border border-white/15 bg-surface-panel px-3 py-2';

  return (
    <fieldset className="space-y-3 rounded-xl border border-white/15 p-4">
      <legend className="px-2 font-semibold">{t('heading')}</legend>
      <p className="text-sm opacity-70">{t('help')}</p>
      <label className="block space-y-1">
        <span className="block text-sm">{t('language')}</span>
        <select className={fieldClass} value={language} onChange={(event) => setLanguage(event.target.value)}>
          {[...languages].map(([code, name]) => (
            <option key={code} value={code} lang={code}>
              {name}{translations.some((row) => row.language === code && (row.title || row.description)) ? ' •' : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="block text-sm">{t('title')}</span>
        <input
          value={entry?.title ?? ''}
          onChange={(event) => update('title', event.target.value)}
          maxLength={500}
          dir="auto"
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1">
        <span className="block text-sm">{t('description')}</span>
        <textarea
          value={entry?.description ?? ''}
          onChange={(event) => update('description', event.target.value)}
          dir="auto"
          rows={4}
          className={fieldClass}
        />
      </label>
    </fieldset>
  );
}
