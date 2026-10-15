import Link from 'next/link';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import type { Content } from '@/types/content';
import type { ItemStatesMap, ContentType, ContentActionHandlers } from '../HomeTabTypes';
import { DEFAULT_ITEM_STATE } from '../HomeTabTypes';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { BookOpenText, Clapperboard, Gamepad2, Tv2 } from 'lucide-react';

interface ActivitySectionProps {
  title: string;
  items: Content[];
  contentType: ContentType;
  maxItems?: number;
  emptyMessage: string;
  exploreLink: string;
  exploreLinkText: string;
  /** Tab name for "show all" navigation */
  showAllTabName?: 'Movies' | 'TV' | 'Games' | 'Books';
  itemStates: ItemStatesMap;
  isOwnProfile: boolean;
  handlers: ContentActionHandlers;
  onShowAll?: (tabName: 'Movies' | 'TV' | 'Games' | 'Books') => void;
  /** Optional subtitle shown above the grid */
  subtitle?: string;
}

const SECTION_META: Record<
  ContentType,
  {
    icon: typeof Clapperboard;
    accentLabel: string;
  }
> = {
  movie: {
    icon: Clapperboard,
    accentLabel: 'Film akışı',
  },
  tv: {
    icon: Tv2,
    accentLabel: 'TV / Dizi akışı',
  },
  game: {
    icon: Gamepad2,
    accentLabel: 'Oyun akışı',
  },
  book: {
    icon: BookOpenText,
    accentLabel: 'Kitap akışı',
  },
};

/** Reusable activity section for Movie/TV/Game/Book content grids */
export default function ActivitySection({
  title,
  items,
  contentType,
  maxItems = 10,
  emptyMessage,
  exploreLink,
  exploreLinkText,
  showAllTabName,
  itemStates,
  isOwnProfile,
  handlers,
  onShowAll,
  subtitle,
}: ActivitySectionProps) {
  console.log(`🎬 [ActivitySection:${contentType}] Rendering ${items.length} items`);
  const { dragScrollProps } = useHorizontalDragScroll();
  const visibleItems = items.slice(0, maxItems);
  const sectionMeta = SECTION_META[contentType];
  const SectionIcon = sectionMeta.icon;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 md:p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_35%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
                <SectionIcon className="h-5 w-5 text-white/75" />
                {title}
              </h3>
              {visibleItems.length > 0 && onShowAll && showAllTabName && (
                <button
                  onClick={() => {
                    console.log(
                      `🔗 [ActivitySection:${contentType}] Navigating to tab:`,
                      showAllTabName
                    );
                    onShowAll(showAllTabName);
                  }}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                >
                  Tümünü Gör
                </button>
              )}
            </div>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-gray-400">
            <p>{emptyMessage}</p>
            <Link
              href={exploreLink as any}
              className="text-gray-400 hover:text-gray-300 mt-2 inline-block"
            >
              {exploreLinkText}
            </Link>
          </div>
        ) : (
          <div
            {...dragScrollProps}
            className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
          >
            {visibleItems.map((item) => {
              const state = itemStates[item.id] || DEFAULT_ITEM_STATE;
              return (
                <div
                  key={item.id}
                  draggable={false}
                  className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none"
                >
                  <InteractivePoster
                    content={item}
                    contentType={contentType}
                    isConsumed={Boolean(
                      item.isConsumed ??
                      (item as any).is_consumed ??
                      ((item as any).user_rating ?? 0) > 0
                    )}
                    isFavorite={Boolean(item.isFavorite ?? (item as any).is_favorite)}
                    isConsumeLater={Boolean(item.isConsumeLater ?? (item as any).is_consume_later)}
                    isContinuing={Boolean(item.isContinuing ?? (item as any).is_continuing)}
                    viewerIsConsumed={state.isConsumed}
                    viewerIsFavorite={state.isFavorite}
                    viewerIsConsumeLater={state.isConsumeLater}
                    viewerIsContinuing={state.isContinuing}
                    rating={(item as any).user_rating ?? (item as any).rating ?? null}
                    showActions={true}
                    onWatch={() => handlers.handleWatchToggle(item)}
                    onToggleFavorite={() => handlers.handleFavoriteToggle(item)}
                    onToggleWatchlist={() => handlers.handleWatchlistToggle(item)}
                    onToggleContinuing={() => handlers.handleContinuingToggle(item)}
                    onAddToList={() => handlers.handleAddToList(item, contentType)}
                    hasReview={Boolean((item as any).hasReview)}
                    context="profile"
                  />
                </div>
              );
            })}

            {visibleItems.length > 0 && onShowAll && showAllTabName && (
              <div className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none">
                <button
                  type="button"
                  onClick={() => {
                    console.log(
                      `🔗 [ActivitySection:${contentType}] Navigating to tab from end button:`,
                      showAllTabName
                    );
                    onShowAll(showAllTabName);
                  }}
                  className="flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center text-white/80 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-lg font-black">
                    +
                  </span>
                  <span className="text-sm font-semibold leading-6">Tümünü Göster</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
