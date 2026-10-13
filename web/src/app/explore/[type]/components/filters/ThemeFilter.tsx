import { Palette, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_THEMES } from '@/services/graphql/admin/adminCategories';

interface ThemeData {
  id: number;
  name: string;
  [key: string]: any;
}

interface ThemeFilterProps {
  themes: ThemeData[];
  selectedThemes: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleTheme: (themeId: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
  otherFilterId: string;
  contentTypeId?: number;
}

export function ThemeFilter({
  themes: initialThemes,
  selectedThemes,
  isExpanded,
  onToggleSection,
  onToggleTheme,
  onClear,
  filterCounts,
  otherFilterId,
  contentTypeId,
}: ThemeFilterProps) {
  const {
    displayItems: themes,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialThemes,
    gqlQuery: LIST_THEMES,
    dataKey: 'listThemes',
    extraVariables: contentTypeId ? { contentTypeId } : undefined,
  });

  return (
    <FilterSection
      title="Tema"
      icon={<Palette className="w-4 h-4 text-purple-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedThemes.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialThemes.length + 1}
      onClear={onClear}
      colorClass="text-purple-400"
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Tema ara..."
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && themes.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : themes.length > 0 ? (
          <>
            {themes
              .filter((theme) => !filterCounts || (filterCounts[theme.name] || 0) > 0)
              .map((theme) => {
                const count = filterCounts?.[theme.name] || 0;
                return (
                  <label
                    key={theme.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedThemes.includes(theme.id.toString())}
                      onChange={() => onToggleTheme(theme.id.toString())}
                      className="w-4 h-4 rounded border-purple-500/50 bg-white/5 text-purple-500 focus:ring-purple-500/30 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors flex-1">
                      {theme.name}
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
                className="w-full text-center text-xs text-purple-400 hover:text-purple-300 py-1.5 hover:bg-purple-500/10 rounded transition-colors"
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">Tema bulunamadı</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 mt-2 pt-2">
        <input
          type="checkbox"
          checked={selectedThemes.includes(otherFilterId)}
          onChange={() => onToggleTheme(otherFilterId)}
          className="w-4 h-4 rounded border-purple-500/50 bg-white/5 text-purple-500 focus:ring-purple-500/30 focus:ring-offset-0"
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white transition-colors flex-1 italic">
          Diğer (Temasız)
        </span>
        {(filterCounts?.[otherFilterId] || 0) > 0 && (
          <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
            {filterCounts?.[otherFilterId]}
          </span>
        )}
      </label>
    </FilterSection>
  );
}
