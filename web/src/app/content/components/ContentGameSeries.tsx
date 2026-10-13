'use client';

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
  // Check if we have collection info
  const hasCollection = content?.gameDetails?.collection;

  if (!hasCollection) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Seri & Koleksiyon</h2>
        <p className="text-gray-400">
          Bu oyun bir koleksiyonun parçası. İlgili oyunlar yakında eklenecek.
        </p>

        <div className="mt-2">
          <p className="text-sm text-gray-500">Collection ID: {content.gameDetails?.collection}</p>
        </div>
      </div>
    </div>
  );
};

export default ContentGameSeries;
