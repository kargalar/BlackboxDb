'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';
const SIDEBAR_TOGGLE_EVENT = 'sidebar-toggle';

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };

  window.addEventListener(SIDEBAR_TOGGLE_EVENT, onStoreChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(SIDEBAR_TOGGLE_EVENT, onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export function useSidebarCollapsed() {
  const isCollapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setCollapsed = useCallback((collapsed: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Keep the in-session preference working when browser storage is unavailable.
    }

    window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT, { detail: { collapsed } }));
  }, []);

  return [isCollapsed, setCollapsed] as const;
}
