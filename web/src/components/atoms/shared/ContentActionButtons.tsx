/**
 * Shared Component: ContentActionButtons
 *
 * Tüm content card'lar için ortak action button'ları içerir.
 * - Watch/Read/Play butonu (içerik tipine göre)
 * - Favorite butonu
 * - Watchlist butonu
 *
 * Bu component, MovieCard, TvCard, BookCard ve GameCard'larda
 * tekrarlanan kod miktarını azaltır.
 */

import React from 'react';
import { EyeIconSolid } from '@/components/atoms/icons/EyeIcon';
import { CheckIcon } from '@/components/atoms/icons/CheckIcon';
import { HeartIcon } from '@/components/atoms/icons/HeartIcon';
import { ListIcon } from '@/components/atoms/icons/SidebarIcons';
import { BookmarkIcon } from '@/components/atoms/icons/BookmarkIcon';

// Size variants için tip tanımı
type SizeVariant = 'small' | 'medium' | 'large';

// Action type - içerik tipine göre farklı etiketler
type ActionType = 'watch' | 'read' | 'play' | 'listen';

// Content type - filmler için devam ediyor butonu gizlenecek
type ContentType = 'movie' | 'tv' | 'game' | 'book' | 'music';

interface ContentActionButtonsProps {
  size?: SizeVariant;
  actionType?: ActionType;
  contentType?: ContentType;

  // State props
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  isContinuing?: boolean;
  isAbandoned?: boolean;
  isInList?: boolean; // True if content is in any user list

  // Event handlers
  onWatch?: (e: React.MouseEvent) => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onToggleWatchlist?: (e: React.MouseEvent) => void;
  onToggleContinuing?: (e: React.MouseEvent) => void;
  onAddToList?: (e: React.MouseEvent) => void;
}

// Size class mapping - tutarlı boyutlar için
const sizeClasses: Record<SizeVariant, { buttons: string; icons: string }> = {
  small: { buttons: 'w-5 h-5', icons: 'w-3 h-3' },
  medium: { buttons: 'w-6 h-6', icons: 'w-3 h-3' },
  large: { buttons: 'w-8 h-8', icons: 'w-4 h-4' },
};

// Action type'a göre etiketler
const actionLabels: Record<ActionType, { watched: string; notWatched: string }> = {
  watch: { watched: 'İzlendi', notWatched: 'İzle' },
  read: { watched: 'Okundu', notWatched: 'Oku' },
  play: { watched: 'Oynandı', notWatched: 'Oyna' },
  listen: { watched: 'Dinlendi', notWatched: 'Dinle' },
};

/**
 * ContentActionButtons Component
 *
 * İçerik kartları için ortak action button'ları render eder.
 * Hover overlay'de gösterilir.
 */
export function ContentActionButtons({
  size = 'medium',
  actionType = 'watch',
  contentType,
  isConsumed = false,
  isFavorite = false,
  isConsumeLater = false,
  isContinuing = false,
  isAbandoned = false,
  isInList = false,
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  onToggleContinuing,
  onAddToList,
}: ContentActionButtonsProps) {
  const sizeClass = sizeClasses[size];
  const labels = actionLabels[actionType];

  // Debug: Component render edildiğinde log
  React.useEffect(() => {
    console.log('🎬 ContentActionButtons render edildi:', {
      size,
      actionType,
      contentType,
      isConsumed,
      isFavorite,
      isConsumeLater,
    });
  }, [size, actionType, contentType, isConsumed, isFavorite, isConsumeLater]);

  return (
    <div
      className="flex gap-2"
      onMouseEnter={() => console.log('🖱️ Action buttons üzerine gelindi')}
    >
      {/* Watch/Read/Play Button */}
      <button
        onClick={onWatch}
        className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${
          isConsumed ? 'bg-green-600 hover:bg-green-700' : 'bg-black/60 hover:bg-black/70'
        } transition-colors`}
        title={isConsumed ? labels.watched : labels.notWatched}
      >
        <EyeIconSolid className={sizeClass.icons} />
      </button>

      {/* Favorite Button */}
      <button
        onClick={onToggleFavorite}
        className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${
          isFavorite ? 'bg-red-600 hover:bg-red-700' : 'bg-black/60 hover:bg-black/70'
        } transition-colors`}
        title={isFavorite ? 'Favoriden Çıkar' : 'Favori'}
      >
        <HeartIcon className={sizeClass.icons} />
      </button>

      {/* Watchlist Button */}
      <button
        onClick={onToggleWatchlist}
        className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${
          isConsumeLater ? 'bg-blue-600 hover:bg-blue-700' : 'bg-black/60 hover:bg-black/70'
        } transition-colors`}
        title={isConsumeLater ? 'Sonra İzle Listesinden Çıkar' : 'Sonra İzle'}
      >
        <BookmarkIcon className={sizeClass.icons} />
      </button>

      {/* Add to List Button */}
      {onAddToList && (
        <button
          onClick={onAddToList}
          className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm text-white ${
            isInList ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-black/60 hover:bg-black/70'
          } transition-colors`}
          title={isInList ? 'Listede' : 'Listeye Ekle'}
        >
          <ListIcon className={sizeClass.icons} />
        </button>
      )}
    </div>
  );
}

export default ContentActionButtons;
