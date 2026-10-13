import type { CropArea } from './image-crop-utils';

export interface ImageFocus {
  x: number;
  y: number;
}

const FOCUS_FRAGMENT = /#focus=[^#]*/;
export const DEFAULT_IMAGE_FOCUS: ImageFocus = { x: 50, y: 50 };

function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
}

export function getImageSource(value: string): string {
  return value.replace(FOCUS_FRAGMENT, '');
}

export function getImageFocus(value: string): ImageFocus {
  const match = value.match(/#focus=([\d.]+),([\d.]+)$/);
  return match
    ? { x: clampPercent(Number(match[1])), y: clampPercent(Number(match[2])) }
    : DEFAULT_IMAGE_FOCUS;
}

export function withImageFocus(value: string, focus: ImageFocus): string {
  const coordinate = (number: number) => Number(clampPercent(number).toFixed(2));
  return `${getImageSource(value)}#focus=${coordinate(focus.x)},${coordinate(focus.y)}`;
}

export function getImageObjectPosition(value: string): string {
  const focus = getImageFocus(value);
  return `${focus.x}% ${focus.y}%`;
}

/** CSS object-position expresses alignment within the available overflow, not the image center. */
export function getFocusFromCrop(
  crop: CropArea,
  imageWidth: number,
  imageHeight: number
): ImageFocus {
  const overflowX = Math.max(0, imageWidth - crop.width);
  const overflowY = Math.max(0, imageHeight - crop.height);
  return {
    x: overflowX > 0 ? clampPercent((crop.x / overflowX) * 100) : 50,
    y: overflowY > 0 ? clampPercent((crop.y / overflowY) * 100) : 50,
  };
}
