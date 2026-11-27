'use client';

import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Download, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { ReleaseRegionFlag, useReleaseRegionLabel } from '@/components/atoms/ReleaseRegionFlag';
import type { AddContentFormData } from '@/app/add-content/types';
import { apolloClient } from '@/lib/apollo-client';
import {
  type ContentRelease,
  formatReleaseDate,
  isReleaseDate,
  mergeContentReleases,
  releaseAreaCodes,
  releaseKey,
  releaseRegionCodes,
} from '@/lib/contentReleases';
import { FETCH_PROVIDER_RELEASES } from '@/services/graphql/contentReleases';

interface ReleaseFieldsProps {
  formData: AddContentFormData;
  setFormData: Dispatch<SetStateAction<AddContentFormData>>;
  canImport: boolean;
}

const emptyDraft: ContentRelease = { date: '', regionCode: null };
const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-950 outline-violet-500 dark:border-white/15 dark:bg-surface-raised dark:text-white';
const actionClass = 'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white';

function getSource(form: AddContentFormData) {
  const { autoFillSource, autoFillSourceId, tmdbId, igdbId, contentTypeId } = form;
  if (contentTypeId === '3' && igdbId) return { source: 'igdb', sourceId: String(igdbId) };
  if ((contentTypeId === '1' || contentTypeId === '2') && tmdbId) {
    return { source: contentTypeId === '1' ? 'tmdb_movie' : 'tmdb_tv', sourceId: String(tmdbId) };
  }
  if (autoFillSource && autoFillSourceId) return { source: autoFillSource, sourceId: autoFillSourceId };
}

export function ReleaseFields({ formData, setFormData, canImport }: ReleaseFieldsProps) {
  const t = useTranslations('ContentReleases');
  const locale = useLocale();
  const regionName = useReleaseRegionLabel();
  const dateInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<ContentRelease>(emptyDraft);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [dateError, setDateError] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const releases = formData.releases ?? [];
  const source = canImport ? getSource(formData) : undefined;
  const countries = releaseRegionCodes.map((code) => ({ code, name: regionName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));

  function resetDraft() {
    setEditingKey(null);
    setDraft(emptyDraft);
    setDateError(false);
  }

  function applyDraft() {
    const date = draft.date.trim().toUpperCase();
    if (!isReleaseDate(date)) {
      setDateError(true);
      return;
    }
    setFormData((previous) => ({
      ...previous,
      releases: mergeContentReleases(
        (previous.releases ?? []).filter((row) => releaseKey(row) !== editingKey),
        [{ date, regionCode: draft.regionCode }]
      ),
    }));
    resetDraft();
  }

  async function importDates() {
    if (!source || importing) return;
    setImporting(true);
    setImportMessage('');
    try {
      const { data } = await apolloClient.query<{ fetchProviderReleases: ContentRelease[] }>({
        query: FETCH_PROVIDER_RELEASES,
        variables: source,
        fetchPolicy: 'network-only',
      });
      const incoming = data?.fetchProviderReleases ?? [];
      if (incoming.length === 0) {
        setImportMessage(t('providerEmpty'));
        return;
      }
      setFormData((previous) => {
        const current = getSource(previous);
        if (current?.source !== source.source || current.sourceId !== source.sourceId) return previous;
        return { ...previous, releases: mergeContentReleases(previous.releases ?? [], incoming) };
      });
      setImportMessage(t('imported'));
    } catch {
      setImportMessage(t('loadFailed'));
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="space-y-4" aria-labelledby="release-fields-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="release-fields-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('formTitle')}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('formDescription')}</p>
        </div>
        {source && (
          <button
            type="button"
            disabled={importing}
            onClick={importDates}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-500/30 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-500/10 disabled:opacity-60 dark:text-violet-300"
          >
            {importing ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {t('import')}
          </button>
        )}
      </div>
      {importMessage && (
        <p role="status" className="text-sm text-gray-600 dark:text-gray-300">{importMessage}</p>
      )}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>{t('region')}</span>
            <select
              value={draft.regionCode ?? ''}
              onChange={(event) => setDraft({ ...draft, regionCode: event.target.value || null })}
              className={inputClass}
            >
              <option value="">{t('unspecifiedRegion')}</option>
              {draft.regionCode && !releaseAreaCodes.includes(draft.regionCode) &&
                !releaseRegionCodes.includes(draft.regionCode) && (
                  <option value={draft.regionCode}>{regionName(draft.regionCode)}</option>
              )}
              <optgroup label={t('areas')}>
                {releaseAreaCodes.map((code) => <option key={code} value={code}>{regionName(code)}</option>)}
              </optgroup>
              <optgroup label={t('countries')}>
                {countries.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
              </optgroup>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>{t('date')}</span>
            <input
              ref={dateInput}
              type="text"
              value={draft.date}
              onChange={(event) => {
                setDraft({ ...draft, date: event.target.value });
                setDateError(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  applyDraft();
                }
              }}
              placeholder="2026-11-28"
              maxLength={10}
              aria-describedby="release-date-format"
              aria-invalid={dateError}
              className={inputClass}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p id="release-date-format" className={`text-xs ${dateError ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {t(dateError ? 'invalidDate' : 'dateFormat')}
          </p>
          <div className="flex items-center gap-2">
            {editingKey && (
              <button type="button" onClick={resetDraft} className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                {t('cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={applyDraft}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              {editingKey ? <Pencil size={15} /> : <Plus size={16} />}
              {t(editingKey ? 'apply' : 'add')}
            </button>
          </div>
        </div>
      </div>

      {releases.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {releases.map((release) => {
            const key = releaseKey(release);
            const name = regionName(release.regionCode);
            const date = formatReleaseDate(release.date, locale, (year, quarter) => t('quarter', { year, quarter }));
            const label = `${name}, ${date}`;
            return (
              <li key={key} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
                <ReleaseRegionFlag code={release.regionCode} label={name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white" title={name}>{name}</p>
                  <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{date}</p>
                </div>
                <button type="button" aria-label={t('editRow', { label })} className={actionClass} onClick={() => {
                  setDraft(release);
                  setEditingKey(key);
                  setDateError(false);
                  dateInput.current?.focus();
                }}>
                  <Pencil size={16} />
                </button>
                <button type="button" aria-label={t('removeRow', { label })} className={actionClass} onClick={() => {
                  setFormData((previous) => ({
                    ...previous,
                    releases: (previous.releases ?? []).filter((row) => releaseKey(row) !== key),
                  }));
                  if (editingKey === key) resetDraft();
                }}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-2 text-sm text-gray-600 dark:text-gray-400">{t('formEmpty')}</p>
      )}
    </section>
  );
}
