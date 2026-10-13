'use client';

import { Dispatch, SetStateAction } from 'react';
import { VideoUrlInput } from '@/components/molecules/VideoUrlInput';

interface VideoFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
  contentTypeId: number;
}

export function VideoFields({ formData, setFormData, contentTypeId }: VideoFieldsProps) {
  // Videolar genelde kitaplarda kullanılmaz
  if (contentTypeId === 4) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          🎥 Video Linkleri
        </h4>
        <div className="space-y-6">
          <VideoUrlInput
            label="🎬 YouTube Trailer Linki"
            name="trailerUrl"
            value={formData.trailerUrl || ''}
            onChange={(value) => setFormData({ ...formData, trailerUrl: value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />

          <VideoUrlInput
            label="📹 İnceleme Videosu (YouTube)"
            name="reviewVideoUrl"
            value={formData.reviewVideoUrl || ''}
            onChange={(value) => setFormData({ ...formData, reviewVideoUrl: value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />

          {contentTypeId === 3 && (
            <VideoUrlInput
              label="🎮 Oynanış Videosu (YouTube)"
              name="gameplayVideoUrl"
              value={formData.gameplayVideoUrl || ''}
              onChange={(value) => setFormData({ ...formData, gameplayVideoUrl: value })}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
