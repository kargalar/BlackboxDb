import { Clock } from 'lucide-react';
import { FilterSection } from './FilterSection';

interface DurationFilterProps {
  duration: { min: number | ''; max: number | '' };
  isExpanded: boolean;
  title?: string;
  defaultMax?: number;
  emptyMaxLabel?: string;
  unitLabel?: string;
  onToggleSection: () => void;
  onChange: (min: number | '', max: number | '') => void;
  onScroll: (e: React.WheelEvent<HTMLInputElement>, isMin: boolean) => void;
  onClear: () => void;
}

export function DurationFilter({
  duration,
  isExpanded,
  title = 'Süre (dk)',
  defaultMax = 500,
  emptyMaxLabel = 'Sınır yok',
  unitLabel = 'dk',
  onToggleSection,
  onChange,
  onScroll,
  onClear,
}: DurationFilterProps) {
  const minVal = duration.min === '' ? 0 : duration.min;
  const maxVal = duration.max === '' ? defaultMax : duration.max;
  const isFiltered = minVal > 0 || duration.max !== '';

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val === '' ? '' : parseInt(val, 10), duration.max);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(duration.min, val === '' ? '' : parseInt(val, 10));
  };

  return (
    <FilterSection
      title={title}
      icon={<Clock className="w-4 h-4 text-emerald-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      activeCount={isFiltered ? 1 : 0}
      onClear={onClear}
      colorClass="text-emerald-400"
    >
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          value={duration.min}
          onChange={handleMinChange}
          onWheel={(e) => onScroll(e, true)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all cursor-ns-resize"
        />
        <span className="text-white/40 font-bold">-</span>
        <input
          type="number"
          min="0"
          value={duration.max}
          onChange={handleMaxChange}
          onWheel={(e) => onScroll(e, false)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all cursor-ns-resize"
        />
      </div>
      <div className="flex items-center justify-between text-xs text-white/40 px-1">
        <span>
          {minVal} {unitLabel}
        </span>
        <div className="h-1 flex-1 mx-2 bg-emerald-500/30 rounded-full" />
        <span>{duration.max === '' ? emptyMaxLabel : `${maxVal} ${unitLabel}`}</span>
      </div>
    </FilterSection>
  );
}
