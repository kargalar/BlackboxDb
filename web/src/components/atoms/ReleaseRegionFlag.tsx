import { Globe2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

export function useReleaseRegionLabel() {
  const locale = useLocale();
  const t = useTranslations('ContentReleases');
  const names = new Intl.DisplayNames(locale, { type: 'region' });
  return (code?: string | null) => code ? names.of(code) ?? code : t('unspecifiedRegion');
}

export function ReleaseRegionFlag({ code, label }: { code?: string | null; label: string }) {
  const [failedCode, setFailedCode] = useState<string | null>();
  const flagCode = code && code !== failedCode && /^[A-Z]{2}$/.test(code) ? code.toLowerCase() : null;

  return (
    <span
      role="img"
      aria-label={label}
      tabIndex={0}
      className="group relative inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-black/10 text-current outline-violet-500 dark:bg-white/10"
    >
      {flagCode ? (
        // Small static PNGs maintain flag artwork on platforms that omit flag emoji.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          width={24}
          height={16}
          loading="lazy"
          src={`https://flagcdn.com/w40/${flagCode}.png`}
          onError={() => setFailedCode(code)}
          className="max-h-5 w-6 rounded-sm object-contain"
        />
      ) : <Globe2 size={17} aria-hidden="true" />}
      <span
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-full z-20 mt-1.5 w-max max-w-52 rounded-md bg-gray-950 px-2 py-1 text-xs leading-tight text-white shadow-lg group-hover:visible group-focus:visible"
      >
        {label}
      </span>
    </span>
  );
}
