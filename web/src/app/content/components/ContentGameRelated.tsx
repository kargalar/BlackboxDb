'use client';

import React from 'react';

interface ContentGameRelatedProps {
  content: any;
}

// This component requires similar/related games data from our database
// Currently disabled until backend support is added
export const ContentGameRelated: React.FC<ContentGameRelatedProps> = ({ content }) => {
  // Check if we have any related game data
  const hasRelatedData = content?.gameDetails?.similarGames || content?.gameDetails?.dlcs;

  if (!hasRelatedData) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">İlgili Oyunlar</h2>
        <p className="text-gray-400">Benzer oyunlar ve DLC içerikleri yakında eklenecek.</p>
      </div>
    </div>
  );
};

export default ContentGameRelated;
