import { useMemo, useState } from 'react';
import InteractivePoster from '@/components/organisms/InteractivePoster';
import { useHorizontalDragScroll } from '@/hooks/useHorizontalDragScroll';
import type { Content } from '@/types/content';
import { BookOpenText, Clapperboard, Gamepad2, Activity, Tv2 } from 'lucide-react';
import type { ContentActionHandlers, ContentType, ItemStatesMap } from '../HomeTabTypes';
import { DEFAULT_ITEM_STATE } from '../HomeTabTypes';

type ContinuingFilter = 'all' | ContentType;

interface ContinuingContentItem {
  content: Content;
  contentType: ContentType;
  tabName: 'Movies' | 'TV' | 'Games' | 'Books';
}

interface ContinuingContentSectionProps {
  items: ContinuingContentItem[];
  itemStates: ItemStatesMap;
  isOwnProfile: boolean;
  handlers: ContentActionHandlers;
  onShowAll?: (tabName: 'Movies' | 'TV' | 'Games' | 'Books') => void;
}

const FILTER_TAB_NAME_MAP: Record<ContentType, 'Movies' | 'TV' | 'Games' | 'Books'> = {
  movie: 'Movies',
  tv: 'TV',
  game: 'Games',
  book: 'Books',
};

const TYPE_META: Record<
  ContentType,
  {
    label: string;
    pillClassName: string;
    summaryClassName: string;
    icon: typeof Clapperboard | typeof Tv2 | typeof Gamepad2 | typeof BookOpenText | any;
  }
> = {
  movie: {
    label: 'Film',
    pillClassName: 'border-white/10 bg-white/5 text-white/80',
    summaryClassName: 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]',
    icon: Clapperboard,
  },
  tv: {
    label: 'TV / Dizi',
    pillClassName: 'border-white/10 bg-white/5 text-white/80',
    summaryClassName: 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]',
    icon: Tv2,
  },
  game: {
    label: 'Oyun',
    pillClassName: 'border-white/10 bg-white/5 text-white/80',
    summaryClassName: 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]',
    icon: Gamepad2,
  },
  book: {
    label: 'Kitap',
    pillClassName: 'border-white/10 bg-white/5 text-white/80',
    summaryClassName: 'border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.06]',
    icon: BookOpenText,
  },
};

const getBaseItemState = (content: Content) => ({
  isConsumed: Boolean(
    content.isConsumed ?? (content as any).is_consumed ?? ((content as any).user_rating ?? 0) > 0
  ),
  isFavorite: Boolean(content.isFavorite ?? (content as any).is_favorite),
  isConsumeLater: Boolean(content.isConsumeLater ?? (content as any).is_consume_later),
  isContinuing: Boolean(content.isContinuing ?? (content as any).is_continuing),
  rating: (content as any).user_rating ?? (content as any).rating ?? null,
  hasReview: Boolean((content as any).hasReview),
});

export default function ContinuingContentSection({
  items,
  itemStates,
  isOwnProfile,
  handlers,
  onShowAll,
}: ContinuingContentSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<ContinuingFilter>('all');
  const counts = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc[item.contentType] += 1;
          return acc;
        },
        { movie: 0, tv: 0, game: 0, book: 0 } as Record<ContentType, number>
      ),
    [items]
  );
  const activeFilter: ContinuingFilter =
    selectedFilter !== 'all' && counts[selectedFilter] === 0 ? 'all' : selectedFilter;
  const { dragScrollProps } = useHorizontalDragScroll();

  const filterTabs = useMemo(
    () => [
      {
        key: 'all' as const,
        label: 'Tümü',
        count: items.length,
        icon: Activity,
        className: 'border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.06]',
      },
      ...(Object.entries(counts) as Array<[ContentType, number]>)
        .filter(([, count]) => count > 0)
        .map(([contentType, count]) => ({
          key: contentType,
          label: TYPE_META[contentType].label,
          count,
          icon: TYPE_META[contentType].icon,
          className: TYPE_META[contentType].summaryClassName,
        })),
    ],
    [counts, items.length]
  );

  const filteredItems = useMemo(
    () => items.filter((item) => activeFilter === 'all' || item.contentType === activeFilter),
    [activeFilter, items]
  );

  if (items.length === 0) return null;

  console.log('✨ [ContinuingContentSection] Rendering continuing items:', {
    total: items.length,
    counts,
    activeFilter,
    filteredTotal: filteredItems.length,
  });

  const showAllTabName = activeFilter === 'all' ? null : FILTER_TAB_NAME_MAP[activeFilter];

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 md:p-6 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_35%,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
                  <Activity className="h-5 w-5 text-white/75" />
                  Devam Edenler
                </h3>
                {showAllTabName && onShowAll && (
                  <button
                    onClick={() => {
                      console.log(
                        '🔗 [ContinuingContentSection] Navigating to tab:',
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
              {!isOwnProfile && (
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/60 md:text-[15px]">
                  Bu kullanıcının şu anda devam ettiği içerikler burada öne çıkıyor.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setSelectedFilter(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${tab.className} ${
                  isActive
                    ? 'border-white/20 bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
                    : ''
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] font-bold text-white/90">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          {...dragScrollProps}
          className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none md:gap-4"
        >
          {filteredItems.map(({ content, contentType }) => {
            const state = itemStates[content.id] || DEFAULT_ITEM_STATE;
            const meta = TYPE_META[contentType];
            const Icon = meta.icon;
            const baseState = getBaseItemState(content);

            return (
              <div
                key={`${contentType}-${content.id}`}
                draggable={false}
                className="relative w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none"
              >
                <div className="pointer-events-none absolute left-3 top-3 z-10">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-lg shadow-black/20 backdrop-blur-xl ${meta.pillClassName}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                </div>

                <InteractivePoster
                  content={content}
                  contentType={contentType}
                  subtitleOverride="Devam ediyor"
                  isConsumed={baseState.isConsumed}
                  isFavorite={baseState.isFavorite}
                  isConsumeLater={baseState.isConsumeLater}
                  isContinuing={baseState.isContinuing}
                  viewerIsConsumed={state.isConsumed}
                  viewerIsFavorite={state.isFavorite}
                  viewerIsConsumeLater={state.isConsumeLater}
                  viewerIsContinuing={state.isContinuing}
                  rating={baseState.rating}
                  showActions={true}
                  onWatch={() => handlers.handleWatchToggle(content)}
                  onToggleFavorite={() => handlers.handleFavoriteToggle(content)}
                  onToggleWatchlist={() => handlers.handleWatchlistToggle(content)}
                  onToggleContinuing={() => handlers.handleContinuingToggle(content)}
                  onAddToList={() => handlers.handleAddToList(content, contentType)}
                  hasReview={baseState.hasReview}
                  context="profile"
                />
              </div>
            );
          })}

          {filteredItems.length > 0 && showAllTabName && onShowAll && (
            <div className="w-[148px] min-w-[148px] sm:w-[158px] sm:min-w-[158px] lg:w-[168px] lg:min-w-[168px] flex-none">
              <button
                type="button"
                onClick={() => {
                  console.log(
                    '🔗 [ContinuingContentSection] Navigating from end card:',
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
      </div>
    </section>
  );
}
