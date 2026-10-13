import { Calendar } from 'lucide-react';
import { FilterSection } from './FilterSection';

interface YearFilterProps {
  year: { min: number | ''; max: number | '' };
  isExpanded: boolean;
  onToggleSection: () => void;
  onChange: (min: number | '', max: number | '') => void;
  onScroll: (e: React.WheelEvent<HTMLInputElement>, isMin: boolean) => void;
  onClear: () => void;
}

export function YearFilter({
  year,
  isExpanded,
  onToggleSection,
  onChange,
  onScroll,
  onClear,
}: YearFilterProps) {
  const currentYear = new Date().getFullYear();
  const minVal = year.min === '' ? 1900 : year.min;
  const maxVal = year.max === '' ? currentYear : year.max;
  const isFiltered = minVal > 1900 || maxVal < currentYear;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val === '' ? '' : parseInt(val, 10), year.max);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(year.min, val === '' ? '' : parseInt(val, 10));
  };

  return (
    <FilterSection
      title="Yıl"
      icon={<Calendar className="w-4 h-4 text-fuchsia-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={isFiltered ? 1 : 0}
      onClear={onClear}
      colorClass="text-fuchsia-400"
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="1900"
          max={currentYear}
          value={year.min}
          onChange={handleMinChange}
          onWheel={(e) => onScroll(e, true)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all cursor-ns-resize"
        />
        <span className="text-white/40 font-bold">-</span>
        <input
          type="number"
          min="1900"
          max={currentYear}
          value={year.max}
          onChange={handleMaxChange}
          onWheel={(e) => onScroll(e, false)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all cursor-ns-resize"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-white/40 px-1">
        <span>{minVal}</span>
        <div className="h-1 flex-1 mx-2 bg-fuchsia-500/30 rounded-full" />
        <span>{maxVal}</span>
      </div>
    </FilterSection>
  );
}
