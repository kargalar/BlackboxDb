/**
 * Component: ImageUploadField
 *
 * Görsel seçme alanı - Upload işlemi form submit sırasında yapılır
 * Base64 ve fileName'i parent'a iletir
 *
 * Requirements:
 * - 1.1: Display image with draggable and resizable crop overlay
 * - 3.2: Display error message for files larger than 10 MB
 * - 6.1-6.8: Support all image types with correct aspect ratios
 * - 8.1-8.4: Error handling for file validation
 */

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Crop } from 'lucide-react';
import toast from 'react-hot-toast';
import { ImageType, ASPECT_RATIOS } from '@/lib/image-crop-config';
import { validateImageFile } from '@/lib/image-validation';
import ImageCropModal from './ImageCropModal';
import {
  getImageFocus,
  getImageSource,
  getImageObjectPosition,
  withImageFocus,
} from '@/lib/image-focus';
import { useTranslations } from 'next-intl';

// Pending upload verisi - form submit sırasında upload edilecek
export interface PendingImageUpload {
  base64: string;
  fileName: string;
  imageType: ImageType;
}

interface ImageUploadFieldProps {
  label: string;
  name: string;
  value: string; // Mevcut görsel URL'i (edit modunda) veya seçilen base64
  onChange: (url: string) => void;
  onPendingUpload?: (pending: PendingImageUpload | null) => void; // Bekleyen upload bilgisi
  imageType: ImageType; // Required - determines aspect ratio
  error?: string;
  required?: boolean;
}

// Get CSS aspect ratio string from ImageType
function getAspectRatioString(imageType: ImageType): string {
  const ratio = ASPECT_RATIOS[imageType];
  if (ratio === 1) return '1/1';
  if (ratio === 2 / 3) return '2/3';
  if (ratio === 16 / 9) return '16/9';
  if (ratio === 21 / 9) return '21/9';
  if (ratio === 64 / 5) return '64/5';
  return '2/3'; // default
}

