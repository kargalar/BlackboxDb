'use client';

import React, { useState } from 'react';
import { X, Monitor, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export interface ScreenshotOption {
  imageUrl: string;
  id?: number;
  seasonNumber?: number | null;
}

interface ScreenshotSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  screenshots: ScreenshotOption[];
  title?: string;
}

/**
 * Dialog for selecting a screenshot to use as backdrop.
 * Shows all available screenshots in a grid and lets the user pick one.
 */
export default function ScreenshotSelectDialog({
  isOpen,
  onClose,
  onSelect,
  screenshots,
  title = 'Ekran Görüntüsünden Seç',
}: ScreenshotSelectDialogProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || screenshots.length === 0) return null;

  const handleSelect = (imageUrl: string) => {
    onSelect(imageUrl);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Monitor className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Arkaplan olarak kullanmak istediğiniz ekran görüntüsünü seçin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Screenshots Grid */}
        <div className="p-5 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {screenshots.map((screenshot, index) => (
              <button
                key={screenshot.id || `${screenshot.imageUrl}-${index}`}
                type="button"
                onClick={() => handleSelect(screenshot.imageUrl)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative group rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <div className="aspect-video relative">
                  <Image
                    src={screenshot.imageUrl}
                    alt={`Ekran görüntüsü ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    unoptimized={
                      screenshot.imageUrl?.startsWith('data:') ||
                      screenshot.imageUrl?.startsWith('blob:')
                    }
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/30 transition-colors duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white dark:bg-gray-900 rounded-full p-2 shadow-lg">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>

                  {/* Season badge */}
                  {screenshot.seasonNumber != null && (
                    <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                      S{screenshot.seasonNumber}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {screenshots.length} ekran görüntüsü mevcut • Seçilen görüntü kırpma ekranında açılacak
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
