import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Clapperboard, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { apolloClient } from '@/lib/apollo-client';
import { LIST_ACTORS, LIST_DIRECTORS } from '@/services/graphql/admin';

interface PersonData {
  id: number;
  name: string;
}

const PAGE_SIZE = 50;

interface PersonFilterProps {
  title: string;
  type: 'actor' | 'director';
  persons: PersonData[];
  selectedPersons: (number | string)[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onTogglePerson: (personId: number | string) => void;
  onClear: () => void;
  filterCounts?: Record<number | string, number>;
  otherFilterId: string;
}

export function PersonFilter({
  title,
  type,
  persons: initialPersons,
  selectedPersons,
  isExpanded,
  onToggleSection,
  onTogglePerson,
  onClear,
  filterCounts,
  otherFilterId,
}: PersonFilterProps) {
  const isActor = type === 'actor';
  const Icon = isActor ? User : Clapperboard;
  const colorClass = isActor ? 'text-green-400' : 'text-orange-400';
  const hoverClass = isActor ? 'hover:text-green-300' : 'hover:text-orange-300';
  const bgHoverClass = isActor ? 'hover:bg-green-500/10' : 'hover:bg-orange-500/10';
  const borderClass = isActor ? 'border-green-500/50' : 'border-orange-500/50';
  const textClass = isActor ? 'text-green-500' : 'text-orange-500';
  const focusClass = isActor ? 'focus:ring-green-500/30' : 'focus:ring-orange-500/30';

  const [searchTerm, setSearchTerm] = useState('');
  const [displayPersons, setDisplayPersons] = useState<PersonData[]>(initialPersons);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPersons.length >= PAGE_SIZE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update displayPersons when initialPersons change (initial load)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setDisplayPersons(initialPersons);
      setHasMore(initialPersons.length >= PAGE_SIZE);
    }
  }, [initialPersons, searchTerm]);

  // Debounced API search
  const searchAPI = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setDisplayPersons(initialPersons);
        setHasMore(initialPersons.length >= PAGE_SIZE);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const gqlQuery = isActor ? LIST_ACTORS : LIST_DIRECTORS;
        const dataKey = isActor ? 'listActors' : 'listDirectors';

        const { data } = await apolloClient.query<Record<string, PersonData[]>>({
          query: gqlQuery,
          variables: { limit: PAGE_SIZE, offset: 0, search: query.trim() },
          fetchPolicy: 'network-only',
        });

        const results = data?.[dataKey] || [];
        setDisplayPersons(results);
        setHasMore(results.length >= PAGE_SIZE);
        console.log(
          `🔍 [PersonFilter] API search "${query}" → ${results.length} ${isActor ? 'actors' : 'directors'}`
        );
      } catch (error) {
        console.error(`❌ [PersonFilter] Search error:`, error);
      } finally {
        setIsSearching(false);
      }
    },
    [isActor, initialPersons]
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setDisplayPersons(initialPersons);
      setHasMore(initialPersons.length >= PAGE_SIZE);
      setIsSearching(false);
      return;
    }

    if (value.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(() => searchAPI(value), 300);
    }
  };

  // Load more on scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const gqlQuery = isActor ? LIST_ACTORS : LIST_DIRECTORS;
      const dataKey = isActor ? 'listActors' : 'listDirectors';

      const variables: any = {
        limit: PAGE_SIZE,
        offset: displayPersons.length,
      };
      if (searchTerm.trim()) {
        variables.search = searchTerm.trim();
      }

      const { data } = await apolloClient.query<Record<string, PersonData[]>>({
        query: gqlQuery,
        variables,
        fetchPolicy: 'network-only',
      });

      const newResults = data?.[dataKey] || [];
      if (newResults.length > 0) {
        // Deduplicate by id
        const existingIds = new Set(displayPersons.map((p) => p.id));
        const uniqueNew = newResults.filter((p) => !existingIds.has(p.id));
        setDisplayPersons((prev) => [...prev, ...uniqueNew]);
        console.log(
          `📜 [PersonFilter] Loaded ${uniqueNew.length} more (total: ${displayPersons.length + uniqueNew.length})`
        );
      }
      setHasMore(newResults.length >= PAGE_SIZE);
    } catch (error) {
      console.error(`❌ [PersonFilter] Load more error:`, error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, displayPersons, searchTerm, isActor]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      loadMore();
    }
  }, [loadMore, isLoadingMore, hasMore]);

  return (
    <FilterSection
      title={title}
      icon={<Icon className={`w-4 h-4 ${colorClass}`} />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedPersons.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialPersons.length + 1}
      onClear={onClear}
      colorClass={colorClass}
    >
      {/* Search field */}
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={`${isActor ? 'Oyuncu' : 'Yönetmen'} ara...`}
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && displayPersons.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">Aranıyor...</span>
          </div>
        ) : displayPersons.length > 0 ? (
          <>
            {displayPersons
              .filter((person) => !filterCounts || (filterCounts[person.id.toString()] || 0) > 0)
              .map((person) => {
                const count = filterCounts?.[person.id.toString()] || 0;
                return (
                  <label
                    key={person.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPersons.includes(person.id)}
                      onChange={() => onTogglePerson(person.id)}
                      className={`w-4 h-4 rounded ${borderClass} bg-white/5 ${textClass} ${focusClass} focus:ring-offset-0`}
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors truncate flex-1">
                      {person.name}
                    </span>
                    {count > 0 && (
                      <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full ml-1">
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
                className={`w-full text-center text-xs ${colorClass} ${hoverClass} py-1.5 ${bgHoverClass} rounded transition-colors`}
              >
                Daha fazla yükle...
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">{isActor ? 'Oyuncu' : 'Yönetmen'} bulunamadı</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 pt-2 mt-1">
        <input
          type="checkbox"
          checked={selectedPersons.includes(otherFilterId)}
          onChange={() => onTogglePerson(otherFilterId)}
          className={`w-4 h-4 rounded ${borderClass} bg-white/5 ${textClass} ${focusClass} focus:ring-offset-0`}
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white/70 transition-colors italic flex-1">
          Diğer ({isActor ? 'oyuncu' : 'yönetmen'} belirtilmemiş)
        </span>
        {(filterCounts?.[otherFilterId] || 0) > 0 && (
          <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full ml-1">
            {filterCounts?.[otherFilterId]}
          </span>
        )}
      </label>
    </FilterSection>
  );
}
