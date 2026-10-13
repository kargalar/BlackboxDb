'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import {
  X,
  Check,
  RotateCcw,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Maximize2,
} from 'lucide-react';
import { cropImage, loadImageFromFile, readFileAsDataUrl, CropArea } from '@/lib/image-crop-utils';
import { ImageType, getAspectRatio } from '@/lib/image-crop-config';
import {
  DEFAULT_IMAGE_FOCUS,
  getFocusFromCrop,
  withImageFocus,
  type ImageFocus,
} from '@/lib/image-focus';
import { useTranslations } from 'next-intl';

/**
 * Props for ImageCropModal component
 */
export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** X butonuna basıldığında tüm bekleyen yüklemeleri iptal et */
  onCancelAll?: () => void;
  imageFile: File;
  imageType: ImageType;
  /** Backdrops return the unchanged file with focus metadata; other types return a crop. */
  onCropComplete: (processedImageBase64: string) => void;
  initialFocus?: ImageFocus;
  /** Toplam bekleyen dosya sayısı (otomatik ekle butonu için) */
  pendingCount?: number;
  /** Şu anki dosya indexi */
  currentFileIndex?: number;
  /** Tüm kalan dosyaları otomatik ekle callback */
  onAutoAddAll?: () => void;
}

/**
 * ImageCropModal Component
 *
 * Displays a modal for cropping images with locked aspect ratio based on image type.
 *
 * Requirements:
 * - 1.1: Display image with draggable and resizable crop overlay
 * - 1.2: Lock crop overlay to required aspect ratio for image type
 * - 1.3: Update crop data in real-time
 * - 1.4: Maintain locked aspect ratio when resizing
 * - 1.5: Store crop data for upload processing
 * - 5.1: Show full image with semi-transparent overlay outside crop area
 * - 5.2: Provide visual handles at corners and edges for resizing
 * - 5.3: Change cursor to indicate drag capability
 * - 5.4: Display preview of cropped result
 * - 5.5: Support both mouse and touch interactions
 */
