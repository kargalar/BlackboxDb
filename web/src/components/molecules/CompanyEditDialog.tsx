'use client';

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
        toast.error('Şirket kaydedilemedi');
        return;
      }

      toast.success('Şirket bilgileri güncellendi');
      onSave({
        ...company,
        ...payload,
      });
    } catch (error: any) {
      console.error('❌ [CompanyEditDialog] Save error:', error);
      toast.error(error?.message || 'Şirket kaydedilemedi');
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
          <h2 className="text-xl font-bold text-white">Şirket Bilgilerini Düzenle</h2>
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
            <label className={labelCls}>Şirket Adı *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Örn: CD Projekt Red"
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Merkez</label>
              <input
                type="text"
                value={formData.headquarters}
                onChange={(e) => setFormData((prev) => ({ ...prev, headquarters: e.target.value }))}
                placeholder="Örn: Warsaw, Poland"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Kuruluş Yılı</label>
              <input
                type="number"
                value={formData.foundingYear}
                onChange={(e) => setFormData((prev) => ({ ...prev, foundingYear: e.target.value }))}
                placeholder="Örn: 1994"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Web Sitesi</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="Örn: https://www.cdprojektred.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Açıklama</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Şirket hakkında kısa bilgi..."
              rows={4}
              className={`${inputCls} resize-none`}
            />
          </div>

          <ImageUploadField
            label="Şirket Logosu"
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
            İptal
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
                Kaydediliyor...
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
                Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanyEditDialog;
