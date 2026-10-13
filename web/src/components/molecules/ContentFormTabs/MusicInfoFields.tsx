'use client';

import { FormInput } from '@/components/atoms/FormInput';
import { AddContentFormData } from '@/app/add-content/types';

interface MusicInfoFieldsProps {
  formData: AddContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddContentFormData>>;
  errors: Record<string, string>;
}

export function MusicInfoFields({ formData, setFormData, errors }: MusicInfoFieldsProps) {
  return (
    <div className="space-y-5">
      <label className="block text-sm text-gray-700 dark:text-gray-300">
        Release type
        <select
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-600 dark:bg-gray-800"
          value={formData.musicReleaseType || ''}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              musicReleaseType: event.target.value as AddContentFormData['musicReleaseType'],
            }))
          }
        >
          <option value="">Unspecified legacy item</option>
          <option value="ALBUM">Album</option>
          <option value="SINGLE">Single</option>
          <option value="TRACK">Track</option>
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          label="Plak şirketi / Label"
          name="label"
          value={formData.label || ''}
          onChange={(value) => setFormData((prev) => ({ ...prev, label: value }))}
          placeholder="Örn. Sony Music"
          error={errors.label}
        />
        <FormInput
          label="Toplam parça"
          name="totalTracks"
          type="number"
          value={formData.totalTracks?.toString() || ''}
          onChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              totalTracks: value ? Math.max(0, Number(value)) : undefined,
            }))
          }
          placeholder="12"
          error={errors.totalTracks}
        />
      </div>

      <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={formData.explicit ?? false}
          onChange={(event) => setFormData((prev) => ({ ...prev, explicit: event.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        Explicit içerik
      </label>

      <FormInput
        label="Spotify parça / albüm URL"
        name="spotifyUrl"
        type="url"
        value={formData.spotifyUrl || ''}
        onChange={(value) => setFormData((prev) => ({ ...prev, spotifyUrl: value }))}
        placeholder="https://open.spotify.com/album/..."
        error={errors.spotifyUrl}
      />
    </div>
  );
}
