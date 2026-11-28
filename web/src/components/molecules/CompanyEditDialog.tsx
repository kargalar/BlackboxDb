'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import ImageUploadField, { PendingImageUpload } from '@/components/molecules/ImageUploadField';
import { uploadContentImage, updateCompany } from '@/services/adminService';

export interface CompanyEditData {
  id?: string | number;
  name: string;
  description?: string;
  headquarters?: string;
  logoUrl?: string;
  website?: string;
  foundingYear?: number;
}

interface CompanyEditDialogProps {
  company: CompanyEditData;
  onClose: () => void;
  onSave: (company: CompanyEditData) => void;
}

export function CompanyEditDialog({ company, onClose, onSave }: CompanyEditDialogProps) {
  const translateUi = useUiTranslations('Ui');
  const [formData, setFormData] = useState({
    name: company.name || '',
    description: company.description || '',
    headquarters: company.headquarters || '',
    logoUrl: company.logoUrl || '',
    website: company.website || '',
    foundingYear: company.foundingYear?.toString() || '',
  });
  const [pendingLogo, setPendingLogo] = useState<PendingImageUpload | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      name: company.name || '',
      description: company.description || '',
      headquarters: company.headquarters || '',
      logoUrl: company.logoUrl || '',
      website: company.website || '',
      foundingYear: company.foundingYear?.toString() || '',
    });
    setPendingLogo(null);
  }, [company]);

  const inputCls =
    'w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors';
  const labelCls = 'block text-sm font-medium text-gray-400 mb-1.5';

  const handleSave = async () => {
    if (!company.id || !formData.name.trim()) return;

    setSaving(true);
    try {
      let logoUrl = formData.logoUrl.trim();

      if (logoUrl.startsWith('data:') && pendingLogo) {
        logoUrl = await uploadContentImage(pendingLogo.base64, pendingLogo.fileName, 'company');
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        headquarters: formData.headquarters.trim() || undefined,
        logoUrl: logoUrl || undefined,
        website: formData.website.trim() || undefined,
        foundingYear: formData.foundingYear ? parseInt(formData.foundingYear, 10) : undefined,
      };

      const result = await updateCompany(String(company.id), payload);
      if (result.error) {
        toast.error(translateUi("sirket_kaydedilemedi_5b6292e"));
        return;
      }

      toast.success(translateUi("sirket_bilgileri_guncellendi_773409c"));
      onSave({
        ...company,
        ...payload,
      });
    } catch (error: any) {
      console.error('❌ [CompanyEditDialog] Save error:', error);
      toast.error(error?.message || translateUi("sirket_kaydedilemedi_5b6292e"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 p-4 pt-[5vh] overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-panel border border-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto mb-4">
        <div className="sticky top-0 bg-surface-panel border-b border-gray-800 px-6 py-5 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-white">{translateUi("sirket_bilgilerini_duzenle_95e7eda")}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className={labelCls}>{translateUi("sirket_adi_56ee467")}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={translateUi("orn_cd_projekt_red_c0f3857")}
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{translateUi("merkez_08f3ec9")}</label>
              <input
                type="text"
                value={formData.headquarters}
                onChange={(e) => setFormData((prev) => ({ ...prev, headquarters: e.target.value }))}
                placeholder={translateUi("orn_warsaw_poland_d677e51")}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{translateUi("kurulus_yili_27d0e35")}</label>
              <input
                type="number"
                value={formData.foundingYear}
                onChange={(e) => setFormData((prev) => ({ ...prev, foundingYear: e.target.value }))}
                placeholder={translateUi("orn_1994_e079e6b")}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{translateUi("web_sitesi_9e502f3")}</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder={translateUi("orn_https_www_cdprojektred_com_a6db198")}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>{translateUi("aciklama_6f80065")}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={translateUi("sirket_hakkinda_kisa_bilgi_cc34bb3")}
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          <ImageUploadField
            label={translateUi("sirket_logosu_a2d5529")}
            name="logoUrl"
            value={formData.logoUrl}
            onChange={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
            onPendingUpload={setPendingLogo}
            imageType="company"
          />
        </div>

        <div className="sticky bottom-0 bg-surface-panel border-t border-gray-800 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            {translateUi("iptal_85e2d08")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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
                {translateUi("kaydet_b809440")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanyEditDialog;
