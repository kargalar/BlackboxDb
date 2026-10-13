'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: string) => {
    // Set the cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Use transition to change the router so it's smooth
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="sidebar-language-switcher mt-auto mb-4 flex shrink-0 items-center gap-2 border-t border-white/10 px-4 pb-0 pt-4">
      <Globe className="w-4 h-4 text-white/50" />
      <div className="flex gap-1 text-sm">
        <button
          onClick={() => handleLocaleChange('en')}
          disabled={isPending}
          aria-pressed={locale === 'en'}
          aria-label="English"
          className={`px-2 py-1 rounded-md transition-colors ${
            locale === 'en'
              ? 'bg-blue-500/20 text-blue-400 font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => handleLocaleChange('tr')}
          disabled={isPending}
          aria-pressed={locale === 'tr'}
          aria-label="Türkçe"
          className={`px-2 py-1 rounded-md transition-colors ${
            locale === 'tr'
              ? 'bg-blue-500/20 text-blue-400 font-medium'
              : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          TR
        </button>
      </div>
    </div>
  );
}
