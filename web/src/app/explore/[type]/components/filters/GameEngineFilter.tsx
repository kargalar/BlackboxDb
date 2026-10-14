import { Cpu, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_GAME_ENGINES } from '@/services/graphql/admin/adminCategories';

interface GameEngineData {
  id: number;
  name: string;
  [key: string]: any;
}

interface GameEngineFilterProps {
  gameEngines: GameEngineData[];
  selectedGameEngines: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleGameEngine: (gameEngineId: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
  otherFilterId: string;
}

export function GameEngineFilter({
  gameEngines: initialGameEngines,
  selectedGameEngines,
  isExpanded,
  onToggleSection,
  onToggleGameEngine,
  onClear,
  filterCounts,
  otherFilterId,
}: GameEngineFilterProps) {
  const {
    displayItems: gameEngines,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialGameEngines,
    gqlQuery: LIST_GAME_ENGINES,
    dataKey: 'listGameEngines',
  });

  return (
    <FilterSection
      title="Oyun Motoru"
      icon={<Cpu className="w-4 h-4 text-emerald-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedGameEngines.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialGameEngines.length + 1}
      onClear={onClear}
      colorClass="text-emerald-400"
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Oyun motoru ara..."
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && gameEngines.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : gameEngines.length > 0 ? (
          <>
            {gameEngines
              .filter((ge) => !filterCounts || (filterCounts[ge.name] || 0) > 0)
              .map((ge) => {
                const count = filterCounts?.[ge.name] || 0;
                return (
                  <label
                    key={ge.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGameEngines.includes(ge.id.toString())}
                      onChange={() => onToggleGameEngine(ge.id.toString())}
                      className="w-4 h-4 rounded border-emerald-500/50 bg-white/5 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors flex-1">
                      {ge.name}
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
                className="w-full text-center text-xs text-emerald-400 hover:text-emerald-300 py-1.5 hover:bg-emerald-500/10 rounded transition-colors"
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">Oyun motoru bulunamadı</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 mt-2 pt-2">
        <input
          type="checkbox"
          checked={selectedGameEngines.includes(otherFilterId)}
          onChange={() => onToggleGameEngine(otherFilterId)}
          className="w-4 h-4 rounded border-emerald-500/50 bg-white/5 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0"
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white transition-colors flex-1 italic">
          Diğer (Oyun Motoru Yok)
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

