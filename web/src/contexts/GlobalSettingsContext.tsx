'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

interface GlobalSettings {
  theme: string;
  isBookEnabled: boolean;
}

interface GlobalSettingsContextType {
  settings: GlobalSettings | null;
  loading: boolean;
}

const GlobalSettingsContext = createContext<GlobalSettingsContextType>({
  settings: null,
  loading: true,
});

const GLOBAL_SETTINGS_POLL_INTERVAL = 5 * 60 * 1000;

const GET_GLOBAL_SETTINGS = gql`
  query GetGlobalSettings {
    getGlobalSettings {
      id
      theme
      isBookEnabled
      updatedAt
    }
  }
`;

export const GlobalSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, loading } = useQuery<{
    getGlobalSettings: {
      id: number;
      theme?: string | null;
      isBookEnabled?: boolean | null;
      updatedAt: string;
    } | null;
  }>(GET_GLOBAL_SETTINGS, {
    pollInterval: GLOBAL_SETTINGS_POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  });

  const globalSettings = data?.getGlobalSettings;
  const hasSettings = Boolean(globalSettings);
  const theme = globalSettings?.theme || 'default';
  const isBookEnabled = globalSettings?.isBookEnabled ?? true;
  const settings = useMemo<GlobalSettings | null>(
    () => (hasSettings ? { theme, isBookEnabled } : null),
    [hasSettings, isBookEnabled, theme]
  );

  useEffect(() => {
    if (hasSettings) {
      document.documentElement.setAttribute('data-global-theme', theme);
    }
  }, [hasSettings, theme]);

  return (
    <GlobalSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export const useGlobalSettings = () => useContext(GlobalSettingsContext);
