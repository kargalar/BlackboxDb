'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import MovieCard from '@/components/organisms/MovieCard';
import TvCard from '@/components/organisms/TvCard';
import GameCard from '@/components/organisms/GameCard';
import BookCard from '@/components/organisms/BookCard';
import type { UnifiedContent } from '@/types/unified-content';

// Content type display config
const CONTENT_TYPE_CONFIG: Record<number, { label: string; emoji: string; order: number }> = {
  1: { label: 'Filmler', emoji: '🎬', order: 1 },
  2: { label: 'Diziler', emoji: '📺', order: 2 },
  3: { label: 'Oyunlar', emoji: '🎮', order: 3 },
  4: { label: 'Kitaplar', emoji: '📚', order: 4 },
};

function getContentTypeConfig(typeId: number) {
  return CONTENT_TYPE_CONFIG[typeId] || { label: 'Diğer', emoji: '📦', order: 99 };
}

interface ContentSimilarProps {
  type: string;
  id: string;
  content?: UnifiedContent; // Current content details for better similar content logic
  similarContent?: UnifiedContent[];
  loading?: boolean;
  error?: string | null;
}

// Helper to resolve content type id from item
function resolveContentTypeId(item: UnifiedContent, fallbackType: string): number {
  if (item.contentTypeId) return item.contentTypeId;

  const contentTypeName = item?.contentType?.name?.toLowerCase();
  if (contentTypeName === 'movie') return 1;
  if (contentTypeName === 'tv show' || contentTypeName === 'tv') return 2;
  if (contentTypeName === 'game') return 3;
  if (contentTypeName === 'book') return 4;

  // Fallback to parent type
  switch (fallbackType) {
    case 'movie':
      return 1;
    case 'tv':
      return 2;
    case 'game':
      return 3;
    case 'book':
      return 4;
    default:
      return 1;
  }
}

