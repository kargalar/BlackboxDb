'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import { DocumentNode } from 'graphql';
import Image from 'next/image';
import { validateImageFile } from '@/lib/image-validation';
import { ImageType } from '@/lib/image-crop-config';
import ImageCropModal from '../molecules/ImageCropModal';

interface ImageUploadProps {
  currentImageUrl?: string | null;
  onUploadSuccess?: (imageUrl: string) => void;
  onUploadError?: (error: Error) => void;
  uploadMutation: DocumentNode;
  mutationVariables?: Record<string, any>;
  aspectRatio?: 'square' | '2:3' | '16:9';
  imageType?: ImageType; // For crop modal
  allowedTypes?: string[];
  label?: string;
}

export default function ImageUpload({
  currentImageUrl,
  onUploadSuccess,
  onUploadError,
  uploadMutation,
  mutationVariables = {},
  aspectRatio = 'square',
  imageType = 'profile', // Default to profile for backward compatibility
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  label = 'Upload Image',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadImage, { loading }] = useMutation(uploadMutation, {
    onCompleted: (data: any) => {
      const imageUrl = Object.values(data)[0] as string;
      setPreview(imageUrl);
      onUploadSuccess?.(imageUrl);
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message);
      onUploadError?.(err);
    },
  });

  const validateFile = (file: File): string | null => {
    // Use the centralized validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return validation.error || 'Dosya doğrulanamadı';
    }
    return null;
  };

  // Handle crop completion
  const handleCropComplete = async (croppedBase64: string) => {
    setPreview(croppedBase64);
    setShowCropModal(false);
    setSelectedFile(null);

    // Upload the cropped image
    try {
      // Convert base64 to blob for upload
      const response = await fetch(croppedBase64);
      const blob = await response.blob();
      const file = new File([blob], selectedFile?.name || 'cropped-image.jpg', {
        type: 'image/jpeg',
      });

      await uploadImage({
        variables: {
          file,
          ...mutationVariables,
        },
      });
    } catch (err) {
      console.error('Upload error:', err);
      setError('Yükleme başarısız oldu');
    }
  };

  // Handle crop modal close
  const handleCropModalClose = () => {
    setShowCropModal(false);
    setSelectedFile(null);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Open crop modal instead of uploading directly
    setSelectedFile(file);
    setShowCropModal(true);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Open crop modal instead of uploading directly
    setSelectedFile(file);
    setShowCropModal(true);
    setError(null);
  };

  const aspectRatioClass = {
    square: 'aspect-square',
    '2:3': 'aspect-[2/3]',
    '16:9': 'aspect-video',
  }[aspectRatio];

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2">{label}</label>

      <div
        className={`relative w-full ${aspectRatioClass} rounded-lg overflow-hidden border-2 border-dashed transition-colors cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <Image src={preview} alt="Upload preview" fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Max 10MB • {allowedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')}
            </p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={allowedTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* Crop Modal */}
      {selectedFile && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropModalClose}
          imageFile={selectedFile}
          imageType={imageType}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
