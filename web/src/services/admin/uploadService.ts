/**
 * Upload Service
 * Handles file uploads
 */

import { graphqlMutation } from '@/lib/graphqlHelpers';
import { UPLOAD_CONTENT_IMAGE } from '../graphql/upload';

/**
 * Upload content images to the local media storage
 *
 * @param fileBase64 - Base64 encoded file data
 * @param fileName - Original file name
 * @param imageType - Type of image (poster, backdrop, screenshot, profile, or company)
 * @param contentId - Optional content ID to associate with the image
 * @returns Uploaded image URL
 */
export async function uploadContentImage(
  fileBase64: string,
  fileName: string,
  imageType: 'poster' | 'backdrop' | 'screenshot' | 'profile' | 'company' = 'poster',
  contentId?: string
): Promise<string> {
  console.log(`📤 [GraphQL] Uploading ${imageType}:`, fileName);

  const { data, error } = await graphqlMutation<string>(
    UPLOAD_CONTENT_IMAGE,
    {
      file: fileBase64,
      fileName,
      contentId: contentId || null,
      imageType,
    },
    'uploadContentImage'
  );

  if (error || !data) {
    throw error || new Error('Upload failed');
  }

  return data;
}
