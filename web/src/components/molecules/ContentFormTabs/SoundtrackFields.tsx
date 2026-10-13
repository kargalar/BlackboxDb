'use client';

import { useState, useMemo } from 'react';
import { AddContentFormData } from '@/app/add-content/types';

interface SoundtrackFieldsProps {
  formData: AddContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddContentFormData>>;
  errors: Record<string, string>;
}

/**
 * Extracts Spotify playlist/album/track ID and type from a URL.
 * Supports formats:
 * - https://open.spotify.com/playlist/37i9dQZF1DX5trt9i14X7j
 * - https://open.spotify.com/album/0sNOF9WDwhWunNAHPD3Baj
 * - https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
 * - spotify:playlist:37i9dQZF1DX5trt9i14X7j
 */
function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  if (!url) return null;

  // Web URL format
  const webMatch = url.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/);
  if (webMatch) return { type: webMatch[1], id: webMatch[2] };

  // URI format (spotify:playlist:xxx)
  const uriMatch = url.match(/spotify:(playlist|album|track):([a-zA-Z0-9]+)/);
  if (uriMatch) return { type: uriMatch[1], id: uriMatch[2] };

  return null;
}

/**
 * SoundtrackFields - Spotify playlist URL input with live embed preview.
 */
export function SoundtrackFields({ formData, setFormData, errors }: SoundtrackFieldsProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isMusic = formData.contentTypeId === '5';
  const spotifyInput = isMusic ? formData.spotifyUrl || '' : formData.spotifyPlaylistUrl || '';

  const spotifyData = useMemo(() => parseSpotifyUrl(spotifyInput), [spotifyInput]);

  const isValidUrl = !!spotifyData;
  const hasInput = !!formData.spotifyPlaylistUrl?.trim();

  const embedUrl = spotifyData
    ? `https://open.spotify.com/embed/${spotifyData.type}/${spotifyData.id}?utm_source=generator&theme=0`
    : null;

  const handleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      ...(isMusic ? { spotifyUrl: value } : { spotifyPlaylistUrl: value }),
    }));
  };

  const handleClear = () => {
    setFormData((prev) => ({
      ...prev,
      ...(isMusic ? { spotifyUrl: '' } : { spotifyPlaylistUrl: '' }),
    }));
  };

  return (
    <div className="space-y-5">
      {/* URL Input */}
      <div>
        <label
          htmlFor={isMusic ? 'spotifyUrl' : 'spotifyPlaylistUrl'}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          🎵 Spotify Playlist / Album / Track URL
        </label>
        <div className="relative">
          <input
            id={isMusic ? 'spotifyUrl' : 'spotifyPlaylistUrl'}
            type="url"
            value={spotifyInput}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="https://open.spotify.com/playlist/..."
            className={`
              w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              ${
                hasInput && !isValidUrl
                  ? 'border-red-400 dark:border-red-500'
                  : isFocused
                    ? 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }
            `}
          />
          {/* Status indicator */}
          {hasInput && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {isValidUrl ? (
                <span className="text-emerald-500 text-sm font-medium flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Geçerli
                </span>
              ) : (
                <span className="text-red-400 text-sm font-medium">Geçersiz URL</span>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                title="Temizle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Spotify&apos;dan playlist, albüm veya şarkı linkini yapıştırın
        </p>
        {errors[isMusic ? 'spotifyUrl' : 'spotifyPlaylistUrl'] && (
          <p className="mt-1 text-sm text-red-500">
            {errors[isMusic ? 'spotifyUrl' : 'spotifyPlaylistUrl']}
          </p>
        )}
      </div>

      {/* Live Embed Preview */}
      {embedUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-emerald-500/30" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Önizleme
            </span>
            <div className="h-px flex-1 bg-emerald-500/30" />
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
            <iframe
              src={embedUrl}
              width="100%"
              height="480"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block"
              title="Spotify Embed Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
