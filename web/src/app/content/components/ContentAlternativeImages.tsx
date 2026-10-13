'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentImage } from '@/types/unified-content';

interface ContentAlternativeImagesProps {
  images: ContentImage[];
  currentPoster?: string | null;
  currentBackdrop?: string | null;
}

function lockPageScroll(): () => void {
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = previousOverflow;
  };
}

export default function ContentAlternativeImages({
  images,
  currentPoster,
  currentBackdrop,
}: ContentAlternativeImagesProps) {
  const t = useTranslations('ContentAlternativeImages');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<'poster' | 'backdrop'>('poster');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const availableImages = images ?? [];
  const alternativeImages = availableImages
    .filter((img) => {
      if (img.type === 'poster' && img.filePath === currentPoster) return false;
      if (img.type === 'backdrop' && img.filePath === currentBackdrop) return false;
      return img.type === 'poster' || img.type === 'backdrop';
    })
    .filter((img, index, self) => index === self.findIndex((t) => t.filePath === img.filePath));

  const posterImages = alternativeImages.filter((img) => img.type === 'poster');
  const backdropImages = alternativeImages.filter((img) => img.type === 'backdrop');

  const activeTab =
    selectedTab === 'poster' && posterImages.length === 0 && backdropImages.length > 0
      ? 'backdrop'
      : selectedTab === 'backdrop' && backdropImages.length === 0 && posterImages.length > 0
        ? 'poster'
        : selectedTab;
  const currentImages = activeTab === 'poster' ? posterImages : backdropImages;
  const selectedImage = selectedIndex === null ? null : currentImages[selectedIndex] || null;
  const selectedImageIndex = selectedImage ? currentImages.indexOf(selectedImage) : -1;

  const openLightbox = (index: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setSelectedIndex(index);
  };
  const closeLightbox = () => {
    setSelectedIndex(null);
    window.requestAnimationFrame(() => openerRef.current?.focus());
  };

  const goNextCb = useCallback(() => {
    setSelectedIndex((prev) =>
      prev === null || currentImages.length === 0 ? null : (prev + 1) % currentImages.length
    );
  }, [currentImages.length]);

  const goPrevCb = useCallback(() => {
    setSelectedIndex((prev) =>
      prev === null || currentImages.length === 0
        ? null
        : (prev - 1 + currentImages.length) % currentImages.length
    );
  }, [currentImages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (selectedImage === null) return;

      if (e.key === 'Tab') {
        const focusableElements =
          dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])');
        if (!focusableElements?.length) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeLightbox();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goNextCb();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrevCb();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    let restorePageScroll: (() => void) | undefined;

    if (selectedImage !== null) {
      restorePageScroll = lockPageScroll();
      closeButtonRef.current?.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      restorePageScroll?.();
    };
  }, [selectedImage, goNextCb, goPrevCb]);

  if (alternativeImages.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({alternativeImages.length})
          </span>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          <button
            type="button"
            onClick={() => setSelectedTab('poster')}
            disabled={posterImages.length === 0}
            aria-pressed={activeTab === 'poster'}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'poster'
                ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {t('posters', { count: posterImages.length })}
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('backdrop')}
            disabled={backdropImages.length === 0}
            aria-pressed={activeTab === 'backdrop'}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'backdrop'
                ? 'bg-white dark:bg-gray-700 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {t('backdrops', { count: backdropImages.length })}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {currentImages.map((image, index) => (
          <button
            type="button"
            key={image.id || index}
            className={`relative w-full overflow-hidden border-0 bg-transparent p-0 text-left group ${
              image.type === 'poster' ? 'aspect-[2/3]' : 'aspect-[21/9]'
            }`}
            aria-label={t('imageAlt', { type: t(image.type), index: index + 1 })}
            onClick={(event) => openLightbox(index, event.currentTarget)}
          >
            <Image
              src={image.filePath}
              alt=""
              fill
              className="object-cover transition-all group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
            />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
              {t(image.type)}
            </span>
            {image.language && (
              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded uppercase">
                {image.language}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          role="dialog"
          ref={dialogRef}
          aria-modal="true"
          aria-label={t('imageAlt', {
            type: t(selectedImage.type),
            index: selectedImageIndex + 1,
          })}
          aria-describedby="alternative-image-keyboard-hint"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <button
            type="button"
            ref={closeButtonRef}
            onClick={(event) => {
              event.stopPropagation();
              closeLightbox();
            }}
            aria-label={t('close')}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X size={32} />
          </button>

          {currentImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrevCb();
                }}
                aria-label={t('previous')}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
              >
                <ChevronLeft size={48} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNextCb();
                }}
                aria-label={t('next')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
              >
                <ChevronRight size={48} />
              </button>
            </>
          )}

          <div className="relative flex-1 flex w-full items-center justify-center pointer-events-none min-h-0">
            <Image
              src={selectedImage.filePath}
              alt={t('imageAlt', {
                type: t(selectedImage.type),
                index: selectedImageIndex + 1,
              })}
              fill
              sizes="100vw"
              className="max-w-[90vw] max-h-[85vh] object-contain pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm flex items-center gap-2">
            <span>
              {selectedImageIndex + 1} / {currentImages.length}
            </span>
            <span id="alternative-image-keyboard-hint" className="sr-only sm:not-sr-only">
              {t('keyboardHint')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
