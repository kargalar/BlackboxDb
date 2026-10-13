'use client';

import type { AdminContent } from '@/services/graphql/admin';
import { useTranslations } from 'next-intl';

interface ContentEditFormProps {
  editData: Partial<AdminContent>;
  onEditDataChange: (data: Partial<AdminContent>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}

export default function ContentEditForm({
  editData,
  onEditDataChange,
  onSave,
  onCancel,
  saving,
}: ContentEditFormProps) {
  const t = useTranslations('AdminContentPage');
  const lockedFields = editData.lockedFields || [];
  const lockableFields = [
    { key: 'title', label: t('form.title') },
    { key: 'description', label: t('form.desc') },
    { key: 'releaseDate', label: t('form.releaseDate') },
    { key: 'runtime', label: t('form.runtime') },
  ];

  const toggleLockedField = (field: string) => {
    const nextLockedFields = lockedFields.includes(field)
      ? lockedFields.filter((item) => item !== field)
      : [...lockedFields, field];
    onEditDataChange({ ...editData, lockedFields: nextLockedFields });
  };

  return (
    <div className="space-y-4 p-5 bg-white/[0.03] rounded-xl border border-white/10">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <div className="text-xs font-medium text-amber-200 mb-2">Field locks</div>
        <div className="flex flex-wrap gap-2">
          {lockableFields.map((field) => {
            const isLocked = lockedFields.includes(field.key);
            return (
              <button
                key={field.key}
                type="button"
                onClick={() => toggleLockedField(field.key)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  isLocked
                    ? 'bg-amber-500/20 text-amber-100 border-amber-400/40'
                    : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
                }`}
              >
                {isLocked ? 'Locked: ' : 'Lock: '}
                {field.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">
            {t('form.title')}
          </label>
          <input
            value={editData.title || ''}
            onChange={(e) => onEditDataChange({ ...editData, title: e.target.value })}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5 font-medium">{t('form.desc')}</label>
          <textarea
            value={editData.description || ''}
            onChange={(e) => onEditDataChange({ ...editData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-medium">
              {t('form.releaseDate')}
            </label>
            <input
              value={editData.releaseDate || ''}
              onChange={(e) => onEditDataChange({ ...editData, releaseDate: e.target.value })}
              placeholder="YYYY-MM-DD"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5 font-medium">
              {t('form.runtime')}
            </label>
            <input
              type="number"
              value={editData.runtime || ''}
              onChange={(e) =>
                onEditDataChange({
                  ...editData,
                  runtime: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="120"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-medium border border-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>✓</span>
          )}
          {t('actions.save')}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
        >
          {t('actions.cancel')}
        </button>
      </div>
    </div>
  );
}
