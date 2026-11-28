'use client';

import { useTranslations as useUiTranslations } from 'next-intl';

import { Dispatch, SetStateAction } from 'react';
import { VideoUrlInput } from '@/components/molecules/VideoUrlInput';

interface VideoFieldsProps {
  formData: any;
  setFormData: Dispatch<SetStateAction<any>>;
  contentTypeId: number;
}

export function VideoFields({ formData, setFormData, contentTypeId }: VideoFieldsProps) {
  const translateUi = useUiTranslations('Ui');
  // Videolar genelde kitaplarda kullanılmaz
  if (contentTypeId === 4) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-gray-50 dark:bg-surface-panel border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {translateUi("video_linkleri_e12d886")}
        </h4>
        <div className="space-y-6">
          <VideoUrlInput
            label={translateUi("youtube_trailer_linki_077b5bd")}
            name="trailerUrl"
            value={formData.trailerUrl || ''}
            onChange={(value) => setFormData({ ...formData, trailerUrl: value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />

          <VideoUrlInput
            label={translateUi("inceleme_videosu_youtube_9564107")}
            name="reviewVideoUrl"
            value={formData.reviewVideoUrl || ''}
            onChange={(value) => setFormData({ ...formData, reviewVideoUrl: value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />

          {contentTypeId === 3 && (
            <VideoUrlInput
              label={translateUi("oynanis_videosu_youtube_9d7cc06")}
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
