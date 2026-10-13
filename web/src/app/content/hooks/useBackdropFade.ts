'use client';

import { useEffect, useRef } from 'react';

const DESCRIPTION_FADE_LINES = 3;

/** Extends only the background layer, leaving the banner's layout height unchanged. */
export function useBackdropFade(enabled: boolean, contentId: string, description: string) {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!enabled || !hero) return;
    const backdrop = hero.querySelector<HTMLElement>('.content-detail-backdrop');
    const paragraph = hero.querySelector<HTMLElement>('.content-detail-description');
    if (!backdrop || !paragraph) return;

    const updateFadeEnd = () => {
      const paragraphBounds = paragraph.getBoundingClientRect();
      const lineHeight = Number.parseFloat(getComputedStyle(paragraph).lineHeight);
      if (!Number.isFinite(lineHeight)) return;
      const descriptionDepth = Math.min(
        paragraphBounds.height,
        lineHeight * DESCRIPTION_FADE_LINES
      );
      const fadeEnd = paragraphBounds.top - backdrop.getBoundingClientRect().top + descriptionDepth;
      hero.style.setProperty(
        '--backdrop-fade-end',
        `${Math.ceil(Math.max(backdrop.offsetHeight, fadeEnd))}px`
      );
    };

    const observer = new ResizeObserver(updateFadeEnd);
    for (const element of hero.querySelectorAll(
      '.content-detail-backdrop, .content-detail-main, .content-detail-title-row, .content-detail-meta-row, .content-detail-description'
    ))
      observer.observe(element);
    updateFadeEnd();

    return () => {
      observer.disconnect();
      hero.style.removeProperty('--backdrop-fade-end');
    };
  }, [enabled, contentId, description]);

  return heroRef;
}
