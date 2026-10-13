'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { buildPageTitle, getRouteTitle } from '@/lib/page-title';
import { pageTitleState } from '@/hooks/usePageTitle';

export default function PageTitleSync() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (lastPathname.current !== pathname) {
      pageTitleState.isSpecificTitleSet = false;
      lastPathname.current = pathname;
    }

    if (pageTitleState.isSpecificTitleSet) {
      return;
    }

    if (document.title.endsWith(' | Blackbox')) {
      return;
    }

    const nextTitle = buildPageTitle(getRouteTitle(pathname || '/', searchParams));

    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }, [pathname, searchParams]);

  return null;
}
