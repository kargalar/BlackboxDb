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
import { HeartIcon } from '@/components/atoms/icons/HeartIcon';
import { ListIcon } from '@/components/atoms/icons/SidebarIcons';
import { BookmarkIcon } from '@/components/atoms/icons/BookmarkIcon';

// Size variants için tip tanımı
type SizeVariant = 'small' | 'medium' | 'large';

// Action type - içerik tipine göre farklı etiketler
type ActionType = 'watch' | 'read' | 'play';

// Content type - filmler için devam ediyor butonu gizlenecek
type ContentType = 'movie' | 'tv' | 'game' | 'book';

interface ContentActionButtonsProps {
  size?: SizeVariant;
  actionType?: ActionType;
  contentType?: ContentType;

  // State props
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  watchLater?: boolean;
  isWatchLater?: boolean;
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
  watchLater,
  isWatchLater,
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
  const isWatchLaterActive = Boolean(isConsumeLater || watchLater || isWatchLater);

  const inactiveButtonClass = 'bg-black/60 text-white';
  return (
    <div className="flex gap-2">
      {/* Watch/Read/Play Button */}
      <button
        onClick={onWatch}
        className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm poster-action-button ${
          isConsumed ? 'bg-green-600 text-white' : inactiveButtonClass
        } transition-colors`}
        title={isConsumed ? labels.watched : labels.notWatched}
      >
        <EyeIconSolid className={sizeClass.icons} />
      </button>

      {/* Favorite Button */}
      <button
        onClick={onToggleFavorite}
        className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm poster-action-button ${
          isFavorite ? 'bg-red-600 text-white' : inactiveButtonClass
        } transition-colors`}
        title={isFavorite ? 'Favoriden Çıkar' : 'Favori'}
      >
        <HeartIcon className={sizeClass.icons} />
      </button>

      {/* Watchlist Button */}
      <button
        aria-pressed={isWatchLaterActive}
        onClick={onToggleWatchlist}
        className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm poster-action-button ${
          isWatchLaterActive ? 'poster-watch-later-active text-white' : inactiveButtonClass
        } transition-colors`}
        title={isWatchLaterActive ? 'Sonra İzle Listesinden Çıkar' : 'Sonra İzle'}
      >
        <BookmarkIcon className={sizeClass.icons} solid={isWatchLaterActive} />
      </button>

      {/* Add to List Button */}
      {onAddToList && (
        <button
          onClick={onAddToList}
          className={`${sizeClass.buttons} flex items-center justify-center rounded-full backdrop-blur-sm poster-action-button ${
            isInList ? 'bg-yellow-600 text-white' : inactiveButtonClass
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
