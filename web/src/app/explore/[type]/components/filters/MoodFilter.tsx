import { Smile, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_MOODS } from '@/services/graphql/admin/adminCategories';

interface MoodData {
  id: number;
  name: string;
  [key: string]: any;
}

interface MoodFilterProps {
  moods: MoodData[];
  selectedMoods: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleMood: (moodId: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
  otherFilterId: string;
  contentTypeId?: number;
}

export function MoodFilter({
  moods: initialMoods,
  selectedMoods,
  isExpanded,
  onToggleSection,
  onToggleMood,
  onClear,
  filterCounts,
  otherFilterId,
  contentTypeId,
}: MoodFilterProps) {
  const {
    displayItems: moods,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialMoods,
    gqlQuery: LIST_MOODS,
    dataKey: 'listMoods',
    extraVariables: contentTypeId ? { contentTypeId } : undefined,
  });

  return (
    <FilterSection
      title="Ruh Hali"
      icon={<Smile className="w-4 h-4 text-pink-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedMoods.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialMoods.length + 1}
      onClear={onClear}
      colorClass="text-pink-400"
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Ruh hali ara..."
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && moods.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : moods.length > 0 ? (
          <>
            {moods
              .filter((mood) => !filterCounts || (filterCounts[mood.name] || 0) > 0)
              .map((mood) => {
                const count = filterCounts?.[mood.name] || 0;
                return (
                  <label
                    key={mood.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMoods.includes(mood.id.toString())}
                      onChange={() => onToggleMood(mood.id.toString())}
                      className="w-4 h-4 rounded border-pink-500/50 bg-white/5 text-pink-500 focus:ring-pink-500/30 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors flex-1">
                      {mood.name}
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
                className="w-full text-center text-xs text-pink-400 hover:text-pink-300 py-1.5 hover:bg-pink-500/10 rounded transition-colors"
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">Ruh hali bulunamadı</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 mt-2 pt-2">
        <input
          type="checkbox"
          checked={selectedMoods.includes(otherFilterId)}
          onChange={() => onToggleMood(otherFilterId)}
          className="w-4 h-4 rounded border-pink-500/50 bg-white/5 text-pink-500 focus:ring-pink-500/30 focus:ring-offset-0"
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white transition-colors flex-1 italic">
          Diğer (Ruh Hali Yok)
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
