/**
 * Canvas-based image cropping utilities
 * Crops images at original resolution without downscaling
 */

/**
 * Crop area coordinates in pixels
 */
export interface CropArea {
  x: number; // crop start x (pixels)
  y: number; // crop start y (pixels)
  width: number; // crop width (pixels)
  height: number; // crop height (pixels)
}

/** Reads the original file bytes without a canvas, resizing or re-encoding. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Dosya okunamadı'));
    reader.onerror = () => reject(reader.error ?? new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

/**
 * Options for the cropImage function
 */
export interface CropImageOptions {
  imageElement: HTMLImageElement;
  cropArea: CropArea;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number; // 0-1, default 0.92
}

/**
 * Crops an image using canvas API at original resolution
 *
 * Requirements:
 * - 2.1: SHALL NOT reduce the Original_Resolution of uploaded images
 * - 2.2: SHALL only apply the user-selected crop without downscaling
 * - 2.3: SHALL preserve the cropped area at its original pixel density
 * - 7.1: SHALL apply the crop client-side before uploading
 * - 7.2: SHALL use canvas API to extract the cropped region at original resolution
 * - 7.3: SHALL send only the cropped portion to the server
 *
 * @param options - Crop options including image element, crop area, and output settings
 * @returns Promise<string> - Base64 encoded cropped image
 */
export async function cropImage(options: CropImageOptions): Promise<string> {
  const { imageElement, cropArea, outputFormat = 'image/jpeg', quality = 0.92 } = options;

  // Validate crop area
  if (cropArea.width <= 0 || cropArea.height <= 0) {
    throw new Error('Kırpma alanı çok küçük');
  }

  // Create canvas with exact crop dimensions (preserves original resolution)
  const canvas = document.createElement('canvas');
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context oluşturulamadı');
  }

  // Draw the cropped region at original resolution
  // Source: imageElement at (cropArea.x, cropArea.y) with (cropArea.width, cropArea.height)
  // Destination: canvas at (0, 0) with same dimensions (no scaling)
  ctx.drawImage(
    imageElement,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  );

  // Convert to base64 with specified format and quality
  return canvas.toDataURL(outputFormat, quality);
}

/**
 * Loads an image from a File object
 *
 * @param file - Image file to load
 * @returns Promise<HTMLImageElement> - Loaded image element
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve(img);
      };

      img.onerror = () => {
        reject(new Error('Görsel yüklenemedi, lütfen tekrar deneyin'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Dosya okunamadı'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 data URL to a Blob
 * Useful for uploading cropped images
 *
 * @param dataUrl - Base64 data URL
 * @returns Blob - Image blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}
