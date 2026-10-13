'use client';

import React, { useState, useEffect } from 'react';
import { getPreciseTimeUntil } from '@/lib/date-utils';

interface ContentCountdownProps {
  releaseDate: string;
}

export default function ContentCountdown({ releaseDate }: ContentCountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Update every minute because the display includes minutes near release.
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const timeUntil = getPreciseTimeUntil(releaseDate, now);

  const formattedDate = (() => {
    if (!releaseDate) return '';
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(releaseDate);
    const date = isDateOnly ? new Date(`${releaseDate}T00:00:00.000Z`) : new Date(releaseDate);
    if (Number.isNaN(date.getTime())) return '';

    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    if (date.getFullYear() !== new Date().getFullYear()) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString('tr-TR', options);
  })();

  if (!timeUntil) return null;

  const isReleased = timeUntil.isReleased;
  const showMinutes = timeUntil.days === 0 && timeUntil.hours === 0;

  return (
    <div className="glass-card p-4 mt-4 max-w-[300px] flex flex-col items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
          Geri Sayım
        </span>
        {formattedDate && (
          <span className="text-xs text-white/60 font-medium">{formattedDate}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {isReleased ? (
          <div className="relative flex items-center justify-center bg-surface-panel rounded text-green-400 font-mono font-black text-xs px-4 h-9 shadow-lg border border-green-500/20">
            <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-black/90 shadow-[0_1px_0_rgba(255,255,255,0.1)] z-10"></div>
            <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-white/10 rounded-t"></div>
            <span className="relative z-0 leading-none tracking-widest">YAYINDA</span>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-1">
              <div className="relative flex items-center justify-center bg-surface-raised rounded text-white font-mono font-black text-xl px-2.5 min-w-[40px] h-9 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/5">
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-black/90 shadow-[0_1px_0_rgba(255,255,255,0.05)] z-10"></div>
                <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-white/5 rounded-t"></div>
                <span className="relative z-0 leading-none">
                  {timeUntil.days.toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-medium">
                Gün
              </span>
            </div>

            <span className="text-white/20 font-bold text-lg -mt-4">:</span>

            <div className="flex flex-col items-center gap-1">
              <div className="relative flex items-center justify-center bg-surface-raised rounded text-white font-mono font-black text-xl px-2.5 min-w-[40px] h-9 shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/5">
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-black/90 shadow-[0_1px_0_rgba(255,255,255,0.05)] z-10"></div>
                <div className="absolute top-0 left-0 right-0 bottom-1/2 bg-white/5 rounded-t"></div>
                <span className="relative z-0 leading-none">
                  {(showMinutes ? timeUntil.minutes : timeUntil.hours).toString().padStart(2, '0')}
                </span>
              </div>
              <span className="text-[9px] text-white/40 uppercase tracking-widest font-medium">
                {showMinutes ? 'Dakika' : 'Saat'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
