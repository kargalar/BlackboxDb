'use client';

import React from 'react';

type AgeRatingValue = { id?: number | string; name: string } | string;

interface AgeRatingBadgeProps {
  rating: AgeRatingValue;
  className?: string;
}

function getRatingName(rating: AgeRatingValue): string {
  return typeof rating === 'string' ? rating : rating.name;
}

function getAgeRatingPalette(name: string) {
  const value = name.trim().toUpperCase();

  if (/^(G|E|PEGI 3|TV-Y|TV-G)$/.test(value)) {
    return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100';
  }
  if (/^(PG|E10\+|PEGI 7|TV-PG|7\+)$/.test(value)) {
    return 'border-sky-400/60 bg-sky-500/15 text-sky-100';
  }
  if (/^(PG-13|T|PEGI 12|12\+|TV-14)$/.test(value)) {
    return 'border-amber-400/60 bg-amber-500/15 text-amber-100';
  }
  if (/^(R|M|MA15\+|PEGI 16|16\+|TV-MA)$/.test(value)) {
    return 'border-orange-400/60 bg-orange-500/15 text-orange-100';
  }
  if (/^(NC-17|AO|18\+|PEGI 18)$/.test(value)) {
    return 'border-rose-400/60 bg-rose-500/15 text-rose-100';
  }

  return 'border-white/20 bg-white/10 text-white';
}

export default function AgeRatingBadge({ rating, className = '' }: AgeRatingBadgeProps) {
  const name = getRatingName(rating);

  return (
    <span
      className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-3 py-1 text-sm font-semibold tracking-wide ${getAgeRatingPalette(name)} ${className}`.trim()}
      aria-label={`Age rating ${name}`}
    >
      {name}
    </span>
  );
}
