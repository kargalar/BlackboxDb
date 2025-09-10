'use client';

import { useState, useEffect, useCallback } from 'react';

interface CountdownProps {
  date: string;
}

const Countdown: React.FC<CountdownProps> = ({ date }) => {
  const calculateTimeLeft = useCallback(() => {
    const difference = +new Date(date) - +new Date();
    if (difference <= 0) return null;

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
    } as const;
  }, [date]);

  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calculateTimeLeft>>(calculateTimeLeft());

  useEffect(() => {
    // Align update to the next minute, then update every minute
    const intervalRef = { current: null as number | null };
    const update = () => setTimeLeft(calculateTimeLeft());
    const now = new Date();
    const msUntilNextMinute = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());

    const timeoutId = window.setTimeout(() => {
      update();
      intervalRef.current = window.setInterval(update, 60000);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [date, calculateTimeLeft]);

  // Small flip unit component for a calendar-like leaf change effect
  const FlipUnit = ({ value, label, pad = 2 }: { value: number; label: string; pad?: number }) => {
    const [displayed, setDisplayed] = useState(value);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
      if (value === displayed) return;
      setAnimating(true);
      const t = window.setTimeout(() => {
        setDisplayed(value);
        setAnimating(false);
      }, 600);
      return () => window.clearTimeout(t);
    }, [value, displayed]);

    const fmt = (n: number) => (pad > 0 ? String(n).padStart(pad, '0') : String(n));

    return (
      <div className="flex flex-col items-center">
        <div className="relative flip-perspective">
          <div className="w-16 sm:w-20 h-20 sm:h-24 rounded-md overflow-hidden bg-neutral-800/70 dark:bg-neutral-900/80 shadow-md border border-neutral-700/40">
            <div className="relative w-full h-full">
              {/* previous value */}
              <div
                className={
                  'absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white ' +
                  (animating ? 'leaf-out' : 'opacity-0')
                }
                aria-hidden
              >
                {fmt(displayed)}
              </div>
              {/* current value */}
              <div
                className={
                  'absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white ' +
                  (animating ? 'leaf-in' : 'opacity-100')
                }
              >
                {fmt(value)}
              </div>
            </div>
          </div>
        </div>
        <span className="mt-2 text-[10px] sm:text-xs uppercase tracking-widest text-neutral-600 dark:text-neutral-300">
          {label}
        </span>
      </div>
    );
  };

  if (!timeLeft) {
    return <span>Time&apos;s up!</span>;
  }

  return (
    <div className="flex items-end gap-3 select-none">
      <FlipUnit value={timeLeft.days} label="Gün" pad={Math.max(2, String(timeLeft.days).length)} />
      <FlipUnit value={timeLeft.hours} label="Saat" pad={2} />
      <FlipUnit value={timeLeft.minutes} label="Dakika" pad={2} />

      <style jsx>{`
        .flip-perspective { perspective: 800px; }
        .leaf-out { animation: leafOut 600ms ease-in-out forwards; transform-origin: top; backface-visibility: hidden; }
        .leaf-in { animation: leafIn 600ms ease-in-out forwards; transform-origin: bottom; backface-visibility: hidden; }
        @keyframes leafOut {
          0% { transform: rotateX(0deg); opacity: 1; }
          100% { transform: rotateX(-90deg); opacity: 0; }
        }
        @keyframes leafIn {
          0% { transform: rotateX(90deg); opacity: 0; }
          100% { transform: rotateX(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Countdown;
