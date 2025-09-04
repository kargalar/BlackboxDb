import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blackbox',
  description: 'Explore movies and games. Built with Next.js + Tailwind.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-white/60 backdrop-blur dark:bg-black/40">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-4">
              <a href="/" className="font-semibold">
                Blackbox
              </a>
              <nav className="flex items-center gap-4 text-sm">
                <a href="/explore" className="opacity-80 hover:opacity-100">Keşfet</a>
                <a href="#" className="opacity-80 hover:opacity-100">Giriş</a>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
          <footer className="border-t p-4 text-center text-xs opacity-70">
            © {new Date().getFullYear()} Blackbox
          </footer>
        </div>
      </body>
    </html>
  );
}