export function ImageCropModal({
  isOpen,
  onClose,
  onCancelAll,
  imageFile,
  imageType,
  onCropComplete,
  pendingCount,
  currentFileIndex,
  onAutoAddAll,
  initialFocus = DEFAULT_IMAGE_FOCUS,
}: ImageCropModalProps) {
  const t = useTranslations('ImageCropModal');
  const isBackdrop = imageType === 'backdrop';
  const titleId = useId();
  const cropperRef = useRef<ReactCropperElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // Get aspect ratio for the image type
  const aspectRatio = getAspectRatio(imageType);

  // Initialize image URL when modal opens
  useEffect(() => {
    if (imageFile && isOpen) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      setError('');
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile, isOpen]);

  // Handle mounting for Portals (Next.js specific)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle crop confirmation
  const handleCropConfirm = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) {
      setError('Kırpma aracı yüklenemedi');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Get crop data from cropper
      const cropData = cropper.getData(true); // true = rounded values

      // Create crop area from cropper data
      const cropArea: CropArea = {
        x: Math.round(cropData.x),
        y: Math.round(cropData.y),
        width: Math.round(cropData.width),
        height: Math.round(cropData.height),
      };

      if (isBackdrop) {
        const image = cropper.getImageData();
        const focus = getFocusFromCrop(cropArea, image.naturalWidth, image.naturalHeight);
        onCropComplete(withImageFocus(await readFileAsDataUrl(imageFile), focus));
        onClose();
        return;
      }

      // Load the original image for cropping at full resolution
      const img = await loadImageFromFile(imageFile);

      // Crop the image at original resolution
      const croppedBase64 = await cropImage({
        imageElement: img,
        cropArea,
        outputFormat:
          imageType === 'screenshot' ? 'image/jpeg' : (imageFile.type as any) || 'image/jpeg',
        quality: imageType === 'screenshot' ? 0.9 : 1.0,
      });

      onCropComplete(croppedBase64);
      onClose();
    } catch (err) {
      console.error('Crop error:', err);
      setError(err instanceof Error ? err.message : 'Kırpma işlemi başarısız oldu');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset crop to default
  const handleReset = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      cropper.reset();
      if (isBackdrop) handleCropperReady();
    }
  };

  // Au crop box horizontally (center)
  const handleAlignHorizontal = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvasData = cropper.getCanvasData();
    const cropBoxData = cropper.getCropBoxData();

    // Calculate center position horizontally
    const newLeft = canvasData.left + (canvasData.width - cropBoxData.width) / 2;

    cropper.setCropBoxData({
      ...cropBoxData,
      left: newLeft,
    });
  };

  // Au crop box vertically (center)
  const handleAlignVertical = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvasData = cropper.getCanvasData();
    const cropBoxData = cropper.getCropBoxData();

    // Calculate center position vertically
    const newTop = canvasData.top + (canvasData.height - cropBoxData.height) / 2;

    cropper.setCropBoxData({
      ...cropBoxData,
      top: newTop,
    });
  };

  // Maximize crop area while maintaining aspect ratio
  const handleMaximize = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvasData = cropper.getCanvasData();
    const imageData = cropper.getImageData();

    // Calculate the maximum crop box size that fits within the image
    // while maintaining the aspect ratio
    const imageWidth = imageData.naturalWidth;
    const imageHeight = imageData.naturalHeight;

    let newWidth: number;
    let newHeight: number;

    // Calculate based on aspect ratio
    if (isNaN(aspectRatio)) {
      // Free aspect ratio - maximize to full image
      newWidth = imageWidth;
      newHeight = imageHeight;
    } else if (imageWidth / imageHeight > aspectRatio) {
      // Image is wider than aspect ratio - height is the limiting factor
      newHeight = imageHeight;
      newWidth = newHeight * aspectRatio;
    } else {
      // Image is taller than aspect ratio - width is the limiting factor
      newWidth = imageWidth;
      newHeight = newWidth / aspectRatio;
    }

    // Convert to canvas coordinates (scaled)
    const scale = canvasData.width / imageData.naturalWidth;
    const scaledWidth = newWidth * scale;
    const scaledHeight = newHeight * scale;

    // Center the crop box
    const newLeft = canvasData.left + (canvasData.width - scaledWidth) / 2;
    const newTop = canvasData.top + (canvasData.height - scaledHeight) / 2;

    cropper.setCropBoxData({
      left: newLeft,
      top: newTop,
      width: scaledWidth,
      height: scaledHeight,
    });
  };

  // Au and center crop area when cropper is ready
  const handleCropperReady = () => {
    handleMaximize();
    const cropper = cropperRef.current?.cropper;
    if (isBackdrop && cropper) {
      const image = cropper.getImageData();
      const crop = cropper.getData(true);
      cropper.setData({
        x: (Math.max(0, image.naturalWidth - crop.width) * initialFocus.x) / 100,
        y: (Math.max(0, image.naturalHeight - crop.height) * initialFocus.y) / 100,
      });
    }
  };

  // Get aspect ratio label for display
  const getAspectRatioLabel = (): string => {
    switch (imageType) {
      case 'poster':
      case 'person':
      case 'expansion':
      case 'seasonPoster':
        return '2:3';
      case 'episodeStill':
        return '16:9';
      case 'backdrop':
        return '21:9';
      case 'screenshot':
        return 'Serbest';
      case 'profile':
        return '1:1';
      default:
        return '';
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-[95vw] w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              {isBackdrop ? t('backdropTitle') : 'Görseli Kırp'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              En-boy oranı: {getAspectRatioLabel()}
              {isNaN(aspectRatio) ? '' : ' (kilitli)'}
            </p>
            {isBackdrop && <p className="mt-1 text-sm text-neutral-400">{t('backdropHint')}</p>}
            {pendingCount && pendingCount > 1 && (
              <p className="text-xs text-blue-500 dark:text-blue-400">
                Görsel {(currentFileIndex || 0) + 1} / {pendingCount}
              </p>
            )}
          </div>
          <button
            onClick={onCancelAll ?? onClose}
            disabled={isProcessing}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors disabled:opacity-50"
            aria-label="Tüm yüklemeleri iptal et"
            title="Tüm yüklemeleri iptal et"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="flex-1 overflow-hidden p-4 min-h-0">
          <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
            {imageUrl ? (
              <Cropper
                ref={cropperRef}
                src={imageUrl}
                style={{ height: '100%', width: '100%', maxHeight: '80vh' }}
                aspectRatio={aspectRatio}
                viewMode={1}
                guides={true}
                center={true}
                highlight={true}
                background={true}
                autoCropArea={1}
                responsive={true}
                restore={true}
                checkOrientation={!isBackdrop}
                modal={true}
                dragMode={isBackdrop ? 'none' : 'move'}
                movable={!isBackdrop}
                zoomable={!isBackdrop}
                zoomOnTouch={!isBackdrop}
                zoomOnWheel={!isBackdrop}
                cropBoxMovable={true}
                cropBoxResizable={!isBackdrop}
                toggleDragModeOnDblclick={false}
                ready={handleCropperReady}
              />
            ) : (
              <div className="text-gray-500 dark:text-gray-400">Görsel yükleniyor...</div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Sıfırla</span>
            </button>

            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            <button
              type="button"
              onClick={handleAlignHorizontal}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Yatay Ortala"
            >
              <AlignHorizontalJustifyCenter className="w-4 h-4" />
              <span className="hidden sm:inline">Yatay</span>
            </button>

            <button
              type="button"
              onClick={handleAlignVertical}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Dikey Ortala"
            >
              <AlignVerticalJustifyCenter className="w-4 h-4" />
              <span className="hidden sm:inline">Dikey</span>
            </button>

            <button
              type="button"
              onClick={handleMaximize}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="En Geniş Alan"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Max</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Hepsini Otomatik Ekle butonu - birden fazla dosya varsa göster */}
            {pendingCount && pendingCount > 1 && onAutoAddAll && (
              <button
                type="button"
                onClick={onAutoAddAll}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Hepsini Otomatik Ekle ({pendingCount - (currentFileIndex || 0)} kalan)
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={handleCropConfirm}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  İşleniyor...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isBackdrop ? t('saveAlignment') : 'Onayla'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default ImageCropModal;
