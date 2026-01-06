import { STORAGE_KEYS } from './types';
import type { TomatoSettings, TomatoStats, ThemeId } from './types';

// Default values
export const DEFAULT_TOMATO_SETTINGS: TomatoSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
};

export const DEFAULT_EGG_PRESETS = [1, 3, 5, 10, 15, 30]; // minutes

const UNLOCK_CODES = ['COFFEE2024', 'SUPPORTER', 'EGGTOMATO'];

// Generic helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Mode
export function getCurrentMode(): 'egg' | 'tomato' {
  return (localStorage.getItem(STORAGE_KEYS.currentMode) as 'egg' | 'tomato') || 'tomato';
}

export function setCurrentMode(mode: 'egg' | 'tomato'): void {
  localStorage.setItem(STORAGE_KEYS.currentMode, mode);
}

// Egg
export function getEggLastDuration(): number {
  return getItem(STORAGE_KEYS.eggLastDuration, 5 * 60 * 1000); // 5 min default
}

export function setEggLastDuration(ms: number): void {
  setItem(STORAGE_KEYS.eggLastDuration, ms);
}

// Tomato Settings
export function getTomatoSettings(): TomatoSettings {
  return getItem(STORAGE_KEYS.tomatoSettings, DEFAULT_TOMATO_SETTINGS);
}

export function setTomatoSettings(settings: TomatoSettings): void {
  setItem(STORAGE_KEYS.tomatoSettings, settings);
}

// Tomato Stats
function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function getTomatoStats(): TomatoStats {
  const stats = getItem<TomatoStats>(STORAGE_KEYS.tomatoStats, {
    todayCount: 0,
    todayDate: getToday(),
    totalCount: 0,
    currentStreak: 0,
    lastSessionDate: '',
    history: {},
  });

  // Migration: Ensure history exists if old data
  if (!stats.history) {
    stats.history = {};
  }

  // Reset today count if new day
  if (stats.todayDate !== getToday()) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = stats.lastSessionDate === yesterday.toISOString().split('T')[0];

    stats.todayCount = 0;
    stats.todayDate = getToday();

    // Reset streak if gap > 1 day
    if (!wasYesterday && stats.lastSessionDate !== getToday()) {
      stats.currentStreak = 0;
    }
  }

  return stats;
}

export function incrementTomatoStats(): TomatoStats {
  const stats = getTomatoStats();
  const today = getToday();

  stats.todayCount++;
  stats.totalCount++;

  // Update streak
  if (stats.lastSessionDate !== today) {
    stats.currentStreak++;
  }
  stats.lastSessionDate = today;

  // History
  stats.history[today] = (stats.history[today] || 0) + 1;

  setItem(STORAGE_KEYS.tomatoStats, stats);
  return stats;
}

// Theme
export function getTheme(): ThemeId {
  return (localStorage.getItem(STORAGE_KEYS.theme) as ThemeId) || 'default';
}

export function setTheme(theme: ThemeId): void {
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

// Dark Mode
export function getDarkMode(): 'auto' | 'light' | 'dark' {
  return (localStorage.getItem(STORAGE_KEYS.darkMode) as 'auto' | 'light' | 'dark') || 'auto';
}

export function setDarkMode(mode: 'auto' | 'light' | 'dark'): void {
  localStorage.setItem(STORAGE_KEYS.darkMode, mode);
}

// Premium
export function isPremium(): boolean {
  const code = localStorage.getItem(STORAGE_KEYS.unlockCode) || '';
  return UNLOCK_CODES.includes(code.toUpperCase());
}

export function tryUnlockCode(code: string): boolean {
  if (UNLOCK_CODES.includes(code.toUpperCase())) {
    localStorage.setItem(STORAGE_KEYS.unlockCode, code.toUpperCase());
    return true;
  }
  return false;
}

// Ambient
export function getAmbientSoundId(): string {
  return localStorage.getItem(STORAGE_KEYS.ambientSound) || 'none';
}

export function setAmbientSoundId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.ambientSound, id);
}

export function isAmbientEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.ambientEnabled) === 'true';
}

export function setAmbientEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.ambientEnabled, String(enabled));
}

