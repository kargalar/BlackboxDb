import { Eye, Clock, Play, Heart, Ban } from 'lucide-react';
import { FilterSection } from './FilterSection';

interface HideOptionsFilterProps {
  hideWatched: boolean;
  hideWatchlist: boolean;
  hideContinuing: boolean;
  hideFavorites: boolean;
  hideAbandoned: boolean;
  isExpanded: boolean;
  onToggleSection: () => void;
  onChange: (
    key: 'hideWatched' | 'hideWatchlist' | 'hideContinuing' | 'hideFavorites' | 'hideAbandoned',
    value: boolean
  ) => void;
}

export function HideOptionsFilter({
  hideWatched,
  hideWatchlist,
  hideContinuing,
  hideFavorites,
  hideAbandoned,
  isExpanded,
  onToggleSection,
  onChange,
}: HideOptionsFilterProps) {
  return (
    <FilterSection
      title="Gizle"
      icon={<Eye className="w-4 h-4 text-violet-400" />}
      isExpanded={isExpanded}
      onToggle={onToggleSection}
      colorClass="text-violet-400"
    >
      <div className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">
              İzlenenleri Gizle
            </span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={hideWatched}
              onChange={(e) => onChange('hideWatched', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">
              Sonra İzle&apos;yi Gizle
            </span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={hideWatchlist}
              onChange={(e) => onChange('hideWatchlist', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">
              Devam Edenleri Gizle
            </span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={hideContinuing}
              onChange={(e) => onChange('hideContinuing', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">
              Favorileri Gizle
            </span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={hideFavorites}
              onChange={(e) => onChange('hideFavorites', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-white/70 group-hover:text-white transition-colors">
              Yarıda Bırakılanları Gizle
            </span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={hideAbandoned}
              onChange={(e) => onChange('hideAbandoned', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
          </div>
        </label>
      </div>
    </FilterSection>
  );
}
