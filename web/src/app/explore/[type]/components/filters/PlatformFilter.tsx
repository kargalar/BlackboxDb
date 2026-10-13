import { Gamepad2, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_PLATFORMS } from '@/services/graphql/admin/adminCategories';

interface PlatformData {
  id: number;
  name: string;
  [key: string]: any;
}

interface PlatformFilterProps {
  platforms: PlatformData[];
  selectedPlatforms: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onTogglePlatform: (platformId: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
}

export function PlatformFilter({
  platforms: initialPlatforms,
  selectedPlatforms,
  isExpanded,
  onToggleSection,
  onTogglePlatform,
  onClear,
  filterCounts,
}: PlatformFilterProps) {
  const {
    displayItems: platforms,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialPlatforms,
    gqlQuery: LIST_PLATFORMS,
    dataKey: 'listPlatforms',
  });

  return (
    <FilterSection
      title="Platform"
      icon={<Gamepad2 className="w-4 h-4 text-blue-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedPlatforms.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialPlatforms.length}
      onClear={onClear}
      colorClass="text-blue-400"
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Platform ara..."
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && platforms.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : platforms.length > 0 ? (
          <>
            {platforms
              .filter(
                (platform) => !filterCounts || (filterCounts[platform.id.toString()] || 0) > 0
              )
              .map((platform) => {
                const count = filterCounts?.[platform.id.toString()] || 0;
                return (
                  <label
                    key={platform.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform.id.toString())}
                      onChange={() => onTogglePlatform(platform.id.toString())}
                      className="w-4 h-4 rounded border-blue-500/50 bg-white/5 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors flex-1">
                      {platform.name}
                    </span>
                    {count > 0 && (
                      <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </label>
                );
              })}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="w-3 h-3 animate-spin text-white/30" />
                <span className="ml-1 text-xs text-white/30">Yükleniyor...</span>
              </div>
            )}
            {hasMore && !isLoadingMore && (
              <button
                onClick={loadMore}
                className="w-full text-center text-xs text-blue-400 hover:text-blue-300 py-1.5 hover:bg-blue-500/10 rounded transition-colors"
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">Platform bulunamadı</p>
        )}
      </div>
    </FilterSection>
  );
}
