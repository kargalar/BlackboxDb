import { tmdbImage } from '@/services/api/tmdb';
import ContentCard from '@/components/ui/ContentCard';
import type { Route } from 'next';
import { EyeIconSolid } from '@/components/icons/EyeIcon';
import { CheckIcon } from '@/components/icons/CheckIcon';

interface TvCardProps {
  tv: {
    id: number;
    name?: string;
    title?: string;
    poster_path?: string | null;
    first_air_date?: string;
  };
  size?: 'small' | 'medium' | 'large';
  className?: string;
  // Optional actions
  showActions?: boolean;
  isWatched?: boolean;
  onWatch?: (tvId: number) => void;
  subtitleOverride?: string | null;
}

export default function TvCard({ tv, size = 'medium', className = '', showActions = false, isWatched = false, onWatch, subtitleOverride = null }: TvCardProps) {
  const title = tv.name || tv.title || 'Bilinmeyen Dizi';
  const href = (`/content/tv/${tv.id}`) as Route;
  const overlay = showActions ? (
    <div className="flex gap-2">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWatch?.(tv.id); }}
        className={`w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-sm text-white ${isWatched ? 'bg-green-600 hover:bg-green-700' : 'bg-white/20 hover:bg-white/30'} transition-colors`}
        title={isWatched ? 'İzlendi' : 'İzle'}
      >
        {isWatched ? <CheckIcon className="w-4 h-4" /> : <EyeIconSolid className="w-4 h-4" />}
      </button>
    </div>
  ) : null;
  return (
    <ContentCard
      href={href}
      title={title}
  subtitle={subtitleOverride ?? (tv.first_air_date ? String(new Date(tv.first_air_date).getFullYear()) : undefined)}
      posterSrc={tv.poster_path ? tmdbImage(tv.poster_path, 'w342') : null}
      size={size}
      className={className}
      overlay={overlay}
    />
  );
}