export default function ContentSimilar({
  type,
  id,
  content,
  similarContent,
  loading = false,
  error = null,
}: ContentSimilarProps) {
  const [localSimilar, setLocalSimilar] = useState<UnifiedContent[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const latestRequestIdRef = useRef(0);
  const t = useTranslations('ContentSimilar');

  // Use provided similar content or fetch local similar
  const displayContent = similarContent || localSimilar;
  const isLoading = loading || localLoading;
  const displayError = error || localError;

  const getResolvedType = (item: UnifiedContent) => {
    const contentTypeName = item?.contentType?.name?.toLowerCase();
    if (contentTypeName === 'movie') return 'movie';
    if (contentTypeName === 'tv show' || contentTypeName === 'tv') return 'tv';
    if (contentTypeName === 'game') return 'game';
    if (contentTypeName === 'book') return 'book';

    if (item?.contentTypeId === 1) return 'movie';
    if (item?.contentTypeId === 2) return 'tv';
    if (item?.contentTypeId === 3) return 'game';
    if (item?.contentTypeId === 4) return 'book';

    return type;
  };

  const buildCardItem = (item: UnifiedContent): UnifiedContent & { name?: string } => ({
    ...item,
    title: item.similarDisplayTitle || item.title,
    name: item.similarDisplayTitle || item.title,
  });

  const fetchSimilarContent = useCallback(async () => {
    if (!id) return;

    const requestId = ++latestRequestIdRef.current;
    setLocalLoading(true);
    setLocalError(null);
    setLocalSimilar([]);

    try {
      console.log(`🔍 ${type} için benzer içerikler alınıyor...`);

      switch (type) {
        case 'movie':
        case 'tv':
          // Unified content already provides similar content in the details
          // This would be handled by the parent component
          break;
        case 'game':
          // For games, search by genre for better recommendations
          if (content?.genres && content.genres.length > 0) {
            // Try to find similar games by genre
            const genreName = content.genres[0].name; // Use first genre
            console.log(`🎮 "${genreName}" türü için benzer oyunlar aranıyor...`);

            const genreResponse = await fetch(
              `/api/igdb/search?q=${encodeURIComponent(genreName)}&limit=6`
            );
            if (genreResponse.ok) {
              const genreData = await genreResponse.json();
              if (requestId !== latestRequestIdRef.current) return;
              // Filter out the current game and limit to 6
              const filteredGames =
                genreData.data?.filter((game: UnifiedContent) => game.id !== id).slice(0, 6) || [];
              if (filteredGames.length > 0) {
                setLocalSimilar(filteredGames);
                break;
              }
            }
          }

          // Fallback: show trending games if no genre match
          console.log('🎮 Tür bulunamadı, trend oyunlar gösteriliyor...');
          const trendingResponse = await fetch('/api/igdb/trending?limit=6');
          if (trendingResponse.ok) {
            const trendingData = await trendingResponse.json();
            if (requestId === latestRequestIdRef.current) {
              setLocalSimilar(trendingData.data || []);
            }
          }
          break;
        case 'book':
          // For books, search by author or category for better recommendations
          if (
            content?.bookDetails &&
            (content.bookDetails.authors.length > 0 || content.bookDetails.categories.length > 0)
          ) {
            // Try to find similar books by author first
            let searchQuery = '';
            if (content.bookDetails.authors.length > 0) {
              searchQuery = content.bookDetails.authors[0]; // Use first author
              console.log(`📚 Yazar "${searchQuery}" için benzer kitaplar aranıyor...`);
            } else if (content.bookDetails.categories.length > 0) {
              searchQuery = content.bookDetails.categories[0]; // Use first category
              console.log(`📚 Kategori "${searchQuery}" için benzer kitaplar aranıyor...`);
            }

            if (searchQuery) {
              const authorResponse = await fetch(
                `/api/books/search?q=${encodeURIComponent(searchQuery)}&limit=6`
              );
              if (authorResponse.ok) {
              const authorData = await authorResponse.json();
                if (requestId !== latestRequestIdRef.current) return;
                // Filter out the current book and limit to 6
                const filteredBooks =
                  authorData.data?.filter((book: UnifiedContent) => book.id !== id).slice(0, 6) ||
                  [];
                if (filteredBooks.length > 0) {
                  setLocalSimilar(filteredBooks);
                  break;
                }
              }
            }
          }

          // Fallback: show popular books if no author/category match
          console.log('📚 Yazar/kategori bulunamadı, popüler kitaplar gösteriliyor...');
          const booksResponse = await fetch('/api/books/search?q=popular&limit=6');
          if (booksResponse.ok) {
            const booksData = await booksResponse.json();
            if (requestId === latestRequestIdRef.current) {
              setLocalSimilar(booksData.data || []);
            }
          }
          break;
        default:
          console.warn(`Similar content not implemented for type: ${type}`);
      }

      console.log('✅ Benzer içerikler yüklendi');
    } catch (err) {
      if (requestId !== latestRequestIdRef.current) return;
      console.error('❌ Benzer içerikler yüklenirken hata:', err);
      setLocalError(t('loadError'));
    } finally {
      if (requestId === latestRequestIdRef.current) setLocalLoading(false);
    }
  }, [content, id, t, type]);

  useEffect(() => {
    if (!similarContent && !loading && !error) {
      void fetchSimilarContent();
    } else {
      latestRequestIdRef.current += 1;
      setLocalLoading(false);
      setLocalSimilar([]);
      setLocalError(null);
    }

    return () => {
      latestRequestIdRef.current += 1;
    };
  }, [error, fetchSimilarContent, loading, similarContent]);

  const renderCard = (item: UnifiedContent, index: number) => {
    const resolvedType = getResolvedType(item);
    const cardItem = buildCardItem(item);
    const subtitleOverride = item.similarDisplaySubtitle || null;

    switch (resolvedType) {
      case 'movie':
        return (
          <MovieCard
            key={item.id || index}
            movie={cardItem}
            size="medium"
            showRating={false}
            showActions={false}
            className="flex-shrink-0 w-48"
            subtitleOverride={subtitleOverride}
          />
        );
      case 'tv':
        return (
          <TvCard
            key={item.id || index}
            tv={cardItem}
            size="medium"
            showRating={false}
            showActions={false}
            className="flex-shrink-0 w-48"
            subtitleOverride={subtitleOverride}
          />
        );
      case 'game': {
        const gameCardItem = {
          ...cardItem,
          name: cardItem.name || cardItem.title,
        };
        return (
          <GameCard
            key={item.id || index}
            game={gameCardItem}
            size="medium"
            showRating={false}
            showActions={false}
            className="flex-shrink-0 w-48"
            subtitleOverride={subtitleOverride}
          />
        );
      }
      case 'book':
        return (
          <BookCard
            key={item.id || index}
            book={cardItem}
            size="medium"
            showRating={false}
            showActions={false}
            className="flex-shrink-0 w-48"
            subtitleOverride={subtitleOverride}
          />
        );
      default:
        return null;
    }
  };

  const [activeTabId, setActiveTabId] = useState<number | null>(null);

  // Group content by content type for display
  const groupedContent = displayContent.reduce<Record<number, UnifiedContent[]>>((acc, item) => {
    const typeId = resolveContentTypeId(item, type);
    if (!acc[typeId]) acc[typeId] = [];
    acc[typeId].push(item);
    return acc;
  }, {});

  const sortedGroups = Object.entries(groupedContent)
    .map(([typeId, items]) => ({
      typeId: Number(typeId),
      config: getContentTypeConfig(Number(typeId)),
      items,
    }))
    .sort((a, b) => a.config.order - b.config.order);

  const selectedTabId = sortedGroups.some((group) => group.typeId === activeTabId)
    ? activeTabId
    : (sortedGroups[0]?.typeId ?? null);

  if (displayError) {
    console.error('Debug - ContentSimilar error:', displayError);
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">{t('title')}</h2>
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{displayError}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    console.log('Debug - ContentSimilar loading');
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">{t('title')}</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48">
              <div className="bg-gray-800 rounded-lg h-72 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!displayContent || displayContent.length === 0) {
    console.log('Debug - ContentSimilar no content');
    return null;
  }

  console.log('Debug - ContentSimilar rendering', displayContent.length, 'items');

  const activeGroup = sortedGroups.find((group) => group.typeId === selectedTabId);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          {t('titleCount', { count: displayContent.length })}
        </h2>
        {activeGroup && activeGroup.items.length > 6 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            {t('showAll', { count: activeGroup.items.length })}
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {t('hideAll')}
          </button>
        )}
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {sortedGroups.map(({ typeId, config, items }) => (
          <button
            key={typeId}
            onClick={() => {
              setActiveTabId(typeId);
              setShowAll(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTabId === typeId
                ? 'bg-white/10 text-white'
                : 'bg-transparent text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <span>{config.emoji}</span>
            <span>{config.label}</span>
            <span className="opacity-50">({items.length})</span>
          </button>
        ))}
      </div>

      {activeGroup &&
        (showAll ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {activeGroup.items.map((item, index) => (
              <div key={item.id || index} className="space-y-2">
                {item.similarIsFranchise && (
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                    Seri Benzerliği
                  </div>
                )}
                {renderCard(item, index)}
              </div>
            ))}
          </div>
        ) : (
          <SingleHorizontalScroll items={activeGroup.items} renderCard={renderCard} />
        ))}
    </div>
  );
}

// Original single horizontal scroll (no grouping)
function SingleHorizontalScroll({
  items,
  renderCard,
}: {
  items: UnifiedContent[];
  renderCard: (item: UnifiedContent, index: number) => React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      {/* Left scroll button */}
      <button
        onClick={() => scrollBy(-300)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div
        ref={scrollRef}
        className="flex space-x-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-hide"
      >
        {items.slice(0, 12).map((item, index) => (
          <div key={item.id || index} className="snap-start space-y-2">
            {item.similarIsFranchise && (
              <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
                Seri Benzerliği
              </div>
            )}
            {renderCard(item, index)}
          </div>
        ))}
      </div>

      {/* Right scroll button */}
      <button
        onClick={() => scrollBy(300)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
