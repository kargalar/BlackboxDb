'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { ContentSearchSelector } from '@/components/molecules/ContentSearchSelector';
import { uploadContentImage } from '@/services/admin/uploadService';
import { CitationItem } from '@/app/add-content/types';
import {
  Image as ImageIcon,
  X,
  Quote,
  UploadCloud,
  Loader2,
  Link2,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CitationsFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
}

export function CitationsFields({ formData, setFormData }: CitationsFieldsProps) {
  const translateUi = useUiTranslations('Ui');
  const [activeSubTab, setActiveSubTab] = useState<'received' | 'made'>('received');
  const [selectedContentTypeId, setSelectedContentTypeId] = useState<string>('1'); // Default: Film
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const citationsReceived = formData.citationsReceived || [];
  const citationsMade = formData.citationsMade || [];

  const handleCitationsChange = (items: any[]) => {
    if (activeSubTab === 'received') {
      const updated = items.map((item) => {
        const existing = citationsReceived.find((c: any) => c.id === item.id);
        return {
          id: item.id,
          name: item.name,
          posterUrl: item.posterUrl,
          note: existing ? existing.note : '',
          imageUrl: existing ? existing.imageUrl : '',
          releaseDate: item.releaseDate || existing?.releaseDate,
          contentTypeId: item.contentTypeId || existing?.contentTypeId,
        };
      });
      setFormData({ ...formData, citationsReceived: updated });
    } else {
      const updated = items.map((item) => {
        const existing = citationsMade.find((c: any) => c.id === item.id);
        return {
          id: item.id,
          name: item.name,
          posterUrl: item.posterUrl,
          note: existing ? existing.note : '',
          imageUrl: existing ? existing.imageUrl : '',
          releaseDate: item.releaseDate || existing?.releaseDate,
          contentTypeId: item.contentTypeId || existing?.contentTypeId,
        };
      });
      setFormData({ ...formData, citationsMade: updated });
    }
  };

  const handleNoteChange = (id: string, note: string) => {
    if (activeSubTab === 'received') {
      const updated = citationsReceived.map((c: any) => (c.id === id ? { ...c, note } : c));
      setFormData({ ...formData, citationsReceived: updated });
    } else {
      const updated = citationsMade.map((c: any) => (c.id === id ? { ...c, note } : c));
      setFormData({ ...formData, citationsMade: updated });
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(translateUi("gorsel_boyutu_5mb_tan_kucuk_olmalidir_ae4a008"));
      return;
    }

    setUploadingId(id);
    const loadingToast = toast.loading(translateUi("gorsel_yukleniyor_3d98135"));

    try {
      const reader = new FileReader();
      const uploadPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;
            const url = await uploadContentImage(base64, file.name, 'screenshot');
            resolve(url);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Dosya okunamadı.'));
        reader.readAsDataURL(file);
      });

      const uploadedUrl = await uploadPromise;
      if (activeSubTab === 'received') {
        const updated = citationsReceived.map((c: any) =>
          c.id === id ? { ...c, imageUrl: uploadedUrl } : c
        );
        setFormData({ ...formData, citationsReceived: updated });
      } else {
        const updated = citationsMade.map((c: any) =>
          c.id === id ? { ...c, imageUrl: uploadedUrl } : c
        );
        setFormData({ ...formData, citationsMade: updated });
      }
      toast.success(translateUi("gorsel_basariyla_yuklendi_108e82f"), { id: loadingToast });
    } catch (error) {
      console.error('❌ Citation image upload failed:', error);
      toast.error(translateUi("gorsel_yuklenirken_bir_hata_olustu_e3673c7"), { id: loadingToast });
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveImage = (id: string) => {
    if (activeSubTab === 'received') {
      const updated = citationsReceived.map((c: any) => (c.id === id ? { ...c, imageUrl: '' } : c));
      setFormData({ ...formData, citationsReceived: updated });
    } else {
      const updated = citationsMade.map((c: any) => (c.id === id ? { ...c, imageUrl: '' } : c));
      setFormData({ ...formData, citationsMade: updated });
    }
    toast.success(translateUi("gorsel_kaldirildi_ce066cc"));
  };

  const currentCitations = activeSubTab === 'received' ? citationsReceived : citationsMade;

  return (
    <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      {/* Title & Description */}
      <div className="mb-6">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Quote className="w-5 h-5 text-violet-500" />
          {translateUi("atif_iliskileri_cb89fba")}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {translateUi("bu_icerigin_diger_yapimlarla_film_dizi_eb24a1a")}
        </p>
      </div>

      {/* Directed Sub-Tabs */}
      <div className="flex bg-gray-100 dark:bg-surface-raised p-1 rounded-2xl border border-gray-200 dark:border-gray-800/80 mb-6 max-w-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('received')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'received'
              ? 'bg-white dark:bg-surface-hover text-violet-600 dark:text-violet-400 shadow-sm border border-gray-200/50 dark:border-gray-800/50'
              : 'text-gray-500 hover:text-gray-850 dark:hover:text-gray-300'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          {translateUi("atif_yapanlar_received_9866d3d")}
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('made')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'made'
              ? 'bg-white dark:bg-surface-hover text-violet-600 dark:text-violet-400 shadow-sm border border-gray-200/50 dark:border-gray-800/50'
              : 'text-gray-500 hover:text-gray-850 dark:hover:text-gray-300'
          }`}
        >
          <Quote className="w-3.5 h-3.5" />
          {translateUi("atifta_bulunduklari_made_61ed3c5")}
        </button>
      </div>

      {/* Context Guide */}
      <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl p-4 mb-6 flex gap-3">
        <HelpCircle className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-violet-800 dark:text-violet-300 leading-relaxed">
          {activeSubTab === 'received' ? (
            <span>
              <b>{translateUi("atif_yapanlar_f7578b1")}</b> {" " + translateUi("bu_sayfada_duzenlediginiz_icerige_4201efd")}
              <b>{formData.title || translateUi("bu_yapim_45ee43a")}</b>{translateUi("atifta_bulunan_onu_referans_gosteren_diger_4d2a8d4")}
            </span>
          ) : (
            <span>
              <b>{translateUi("atifta_bulunduklari_121eb56")}</b> {" " + translateUi("bu_sayfada_duzenlediginiz_icerigin_6be8ed3")}
              <b>{formData.title || translateUi("bu_yapim_45ee43a")}</b>{translateUi("icerisinde_atifta_bulunulan_sahne_replik_bazinda_4f73a83")}
            </span>
          )}
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="flex flex-col gap-6">
        <div className="max-w-2xl flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {translateUi("icerik_turu_a4a22c7")}
            </label>
            <select
              value={selectedContentTypeId}
              onChange={(e) => setSelectedContentTypeId(e.target.value)}
              className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-gray-700 px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-gray-900 dark:text-white font-medium"
            >
              <option value="1">{translateUi("film_b9aec11")}</option>
              <option value="2">{translateUi("dizi_24e71e6")}</option>
              <option value="3">{translateUi("oyun_246ef60")}</option>
            </select>
          </div>

          <div className="w-full md:w-2/3">
            <ContentSearchSelector
              label={
                activeSubTab === 'received'
                  ? translateUi("atifta_bulunan_yapimi_sec_bd847e1")
                  : translateUi("atif_yapilan_yapimi_sec_3d88a26")
              }
              value={currentCitations.map((c: any) => ({
                id: c.id,
                name: c.name,
                posterUrl: c.posterUrl,
              }))}
              onChange={handleCitationsChange}
              placeholder={translateUi("yapim_arayin_269485a")}
              contentTypeId={selectedContentTypeId}
            />
          </div>
        </div>

        {/* Selected List */}
        {currentCitations.length > 0 && (
          <div className="flex flex-col gap-4 mt-4">
            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {activeSubTab === 'received'
                ? translateUi("atifta_bulunanlar_detaylari_ff06c35")
                : translateUi("atif_yapilanlar_detaylari_7b9f8d1")}
            </h5>

            <div className="grid grid-cols-1 gap-4">
              {currentCitations.map((citation: CitationItem) => (
                <div
                  key={citation.id}
                  className="relative p-5 rounded-2xl bg-white dark:bg-surface-raised/60 border border-gray-200 dark:border-gray-800/80 shadow-sm flex flex-col lg:flex-row gap-5 transition-all hover:border-gray-300 dark:hover:border-gray-700"
                >
                  {/* Poster */}
                  <div className="w-24 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800">
                    {citation.posterUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={citation.posterUrl}
                        alt={citation.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon aria-hidden="true" className="w-6 h-6 opacity-40 mb-1" />
                        <span className="text-[10px]">{translateUi("afis_yok_c965db9")}</span>
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex-grow flex flex-col gap-4">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300 mb-1 font-medium">
                        {activeSubTab === 'received' ? translateUi("atif_yapan_yapim_fd0fde0") : translateUi("atif_yapilan_yapim_89cf6a8")}
                      </span>
                      <h6 className="text-base font-bold text-gray-900 dark:text-white">
                        {citation.name}
                      </h6>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Note */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {translateUi("atif_sahnesi_aciklamasi_not_2b04204")}
                        </label>
                        <textarea
                          value={citation.note || ''}
                          onChange={(e) => handleNoteChange(citation.id, e.target.value)}
                          placeholder={translateUi("orn_15_dakikada_bu_oyunun_kutusu_8e11958")}
                          rows={3}
                          className="w-full bg-gray-50 dark:bg-surface-panel border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-gray-900 dark:text-white resize-none"
                        />
                      </div>

                      {/* Image Upload */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {translateUi("atif_sahnesi_gorseli_opsiyonel_db72311")}
                        </label>

                        {citation.imageUrl ? (
                          <div className="relative w-full h-[88px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={citation.imageUrl}
                              alt={translateUi("atif_gorseli_751bc7d")}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(citation.id)}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="relative w-full h-[88px] flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-surface-panel cursor-pointer hover:bg-gray-100 dark:hover:bg-surface-hover transition-all">
                            {uploadingId === citation.id ? (
                              <div className="flex flex-col items-center justify-center text-violet-500 gap-1">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-xs">{translateUi("yukleniyor_317109f")}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-1">
                                <UploadCloud className="w-5 h-5 text-gray-400" />
                                <span className="text-xs font-medium">{translateUi("gorsel_sec_surukle_9fceffa")}</span>
                                <span className="text-[9px] opacity-70">{translateUi("png_jpg_maks_5mb_bff61ca")}</span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingId === citation.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(citation.id, file);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = currentCitations.filter((c: any) => c.id !== citation.id);
                      if (activeSubTab === 'received') {
                        setFormData({ ...formData, citationsReceived: updated });
                      } else {
                        setFormData({ ...formData, citationsMade: updated });
                      }
                    }}
                    className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-surface-hover transition-colors"
                    title={translateUi("atifi_kaldir_088a40b")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
