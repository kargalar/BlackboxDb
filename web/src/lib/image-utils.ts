// ======================================
// Image URL Utilities
// Local and provider image URL helpers
// ======================================
// These functions replace tmdbImage() and igdbImageUrl()

/**
 * Image size presets for responsive images
 * (Kept for backward compatibility)
 */
export const IMAGE_SIZES = {
  // Poster sizes
  poster: {
    small: 185, // w185
    medium: 342, // w342
    large: 500, // w500
    xlarge: 780, // w780
    original: 'original',
  },
  // Backdrop sizes
  backdrop: {
    small: 300, // w300
    medium: 780, // w780
    large: 1280, // w1280
    original: 'original',
  },
  // Profile sizes
  profile: {
    small: 45, // w45
    medium: 185, // w185
    large: 632, // w632
    original: 'original',
  },
  // Still/screenshot sizes
  still: {
    small: 185, // w185
    medium: 300, // w300
    large: 500, // w500
    original: 'original',
  },
} as const;

export type ImageSize = number | 'original';
export type ImageType = keyof typeof IMAGE_SIZES;

/**
 * Resolve an image URL for display. Local images are served by the API proxy.
 *
 * @param url - Full CDN URL or relative path
 * @param size - Desired width in pixels or 'original'
 * @param type - Image type (poster, backdrop, profile, still)
 * @returns Transformed image URL or fallback
 *
 * @example
 * getContentImageUrl('https://cdn.example.com/posters/movie123.jpg', 342, 'poster')
 * getContentImageUrl('https://cdn.example.com/posters/movie123.jpg', 'original', 'poster', 'original')
 * getContentImageUrl(null, 342, 'poster') // Returns placeholder
 */
export function getContentImageUrl(
  url: string | null | undefined,
  _size: ImageSize = 'original',
  type: ImageType = 'poster',
): string {
  // Return placeholder if no URL provided
  if (!url) {
    console.debug(`🖼️ [ImageUtils] No URL provided for ${type}, using placeholder`);
    return getPlaceholderImage(type);
  }

  // External image providers own their URL formats and transformation rules.
  if (url.startsWith('http')) {
    return url;
  }

  // If relative path, convert to full URL
  const baseUrl = process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_API_URL || '';
  const fullUrl = `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
  console.debug(`🖼️ [ImageUtils] Relative path converted for ${type}`);

  return fullUrl;
}

/**
 * Get person profile image URL with optional size transformation
 *
 * @param url - Full CDN URL or relative path
 * @param size - Desired width in pixels or 'original'
 * @returns Transformed image URL or fallback
 *
 * @example
 * getPersonImageUrl('https://cdn.example.com/profiles/person123.jpg', 185)
 * getPersonImageUrl(null, 185) // Returns placeholder
 */
export function getPersonImageUrl(
  url: string | null | undefined,
  size: ImageSize = IMAGE_SIZES.profile.medium
): string {
  return getContentImageUrl(url, size, 'profile');
}

/**
 * Get company logo URL with optional size transformation
 *
 * @param url - Full CDN URL or relative path
 * @param size - Desired width in pixels or 'original'
 * @returns Transformed image URL or fallback
 */
export function getCompanyLogoUrl(url: string | null | undefined, size: ImageSize = 200): string {
  if (!url) {
    return getPlaceholderImage('profile'); // Use profile placeholder for logos
  }

  return getContentImageUrl(url, size, 'profile');
}

/**
/**
 * Get placeholder image based on content type
 *
 * @param type - Image type
 * @returns Placeholder image URL or data URI
 */
function getPlaceholderImage(type: ImageType): string {
  // Return appropriate placeholder based on type
  const placeholders: Record<ImageType, string> = {
    poster: '/placeholders/poster.png',
    backdrop: '/placeholders/backdrop.png',
    profile: '/placeholders/profile.png',
    still: '/placeholders/still.png',
  };

  return placeholders[type] || '/placeholders/default.png';
}

/**
 * Get srcset for responsive images
 *
 * @param url - Base image URL
 * @param type - Image type
 * @returns srcset string for <img> element
 *
 * @example
 * <img src={getContentImageUrl(url, 342, 'poster')} srcSet={getImageSrcSet(url, 'poster')} />
 */
export function getImageSrcSet(
  url: string | null | undefined,
  type: ImageType = 'poster'
): string | undefined {
  if (!url) return undefined;

  const sizes = IMAGE_SIZES[type];
  const srcsetParts: string[] = [];

  // Generate srcset for all available sizes
  Object.values(sizes).forEach((size) => {
    if (size === 'original') {
      srcsetParts.push(`${getContentImageUrl(url, 'original', type)} 2000w`);
    } else {
      srcsetParts.push(`${getContentImageUrl(url, size, type)} ${size}w`);
    }
  });

  return srcsetParts.join(', ');
}

/**
 * Get optimized poster URL for different display contexts
 */
export const getPosterUrl = {
  card: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.poster.small, 'poster'),
  detail: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.poster.large, 'poster'),
  hero: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.poster.xlarge, 'poster'),
  original: (url: string | null | undefined) => getContentImageUrl(url, 'original', 'poster'),
};

/**
 * Get optimized backdrop URL for different display contexts
 */
export const getBackdropUrl = {
  thumbnail: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.backdrop.small, 'backdrop'),
  hero: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.backdrop.large, 'backdrop'),
  original: (url: string | null | undefined) => getContentImageUrl(url, 'original', 'backdrop'),
};

/**
 * Get optimized profile URL for different display contexts
 */
export const getProfileUrl = {
  avatar: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.profile.small, 'profile'),
  card: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.profile.medium, 'profile'),
  detail: (url: string | null | undefined) =>
    getContentImageUrl(url, IMAGE_SIZES.profile.large, 'profile'),
  original: (url: string | null | undefined) => getContentImageUrl(url, 'original', 'profile'),
};

/**
 * Preload critical images
 *
 * @param urls - Array of image URLs to preload
 */
export function preloadImages(urls: (string | null | undefined)[]): void {
  if (typeof window === 'undefined') return;

  urls.forEach((url) => {
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}

/**
 * Check if image URL is valid and accessible
 *
 * @param url - Image URL to validate
 * @returns Promise<boolean>
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
