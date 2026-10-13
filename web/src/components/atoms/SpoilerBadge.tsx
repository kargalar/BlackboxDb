'use client';

import { EyeOff } from 'lucide-react';

interface SpoilerBadgeProps {
  label?: string;
}

export default function SpoilerBadge({ label = 'Spoiler' }: SpoilerBadgeProps) {
  return (
    <span className="inline-flex items-center text-orange-300" title={label} aria-label={label}>
      <EyeOff size={12} />
    </span>
  );
}
