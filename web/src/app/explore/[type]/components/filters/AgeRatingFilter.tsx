import { Shield, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_AGE_RATINGS } from '@/services/graphql/admin/adminCategories';

interface AgeRatingData {
  id: number;
  name: string;
  [key: string]: any;
}

interface AgeRatingFilterProps {
  ageRatings: AgeRatingData[];
  selectedAgeRatings: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleAgeRating: (ageRatingId: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
  otherFilterId: string;
}

export function AgeRatingFilter({
  ageRatings: initialAgeRatings,
  selectedAgeRatings,
  isExpanded,
  onToggleSection,
  onToggleAgeRating,
  onClear,
  filterCounts,
  otherFilterId,
}: AgeRatingFilterProps) {
  const {
    displayItems: ageRatings,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialAgeRatings,
    gqlQuery: LIST_AGE_RATINGS,
    dataKey: 'listAgeRatings',
  });

  return (
    <FilterSection
      title="Yaş Sınırı"
      icon={<Shield className="w-4 h-4 text-red-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedAgeRatings.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialAgeRatings.length + 1}
      onClear={onClear}
      colorClass="text-red-400"
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Yaş sınırı ara..."
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && ageRatings.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : ageRatings.length > 0 ? (
          <>
            {ageRatings
              .filter((ageRating) => !filterCounts || (filterCounts[ageRating.name] || 0) > 0)
              .map((ageRating) => {
                const count = filterCounts?.[ageRating.name] || 0;
                return (
                  <label
                    key={ageRating.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgeRatings.includes(ageRating.id.toString())}
                      onChange={() => onToggleAgeRating(ageRating.id.toString())}
                      className="w-4 h-4 rounded border-red-500/50 bg-white/5 text-red-500 focus:ring-red-500/30 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors flex-1">
                      {ageRating.name}
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
                className="w-full text-center text-xs text-red-400 hover:text-red-300 py-1.5 hover:bg-red-500/10 rounded transition-colors"
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">Yaş sınırı bulunamadı</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 mt-2 pt-2">
        <input
          type="checkbox"
          checked={selectedAgeRatings.includes(otherFilterId)}
          onChange={() => onToggleAgeRating(otherFilterId)}
          className="w-4 h-4 rounded border-red-500/50 bg-white/5 text-red-500 focus:ring-red-500/30 focus:ring-offset-0"
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white transition-colors flex-1 italic">
          Diğer (Yaş Sınırı Yok)
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
