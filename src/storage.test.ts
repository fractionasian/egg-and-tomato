import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as storage from './storage';
import { STORAGE_KEYS } from './types';

describe('Storage Logic', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        localStorage.clear();
    });

    describe('Tomato Settings', () => {
        it('returns default settings when empty', () => {
            const settings = storage.getTomatoSettings();
            expect(settings).toEqual(storage.DEFAULT_TOMATO_SETTINGS);
        });

        it('saves and retrieves settings', () => {
            const newSettings = { ...storage.DEFAULT_TOMATO_SETTINGS, workMinutes: 50 };
            storage.setTomatoSettings(newSettings);
            expect(storage.getTomatoSettings()).toEqual(newSettings);
            expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.tomatoSettings)!)).toEqual(newSettings);
        });
    });

    describe('Egg Mode', () => {
        it('persists last duration', () => {
            storage.setEggLastDuration(12345);
            expect(storage.getEggLastDuration()).toBe(12345);
        });

        it('returns default if missing', () => {
            expect(storage.getEggLastDuration()).toBe(300000); // 5 min default
        });
    });

    describe('App Mode', () => {
        it('defaults to tomato', () => {
            expect(storage.getCurrentMode()).toBe('tomato');
        });

        it('persists mode selection', () => {
            storage.setCurrentMode('egg');
            expect(storage.getCurrentMode()).toBe('egg');
        });
    });

    describe('Dark Mode', () => {
        it('defaults to auto', () => {
            expect(storage.getDarkMode()).toBe('auto');
        });

        it('persists dark mode setting', () => {
            storage.setDarkMode('dark');
            expect(storage.getDarkMode()).toBe('dark');
        });
    });

    describe('Tomato Stats', () => {
        it('initializes with zero stats', () => {
            const stats = storage.getTomatoStats();
            expect(stats.totalCount).toBe(0);
            expect(stats.currentStreak).toBe(0);
        });

        it('increments stats correctly', () => {
            storage.incrementTomatoStats();
            const stats = storage.getTomatoStats();
            expect(stats.todayCount).toBe(1);
            expect(stats.totalCount).toBe(1);
        });

        it('resets today count on new day', () => {
            // Simulate yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const oldStats = {
                todayCount: 5,
                todayDate: yesterdayStr,
                totalCount: 10,
                currentStreak: 2,
                lastSessionDate: yesterdayStr
            };

            localStorage.setItem(STORAGE_KEYS.tomatoStats, JSON.stringify(oldStats));

            const stats = storage.getTomatoStats();
            expect(stats.todayCount).toBe(0); // Reset
            expect(stats.totalCount).toBe(10); // Kept
            expect(stats.todayDate).toBe(new Date().toISOString().split('T')[0]); // Updated
        });
        it('tracks history correctly', () => {
            storage.incrementTomatoStats();
            storage.incrementTomatoStats();
            const stats = storage.getTomatoStats();
            const today = new Date().toISOString().split('T')[0];
            expect(stats.history[today]).toBe(2);
        });
    });
});
