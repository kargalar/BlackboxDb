import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type PosterCardProps = {
  src?: string | null;
  alt: string;
  aspectClassName?: string; // e.g. 'aspect-[2/3]'
  rounded?: 'md' | 'lg' | 'xl';
  hoverZoom?: boolean;
  className?: string;
  imageClassName?: string;
  fallback?: React.ReactNode; // fallback content when no src
  useNextImage?: boolean; // allow opting-out for external domains not whitelisted
};

/**
 * Atom: PosterCard
 * - Standardized poster container with ratio, rounding, hover zoom effect and fallback.
 */
export function PosterCard({
  src,
  alt,
  aspectClassName = 'aspect-[2/3]',
  rounded = 'lg',
  hoverZoom = true,
  className,
  imageClassName,
  fallback,
  useNextImage = true,
}: PosterCardProps) {
  const roundedCls =
    rounded === 'xl' ? 'rounded-xl' : rounded === 'md' ? 'rounded-md' : 'rounded-lg';
  const zoomCls = hoverZoom ? 'group-hover:scale-105 transition-transform' : '';

  return (
    <div
      className={cn(
        'relative overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800',
        roundedCls,
        aspectClassName,
        className
      )}
    >
      {src ? (
        useNextImage ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className={cn('object-cover', zoomCls, imageClassName)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className={cn('h-full w-full object-cover', zoomCls, imageClassName)}
          />
        )
      ) : (
        (fallback ?? (
          <div className="h-full w-full grid place-items-center text-gray-400 text-xs text-center p-2">
            No image
          </div>
        ))
      )}
    </div>
  );
}

export default PosterCard;
