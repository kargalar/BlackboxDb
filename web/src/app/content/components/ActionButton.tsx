import type { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  tone: 'consumed' | 'favorite' | 'later' | 'continuing' | 'abandoned';
}

export default function ActionButton({
  icon,
  label,
  active = false,
  onClick,
  tone,
}: ActionButtonProps) {
  return (
    <div className="content-action group flex flex-col items-center gap-2" data-tone={tone}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className="content-action-button relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors"
      >
        {icon}
        {active && (
          <span className="content-action-check absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full">
            <Check size={11} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </button>
      <span
        className={`text-xs text-center ${active ? 'content-action-label-active' : 'text-neutral-400'}`}
      >
        {label}
      </span>
    </div>
  );
}
