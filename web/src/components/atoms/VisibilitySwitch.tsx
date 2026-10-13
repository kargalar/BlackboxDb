'use client';

import { Globe2, Lock } from 'lucide-react';

interface VisibilitySwitchProps {
  isPublic: boolean;
  onChange: (nextValue: boolean) => void;
  disabled?: boolean;
  publicLabel?: string;
  privateLabel?: string;
  className?: string;
  iconOnly?: boolean;
}

export default function VisibilitySwitch({
  isPublic,
  onChange,
  disabled = false,
  publicLabel = 'Public',
  privateLabel = 'Private',
  className = '',
  iconOnly = false,
}: VisibilitySwitchProps) {
  const currentLabel = isPublic ? publicLabel : privateLabel;

  if (iconOnly) {
    return (
      <button
        type="button"
        aria-pressed={isPublic}
        aria-label={`Yorum görünürlüğü: ${currentLabel}`}
        title={currentLabel}
        onClick={() => onChange(!isPublic)}
        disabled={disabled}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
          isPublic
            ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
            : 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
        } ${className}`.trim()}
      >
        {isPublic ? <Globe2 size={16} /> : <Lock size={16} />}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          isPublic ? 'text-emerald-300' : 'text-amber-300'
        }`}
      >
        {isPublic ? <Globe2 size={15} /> : <Lock size={15} />}
        <span>{currentLabel}</span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label={`Yorum görünürlüğü: ${currentLabel}`}
        onClick={() => onChange(!isPublic)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-60 ${
          isPublic ? 'bg-emerald-500' : 'bg-amber-500/80'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            isPublic ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
