'use client';

import { useState } from 'react';

interface StarsProps {
  value?: number | null;
  onChange?: (v: number | null) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

const Stars = ({ value = 0, onChange, size = 'md', disabled = false }: StarsProps) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayPoints: number = !disabled && hoverValue !== null ? hoverValue : Number(value ?? 0);

  const getBlockStyles = (index: number, isActive: boolean) => {
    if (!isActive) return 'text-neutral-600 bg-transparent border-transparent hover:bg-white/5';

    const styles = [
      'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]', // 1
      'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.2)]', // 2
      'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]', // 3
      'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]', // 4
      'bg-lime-500/20 border-lime-500/50 text-lime-400 shadow-[0_0_10px_rgba(132,204,22,0.2)]', // 5
      'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]', // 6
      'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]', // 7
      'bg-teal-500/20 border-teal-500/50 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]', // 8
      'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]', // 9
      'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]', // 10
    ];

    return styles[index - 1];
  };

  const getTextColor = (points: number) => {
    const colors = [
      'text-neutral-600 drop-shadow-none',
      'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]',
      'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]',
      'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]',
      'text-lime-500 drop-shadow-[0_0_8px_rgba(132,204,22,0.5)]',
      'text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]',
      'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      'text-teal-500 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]',
      'text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]',
      'text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    ];
    return colors[points] || colors[0];
  };

  const handleRatingClick = (i: number) => {
    if (disabled) return;
    if (value === i) {
      onChange?.(null);
    } else {
      onChange?.(i);
    }
  };

  return (
    <div className={`flex items-center group w-full ${size === 'sm' ? 'gap-2' : 'gap-3'}`}>
      {/* 10 Numbered Blocks Container */}
      <div
        className={`flex flex-1 items-center bg-black/40 backdrop-blur-md rounded-lg border border-white/5 shadow-inner w-full overflow-hidden ${size === 'sm' ? 'p-px gap-px' : 'p-0.5 gap-0.5'}`}
        onMouseLeave={() => setHoverValue(null)}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => {
          const isActive = displayPoints >= i;

          return (
            <button
              key={i}
              onMouseEnter={() => !disabled && setHoverValue(i)}
              onClick={() => handleRatingClick(i)}
              className={`
                relative flex-1 flex items-center justify-center font-semibold transition-all duration-300 border
                ${size === 'sm' ? 'h-7 text-[10px] rounded' : 'h-9 text-xs rounded-md'}
                ${getBlockStyles(i, isActive)}
                ${disabled ? 'cursor-default opacity-50' : 'hover:scale-110 hover:z-10'}
              `}
            >
              {i}
            </button>
          );
        })}
      </div>

      {/* Selected Score Display */}
      <div
        className={`flex items-center justify-end ${size === 'sm' ? 'min-w-[1.5rem]' : 'min-w-[2rem]'}`}
      >
        <span
          className={`font-black tabular-nums tracking-tighter transition-all duration-300 ${size === 'sm' ? 'text-xl' : 'text-2xl'} ${getTextColor(value ?? 0)}`}
        >
          {(value ?? 0) > 0 ? value : '-'}
        </span>
      </div>
    </div>
  );
};

export default Stars;
