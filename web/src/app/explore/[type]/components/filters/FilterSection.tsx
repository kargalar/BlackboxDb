import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { ReactNode } from 'react';

interface FilterSectionProps {
  title: string;
  icon: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  activeCount?: number;
  totalCount?: number;
  onClear?: () => void;
  children: ReactNode;
  colorClass?: string;
}

export function FilterSection({
  title,
  icon,
  isExpanded,
  onToggle,
  activeCount = 0,
  totalCount,
  onClear,
  children,
  colorClass = 'text-violet-400',
}: FilterSectionProps) {
  const hasTotalCount = typeof totalCount === 'number' && totalCount > 0;
  const showCountBadge = activeCount > 0 || hasTotalCount;
  const countText = hasTotalCount ? `${activeCount}/${totalCount}` : `${activeCount}`;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-xl p-4 shadow-sm">
      <div
        onClick={onToggle}
        className="flex items-center justify-between w-full text-white font-semibold group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          {showCountBadge && (
            <span className={`text-xs ${colorClass} bg-white/10 px-1.5 py-0.5 rounded-full`}>
              {countText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
              title="Temizle"
            >
              <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
          )}
        </div>
      </div>
      {isExpanded && <div className="mt-3 space-y-1.5">{children}</div>}
    </div>
  );
}
