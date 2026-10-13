/**
 * Image type definitions for the crop system
 */
export type ImageType =
  | 'poster'
  | 'backdrop'
  | 'screenshot'
  | 'person'
  | 'expansion'
  | 'seasonPoster'
  | 'episodeStill'
  | 'profile'
  | 'company'
  | 'cover';

/**
 * Aspect ratios for each image type
 * - poster: 2:3 (portrait)
 * - backdrop: 21:9 display selection; the original file is retained
 * - screenshot: 16:9 (landscape)
 * - person: 2:3 (portrait)
 * - expansion: 2:3 (portrait)
 * - seasonPoster: 2:3 (portrait)
 * - episodeStill: 16:9 (landscape)
 * - profile: 1:1 (square)
 * - cover: 16:5 (wide horizontal cover photo)
 */
export const ASPECT_RATIOS: Record<ImageType, number> = {
  poster: 2 / 3, // 0.667 - portrait
  backdrop: 21 / 9, // Alignment preview; no physical crop is applied to backdrops.
  screenshot: NaN, // Free - user can crop freely
  person: 2 / 3, // 0.667 - portrait
  expansion: 2 / 3, // 0.667 - portrait
  seasonPoster: 2 / 3, // 0.667 - portrait
  episodeStill: 16 / 9, // 1.778 - landscape
  profile: 1 / 1, // 1.0 - square
  company: 1 / 1, // 1.0 - square
  cover: 64 / 5, // 12.8 - matches profile display aspect-[64/5]
};

/**
 * Get the aspect ratio for a given image type
 */
export function getAspectRatio(imageType: ImageType): number {
  return ASPECT_RATIOS[imageType];
}
