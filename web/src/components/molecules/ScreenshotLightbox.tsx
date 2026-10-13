'use client';

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, AlertTriangle, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { Screenshot } from './ScreenshotUpload';

const DIFFICULTY_LABELS = ['Çok Kolay', 'Kolay', 'Orta', 'Zor', 'Çok Zor'];
const DIFFICULTY_COLORS = [
  'bg-green-500',
  'bg-lime-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-red-500',
];

interface ScreenshotLightboxProps {
  screenshots: Screenshot[];
  selectedIndex: number;
  onClose: () => void;
  onSpoilerToggle: (index: number) => void;
  onSensitiveToggle: (index: number) => void;
  onQuizToggle: (index: number) => void;
  onDifficultyChange: (index: number, difficulty: number, currentEnabledStatus?: boolean) => void;
  onNavigate: (index: number) => void;
  onDelete?: (index: number) => void;
}

/**
 * Admin screenshot lightbox - full-screen image viewer with
 * prev/next navigation, spoiler toggle, quiz toggle, and difficulty selector.
 */
export default function ScreenshotLightbox({
  screenshots,
  selectedIndex,
  onClose,
  onSpoilerToggle,
  onSensitiveToggle,
  onQuizToggle,
  onDifficultyChange,
  onNavigate,
  onDelete,
}: ScreenshotLightboxProps) {
  const goPrev = useCallback(() => {
    const prev = (selectedIndex - 1 + screenshots.length) % screenshots.length;
    onNavigate(prev);
  }, [selectedIndex, screenshots.length, onNavigate]);

  const goNext = useCallback(() => {
    const next = (selectedIndex + 1) % screenshots.length;
    onNavigate(next);
  }, [selectedIndex, screenshots.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input filan açıksa engelle
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();

      const currentScreenshot = screenshots[selectedIndex];
      if (!currentScreenshot) return;

      // Zorluk atama (1-5)
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const level = parseInt(e.key, 10);
        if (currentScreenshot.isEnabledForQuiz && currentScreenshot.difficulty === level) {
          // Aynı zorluğa tekrar basılırsa testi kapat
          onQuizToggle(selectedIndex);
        } else {
          if (!currentScreenshot.isEnabledForQuiz) {
            onQuizToggle(selectedIndex);
          }
          onDifficultyChange(selectedIndex, level, currentScreenshot.isEnabledForQuiz);
        }
      }

      // Spoiler işaretleme (Q/q)
      if (e.key.toLowerCase() === 'q') {
        onSpoilerToggle(selectedIndex);
      }

      // Hassas (+18) işaretleme (E/e)
      if (e.key.toLowerCase() === 'e') {
        onSensitiveToggle(selectedIndex);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onClose,
    goPrev,
    goNext,
    screenshots,
    selectedIndex,
    onDifficultyChange,
    onQuizToggle,
    onSpoilerToggle,
    onSensitiveToggle,
  ]);

  if (typeof document === 'undefined') return null;

  const screenshot = screenshots[selectedIndex];
  if (!screenshot) return null;

  const content = (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Top bar: close + counter */}
      <div
        className="flex items-center justify-between p-4 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-white/70 text-sm font-medium">
          {selectedIndex + 1} / {screenshots.length}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white transition-colors"
          aria-label="Kapat"
        >
          <X size={28} />
        </button>
      </div>

      {/* Image area + navigation */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-16">
        {/* Prev button */}
        {screenshots.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 p-2 text-white/60 hover:text-white transition-colors z-10"
            aria-label="Önceki"
          >
            <ChevronLeft size={44} />
          </button>
        )}

        {/* Image */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={screenshot.imageUrl}
            alt={`Screenshot ${selectedIndex + 1}`}
            className="max-w-full max-h-full object-contain pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Spoiler badge - sağ üstte */}
          {screenshot.isSpoiler && (
            <div
              className="absolute top-4 right-4 bg-orange-500/90 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 z-10 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <AlertTriangle className="w-4 h-4" />
              Spoiler
            </div>
          )}

          {/* Sensitive badge - sol üstte */}
          {screenshot.isSensitive && (
            <div
              className="absolute top-4 left-4 bg-red-600/90 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 z-10 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <EyeOff className="w-4 h-4" />
              Hassas
            </div>
          )}

          {/* Quiz badge - sağ üstte (spoiler badge altında) */}
          {screenshot.isEnabledForQuiz && (
            <div
              className={`absolute right-4 bg-green-500/90 text-white text-sm px-3 py-1 rounded-full flex items-center gap-2 z-10 pointer-events-auto ${screenshot.isSpoiler ? 'top-14' : 'top-4'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="w-4 h-4" />
              Test: {DIFFICULTY_LABELS[screenshot.difficulty - 1]}
            </div>
          )}
        </div>

        {/* Next button */}
        {screenshots.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-2 p-2 text-white/60 hover:text-white transition-colors z-10"
            aria-label="Sonraki"
          >
            <ChevronRight size={44} />
          </button>
        )}
      </div>

      {/* Bottom controls panel */}
      <div className="bg-black/90 p-6 pt-10 z-20" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-center justify-center gap-4 max-w-2xl mx-auto">
          {/* Spoiler Toggle */}
          <button
            type="button"
            onClick={() => onSpoilerToggle(selectedIndex)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              screenshot.isSpoiler
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            {screenshot.isSpoiler ? 'Spoiler ✓' : 'Spoiler'}
          </button>

          {/* Sensitive Toggle */}
          <button
            type="button"
            onClick={() => onSensitiveToggle(selectedIndex)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              screenshot.isSensitive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            <EyeOff className="w-4 h-4" />
            {screenshot.isSensitive ? 'Hassas ✓' : 'Hassas'}
          </button>

          {/* Quiz Toggle */}
          <button
            type="button"
            onClick={() => onQuizToggle(selectedIndex)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              screenshot.isEnabledForQuiz
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            {screenshot.isEnabledForQuiz ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            {screenshot.isEnabledForQuiz ? 'Testte ✓' : 'Teste Ekle'}
          </button>

          {/* Delete Button */}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(selectedIndex)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              <Trash2 className="w-4 h-4" />
              Sil
            </button>
          )}

          {/* Difficulty Selector - only when quiz enabled */}
          {screenshot.isEnabledForQuiz && (
            <div className="flex items-center gap-2">
              <span className="text-white/60 text-sm mr-1">Seviye:</span>
              {[1, 2, 3, 4, 5].map((level) => {
                const isActive = screenshot.difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        onQuizToggle(selectedIndex);
                      } else {
                        onDifficultyChange(selectedIndex, level, screenshot.isEnabledForQuiz);
                      }
                    }}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                      ${
                        isActive
                          ? `${DIFFICULTY_COLORS[level - 1]} text-white`
                          : 'bg-white/10 text-white/70 hover:bg-white/20 cursor-pointer'
                      }
                    `}
                    title={DIFFICULTY_LABELS[level - 1]}
                  >
                    {DIFFICULTY_LABELS[level - 1]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
