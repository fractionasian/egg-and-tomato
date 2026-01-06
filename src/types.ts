// Timer state types
export type TimerMode = 'egg' | 'tomato';
export type TomatoSession = 'work' | 'short' | 'long';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  remainingMs: number;
  totalMs: number;
  ambientSoundId: string | null;
  isAmbientEnabled: boolean;
}

export interface EggState extends TimerState {
  mode: 'egg';
  lastDurationMs: number;
}

export interface TomatoState extends TimerState {
  mode: 'tomato';
  session: TomatoSession;
  completedPomodoros: number;
  cyclePosition: number; // 0-3, after 4 work sessions = long break
}

// Settings
export interface EggSettings {
  presets: number[]; // in minutes
}

export interface TomatoSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
}

// Stats
export interface TomatoStats {
  todayCount: number;
  todayDate: string; // ISO date for tracking new day
  totalCount: number;
  currentStreak: number;
  lastSessionDate: string;
  history: Record<string, number>; // "YYYY-MM-DD": count
}

// Theme
export type ThemeId = 'default' | 'ocean' | 'sakura' | 'forest' | 'midnight' | 'candy';

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  isPremium: boolean;
}

export type AmbientSoundId = 'none' | 'rain' | 'forest' | 'brown_noise' | 'white_noise';

export interface AmbientSound {
  id: AmbientSoundId;
  name: string;
  url: string; // or 'generated' for noise
}


// Storage keys
export const STORAGE_KEYS = {
  // Mode
  currentMode: 'timer_mode',

  // Egg
  eggLastDuration: 'egg_last_duration',

  // Tomato
  tomatoSettings: 'tomato_settings',
  tomatoStats: 'tomato_stats',
  tomatoState: 'tomato_state',

  // Theme
  theme: 'timer_theme',
  darkMode: 'timer_dark_mode',

  // Ambient
  ambientSound: 'timer_ambient_sound_id',
  ambientEnabled: 'timer_ambient_enabled',

  // Premium
  unlockCode: 'unlock_code',
} as const;
