import * as React from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';
import PosterCard from './PosterCard';
import PosterZoomPreview from '@/components/molecules/PosterZoomPreview';
import { useUserPreferences } from '@/hooks/useUserPreferences';

type Size = 'small' | 'medium' | 'large';

const sizeMap: Record<Size, { container: string; title: string; subtitle: string }> = {
  small: { container: 'w-full', title: 'text-xs', subtitle: 'text-[10px]' },
  medium: { container: 'w-full', title: 'text-sm', subtitle: 'text-xs' },
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
  aspectClassName?: string; // e.g. 'aspect-square' or 'aspect-[2/3]'
};

/**
 * Molecule: ContentCard
 * Modern glassmorphism card with hover effects
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
  aspectClassName,
}: ContentCardProps) {
  const sz = sizeMap[size];
  const { posterZoomEnabled, posterIconsBelow } = useUserPreferences();

  return (
    <PosterZoomPreview src={posterSrc} alt={title} enabled={posterZoomEnabled}>
      <Link
        href={href}
        className={cn('content-card group relative cursor-pointer block', className)}
      >
        {/* Poster Container */}
        <div className="relative overflow-hidden rounded-xl">
          <PosterCard
            src={posterSrc ?? undefined}
            alt={title}
            aspectClassName={aspectClassName}
            className="bg-gray-900/50 transition-transform duration-300 group-hover:scale-105"
            useNextImage={useNextImage}
            fallback={
              <div className="h-full w-full grid place-items-center px-3">
                <div
                  className={cn('text-gray-300 text-center font-semibold line-clamp-3', sz.title)}
                >
                  {title}
                </div>
              </div>
            }
          />

          {/* Badges ON poster (when posterIconsBelow is false) */}
          {!posterIconsBelow && rightTop && <div className="content-card-rating">{rightTop}</div>}

          {/* Action Buttons Overlay (visible on hover) */}
          {overlay && <div className="content-card-actions">{overlay}</div>}

          {/* Bottom Gradient Overlay with Title */}
          <div className="content-card-overlay">
            <div className={cn('font-semibold line-clamp-2 text-white', sz.title)}>{title}</div>
            {subtitle && <div className={cn('text-white/60 mt-1', sz.subtitle)}>{subtitle}</div>}
          </div>
        </div>

        {/* Status Badges - Below poster (when posterIconsBelow is true) */}
        {posterIconsBelow && rightTop && <div className="content-card-badges">{rightTop}</div>}
      </Link>
    </PosterZoomPreview>
  );
}

export default ContentCard;
