'use client';

import { useEffect } from 'react';
import { buildPageTitle } from '@/lib/page-title';

export const pageTitleState = {
  isSpecificTitleSet: false,
};

export function usePageTitle(title?: string | null) {
  useEffect(() => {
    const nextTitle = title?.trim();

    if (!nextTitle) {
      return;
    }

    const normalizedTitle = buildPageTitle(nextTitle);

    pageTitleState.isSpecificTitleSet = true;

    if (document.title !== normalizedTitle) {
      document.title = normalizedTitle;
      console.debug('🪪 [usePageTitle] Page title updated:', normalizedTitle);
    }
  }, [title]);
}
