import { Globe2, Lock } from 'lucide-react';

interface VisibilityBadgeProps {
  isPublic: boolean;
  publicLabel?: string;
  privateLabel?: string;
}

export default function VisibilityBadge({
  isPublic,
  publicLabel = 'Public',
  privateLabel = 'Private',
}: VisibilityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
        isPublic
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      }`}
    >
      {isPublic ? <Globe2 size={12} /> : <Lock size={12} />}
      {isPublic ? publicLabel : privateLabel}
    </span>
  );
}
