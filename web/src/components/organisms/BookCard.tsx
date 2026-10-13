/**
 * Component: BookCard
 *
 * Kitap içerikleri için kart component'i.
 * Ortak UI component'lerini kullanarak kod tekrarını azaltır.
 */

import type { Route } from 'next';
import ContentCard from '@/components/atoms/ContentCard';
import ContentActionButtons from '@/components/atoms/shared/ContentActionButtons';
import ContentBadgesContainer from '@/components/atoms/shared/ContentBadges';
import { useContentActions } from '@/hooks/useContentActions';

type Book = {
  id: string | number;
  title: string;
  authors?: string[];
  publishedDate?: string | null;
  releaseDate?: string | null;
  posterUrl?: string | null;
  thumbnail?: string | null; // Deprecated: Google Books format
  infoLink?: string | null;
};

interface BookCardProps {
  book: Book;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showActions?: boolean;
  isConsumed?: boolean;
  isFavorite?: boolean;
  isConsumeLater?: boolean;
  isContinuing?: boolean;
  isAbandoned?: boolean;
  viewerIsConsumed?: boolean;
  viewerIsFavorite?: boolean;
  viewerIsConsumeLater?: boolean;
  viewerIsContinuing?: boolean;
  viewerIsAbandoned?: boolean;
  userConsumeCount?: number;
  onWatch?: (bookId: string | number) => void;
  onToggleFavorite?: (bookId: string | number) => void;
  onToggleWatchlist?: (bookId: string | number) => void;
  onToggleContinuing?: (bookId: string | number) => void;
  onAddToList?: (bookId: string | number) => void;
  showRating?: boolean;
  rating?: number;
  reviewCount?: number;
  subtitleOverride?: string | null;
  hasReview?: boolean;
}

export default function BookCard({
  book,
  size = 'medium',
  className = '',
  showActions = true,
  isConsumed = false,
  isFavorite = false,
  isConsumeLater = false,
  isContinuing = false,
  isAbandoned = false,
  viewerIsConsumed,
  viewerIsFavorite,
  viewerIsConsumeLater,
  viewerIsContinuing,
  viewerIsAbandoned,
  userConsumeCount,
  onWatch,
  onToggleFavorite,
  onToggleWatchlist,
  onToggleContinuing,
  onAddToList,
  showRating = false,
  rating,
  reviewCount,
  subtitleOverride = null,
  hasReview = false,
}: BookCardProps) {
  const dateStr = book.releaseDate || book.publishedDate;
  const year = dateStr ? (dateStr.match(/\d{4}/)?.[0] ?? '') : '';
  const subtitle = [book.authors?.slice(0, 2).join(', '), year].filter(Boolean).join(' • ');
  const posterUrl = book.posterUrl || book.thumbnail;
  const href = `/content/book/${book.id}` as Route;

  // Ortak event handler'ları hook'tan al
  const { handleWatch, handleToggleFavorite, handleToggleWatchlist, handleToggleContinuing } =
    useContentActions({
      contentId: String(book.id),
      contentType: 'book',
      onWatch,
      onToggleFavorite,
      onToggleWatchlist,
      onToggleContinuing,
    });

  // Listeye ekle handler
  const handleAddToList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToList) onAddToList(book.id);
  };

  // Action buttons overlay (hover'da gösterilir)
  const overlay = showActions ? (
    <ContentActionButtons
      size={size}
      actionType="read"
      contentType="book"
      isConsumed={viewerIsConsumed ?? isConsumed}
      isFavorite={viewerIsFavorite ?? isFavorite}
      isConsumeLater={viewerIsConsumeLater ?? isConsumeLater}
      isContinuing={viewerIsContinuing ?? isContinuing}
      isAbandoned={viewerIsAbandoned ?? isAbandoned}
      onWatch={handleWatch}
      onToggleFavorite={handleToggleFavorite}
      onToggleWatchlist={handleToggleWatchlist}
      onToggleContinuing={handleToggleContinuing}
      onAddToList={onAddToList ? handleAddToList : undefined}
    />
  ) : null;

  // Rating ve status badge'leri
  const badges = (
    <ContentBadgesContainer
      showRating={showRating}
      rating={rating}
      reviewCount={reviewCount}
      size={size}
      isConsumed={isConsumed}
      isFavorite={isFavorite}
      isConsumeLater={isConsumeLater}
      isContinuing={isContinuing}
      isAbandoned={isAbandoned}
      hasReview={hasReview}
      userConsumeCount={userConsumeCount}
    />
  );

  return (
    <ContentCard
      href={href}
      title={book.title}
      subtitle={subtitleOverride ?? (subtitle || undefined)}
      posterSrc={posterUrl}
      size={size}
      className={className}
      overlay={overlay}
      rightTop={badges}
      useNextImage={false}
    />
  );
}
