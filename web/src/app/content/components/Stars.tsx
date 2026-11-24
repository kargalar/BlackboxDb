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
    if (!isActive) return 'text-neutral-600 bg-transparent hover:bg-white/5';

    const styles = [
      'bg-red-500/20 text-red-400', // 1
      'bg-orange-500/20 text-orange-400', // 2
      'bg-amber-500/20 text-amber-400', // 3
      'bg-yellow-500/20 text-yellow-400', // 4
      'bg-lime-500/20 text-lime-400', // 5
      'bg-green-500/20 text-green-400', // 6
      'bg-emerald-500/20 text-emerald-400', // 7
      'bg-teal-500/20 text-teal-400', // 8
      'bg-[#06b6d4]/20 text-[#22d3ee]', // 9
      'bg-[#3b82f6]/20 text-[#60a5fa]', // 10
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
      'text-[#06b6d4] drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]',
      'text-[#3b82f6] drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]',
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
        className="flex flex-1 items-center bg-black/40 backdrop-blur-md border border-white/5 shadow-inner w-full overflow-hidden"
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
                relative flex-1 flex items-center justify-center rounded-none font-semibold transition-colors duration-300
                ${size === 'sm' ? 'h-7 text-[10px]' : 'h-9 text-xs'}
                ${getBlockStyles(i, isActive)}
                ${disabled ? 'cursor-default opacity-50' : ''}
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
