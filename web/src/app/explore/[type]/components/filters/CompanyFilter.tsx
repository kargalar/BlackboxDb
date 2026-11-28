import { useTranslations as useUiTranslations } from 'next-intl';
import { Building2, Loader2 } from 'lucide-react';
import { FilterSection } from './FilterSection';
import { useScrollableFilter } from './useScrollableFilter';
import { LIST_COMPANIES } from '@/services/graphql/admin/adminCategories';

interface CompanyData {
  id: number;
  name: string;
  [key: string]: any;
}

interface CompanyFilterProps {
  companies: CompanyData[];
  selectedCompanies: (number | string)[];
  isExpanded: boolean;
  onToggleSection: () => void;
  onToggleCompany: (companyId: number | string) => void;
  onClear: () => void;
  filterCounts?: Record<number | string, number>;
  otherFilterId: string;
  contentTypeId?: number;
}

export function CompanyFilter({
  companies: initialCompanies,
  selectedCompanies,
  isExpanded,
  onToggleSection,
  onToggleCompany,
  onClear,
  filterCounts,
  otherFilterId,
  contentTypeId,
}: CompanyFilterProps) {
  const translateUi = useUiTranslations('Ui');
  const colorClass = 'text-cyan-400';
  const hoverClass = 'hover:text-cyan-300';
  const bgHoverClass = 'hover:bg-cyan-500/10';
  const borderClass = 'border-cyan-500/50';
  const textClass = 'text-cyan-500';
  const focusClass = 'focus:ring-cyan-500/30';

  const {
    displayItems: companies,
    searchTerm,
    handleSearchChange,
    handleScroll,
    scrollRef,
    isSearching,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useScrollableFilter({
    initialItems: initialCompanies,
    gqlQuery: LIST_COMPANIES,
    dataKey: 'listCompanies',
    extraVariables: contentTypeId ? { contentTypeId } : {},
  });

  return (
    <FilterSection
      title={translateUi("sirketler_6065255")}
      icon={<Building2 className={`w-4 h-4 ${colorClass}`} />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={selectedCompanies.length}
      totalCount={filterCounts ? Object.keys(filterCounts).length : initialCompanies.length + 1}
      onClear={onClear}
      colorClass={colorClass}
    >
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={translateUi("sirket_ara_c1556a0")}
        className="w-full px-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/20"
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5"
      >
        {isSearching && companies.length === 0 ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            <span className="ml-2 text-xs text-white/40">{translateUi("araniyor_1f83d73")}</span>
          </div>
        ) : companies.length > 0 ? (
          <>
            {companies
              .filter((company) => !filterCounts || (filterCounts[company.id.toString()] || 0) > 0)
              .map((company) => {
                const count = filterCounts?.[company.id.toString()] || 0;
                return (
                  <label
                    key={company.id}
                    className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => onToggleCompany(company.id)}
                      className={`w-4 h-4 rounded ${borderClass} bg-white/5 ${textClass} ${focusClass} focus:ring-offset-0`}
                    />
                    <span className="ml-2 text-sm text-white/70 group-hover:text-white transition-colors truncate flex-1">
                      {company.name}
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
                <span className="ml-1 text-xs text-white/30">{translateUi("yukleniyor_317109f")}</span>
              </div>
            )}
            {hasMore && !isLoadingMore && (
              <button
                onClick={loadMore}
                className={`w-full text-center text-xs ${colorClass} ${hoverClass} py-1.5 ${bgHoverClass} rounded transition-colors`}
              >
                {translateUi("daha_fazla_yukle_d36c840")}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-white/30 py-2">{translateUi("sirket_bulunamadi_4a2fc4d")}</p>
        )}
      </div>
      <label className="flex items-center cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors border-t border-white/5 pt-2 mt-1">
        <input
          type="checkbox"
          checked={selectedCompanies.includes(otherFilterId)}
          onChange={() => onToggleCompany(otherFilterId)}
          className={`w-4 h-4 rounded ${borderClass} bg-white/5 ${textClass} ${focusClass} focus:ring-offset-0`}
        />
        <span className="ml-2 text-sm text-white/50 group-hover:text-white/70 transition-colors italic flex-1">
          {translateUi("diger_sirket_belirtilmemis_04fb743")}
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
