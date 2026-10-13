import { Gamepad2, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_GAME_MODES } from '@/services/graphql/admin/adminCategories';

interface GameModeData {
  id: number;
  name: string;
  [key: string]: any;
}

interface GameModeFilterProps {
  gameModes: GameModeData[];
  selectedGameModes: string[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleGameMode: (gameModeId: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number>;
  otherFilterId: string;
}

export function GameModeFilter({
  gameModes: initialGameModes,
  selectedGameModes,
  isExpanded,
  onToggleSection,
  onToggleGameMode,
  onClear,
  filterCounts,
  otherFilterId,
}: GameModeFilterProps) {
  const {
    displayItems: gameModes,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialGameModes,
    gqlQuery: LIST_GAME_MODES,
    dataKey: 'listGameModes',
  });

  return (
    <FilterSection
      title="Oyun Modu"
      icon={<Gamepad2 className="w-4 h-4 text-cyan-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedGameModes.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialGameModes.length + 1}
      onClear={onClear}
      colorClass="text-cyan-400"
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Oyun modu ara..."
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && gameModes.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : gameModes.length > 0 ? (
          <>
            {gameModes
              .filter((gm) => !filterCounts || (filterCounts[gm.name] || 0) > 0)
              .map((gm) => {
                const count = filterCounts?.[gm.name] || 0;
                return (
                  <label
                    key={gm.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGameModes.includes(gm.id.toString())}
                      onChange={() => onToggleGameMode(gm.id.toString())}
                      className="w-4 h-4 rounded border-cyan-500/50 bg-white/5 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors flex-1">
                      {gm.name}
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
                className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 py-1.5 hover:bg-cyan-500/10 rounded transition-colors"
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">Oyun modu bulunamadı</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 mt-2 pt-2">
        <input
          type="checkbox"
          checked={selectedGameModes.includes(otherFilterId)}
          onChange={() => onToggleGameMode(otherFilterId)}
          className="w-4 h-4 rounded border-cyan-500/50 bg-white/5 text-cyan-500 focus:ring-cyan-500/30 focus:ring-offset-0"
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white transition-colors flex-1 italic">
          Diğer (Oyun Modu Yok)
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
