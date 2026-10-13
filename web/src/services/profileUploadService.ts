import { apolloClient } from '@/lib/apollo-client';
import {
  UPLOAD_PROFILE_PICTURE,
  UPLOAD_COVER_PHOTO,
  type UploadProfilePictureData,
  type UploadProfilePictureVars,
} from '@/services/graphql/upload';
import { logApiRequest } from '@/lib/requestLogger';

export async function uploadProfilePicture(
  file: File
): Promise<{ url: string | null; error?: any }> {
  try {
    console.log('📸 [ProfileUpload] Uploading profile picture...', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const result = await apolloClient.mutate<UploadProfilePictureData, UploadProfilePictureVars>({
      mutation: UPLOAD_PROFILE_PICTURE,
      variables: { file },
      context: {
        headers: {
          'apollo-require-preflight': 'true',
        },
      },
    });

    const url = result.data?.uploadProfilePicture ?? null;

    if (!url) {
      const message = 'Profile picture upload returned empty URL';
      console.error('❌ [ProfileUpload]', message, { result });
      logApiRequest('GraphQL:uploadProfilePicture', 'MUTATION', false, message);
      return { url: null, error: message };
    }

    console.log('✅ [ProfileUpload] Uploaded:', url);
    logApiRequest('GraphQL:uploadProfilePicture', 'MUTATION', true);
    return { url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile picture upload failed';
    console.error('❌ [ProfileUpload] Upload failed:', error);
    logApiRequest('GraphQL:uploadProfilePicture', 'MUTATION', false, message);
    return { url: null, error };
  }
}

export async function uploadCoverPhoto(file: File): Promise<{ url: string | null; error?: any }> {
  try {
    console.log('🖼️ [CoverUpload] Uploading cover photo...', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const result = await apolloClient.mutate<{ uploadCoverPhoto: string }, { file: File }>({
      mutation: UPLOAD_COVER_PHOTO,
      variables: { file },
      context: {
        headers: {
          'apollo-require-preflight': 'true',
        },
      },
    });

    const url = result.data?.uploadCoverPhoto ?? null;

    if (!url) {
      const message = 'Cover photo upload returned empty URL';
      console.error('❌ [CoverUpload]', message, { result });
      logApiRequest('GraphQL:uploadCoverPhoto', 'MUTATION', false, message);
      return { url: null, error: message };
    }

    console.log('✅ [CoverUpload] Uploaded:', url);
    logApiRequest('GraphQL:uploadCoverPhoto', 'MUTATION', true);
    return { url };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cover photo upload failed';
    console.error('❌ [CoverUpload] Upload failed:', error);
    logApiRequest('GraphQL:uploadCoverPhoto', 'MUTATION', false, message);
    return { url: null, error };
  }
}
