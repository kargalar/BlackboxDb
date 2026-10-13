'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, Upload, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateImageFile } from '@/lib/image-validation';
import ImageCropModal from './ImageCropModal';
import ScreenshotLightbox from './ScreenshotLightbox';

// Screenshot tipi - base64 ve fileName eklendi
export interface Screenshot {
  id?: number;
  imageUrl: string; // Mevcut URL veya base64 preview (can be blob object URL)
  base64?: string; // Yeni eklenmiş dosyalar için
  file?: File; // <--- OOM hatasını önlemek için eklendi (base64 yerine saklanacak)
  fileName?: string; // Yeni eklenmiş dosyalar için
  difficulty: number;
  order: number;
  description?: string;
  isEnabledForQuiz: boolean;
  seasonNumber?: number | null;
  isSpoiler: boolean; // Spoiler içerik mi
  isSensitive: boolean; // Hassas/+18 içerik mi
  isNew?: boolean; // Yeni yüklenen mi (henüz upload edilmemiş)
  upvoteCount?: number;
  downvoteCount?: number;
}

interface ScreenshotUploadProps {
  screenshots: Screenshot[];
  onScreenshotsChange: (screenshots: Screenshot[]) => void;
  disabled?: boolean;
  title?: string;
  groupKey?: string;
  onMoveScreenshotHere?: (screenshot: Screenshot, targetIndex?: number) => void;
}

const DIFFICULTY_LABELS = ['Çok Kolay', 'Kolay', 'Orta', 'Zor', 'Çok Zor'];
const SHORT_DIFFICULTY_LABELS = ['ÇK', 'Kolay', 'Orta', 'Zor', 'ÇZ'];
const DIFFICULTY_COLORS = [
  'bg-green-500',
  'bg-lime-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-red-500',
];

function revokeObjectUrl(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}