export default function ImageUploadField({
  label,
  name,
  value,
  onChange,
  onPendingUpload,
  imageType,
  error,
  required = false,
}: ImageUploadFieldProps) {
  const t = useTranslations('ImageCropModal');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [isNewImage, setIsNewImage] = useState(false); // Yeni seçilmiş görsel mi?
  const [isDragging, setIsDragging] = useState(false);

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Store selected file in ref to avoid closure issues with async crop completion
  const selectedFileRef = useRef<File | null>(null);
  const alignmentSourceRef = useRef<string | null>(null);

  // Get aspect ratio string for CSS
  const aspectRatio = getAspectRatioString(imageType);

  // Handle file selection - validate and open crop modal
  const handleSelectedFile = (file: File, alignmentSource: string | null = null) => {
    // Validate file using the validation utility
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Dosya doğrulanamadı');
      return;
    }

    setUploadError('');

    // Store the file in both state and ref
    // Ref is used in handleCropComplete to avoid stale closure issues
    selectedFileRef.current = file;
    alignmentSourceRef.current = alignmentSource;
    setSelectedFile(file);
    setShowCropModal(true);
  };

  // Backdrops preserve the source; other image types return a cropped file.
  const handleCropComplete = (processedBase64: string) => {
    // Use ref to get the file (avoids stale closure issues)
    const file = selectedFileRef.current;
    if (
      imageType === 'backdrop' &&
      alignmentSourceRef.current &&
      !alignmentSourceRef.current.startsWith('data:')
    ) {
      onChange(withImageFocus(alignmentSourceRef.current, getImageFocus(processedBase64)));
      onPendingUpload?.(null);
      setIsNewImage(false);
      handleCropModalClose();
      return;
    }
    console.log(`📸 [ImageUpload] Prepared ${file?.name} (${imageType}) - will upload on save`);

    // Base64'ü value olarak set et (preview için)
    onChange(processedBase64);
    setIsNewImage(true);

    // Pending upload bilgisini parent'a ilet
    if (onPendingUpload && file) {
      console.log(`📤 [ImageUpload] Calling onPendingUpload for ${imageType}`);
      onPendingUpload({
        base64: processedBase64,
        fileName: file.name,
        imageType: imageType,
      });
    } else {
      console.warn(
        `⚠️ [ImageUpload] onPendingUpload not called: onPendingUpload=${!!onPendingUpload}, file=${!!file}`
      );
    }

    // Clean up
    selectedFileRef.current = null;
    alignmentSourceRef.current = null;
    setSelectedFile(null);
    setShowCropModal(false);
  };

  // Handle crop modal close without completing
  const handleCropModalClose = () => {
    selectedFileRef.current = null;
    alignmentSourceRef.current = null;
    setSelectedFile(null);
    setShowCropModal(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleSelectedFile(file);
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
    handleSelectedFile(file);
  };

  // Handle click on image area to open file picker
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Remove uploaded image
  const handleRemove = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    setUploadError('');
    setIsNewImage(false);
    selectedFileRef.current = null;
    alignmentSourceRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Clear pending upload
    if (onPendingUpload) {
      onPendingUpload(null);
    }
  };

  // Handle alignment of existing image
  const handleAlignClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanUrl) return;

    const toastId = toast.loading('Görsel hazırlanıyor...');
    try {
      const source = cleanUrl.startsWith('data:')
        ? cleanUrl
        : `/api/proxy-image?url=${encodeURIComponent(cleanUrl)}`;
      const response = await fetch(source);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const file = new File([blob], 'align_image.jpg', { type: blob.type });
      toast.dismiss(toastId);
      handleSelectedFile(file, imageType === 'backdrop' ? value : null);
    } catch (error) {
      console.error('Failed to fetch image for alignment:', error);
      toast.dismiss(toastId);
      toast.error('Görsel hizalama için yüklenemedi. (CORS veya ağ hatası)');
    }
  };

  // Base64 mi yoksa URL mi kontrol et
  const isBase64 = value?.startsWith('data:');
  const cleanUrl = value ? getImageSource(value) : '';
  const displayUrl = cleanUrl;
  const isFilled = !!cleanUrl;

  const objectPosition = getImageObjectPosition(value || '');

  return (
    <div className="space-y-2">
      <label
        className={`block text-sm transition-colors ${
          isFilled
            ? 'font-semibold text-gray-900 dark:text-white'
            : 'font-medium text-gray-400 dark:text-gray-500'
        }`}
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload area */}
      <div className="space-y-3">
        {/* Image preview or upload area */}
        {displayUrl ? (
          <div
            className="relative group"
            style={{
              aspectRatio,
              maxWidth: imageType === 'poster' ? '100%' : '100%',
              width: '100%',
            }}
          >
            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
              <Image
                src={displayUrl}
                alt="Preview"
                fill
                className="object-cover"
                style={{ objectPosition }}
                sizes="(max-width: 768px) 100vw, 400px"
                unoptimized={isBase64}
              />
            </div>

            {/* Hover overlay actions (ScreenshotUpload ile aynı dil) */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Değiştir
              </button>
              <button
                type="button"
                onClick={handleAlignClick}
                className="px-3 py-2 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Crop className="w-4 h-4" />
                {imageType === 'backdrop' ? t('updateAlignment') : 'Hizala'}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Kaldır
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
              ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
            `}
            style={{
              padding: '1.25rem',
              aspectRatio,
              maxWidth: imageType === 'poster' ? '100%' : '100%',
              width: '100%',
              minHeight: '150px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="text-center">
              <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Sürükleyip bırakın veya tıklayarak seçin
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                JPG, PNG, WebP • Max 10MB
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {(error || uploadError) && (
          <p className="text-sm text-red-600 dark:text-red-400">{error || uploadError}</p>
        )}

        {/* Existing image info */}
        {value && !isNewImage && !isBase64 && (
          <p className="text-sm text-green-600 dark:text-green-400">✅ Mevcut görsel</p>
        )}
      </div>

      {/* Crop Modal */}
      {selectedFile && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropModalClose}
          imageFile={selectedFile}
          imageType={imageType}
          onCropComplete={handleCropComplete}
          initialFocus={getImageFocus(alignmentSourceRef.current || '')}
        />
      )}
    </div>
  );
}
