'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import React from 'react';

interface ContentGameSeriesProps {
  content: {
    gameDetails?: {
      collection?: number;
    };
  };
}

// This component requires related games data from our database
// Currently disabled until backend support is added
export const ContentGameSeries: React.FC<ContentGameSeriesProps> = ({ content }) => {
  const translateUi = useUiTranslations('Ui');
  // Check if we have collection info
  const hasCollection = content?.gameDetails?.collection;

  if (!hasCollection) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">{translateUi("seri_koleksiyon_2528700")}</h2>
        <p className="text-gray-400">
          {translateUi("bu_oyun_bir_koleksiyonun_parcasi_ilgili_5033123")}
        </p>

        <div className="mt-2">
          <p className="text-sm text-gray-500">{translateUi("collection_id_c020d4b") + " "} {content.gameDetails?.collection}</p>
        </div>
      </div>
    </div>
  );
};

export default ContentGameSeries;
