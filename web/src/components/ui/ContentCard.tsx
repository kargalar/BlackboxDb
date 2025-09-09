import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';
import PosterCard from './PosterCard';

type Size = 'small' | 'medium' | 'large';

const sizeMap: Record<Size, { container: string; title: string; subtitle: string }> = {
  small: { container: 'w-16', title: 'text-xs', subtitle: 'text-[10px]' },
  medium: { container: 'w-24', title: 'text-sm', subtitle: 'text-xs' },
  large: { container: 'w-full', title: 'text-base', subtitle: 'text-sm' },
};

export type ContentCardProps = {
  href: Route;
  title: string;
  subtitle?: string | null;
  posterSrc?: string | null;
  size?: Size;
  className?: string;
  overlay?: React.ReactNode; // actions overlay shown on hover
  rightTop?: React.ReactNode; // badges at top-right
  useNextImage?: boolean; // pass to PosterCard
};

/**
 * Molecule: ContentCard
 * - Wraps PosterCard with a title/subtitle block and optional hover overlay/badges.
 */
export function ContentCard({
  href,
  title,
  subtitle,
  posterSrc,
  size = 'medium',
  className,
  overlay,
  rightTop,
  useNextImage = true,
}: ContentCardProps) {
  const sz = sizeMap[size];
  return (
    <Link href={href} className={cn('group relative cursor-pointer', className)}>
      <div className={cn(sz.container, 'relative')}>
        <PosterCard src={posterSrc ?? undefined} alt={title} className="bg-gray-800" useNextImage={useNextImage} />
        {rightTop ? <div className="absolute top-2 right-2 z-10">{rightTop}</div> : null}
        {overlay ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {overlay}
          </div>
        ) : null}
      </div>
      <div className="mt-2 space-y-1">
        <div className={cn('font-medium line-clamp-2 text-white transition-colors group-hover:text-gray-300', sz.title)} title={title}>
          {title}
        </div>
        {subtitle ? (
          <div className={cn('text-gray-400', sz.subtitle)}>{subtitle}</div>
        ) : null}
      </div>
    </Link>
  );
}

export default ContentCard;
