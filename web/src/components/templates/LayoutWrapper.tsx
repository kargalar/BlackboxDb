'use client';

import { createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Sidebar from '../organisms/Sidebar';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';

interface LayoutContextType {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType>({
  isSidebarCollapsed: false,
  setSidebarCollapsed: () => {},
});

export const useLayout = () => useContext(LayoutContext);

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useSidebarCollapsed();
  const pathname = usePathname();
  const t = useTranslations('Accessibility');

  const noPaddingPaths = ['/content', '/person', '/company', '/explore', '/profile'];
  const isPathOrChildRoute = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const hasNoPadding = noPaddingPaths.some(isPathOrChildRoute);
  const isAuthPage = isPathOrChildRoute('/auth');

  return (
    <LayoutContext.Provider value={{ isSidebarCollapsed, setSidebarCollapsed }}>
      <a className="skip-link" href="#main-content">
        {t('skipToMain')}
      </a>
      {!isAuthPage && <Sidebar />}
      <main
        id="main-content"
        tabIndex={-1}
        className={`main-with-sidebar min-h-screen overflow-x-hidden ${isAuthPage ? 'main-fullscreen' : 'pb-20 lg:pb-0'} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        <div className={hasNoPadding || isAuthPage ? '' : 'page-shell'}>{children}</div>
      </main>
    </LayoutContext.Provider>
  );
}
