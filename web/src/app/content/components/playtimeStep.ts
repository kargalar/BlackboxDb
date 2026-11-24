import type { KeyboardEvent } from 'react';

export type PlaytimeUnit = 'hours' | 'minutes';

export function getPlaytimeStep({
  ctrlKey,
  shiftKey,
}: Pick<KeyboardEvent, 'ctrlKey' | 'shiftKey'>) {
  if (ctrlKey) return 10;
  return shiftKey ? 100 : 1;
}

export function adjustPlaytime(current: number, unit: PlaytimeUnit, step: number) {
  const minutes = current % 60;
  if (unit === 'hours') {
    const hours = Math.max(0, Math.floor(current / 60) + step);
    return hours * 60 + minutes;
  }

  if (step === -1 && minutes === 0) return current;
  return Math.max(0, current + step);
}

export function handlePlaytimeKeyDown(event: KeyboardEvent, onStep: (step: number) => void) {
  if (event.altKey || event.metaKey || (!event.ctrlKey && !event.shiftKey)) return;

  const { key } = event;
  const isPlus = key === '+' || (event.ctrlKey && key === '=');
  const isMinus = key === '-' || key === '_';
  if (!isPlus && !isMinus) return;

  event.preventDefault();
  const step = getPlaytimeStep(event);
  onStep(isPlus ? step : -step);
}
