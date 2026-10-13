/**
 * Image file validation utilities
 */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valid image MIME types
 */
export const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Maximum file size in bytes (10 MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10,485,760 bytes

/**
 * Validates an image file for upload
 * - Checks file type (JPG, PNG, WebP)
 * - Checks file size (max 10 MB)
 */
export function validateImageFile(file: File): FileValidationResult {
  // Check file type
  if (!VALID_IMAGE_TYPES.includes(file.type as (typeof VALID_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      error: 'Lütfen geçerli bir görsel dosyası seçiniz (JPG, PNG, WebP)',
    };
  }

  // Check file size (10 MB)
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "Dosya boyutu 10 MB'den küçük olmalıdır",
    };
  }

  return { valid: true };
}
