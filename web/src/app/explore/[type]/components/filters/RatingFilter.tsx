import { Star } from 'lucide-react';
import { FilterSection } from './FilterSection';

interface RatingFilterProps {
  rating: { min: number | ''; max: number | '' };
  isExpanded: boolean;
  onToggleSection: () => void;
  onChange: (min: number | '', max: number | '') => void;
  onScroll: (e: React.WheelEvent<HTMLInputElement>, isMin: boolean) => void;
  onClear: () => void;
}

export function RatingFilter({
  rating,
  isExpanded,
  onToggleSection,
  onChange,
  onScroll,
  onClear,
}: RatingFilterProps) {
  const minVal = rating.min === '' ? 0 : rating.min;
  const maxVal = rating.max === '' ? 10 : rating.max;
  const isFiltered = minVal > 0 || maxVal < 10;

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val === '' ? '' : parseFloat(val), rating.max);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(rating.min, val === '' ? '' : parseFloat(val));
  };

  return (
    <FilterSection
      title="Puan"
      icon={<Star className="w-4 h-4 text-amber-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={isFiltered ? 1 : 0}
      onClear={onClear}
      colorClass="text-amber-400"
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="10"
          step="1"
          value={rating.min}
          onChange={handleMinChange}
          onWheel={(e) => onScroll(e, true)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all cursor-ns-resize"
        />
        <span className="text-white/40 font-bold">-</span>
        <input
          type="number"
          min="0"
          max="10"
          step="1"
          value={rating.max}
          onChange={handleMaxChange}
          onWheel={(e) => onScroll(e, false)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all cursor-ns-resize"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-white/40 px-1">
        <span>{minVal}</span>
        <div className="h-1 flex-1 mx-2 bg-amber-500/30 rounded-full" />
        <span>{maxVal}</span>
      </div>
    </FilterSection>
  );
}
