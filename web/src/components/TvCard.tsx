import Link from 'next/link';
import Image from 'next/image';
import { tmdbImage } from '@/services/api/tmdb';

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
}

const sizeClasses = {
  small: { container: 'w-16', aspect: 'aspect-[2/3]' },
  medium: { container: 'w-24', aspect: 'aspect-[2/3]' },
  large: { container: 'w-full', aspect: 'aspect-[2/3]' },
};

export default function TvCard({ tv, size = 'medium', className = '' }: TvCardProps) {
  const sizeClass = sizeClasses[size];
  const title = tv.name || tv.title || 'Bilinmeyen Dizi';

  return (
    <Link href={`/content/tv/${tv.id}`} className={`group relative cursor-pointer ${className}`}>
      <div className={`${sizeClass.container} ${sizeClass.aspect} rounded-lg overflow-hidden relative bg-gray-800`}>
        {tv.poster_path ? (
          <Image
            src={tmdbImage(tv.poster_path, 'w342')}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center">
            <span className="text-xs text-center px-2 text-white">{title}</span>
          </div>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <h3 className="font-medium line-clamp-2 text-white group-hover:text-gray-300 transition-colors text-sm">{title}</h3>
        {tv.first_air_date && (
          <p className="text-gray-400 text-xs">{new Date(tv.first_air_date).getFullYear()}</p>
        )}
      </div>
    </Link>
  );
}
