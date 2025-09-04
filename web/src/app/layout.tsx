import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blackbox',
  description: 'Keşfet, izle, oyna. Film ve oyun deneyimini kaydet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gray-50 antialiased dark:bg-gray-950`}>
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
              <a href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600" />
                <span className="text-xl font-bold text-gray-900 dark:text-white">Blackbox</span>
              </a>
              
              <nav className="hidden md:flex items-center gap-6">
                <a href="/explore" className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                  Keşfet
                </a>
                <a href="/profile" className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                  Profil
                </a>
              </nav>

              <div className="flex items-center gap-3">
                <button className="hidden md:block rounded-full bg-gray-100 p-2 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
                  <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <a href="/auth/login" className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors">
                  Giriş Yap
                </a>
              </div>
            </div>
          </header>
          
          <main className="flex-1">
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
      </body>
    </html>
  );
}
