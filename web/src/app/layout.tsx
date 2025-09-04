import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blackbox',
  description: 'Keşfet, izle, oyna. Film ve oyun deneyimini kaydet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gray-50 antialiased dark:bg-gray-950`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              
              <main className="flex-1 pt-16">
                <div className="mx-auto max-w-7xl px-4 py-6">
                  {children}
                </div>
              </main>
              
              <footer className="border-t bg-white dark:bg-gray-900 mt-auto">
                <div className="mx-auto max-w-7xl px-4 py-8">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-gradient-to-br from-purple-600 to-blue-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Blackbox</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      © {new Date().getFullYear()} Blackbox. Tüm hakları saklıdır.
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
