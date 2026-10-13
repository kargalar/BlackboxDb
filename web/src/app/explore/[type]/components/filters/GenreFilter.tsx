import { Clapperboard, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_GENRES } from '@/services/graphql/admin/adminCategories';

interface GenreData {
  id: number;
  name: string;
  [key: string]: any;
}

interface GenreFilterProps {
  genres: GenreData[];
  selectedGenres: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleGenre: (genreId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
  otherFilterId: string;
  contentTypeId?: number;
}

export function GenreFilter({
  genres: initialGenres,
  selectedGenres,
  isExpanded,
  onToggleSection,
  onToggleGenre,
  onSelectAll,
  onClear,
  filterCounts,
  otherFilterId,
  contentTypeId,
}: GenreFilterProps) {
  const {
    displayItems: genres,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialGenres,
    gqlQuery: LIST_GENRES,
    dataKey: 'listGenres',
    extraVariables: contentTypeId ? { contentTypeId } : {},
  });

  return (
    <FilterSection
      title="Tür"
      icon={<Clapperboard className="w-4 h-4 text-violet-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedGenres.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialGenres.length + 1}
      onClear={onClear}
      colorClass="text-violet-400"
    >
      <button
        onClick={onSelectAll}
        className="w-full text-left text-xs text-violet-400 hover:text-violet-300 px-1.5 py-1 hover:bg-violet-500/10 rounded transition-colors"
      >
        Hepsini Seç
      </button>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Tür ara..."
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && genres.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : genres.length > 0 ? (
          <>
            {genres
              .filter((genre) => !filterCounts || (filterCounts[genre.name] || 0) > 0)
              .map((genre) => {
                const count = filterCounts?.[genre.name] || 0;
                return (
                  <label
                    key={genre.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGenres.includes(genre.id.toString())}
                      onChange={() => onToggleGenre(genre.id.toString())}
                      className="w-4 h-4 rounded border-violet-500/50 bg-white/5 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors flex-1">
                      {genre.name}
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
                className="w-full text-center text-xs text-violet-400 hover:text-violet-300 py-1.5 hover:bg-violet-500/10 rounded transition-colors"
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">Tür bulunamadı</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 mt-2 pt-2">
        <input
          type="checkbox"
          checked={selectedGenres.includes(otherFilterId)}
          onChange={() => onToggleGenre(otherFilterId)}
          className="w-4 h-4 rounded border-violet-500/50 bg-white/5 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0"
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white transition-colors flex-1 italic">
          Diğer (Türsüz)
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
