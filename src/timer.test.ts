import { describe, it, expect, vi } from 'vitest';
import { createTimer, formatTime } from './timer';

describe('Timer Logic', () => {
  it('formats time correctly', () => {
    expect(formatTime(65000)).toBe('01:05');
    expect(formatTime(3600000)).toBe('60:00');
    expect(formatTime(0)).toBe('00:00');
  });

  it('runs the timer callback', () => {
    vi.useFakeTimers();
    const onTick = vi.fn();
    const onComplete = vi.fn();

    const timer = createTimer(1000, onTick, onComplete);
    timer.start();

    expect(onTick).toHaveBeenCalled(); // Initial tick

    vi.advanceTimersByTime(500);
    expect(onTick).toHaveBeenCalled();

    vi.advanceTimersByTime(500); // Complete
    expect(onComplete).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