export default function ScreenshotUpload({
  screenshots = [],
  onScreenshotsChange,
  disabled = false,
  title = 'Ekran Görüntüleri',
  groupKey = 'default',
  onMoveScreenshotHere,
}: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [currentCropIndex, setCurrentCropIndex] = useState(0);

  // Lightbox & Hover state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hasScreenshots = screenshots.length > 0;
  const hasNewScreenshots = screenshots.some((s) => s.isNew);

  const getDragPayload = (
    e: React.DragEvent
  ): { screenshot: Screenshot; groupKey: string } | null => {
    const raw = e.dataTransfer.getData('application/x-blackbox-screenshot');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const handleExternalScreenshotDrop = (e: React.DragEvent, targetIndex?: number) => {
    if (e.dataTransfer.types.includes('Files')) return false;

    const payload = getDragPayload(e);
    if (!payload || payload.groupKey === groupKey || !onMoveScreenshotHere) return false;

    e.preventDefault();
    e.stopPropagation();
    onMoveScreenshotHere(payload.screenshot, targetIndex);
    setDraggedIndex(null);
    setDragOverIndex(null);
    return true;
  };

  // Handle crop completion for a single file
  const handleCropComplete = useCallback(
    (croppedBase64: string) => {
      const currentFile = pendingFiles[currentCropIndex];

      console.log(`📸 [ScreenshotUpload] Cropped ${currentFile?.name} - will upload on save`);

      // Add the cropped screenshot
      const newScreenshot: Screenshot = {
        imageUrl: croppedBase64,
        base64: croppedBase64,
        fileName: currentFile?.name,
        difficulty: 3,
        order: screenshots.length + 1,
        isEnabledForQuiz: false,
        isSpoiler: false,
        isSensitive: false,
        isNew: true,
      };

      // Keep screenshots updated. The modal will call onClose() immediately after this,
      // which handles advancing to the next image (handleCropModalClose).
      onScreenshotsChange([...screenshots, newScreenshot]);
    },
    [pendingFiles, currentCropIndex, screenshots, onScreenshotsChange]
  );

  // Handle crop modal close
  const handleCropModalClose = useCallback(() => {
    // Skip current file and move to next, or close if last
    if (currentCropIndex >= pendingFiles.length - 1) {
      setShowCropModal(false);
      setPendingFiles([]);
      setCurrentCropIndex(0);
    } else {
      setCurrentCropIndex((prev) => prev + 1);
    }
  }, [currentCropIndex, pendingFiles.length]);

  // Yeni ekran görüntüsü ekle - validate and open crop modal
  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      console.log(`[ScreenshotUpload] Processing ${files.length} files`);

      const validFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate using the validation utility
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        // Check for duplicates by comparing file size and name
        const isDuplicate = screenshots.some((screenshot) => {
          // Compare with fileName if available (for newly added files)
          if (screenshot.fileName && screenshot.fileName === file.name) {
            return true;
          }
          // Also check base64 length as a quick heuristic
          if (screenshot.base64) {
            // If sizes match, it's likely a duplicate
            // Base64 size is approximately fileSize * 1.37
            const estimatedBase64Size = file.size * 1.37;
            const actualBase64Size = screenshot.base64.length;
            // Allow 5% tolerance for encoding differences
            if (Math.abs(estimatedBase64Size - actualBase64Size) < estimatedBase64Size * 0.05) {
              return true;
            }
          }
          return false;
        });

        if (isDuplicate) {
          toast.error(`${file.name}: Bu görsel zaten eklenmiş`);
          console.log(`[ScreenshotUpload] Duplicate detected: ${file.name}`);
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        // Tarihe göre sırala - eskiden yeniye (lastModified ascending)
        validFiles.sort((a, b) => a.lastModified - b.lastModified);
        console.log(`[ScreenshotUpload] Sorted ${validFiles.length} files by date (oldest first)`);
        // Store valid files and open crop modal for the first one
        setPendingFiles(validFiles);
        setCurrentCropIndex(0);
        setShowCropModal(true);
      }
    },
    [screenshots]
  );

  // Ekran görüntüsünü sil
  const handleRemove = useCallback(
    (index: number) => {
      console.log(`[ScreenshotUpload] Removing screenshot at index: ${index}`);
      const removedScreenshot = screenshots[index];
      const newScreenshots = screenshots
        .filter((_, i) => i !== index)
        .map((screenshot, i) => ({ ...screenshot, order: i + 1 }));

      if (removedScreenshot) revokeObjectUrl(removedScreenshot.imageUrl);
      onScreenshotsChange(newScreenshots);
      toast.success('Ekran görüntüsü kaldırıldı');
      // Lightbox açıksa: sonraki/önceki görsele geç, yoksa kapat
      if (lightboxIndex !== null) {
        if (newScreenshots.length === 0) {
          setLightboxIndex(null);
        } else if (index >= newScreenshots.length) {
          // Silinen son eleman ise bir öncekine geç
          setLightboxIndex(newScreenshots.length - 1);
        }
        // else: aynı index'te kal (sonraki görsel otomatik gelir)
      }
    },
    [screenshots, onScreenshotsChange, lightboxIndex]
  );

  // Tümünü sil
  const handleDeleteAll = useCallback(() => {
    if (screenshots.length === 0) return;
    console.log(`[ScreenshotUpload] Deleting all ${screenshots.length} screenshots`);
    screenshots.forEach((screenshot) => revokeObjectUrl(screenshot.imageUrl));
    onScreenshotsChange([]);
    setLightboxIndex(null);
    toast.success(`${screenshots.length} ekran görüntüsü silindi`);
  }, [screenshots, onScreenshotsChange]);

  // Sadece yeni yüklenenleri sil
  const handleDeleteNewOnly = useCallback(() => {
    const newCount = screenshots.filter((s) => s.isNew).length;
    if (newCount === 0) return;
    console.log(`[ScreenshotUpload] Deleting ${newCount} new screenshots`);
    screenshots
      .filter((screenshot) => screenshot.isNew)
      .forEach((screenshot) => revokeObjectUrl(screenshot.imageUrl));
    const kept = screenshots
      .filter((screenshot) => !screenshot.isNew)
      .map((screenshot, index) => ({ ...screenshot, order: index + 1 }));
    onScreenshotsChange(kept);
    setLightboxIndex(null);
    toast.success(`${newCount} yeni ekran görüntüsü silindi`);
  }, [screenshots, onScreenshotsChange]);

  // Dosyayı base64'e çevir (otomatik ekleme için)
  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Tüm bekleyen yüklemeleri iptal et (X butonuna basılınca)
  const handleCancelAll = useCallback(() => {
    console.log('[ScreenshotUpload] Cancelled all pending uploads');
    setShowCropModal(false);
    setPendingFiles([]);
    setCurrentCropIndex(0);
  }, []);

  // Hepsini otomatik ekle - kalan dosyaları kırpmadan ekle
  const handleAutoAddAll = useCallback(async () => {
    const remaining = pendingFiles.slice(currentCropIndex);
    console.log(`[ScreenshotUpload] Au ${remaining.length} files without crop`);

    const newScreenshots: Screenshot[] = [];
    for (const file of remaining) {
      try {
        // Base64'e çevirmek yerine geçici obje URL'si kullan (Memory Crash'i önler)
        const objectUrl = URL.createObjectURL(file);
        newScreenshots.push({
          imageUrl: objectUrl,
          file: file, // Orijinal dosyayı sakla, yükleme sırasında base64'e çevrilecek
          fileName: file.name,
          difficulty: 3,
          order: screenshots.length + newScreenshots.length + 1,
          isEnabledForQuiz: false,
          isSpoiler: false,
          isSensitive: false,
          isNew: true,
        });
      } catch (err) {
        console.error(`[ScreenshotUpload] Failed to process ${file.name}:`, err);
        toast.error(`${file.name} işlenemedi`);
      }
    }

    if (newScreenshots.length > 0) {
      onScreenshotsChange([...screenshots, ...newScreenshots]);
      toast.success(`${newScreenshots.length} görsel otomatik eklendi`);
    }

    setShowCropModal(false);
    setPendingFiles([]);
    setCurrentCropIndex(0);
  }, [pendingFiles, currentCropIndex, screenshots, onScreenshotsChange]);

  // Zorluk güncelle - aynı zorluğa birden fazla görsel izin verilir
  const handleDifficultyChange = useCallback(
    (index: number, difficulty: number) => {
      console.log(`[ScreenshotUpload] Updating difficulty for index ${index}: ${difficulty}`);
      const newScreenshots = [...screenshots];
      newScreenshots[index] = { ...newScreenshots[index], difficulty, isEnabledForQuiz: true };
      onScreenshotsChange(newScreenshots);
    },
    [screenshots, onScreenshotsChange]
  );

  // Quiz durumunu güncelle - aynı zorlukta birden fazla görsel olabilir
  const handleQuizToggle = useCallback(
    (index: number) => {
      const newScreenshots = [...screenshots];
      newScreenshots[index] = {
        ...newScreenshots[index],
        isEnabledForQuiz: !newScreenshots[index].isEnabledForQuiz,
      };
      console.log(
        `[ScreenshotUpload] Toggling quiz status for index ${index}: ${newScreenshots[index].isEnabledForQuiz}`
      );
      onScreenshotsChange(newScreenshots);
    },
    [screenshots, onScreenshotsChange]
  );

  // Spoiler durumunu güncelle
  const handleSpoilerToggle = useCallback(
    (index: number) => {
      const newScreenshots = [...screenshots];
      newScreenshots[index] = {
        ...newScreenshots[index],
        isSpoiler: !newScreenshots[index].isSpoiler,
      };
      console.log(
        `[ScreenshotUpload] Toggling spoiler status for index ${index}: ${newScreenshots[index].isSpoiler}`
      );
      onScreenshotsChange(newScreenshots);
    },
    [screenshots, onScreenshotsChange]
  );

  // Hassas durumunu güncelle
  const handleSensitiveToggle = useCallback(
    (index: number) => {
      const newScreenshots = [...screenshots];
      newScreenshots[index] = {
        ...newScreenshots[index],
        isSensitive: !newScreenshots[index].isSensitive,
      };
      console.log(
        `[ScreenshotUpload] Toggling sensitive status for index ${index}: ${newScreenshots[index].isSensitive}`
      );
      onScreenshotsChange(newScreenshots);
    },
    [screenshots, onScreenshotsChange]
  );

  // File Drag & Drop (dosya yükleme için)
  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Sadece dosya sürükleniyorsa
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleFileDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (handleExternalScreenshotDrop(e)) return;
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Screenshot Reorder Drag & Drop
  const handleScreenshotDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.setData(
      'application/x-blackbox-screenshot',
      JSON.stringify({ screenshot: screenshots[index], groupKey })
    );
  };

  const handleScreenshotDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleScreenshotDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleScreenshotDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (handleExternalScreenshotDrop(e, toIndex)) return;
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      console.log(`[ScreenshotUpload] Reordering from ${draggedIndex} to ${toIndex}`);
      const newScreenshots = [...screenshots];
      const [removed] = newScreenshots.splice(draggedIndex, 1);
      newScreenshots.splice(toIndex, 0, removed);

      // Order'ları güncelle
      newScreenshots.forEach((s, i) => {
        s.order = i + 1;
      });

      onScreenshotsChange(newScreenshots);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleScreenshotDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Keyboard shortcuts for hovered screenshot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (hoveredIndex === null) return;

      const currentScreenshot = screenshots[hoveredIndex];
      if (!currentScreenshot) return;

      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        handleSpoilerToggle(hoveredIndex);
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleSensitiveToggle(hoveredIndex);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const level = parseInt(e.key, 10);

        if (currentScreenshot.isEnabledForQuiz && currentScreenshot.difficulty === level) {
          // Aynı zorluğa tekrar basılırsa testi kapat
          handleQuizToggle(hoveredIndex);
        } else {
          if (!currentScreenshot.isEnabledForQuiz) {
            handleQuizToggle(hoveredIndex);
          }
          handleDifficultyChange(hoveredIndex, level);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    hoveredIndex,
    handleSpoilerToggle,
    handleSensitiveToggle,
    handleQuizToggle,
    handleDifficultyChange,
    screenshots,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {screenshots.length} görsel | {screenshots.filter((s) => s.isEnabledForQuiz).length}{' '}
            test için aktif
          </span>
          {hasNewScreenshots && (
            <button
              type="button"
              onClick={handleDeleteNewOnly}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors disabled:opacity-50"
              title="Yeni Yüklenenleri Sil"
            >
              <Trash2 className="w-4 h-4" />
              Yenileri Sil
            </button>
          )}
          {hasScreenshots && (
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors disabled:opacity-50"
              title="Tümünü Sil"
            >
              <Trash2 className="w-4 h-4" />
              Tümünü Sil
            </button>
          )}
        </div>
      </div>

      {/* Test durumu gösterimi - sol altta hangi zorluklar kapatılıyor */}
      {screenshots.some((s) => s.isEnabledForQuiz) &&
        (() => {
          const diffCounts = [1, 2, 3, 4, 5].map((level) => ({
            level,
            count: screenshots.filter((s) => s.isEnabledForQuiz && s.difficulty === level).length,
          }));
          const missingLevels = diffCounts.filter((d) => d.count === 0);
          return (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                Test zorluklukları:
              </span>
              {diffCounts.map(({ level, count }) => (
                <span
                  key={level}
                  className={`px-2 py-0.5 rounded font-medium text-white ${
                    count > 0 ? DIFFICULTY_COLORS[level - 1] : 'bg-gray-400'
                  }`}
                >
                  {SHORT_DIFFICULTY_LABELS[level - 1]}: {count}
                </span>
              ))}
              {missingLevels.length > 0 && (
                <span className="text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Eksik seviye:{' '}
                  {missingLevels.map((d) => SHORT_DIFFICULTY_LABELS[d.level - 1]).join(', ')}
                </span>
              )}
            </div>
          );
        })()}

      {/* Upload area (sadece ilk ekleme sırasında üstte göster) */}
      {!hasScreenshots && (
        <div
          onDragOver={handleFileDragOver}
          onDragLeave={handleFileDragLeave}
          onDrop={handleFileDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={disabled}
            className="hidden"
          />

          <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            Ekran görüntülerini sürükleyip bırakın veya tıklayarak seçin
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            PNG, JPG, WebP • Max 10MB • Birden fazla dosya seçebilirsiniz
          </p>
        </div>
      )}

      {/* Screenshots grid */}
      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {screenshots.map((screenshot, index) => (
            <div
              key={screenshot.id || `${screenshot.imageUrl}-${index}`}
              draggable
              onDragStart={(e) => handleScreenshotDragStart(e, index)}
              onDragOver={(e) => handleScreenshotDragOver(e, index)}
              onDragLeave={handleScreenshotDragLeave}
              onDrop={(e) => handleScreenshotDrop(e, index)}
              onDragEnd={handleScreenshotDragEnd}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`
                relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group cursor-grab active:cursor-grabbing
                ${draggedIndex === index ? 'opacity-50' : ''}
                ${dragOverIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
              `}
            >
              {/* Görsel - tıklayınca lightbox aç */}
              <div
                className="aspect-video relative cursor-pointer"
                onClick={() => setLightboxIndex(index)}
              >
                <Image
                  src={screenshot.imageUrl}
                  alt={`Screenshot ${index + 1}`}
                  fill
                  className="object-cover pointer-events-none"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized={screenshot.imageUrl?.startsWith('data:')}
                />

                {/* Zorluk seçici overlay - her zaman üstte göster (hover'da veya quiz aktifse) */}
                <div
                  className={`absolute top-0 left-0 right-0 p-1 z-20 transition-opacity ${screenshot.isEnabledForQuiz ? 'bg-black/80 opacity-100' : 'bg-black/60 opacity-0 group-hover:opacity-100'}`}
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const isActive =
                        screenshot.isEnabledForQuiz && screenshot.difficulty === level;
                      return (
                        <button
                          type="button"
                          key={level}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (isActive) {
                              handleQuizToggle(index);
                            } else {
                              if (!screenshot.isEnabledForQuiz) {
                                handleQuizToggle(index);
                              }
                              handleDifficultyChange(index, level);
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className={`
                          flex-1 text-xs py-0.5 rounded font-semibold transition-colors cursor-pointer
                          ${
                            isActive
                              ? `${DIFFICULTY_COLORS[level - 1]} text-white`
                              : 'bg-white/15 text-white/60 hover:bg-white/35 hover:text-white'
                          }
                        `}
                          title={DIFFICULTY_LABELS[level - 1]}
                        >
                          {SHORT_DIFFICULTY_LABELS[level - 1]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Spoiler badge - sağ altta */}
                {screenshot.isSpoiler && (
                  <div className="absolute bottom-2 right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded z-10 pointer-events-none transition-opacity group-hover:opacity-0">
                    Spoiler
                  </div>
                )}

                {/* Sensitive badge - sol altta */}
                {screenshot.isSensitive && (
                  <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded z-10 flex items-center gap-1 pointer-events-none transition-opacity group-hover:opacity-0">
                    <EyeOff className="w-3 h-3" />
                    Hassas
                  </div>
                )}

                {/* Votes badge - sağ altta (spoiler badge'in altında) */}
                {(screenshot.upvoteCount !== undefined ||
                  screenshot.downvoteCount !== undefined) && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded z-10 pointer-events-none transition-opacity group-hover:opacity-0">
                    {screenshot.upvoteCount !== undefined && screenshot.upvoteCount > 0 && (
                      <span className="text-emerald-400">👍 {screenshot.upvoteCount}</span>
                    )}
                    {screenshot.downvoteCount !== undefined && screenshot.downvoteCount > 0 && (
                      <span className="text-red-400">👎 {screenshot.downvoteCount}</span>
                    )}
                  </div>
                )}

                {/* Controls overlay - hover'da göster */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-auto">
                    {/* Sol: spoiler toggle */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpoilerToggle(index);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full transition-colors text-xs font-medium ${
                          screenshot.isSpoiler
                            ? 'bg-orange-500 text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title={screenshot.isSpoiler ? 'Spoiler kaldır' : 'Spoiler olarak işaretle'}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Spoiler
                      </button>

                      {/* Hassas toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSensitiveToggle(index);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full transition-colors text-xs font-medium ${
                          screenshot.isSensitive
                            ? 'bg-red-600 text-white'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title={
                          screenshot.isSensitive
                            ? 'Hassaslık kaldır'
                            : 'Hassas İçerik olarak işaretle'
                        }
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        Hassas
                      </button>
                    </div>

                    {/* Sağ: sil */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                      title="Sil"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Upload area (liste sonunda) */}
          <div
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`
              aspect-video border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors
              ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              disabled={disabled}
              className="hidden"
            />

            <Upload className="w-8 h-8 mb-2 text-gray-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">Ekle</p>
          </div>
        </div>
      )}

      {/* Crop Modal - shows for each file in sequence */}
      {pendingFiles.length > 0 && pendingFiles[currentCropIndex] && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropModalClose}
          onCancelAll={handleCancelAll}
          imageFile={pendingFiles[currentCropIndex]}
          imageType="screenshot"
          onCropComplete={handleCropComplete}
          pendingCount={pendingFiles.length}
          currentFileIndex={currentCropIndex}
          onAutoAddAll={handleAutoAddAll}
        />
      )}

      {/* Lightbox - fotoğrafa tıklayınca büyük göster */}
      {lightboxIndex !== null && (
        <ScreenshotLightbox
          screenshots={screenshots}
          selectedIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onSpoilerToggle={handleSpoilerToggle}
          onSensitiveToggle={handleSensitiveToggle}
          onQuizToggle={handleQuizToggle}
          onDifficultyChange={handleDifficultyChange}
          onNavigate={setLightboxIndex}
          onDelete={handleRemove}
        />
      )}
    </div>
  );
}
