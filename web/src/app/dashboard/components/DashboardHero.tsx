'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Sparkles, Settings } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '@/contexts/AuthContext';
import type { UnifiedContent } from '@/types/unified-content';
import { GET_EDITOR_PICKS, type EditorPick } from '@/services/graphql/editorPicks';
import type { ContentType } from '../types';

const CONTENT_TYPE_SLUGS: Record<number, string> = {
  1: 'movie',
  2: 'tv',
  3: 'game',
  4: 'book',
};

const CATEGORIES = [
  { id: 1, slug: 'movie', icon: '🎬' },
  { id: 2, slug: 'tv', icon: '📺' },
  { id: 3, slug: 'game', icon: '🎮' },
  { id: 4, slug: 'book', icon: '📚' },
];

interface DashboardHeroProps {
  content?: UnifiedContent | null;
  isLoading?: boolean;
  onAddToList?: (content: UnifiedContent, contentType: ContentType) => void;
  fallbackContents?: Partial<Record<number, UnifiedContent | null>>;
  preferredContentTypes?: number[];
}

function getYear(content: UnifiedContent) {
  const date = content.releaseDate || content.firstAirDate || content.publishedDate;
  return date ? date.slice(0, 4) : '';
}

function formatRuntime(minutes?: number) {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes}m`;
}

export default function DashboardHero({
  content: singleContentProp,
  isLoading = false,
  onAddToList,
  fallbackContents,
  preferredContentTypes,
}: DashboardHeroProps) {
  const t = useTranslations('Dashboard');
  const { isPrivileged } = useAuth();

  // Fetch all editor picks
  const { data: picksData, loading: picksLoading } = useQuery<{ editorPicks: EditorPick[] }>(
    GET_EDITOR_PICKS,
    {
      fetchPolicy: 'cache-first',
    }
  );

  // Group picks by contentTypeId
  const picksByType = useMemo(() => {
    const map: Record<number, EditorPick[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    if (picksData?.editorPicks) {
      picksData.editorPicks.forEach((p) => {
        if (!map[p.contentTypeId]) map[p.contentTypeId] = [];
        map[p.contentTypeId].push(p);
      });
    }
    return map;
  }, [picksData]);

  // Determine initial active category
  const availableCategories = useMemo(() => {
    if (!preferredContentTypes || preferredContentTypes.length === 0) {
      return CATEGORIES;
    }
    return CATEGORIES.filter((c) => preferredContentTypes.includes(c.id));
  }, [preferredContentTypes]);

  const [activeTypeId, setActiveTypeId] = useState<number>(() => {
    return availableCategories[0]?.id || 1;
  });

  // Current items for the selected category
  const activeItems = useMemo(() => {
    const list = picksByType[activeTypeId] || [];
    if (list.length > 0) {
      return list.map((item) => ({
        content: item.content,
        label: item.label || t('hero.defaultBadge'),
        imageUrl: item.imageUrl,
      }));
    }

    // Fallback to fallbackContents if editor hasn't set picks for this type
    const fallback = fallbackContents?.[activeTypeId] || (activeTypeId === 1 ? singleContentProp : null);
    if (fallback) {
      return [
        {
          content: fallback,
          label: t('hero.featured'),
          imageUrl: undefined,
        },
      ];
    }

    return [];
  }, [picksByType, activeTypeId, fallbackContents, singleContentProp, t]);

  // Current slide index (0 to activeItems.length - 1)
  const [slideIndex, setSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset slide index when active category changes
  useEffect(() => {
    setSlideIndex(0);
  }, [activeTypeId]);

  // Safe slide index bounds
  const currentIndex = slideIndex >= activeItems.length ? 0 : slideIndex;
  const currentItem = activeItems[currentIndex];
  const currentContent = currentItem?.content;

  // Auto-advance slides every 7 seconds when not hovered
  useEffect(() => {
    if (activeItems.length <= 1 || isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % activeItems.length);
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeItems.length, isHovered]);

  const handlePrev = () => {
    if (activeItems.length <= 1) return;
    setSlideIndex((prev) => (prev - 1 + activeItems.length) % activeItems.length);
  };

  const handleNext = () => {
    if (activeItems.length <= 1) return;
    setSlideIndex((prev) => (prev + 1) % activeItems.length);
  };

  if ((isLoading || picksLoading) && !currentContent) {
    return <div className="dashboard-hero dashboard-hero-skeleton skeleton" aria-hidden="true" />;
  }

  if (!currentContent) return null;

  const typeSlug = CONTENT_TYPE_SLUGS[currentContent.contentTypeId] || 'movie';
  const typeLabel = (() => {
    switch (currentContent.contentTypeId) {
      case 1:
        return t('hero.contentType.movie');
      case 2:
        return t('hero.contentType.tvShow');
      case 3:
        return t('hero.contentType.game');
      case 4:
        return t('hero.contentType.book');
      default:
        return t('hero.contentType.content');
    }
  })();

  const contentType = (
    typeSlug === 'movie' ||
    typeSlug === 'tv' ||
    typeSlug === 'game' ||
    typeSlug === 'book'
      ? typeSlug
      : 'movie'
  ) as ContentType;

  const href = `/content/${typeSlug}/${currentContent.id}`;
  const year = getYear(currentContent);
  const runtime = currentContent.runtime ? formatRuntime(currentContent.runtime) : '';
  const badgeLabel = (() => {
    const rawLabel = currentItem?.label?.trim();
    if (
      !rawLabel ||
      rawLabel.toLowerCase().includes('günün') ||
      rawLabel.toLowerCase().includes('haftanın')
    ) {
      return t('hero.defaultBadge');
    }
    return rawLabel;
  })();
  const customHeroImage = currentItem?.imageUrl;
  const hasHorizontalImage = Boolean(customHeroImage || currentContent.backdropUrl);
  const backdropImage = customHeroImage || currentContent.backdropUrl || currentContent.posterUrl;

  return (
    <section
      className="dashboard-hero group cursor-pointer relative"
      aria-labelledby="dashboard-hero-title"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Backdrop - fills entire container */}
      {backdropImage ? (
        <Image
          key={`${currentContent.id}-${backdropImage}`}
          src={backdropImage}
          alt={currentContent.title || ''}
          fill
          priority
          className={`dashboard-hero-backdrop object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
            !hasHorizontalImage ? 'blur-2xl scale-125 opacity-35' : 'object-center'
          }`}
          sizes="(max-width: 1024px) 100vw, 1400px"
        />
      ) : (
        <div className="dashboard-hero-fallback" aria-hidden="true" />
      )}
      <div className="dashboard-hero-scrim" aria-hidden="true" />

      {/* Floating crisp poster when no horizontal image is available (e.g. books) */}
      {!hasHorizontalImage && currentContent.posterUrl && (
        <div className="hidden sm:block absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="w-28 h-40 md:w-36 md:h-52 rounded-2xl overflow-hidden shadow-2xl border border-white/20 relative rotate-2 group-hover:rotate-0 transition-transform duration-500">
            <Image
              src={currentContent.posterUrl}
              alt={currentContent.title || ''}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 112px, 144px"
            />
          </div>
        </div>
      )}

      {/* Clickable Card Link for Entire Container */}
      <Link
        href={href as Route}
        className="absolute inset-0 z-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-[inherit]"
        aria-label={currentContent.title}
      />

      {/* Top Header inside Hero: Category Tabs + Admin Link */}
      <div className="absolute top-5 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
          {availableCategories.map((cat) => {
            const isActive = cat.id === activeTypeId;
            const hasPicks = (picksByType[cat.id]?.length || 0) > 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTypeId(cat.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{t(`hero.tabs.${cat.slug}` as any)}</span>
                {hasPicks && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </button>
            );
          })}
        </div>

        {isPrivileged && (
          <Link
            href={'/admin/showcase' as Route}
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:border-purple-500/50 text-xs font-medium text-white/70 hover:text-white transition-all flex items-center gap-1.5 shadow-lg group/admin relative z-20 pointer-events-auto"
            title="Vitrin Yönetimi"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover/admin:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Vitrin Yönetimi</span>
          </Link>
        )}
      </div>

      {/* Main Content Area */}
      <div className="dashboard-hero-content pt-24 pb-8 pointer-events-none relative z-10">
        <div className="max-w-2xl">
          {/* Dynamic Badge / Kicker */}
          <div className="dashboard-hero-kicker inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 backdrop-blur-sm">
            <span className="dashboard-hero-kicker-dot" />
            <span className="text-xs font-bold tracking-wider uppercase text-purple-200">
              {badgeLabel}
            </span>
          </div>

          <p className="text-sm font-medium text-white/60 mt-1">
            {typeLabel} {year && `• ${year}`} {runtime && `• ${runtime}`}
          </p>

          <h2
            id="dashboard-hero-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-white drop-shadow-sm group-hover:text-purple-200 transition-colors"
          >
            {currentContent.title}
          </h2>

          {currentContent.description && (
            <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-white/75 drop-shadow">
              {currentContent.description}
            </p>
          )}
        </div>
      </div>

      {/* Slide Navigation Controls (Only if more than 1 item) */}
      {activeItems.length > 1 && (
        <div className="absolute bottom-5 right-6 z-20 flex items-center gap-3 pointer-events-auto">
          {/* Numbered Dots / Indicators */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            {activeItems.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSlideIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-6 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Arrow Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-all"
              aria-label={t('hero.prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="p-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-all"
              aria-label={t('hero.next')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
