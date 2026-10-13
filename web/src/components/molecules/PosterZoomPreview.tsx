'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

const PREVIEW_MAX_WIDTH = 600;
const VIEWPORT_PADDING = 8;
const PREVIEW_GAP = 20;
const PREVIEW_CAPTION_HEIGHT = 48;

interface PosterZoomPreviewProps {
  src?: string | null;
  alt: string;
  children: React.ReactNode;
  enabled?: boolean;
  /** Delay in ms before showing zoom preview */
  delay?: number;
}

/**
 * Molecule: PosterZoomPreview
 * Wraps a poster card and shows an enlarged preview after hover delay.
 * Uses portal to render above everything.
 */
export default function PosterZoomPreview({
  src,
  alt,
  children,
  enabled = true,
  delay = 1000,
}: PosterZoomPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    if (!enabled || !src) return;

    timerRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const widthLimit = Math.max(0, window.innerWidth - VIEWPORT_PADDING * 2);
        const heightLimit = Math.max(
          0,
          ((window.innerHeight - PREVIEW_CAPTION_HEIGHT - VIEWPORT_PADDING * 2) * 2) / 3
        );
        const previewWidth = Math.min(PREVIEW_MAX_WIDTH, widthLimit, heightLimit);
        const previewHeight = (previewWidth * 3) / 2 + PREVIEW_CAPTION_HEIGHT;
        const previewLeft = rect.left + rect.width / 2 - previewWidth / 2;

        const clampedLeft = Math.max(
          VIEWPORT_PADDING,
          Math.min(previewLeft, window.innerWidth - previewWidth - VIEWPORT_PADDING)
        );
        const maxTop = Math.max(
          VIEWPORT_PADDING,
          window.innerHeight - previewHeight - VIEWPORT_PADDING
        );
        const clampedTop = Math.min(Math.max(VIEWPORT_PADDING, rect.top - PREVIEW_GAP), maxTop);

        setPosition({
          top: clampedTop,
          left: clampedLeft,
          width: previewWidth,
        });
        setShowPreview(true);
        console.log('🔍 [PosterZoom] Showing preview for:', alt);
      }
    }, delay);
  }, [enabled, src, alt, delay]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowPreview(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      {children}

      {showPreview &&
        src &&
        createPortal(
          <div
            className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            onMouseEnter={handleMouseLeave}
          >
            <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/60 border border-white/20 bg-black">
              <div className="relative w-full aspect-[2/3]">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes={`${Math.ceil(position.width)}px`}
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="px-3 py-2 bg-black/90">
                <p className="text-white text-sm font-medium truncate">{alt}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
