import React from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  adjustPlaytime,
  getPlaytimeStep,
  handlePlaytimeKeyDown,
  type PlaytimeUnit,
} from '../playtimeStep';

interface PlaytimeControlProps {
  t: any;
  localPlaytime: number;
  playtimeMinutes: number;
  setLocalPlaytime: (val: number) => void;
  handlePlaytimeChange: (val: number) => void;
}

const PlaytimeControl: React.FC<PlaytimeControlProps> = ({
  t,
  localPlaytime,
  playtimeMinutes,
  setLocalPlaytime,
  handlePlaytimeChange,
}) => {
  const saveStep = (unit: PlaytimeUnit, step: number) => {
    const total = adjustPlaytime(localPlaytime, unit, step);
    if (total !== localPlaytime) handlePlaytimeChange(total);
  };

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between">
        {t('titles.playtime')}
      </h4>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col items-center justify-center gap-4 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-center gap-4">
            {/* Hours Control */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {t('labels.hours')}
              </span>
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-neutral-700 transition-all duration-200">
                <button
                  type="button"
                  onClick={(event) => saveStep('hours', -getPlaytimeStep(event))}
                  className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(event) =>
                    handlePlaytimeKeyDown(event, (step) =>
                      setLocalPlaytime(adjustPlaytime(localPlaytime, 'hours', step))
                    )
                  }
                  value={localPlaytime ? Math.floor(localPlaytime / 60) : ''}
                  onChange={(e) => {
                    const newHours = Math.max(0, parseInt(e.target.value) || 0);
                    const currentMinutes = (localPlaytime || 0) % 60;
                    setLocalPlaytime(newHours * 60 + currentMinutes);
                  }}
                  onBlur={() => {
                    if (localPlaytime !== playtimeMinutes) {
                      handlePlaytimeChange(localPlaytime);
                    }
                  }}
                  placeholder="0"
                  className="w-12 bg-transparent border-none text-center font-bold text-lg text-white focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={(event) => saveStep('hours', getPlaytimeStep(event))}
                  className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="text-neutral-700 font-bold text-xl self-end mb-1">:</div>

            {/* Minutes Control */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {t('labels.minutes')}
              </span>
              <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden focus-within:border-neutral-700 transition-all duration-200">
                <button
                  type="button"
                  onClick={(event) => saveStep('minutes', -getPlaytimeStep(event))}
                  className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="0"
                  max="59"
                  onKeyDown={(event) =>
                    handlePlaytimeKeyDown(event, (step) =>
                      setLocalPlaytime(adjustPlaytime(localPlaytime, 'minutes', step))
                    )
                  }
                  value={localPlaytime ? localPlaytime % 60 : ''}
                  onChange={(e) => {
                    const newMinutes = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
                    const currentHours = Math.floor((localPlaytime || 0) / 60);
                    setLocalPlaytime(currentHours * 60 + newMinutes);
                  }}
                  onBlur={() => {
                    if (localPlaytime !== playtimeMinutes) {
                      handlePlaytimeChange(localPlaytime);
                    }
                  }}
                  placeholder="0"
                  className="w-12 bg-transparent border-none text-center font-bold text-lg text-white focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={(event) => saveStep('minutes', getPlaytimeStep(event))}
                  className="px-2 py-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaytimeControl;
