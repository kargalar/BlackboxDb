'use client';

/**
 * ExpansionForm — create/edit form for expansions.
 * SRP: form UI only, all logic comes from parent via props.
 */

import { type MutableRefObject } from 'react';
import { type ExpansionFormData } from './useExpansionsData';
import ImageUploadField, { type PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { useTranslations } from 'next-intl';

interface Props {
  editing: number | null;
  formData: ExpansionFormData;
  loading: boolean;
  contentSearch: string;
  contentResults: { id: string; title: string }[];
  searchingContent: boolean;
  pendingPosterRef: MutableRefObject<PendingImageUpload | null>;
  onFormDataChange: (data: ExpansionFormData) => void;
  onContentSearchChange: (search: string) => void;
  onSelectContent: (id: string, title: string) => void;
  onCreate: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const EXPANSION_TYPES = [
  { value: 'expansion', label: 'Expansion' },
  { value: 'remake', label: 'Remake' },
  { value: 'remaster', label: 'Remaster' },
];

export default function ExpansionForm({
  editing,
  formData,
  loading,
  contentSearch,
  contentResults,
  searchingContent,
  pendingPosterRef,
  onFormDataChange,
  onContentSearchChange,
  onSelectContent,
  onCreate,
  onSave,
  onCancel,
}: Props) {
  const t = useTranslations('AdminExpansionsPage');

  const update = (field: keyof ExpansionFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white/90">
        {editing ? t('editTitle') : t('newTitle')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Content selection */}
        <div className="relative">
          <label className="block text-sm text-white/60 mb-1">{t('form.content')}</label>
          {formData.contentId ? (
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
              <span className="text-white/80 flex-1 truncate">
                {formData.contentTitle || formData.contentId}
              </span>
              {!editing && (
                <button
                  onClick={() => {
                    onFormDataChange({ ...formData, contentId: '', contentTitle: '' });
                    onContentSearchChange('');
                  }}
                  className="text-white/40 hover:text-red-400 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div>
              <input
                value={contentSearch}
                onChange={(e) => onContentSearchChange(e.target.value)}
                placeholder={t('form.searchContent')}
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-white/90 border border-white/10 focus:border-blue-500 focus:outline-none"
              />
              {searchingContent && (
                <div className="text-xs text-white/40 mt-1">{t('form.searching')}</div>
              )}
              {contentResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {contentResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onSelectContent(c.id, c.title)}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm text-white/60 mb-1">{t('form.name')}</label>
          <input
            value={formData.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('form.namePh')}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-white/90 border border-white/10 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm text-white/60 mb-1">{t('form.type')}</label>
          <select
            value={formData.type}
            onChange={(e) => update('type', e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-white/90 border border-white/10 focus:border-blue-500 focus:outline-none"
          >
            {EXPANSION_TYPES.map((t) => (
              <option key={t.value} value={t.value} className="bg-gray-900">
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Release Date */}
        <div>
          <label className="block text-sm text-white/60 mb-1">{t('form.releaseDate')}</label>
          <input
            type="date"
            value={formData.releaseDate}
            onChange={(e) => update('releaseDate', e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-white/90 border border-white/10 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Poster Image */}
        <div className="md:col-span-2">
          <ImageUploadField
            label={t('form.poster')}
            name="posterUrl"
            value={formData.posterUrl}
            onChange={(url) => onFormDataChange({ ...formData, posterUrl: url })}
            onPendingUpload={(pending) => {
              pendingPosterRef.current = pending;
            }}
            imageType="expansion"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm text-white/60 mb-1">{t('form.desc')}</label>
          <textarea
            value={formData.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder={t('form.descPh')}
            rows={3}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-white/90 border border-white/10 focus:border-blue-500 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {editing ? (
          <>
            <button
              onClick={onSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? t('actions.saving') : t('actions.save')}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors"
            >
              {t('actions.cancel')}
            </button>
          </>
        ) : (
          <button
            onClick={onCreate}
            disabled={loading || !formData.contentId || !formData.name}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? t('actions.creating') : t('actions.create')}
          </button>
        )}
      </div>
    </div>
  );
}
