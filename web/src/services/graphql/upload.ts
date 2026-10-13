/**
 * GraphQL Upload Mutations
 * File upload operations for profile pictures and content images
 */

import { gql } from '@apollo/client';

// ==========================================
// PROFILE PICTURE UPLOAD
// ==========================================

export const UPLOAD_PROFILE_PICTURE = gql`
  mutation UploadProfilePicture($file: Upload!) {
    uploadProfilePicture(file: $file)
  }
`;

// ==========================================
// CONTENT POSTER UPLOAD
// ==========================================

export const UPLOAD_CONTENT_POSTER = gql`
  mutation UploadContentPoster($file: Upload!, $contentId: String!) {
    uploadContentPoster(file: $file, contentId: $contentId)
  }
`;

// ==========================================
// CONTENT BACKDROP UPLOAD
// ==========================================

export const UPLOAD_CONTENT_BACKDROP = gql`
  mutation UploadContentBackdrop($file: Upload!, $contentId: String!) {
    uploadContentBackdrop(file: $file, contentId: $contentId)
  }
`;

// ==========================================
// COVER PHOTO UPLOAD
// ==========================================

export const UPLOAD_COVER_PHOTO = gql`
  mutation UploadCoverPhoto($file: Upload!) {
    uploadCoverPhoto(file: $file)
  }
`;

// ==========================================
// TYPESCRIPT INTERFACES
// ==========================================

export interface UploadProfilePictureData {
  uploadProfilePicture: string;
}

export interface UploadProfilePictureVars {
  file: File;
}

export interface UploadContentPosterData {
  uploadContentPoster: string;
}

export interface UploadContentPosterVars {
  file: File;
  contentId: string;
}

export interface UploadContentBackdropData {
  uploadContentBackdrop: string;
}

export interface UploadContentBackdropVars {
  file: File;
  contentId: string;
}

// ==========================================
// CONTENT IMAGE UPLOAD (GENERIC - BASE64)
// ==========================================

export const UPLOAD_CONTENT_IMAGE = gql`
  mutation UploadContentImage(
    $file: String!
    $fileName: String!
    $contentId: String
    $imageType: String!
  ) {
    uploadContentImage(
      file: $file
      fileName: $fileName
      contentId: $contentId
      imageType: $imageType
    )
  }
`;

export interface UploadContentImageData {
  uploadContentImage: string;
}

export interface UploadContentImageVars {
  file: string;
  fileName: string;
  contentId?: string;
  imageType: string;
}
