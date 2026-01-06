import type {
    TimerMode,
    TimerStatus,
    TomatoSession,
} from './types';
import * as storage from './storage';

export interface AppState {
    mode: TimerMode;
    remainingMs: number;
    totalMs: number;
    status: TimerStatus;
    tomatoSession: TomatoSession;
    cyclePosition: number;
    ambientSoundId: string;
    isAmbientEnabled: boolean;
}

type StateListener = (state: AppState) => void;

export class Store {
    private state: AppState;
    private listeners: Set<StateListener> = new Set();

    constructor() {
        this.state = {
            mode: storage.getCurrentMode(),
            remainingMs: 0,
            totalMs: 0,
            status: 'idle',
            tomatoSession: 'work',
            cyclePosition: 0,
            ambientSoundId: storage.getAmbientSoundId(),
            isAmbientEnabled: storage.isAmbientEnabled(),
        };

        this.init();
    }

    private init() {
        if (this.state.mode === 'egg') {
            const lastDuration = storage.getEggLastDuration();
            this.state.totalMs = lastDuration;
            this.state.remainingMs = lastDuration;
        } else {
            this.initTomatoSessionState();
        }
    }

    getState(): AppState {
        return { ...this.state };
    }

    subscribe(listener: StateListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        const snapshot = this.getState();
        this.listeners.forEach((l) => l(snapshot));
    }

    // Actions
    setMode(mode: TimerMode) {
        if (mode === this.state.mode) return;

        this.state.mode = mode;
        this.state.status = 'idle';
        storage.setCurrentMode(mode);

        if (mode === 'egg') {
            this.state.totalMs = storage.getEggLastDuration();
            this.state.remainingMs = this.state.totalMs;
        } else {
            this.state.tomatoSession = 'work';
            this.state.cyclePosition = 0;
            this.initTomatoSessionState();
        }
        this.notify();
    }

    setDuration(ms: number) {
        this.state.totalMs = ms;
        this.state.remainingMs = ms;
        if (this.state.mode === 'egg') {
            storage.setEggLastDuration(ms);
        }
        this.notify();
    }

    setStatus(status: TimerStatus) {
        this.state.status = status;
        this.notify();
    }

    updateRemaining(ms: number) {
        this.state.remainingMs = ms;
        this.notify();
    }

    // Tomato Logic
    initTomatoSessionState() {
        const settings = storage.getTomatoSettings();
        let minutes: number;

        switch (this.state.tomatoSession) {
            case 'work':
                minutes = settings.workMinutes;
                break;
            case 'short':
                minutes = settings.shortBreakMinutes;
                break;
            case 'long':
                minutes = settings.longBreakMinutes;
                break;
        }

        this.state.totalMs = minutes * 60 * 1000;
        this.state.remainingMs = this.state.totalMs;
    }

    advanceTomatoSession() {
        if (this.state.tomatoSession === 'work') {
            this.state.cyclePosition++;
            const settings = storage.getTomatoSettings();

            if (this.state.cyclePosition >= settings.sessionsBeforeLongBreak) {
                this.state.tomatoSession = 'long';
                this.state.cyclePosition = 0;
            } else {
                this.state.tomatoSession = 'short';
            }
        } else {
            this.state.tomatoSession = 'work';
        }

        this.initTomatoSessionState();
        this.state.status = 'idle';
        this.notify();
    }

    setAmbientSound(id: string) {
        this.state.ambientSoundId = id;
        storage.setAmbientSoundId(id);
        this.notify();
    }

    toggleAmbient() {
        this.state.isAmbientEnabled = !this.state.isAmbientEnabled;
        storage.setAmbientEnabled(this.state.isAmbientEnabled);
        this.notify();
    }
}
