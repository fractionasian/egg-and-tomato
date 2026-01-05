import type { TimerStatus } from './types';

export type TimerCallback = (remainingMs: number, status: TimerStatus) => void;
export type CompleteCallback = () => void;

interface TimerInstance {
    start: () => void;
    pause: () => void;
    reset: (newDurationMs?: number) => void;
    getRemaining: () => number;
    getStatus: () => TimerStatus;
    destroy: () => void;
}

export function createTimer(
    initialMs: number,
    onTick: TimerCallback,
    onComplete: CompleteCallback
): TimerInstance {
    let remainingMs = initialMs;
    let totalMs = initialMs;
    let status: TimerStatus = 'idle';
    let intervalId: number | null = null;
    let lastTickTime: number = 0;

    const tick = () => {
        const now = performance.now();
        const elapsed = now - lastTickTime;
        lastTickTime = now;

        remainingMs = Math.max(0, remainingMs - elapsed);
        onTick(remainingMs, status);

        if (remainingMs <= 0) {
            stop();
            status = 'idle';
            onComplete();
        }
    };

    const stop = () => {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };

    return {
        start() {
            if (status === 'running') return;
            if (remainingMs <= 0) {
                remainingMs = totalMs;
            }
            status = 'running';
            lastTickTime = performance.now();
            intervalId = window.setInterval(tick, 100); // Update every 100ms for smooth display
            onTick(remainingMs, status);
        },

        pause() {
            if (status !== 'running') return;
            stop();
            status = 'paused';
            onTick(remainingMs, status);
        },

        reset(newDurationMs?: number) {
            stop();
            if (newDurationMs !== undefined) {
                totalMs = newDurationMs;
            }
            remainingMs = totalMs;
            status = 'idle';
            onTick(remainingMs, status);
        },

        getRemaining() {
            return remainingMs;
        },

        getStatus() {
            return status;
        },

        destroy() {
            stop();
        }
    };
}

// Format milliseconds as MM:SS
export function formatTime(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format as HH:MM:SS for longer durations
export function formatTimeLong(ms: number): string {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Calculate progress (0 to 1)
export function calculateProgress(remainingMs: number, totalMs: number): number {
    if (totalMs <= 0) return 0;
    return 1 - (remainingMs / totalMs);
}
