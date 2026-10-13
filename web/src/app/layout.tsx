import './globals.css';
import './theme.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import { ApolloProvider } from '@/components/atoms/ApolloProvider';
import { ThemeProvider } from '@/components/atoms/theme-provider';
import LayoutWrapper from '@/components/templates/LayoutWrapper';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProfileCacheProvider } from '@/contexts/ProfileCacheContext';
import { LoginRequiredProvider } from '@/components/atoms/LoginRequiredDialog';
import { GlobalSettingsProvider } from '@/contexts/GlobalSettingsContext';
import PageTitleSync from '@/components/atoms/PageTitleSync';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { SITE_URL } from '@/lib/site-url';

const inter = Inter({ subsets: ['latin'] });
const enableVercelTelemetry = process.env.NEXT_PUBLIC_ENABLE_VERCEL_TELEMETRY === 'true';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Blackbox',
    template: '%s | Blackbox',
  },
  description: 'Discover, track, and discuss movies, shows, games, and books.',
  openGraph: {
    type: 'website',
    siteName: 'Blackbox',
    title: 'Blackbox',
    description: 'Discover, track, and discuss movies, shows, games, and books.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blackbox',
    description: 'Discover, track, and discuss movies, shows, games, and books.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased bg-black text-white`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <ApolloProvider>
              <GlobalSettingsProvider>
                <AuthProvider>
                  <LoginRequiredProvider>
                    <ProfileCacheProvider>
                      <Suspense fallback={null}>
                        <PageTitleSync />
                      </Suspense>
                      {/* Layout with Sidebar */}
                      <LayoutWrapper>{children}</LayoutWrapper>
                    </ProfileCacheProvider>
                  </LoginRequiredProvider>
                </AuthProvider>
              </GlobalSettingsProvider>
            </ApolloProvider>
          </ThemeProvider>
          {enableVercelTelemetry && <Analytics />}
          {enableVercelTelemetry && <SpeedInsights />}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
