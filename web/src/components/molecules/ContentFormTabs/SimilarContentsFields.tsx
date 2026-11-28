'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { ContentSearchSelector } from '@/components/molecules/ContentSearchSelector';

interface SimilarContentsFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
}

export function SimilarContentsFields({ formData, setFormData }: SimilarContentsFieldsProps) {
  const translateUi = useUiTranslations('Ui');
  const [selectedContentTypeId, setSelectedContentTypeId] = useState<string>('1');

  return (
    <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          {translateUi("benzer_icerikler_727b8fd")}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {translateUi("bu_icerige_benzeyen_diger_icerikleri_arayip_2a9a735")}{formData.title || translateUi("bu_icerige_d648b96")} {" " + translateUi("benzer_quot_olarak_onerilen_icerikleri_gorebilir_ea5aa66")}
        </p>
      </div>

      <div className="max-w-2xl flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {translateUi("icerik_turu_a4a22c7")}
          </label>
          <select
            value={selectedContentTypeId}
            onChange={(e) => setSelectedContentTypeId(e.target.value)}
            className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-gray-900 dark:text-white"
          >
            <option value="1">{translateUi("film_b9aec11")}</option>
            <option value="2">{translateUi("dizi_24e71e6")}</option>
            <option value="3">{translateUi("oyun_246ef60")}</option>
            <option value="4">{translateUi("kitap_8f04008")}</option>
          </select>
        </div>

        <ContentSearchSelector
          label={translateUi("arama_e725336")}
          value={formData.similarContents || []}
          onChange={(items) => setFormData({ ...formData, similarContents: items })}
          placeholder={translateUi("benzer_icerik_arayin_c77755d")}
          contentTypeId={selectedContentTypeId}
        />
      </div>
    </div>
  );
}
