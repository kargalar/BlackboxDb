'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useState } from 'react';
import { FormInput } from '@/components/atoms/FormInput';
import ImageUploadField from '@/components/molecules/ImageUploadField';
import toast from 'react-hot-toast';

export interface DeveloperData {
  id?: number;
  name: string;
  description?: string;
  headquarters?: string;
  logoUrl?: string;
  website?: string;
  foundingYear?: number;
}

interface DeveloperEditDialogProps {
  developer?: DeveloperData | null;
  initialName?: string;
  onClose: () => void;
  onSave: (developer: DeveloperData) => void | Promise<void>;
  mode?: 'create' | 'edit';
  title?: string;
}

export function DeveloperEditDialog({
  developer,
  initialName = '',
  onClose,
  onSave,
  mode = 'edit',
  title,
}: DeveloperEditDialogProps) {
  const translateUi = useUiTranslations('Ui');
  const [formData, setFormData] = useState({
    name: developer?.name || initialName,
    description: developer?.description || '',
    headquarters: developer?.headquarters || '',
    logoUrl: developer?.logoUrl || '',
    website: developer?.website || '',
    foundingYear: developer?.foundingYear?.toString() || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    const developerData: DeveloperData = {
      ...developer,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      headquarters: formData.headquarters?.trim() || undefined,
      logoUrl: formData.logoUrl?.trim() || undefined,
      website: formData.website?.trim() || undefined,
      foundingYear: formData.foundingYear ? parseInt(formData.foundingYear, 10) : undefined,
    };

    console.log('💾 [DeveloperEditDialog] Saving company:', developerData);
    setSaving(true);
    try {
      await onSave(developerData);
      onClose();
    } catch (error) {
      console.error('[DeveloperEditDialog] Failed to save company:', error);
      toast.error(translateUi("kaydetme_basarisiz_oldu_lutfen_tekrar_deneyin_2d074bb"));
      setSaving(false);
    }
  };

  const dialogTitle =
    title || (mode === 'create' ? 'Yeni Şirket Ekle' : 'Şirket Bilgilerini Düzenle');
  const saveButtonText = mode === 'create' ? 'Ekle' : 'Kaydet';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{dialogTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <fieldset disabled={saving} className="w-full min-w-0 p-6 space-y-4">
          {/* Name */}
          <FormInput
            label={translateUi("sirket_adi_5ed83c8")}
            name="name"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder={translateUi("orn_cd_projekt_red_c0f3857")}
            required
          />

          {/* Headquarters */}
          <FormInput
            label={translateUi("merkez_08f3ec9")}
            name="headquarters"
            value={formData.headquarters}
            onChange={(value) => setFormData({ ...formData, headquarters: value })}
            placeholder={translateUi("orn_warsaw_poland_d677e51")}
          />

          {/* Founding Year */}
          <FormInput
            label={translateUi("kurulus_yili_27d0e35")}
            name="foundingYear"
            type="number"
            value={formData.foundingYear}
            onChange={(value) => setFormData({ ...formData, foundingYear: value })}
            placeholder={translateUi("orn_1994_e079e6b")}
          />

          {/* Website */}
          <FormInput
            label={translateUi("web_sitesi_9e502f3")}
            name="website"
            value={formData.website}
            onChange={(value) => setFormData({ ...formData, website: value })}
            placeholder={translateUi("orn_https_www_cdprojektred_com_a6db198")}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              {translateUi("aciklama_6f80065")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={translateUi("gelistirici_hakkinda_kisa_bilgi_91abb6d")}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Logo */}
          <ImageUploadField
            label={translateUi("logo_83fce83")}
            name="logoUrl"
            value={formData.logoUrl}
            onChange={(url) => setFormData({ ...formData, logoUrl: url })}
            imageType="profile"
          />
        </fieldset>

        {/* Footer Buttons */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
          >
            {translateUi("iptal_85e2d08")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {translateUi("kaydediliyor_5bb599b")}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {saveButtonText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeveloperEditDialog;
