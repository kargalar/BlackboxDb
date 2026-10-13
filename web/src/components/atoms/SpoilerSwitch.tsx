'use client';

import { Check, Eye, EyeOff } from 'lucide-react';

interface SpoilerSwitchProps {
  isSpoiler: boolean;
  onChange: (nextValue: boolean) => void;
  disabled?: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
  className?: string;
  iconOnly?: boolean;
  variant?: 'switch' | 'checkbox';
}

export default function SpoilerSwitch({
  isSpoiler,
  onChange,
  disabled = false,
  enabledLabel = 'Spoiler',
  disabledLabel = 'Spoiler yok',
  className = '',
  iconOnly = false,
  variant = 'switch',
}: SpoilerSwitchProps) {
  const currentLabel = isSpoiler ? enabledLabel : disabledLabel;

  if (iconOnly || variant === 'checkbox') {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={isSpoiler}
        aria-label={`Yorum spoiler durumu: ${currentLabel}`}
        title={currentLabel}
        onClick={() => onChange(!isSpoiler)}
        disabled={disabled}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
          isSpoiler
            ? 'border-orange-500/50 text-orange-300 hover:bg-orange-500/10'
            : 'border-white/15 text-white/50 hover:bg-white/5 hover:text-white/70'
        } ${className}`.trim()}
      >
        {isSpoiler ? <EyeOff size={16} /> : <Eye size={16} />}
        {isSpoiler && (
          <Check
            size={11}
            className="absolute -right-1 -top-1 rounded-full bg-surface-raised text-orange-300"
          />
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          isSpoiler ? 'text-orange-300' : 'text-sky-300'
        }`}
      >
        {isSpoiler ? <EyeOff size={15} /> : <Eye size={15} />}
        <span>{currentLabel}</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isSpoiler}
        aria-label={`Yorum spoiler durumu: ${currentLabel}`}
        onClick={() => onChange(!isSpoiler)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
          isSpoiler ? 'bg-orange-500/90' : 'bg-slate-500/70'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            isSpoiler ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
