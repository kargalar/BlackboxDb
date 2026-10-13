'use client';

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

function getYoutubeEmbedUrl(value: string): string | null {
  if (!value.trim()) return null;

  try {
    const normalizedValue = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(normalizedValue);
    const hostname = url.hostname.toLowerCase();
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(hostname)) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else {
        videoId = url.pathname.match(/^\/embed\/([^/]+)\/?$/)?.[1] ?? null;
      }
    }

    return videoId && YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
      ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
      : null;
  } catch {
    return null;
  }
}

interface VideoUrlInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function VideoUrlInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
}: VideoUrlInputProps) {
  const embedUrl = getYoutubeEmbedUrl(value);

  const isFilled = value !== undefined && value !== '';

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label
          htmlFor={name}
          className={`block text-sm transition-colors ${
            isFilled
              ? 'font-semibold text-gray-900 dark:text-white'
              : 'font-medium text-gray-400 dark:text-gray-500'
          }`}
        >
          {label}
        </label>
        <input
          id={name}
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:bg-surface-panel dark:text-white transition-colors ${
            error
              ? 'border border-red-500'
              : isFilled
                ? 'border-transparent'
                : 'border border-gray-200 dark:border-gray-800'
          }`}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {embedUrl && (
        <div className="w-full aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-black/5 dark:bg-white/5">
          <iframe
            src={embedUrl}
            title={label}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
