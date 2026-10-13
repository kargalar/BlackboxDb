'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { ContentSearchSelector } from '@/components/molecules/ContentSearchSelector';

interface SimilarContentsFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
}

export function SimilarContentsFields({ formData, setFormData }: SimilarContentsFieldsProps) {
  const [selectedContentTypeId, setSelectedContentTypeId] = useState<string>('1');

  return (
    <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
          Benzer İçerikler
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Bu içeriğe benzeyen diğer içerikleri arayıp seçin. Bu sayede kullanıcılar içerik
          sayfasında &quot;{formData.title || 'Bu içeriğe'} benzer&quot; olarak önerilen içerikleri
          görebilir.
        </p>
      </div>

      <div className="max-w-2xl flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            İçerik Türü
          </label>
          <select
            value={selectedContentTypeId}
            onChange={(e) => setSelectedContentTypeId(e.target.value)}
            className="w-full bg-white dark:bg-surface-raised border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors text-gray-900 dark:text-white"
          >
            <option value="1">Film</option>
            <option value="2">Dizi</option>
            <option value="3">Oyun</option>
            <option value="4">Kitap</option>
          </select>
        </div>

        <ContentSearchSelector
          label="Arama"
          value={formData.similarContents || []}
          onChange={(items) => setFormData({ ...formData, similarContents: items })}
          placeholder="Benzer içerik arayın..."
          contentTypeId={selectedContentTypeId}
        />
      </div>
    </div>
  );
}
