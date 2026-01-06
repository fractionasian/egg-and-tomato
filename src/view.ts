import type { AppState } from './store';
import * as storage from './storage';
import { formatTime, calculateProgress } from './timer';
import type { TomatoSession, TimerMode, TomatoSettings } from './types';

export interface ViewActions {
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onSwitchMode: (mode: TimerMode) => void;
  onSetDuration: (ms: number) => void;
  onSaveSettings: (settings: TomatoSettings) => void;
  onSaveDarkMode: (mode: 'auto' | 'light' | 'dark') => void;
  onSetAmbient: (id: string) => void;
  onToggleAmbient: () => void;
  onTestSound: () => void;
}

export class View {
  private app: HTMLElement;
  private actions: ViewActions;

  constructor(rootElement: HTMLElement, actions: ViewActions) {
    this.app = rootElement;
    this.actions = actions;
  }

  render(state: AppState) {
    const stats = storage.getTomatoStats();
    const settings = storage.getTomatoSettings();

    this.app.innerHTML = `
      <div class="mode-switch">
        <button id="mode-egg" aria-pressed="${state.mode === 'egg'}">🥚 egg</button>
        <button id="mode-tomato" aria-pressed="${state.mode === 'tomato'}">🍅 tomato</button>
      </div>
      
      <div class="timer-container ${state.status === 'running' ? 'running' : ''}">
        <svg class="progress-ring" viewBox="0 0 200 200">
          <circle class="ring-bg" cx="100" cy="100" r="90" />
          <circle 
            class="ring-progress" 
            cx="100" cy="100" r="90"
            style="stroke-dasharray: ${2 * Math.PI * 90}; stroke-dashoffset: ${2 * Math.PI * 90 * (1 - calculateProgress(state.remainingMs, state.totalMs))}"
          />
        </svg>
        <div class="timer-display">${formatTime(state.remainingMs)}</div>
      </div>
  
      ${state.mode === 'tomato'
        ? `
        <div class="session-label">${this.getSessionLabel(state.tomatoSession)}</div>
        <div class="pomo-dots">
          ${Array.from(
          { length: settings.sessionsBeforeLongBreak },
          (_, i) => `<div class="pomo-dot ${i < state.cyclePosition ? 'filled' : ''}"></div>`,
        ).join('')}
        </div>
      `
        : ''
      }
      
      ${state.mode === 'egg' ? this.renderEggDurationPicker(state) : ''}
      
      <div class="controls">
        ${state.status === 'running'
        ? `<button class="btn btn-primary" id="btn-pause">Pause</button>`
        : `<button class="btn btn-primary" id="btn-start">${state.status === 'paused' ? 'Resume' : 'Start'}</button>`
      }
        <button class="btn btn-secondary btn-icon" id="btn-reset" title="Reset">↺</button>
        ${state.mode === 'tomato' ? `<button class="btn btn-secondary btn-icon" id="btn-skip" title="Skip">⏭</button>` : ''}
      </div>
      
      ${state.mode === 'tomato'
        ? `
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${stats.todayCount}</div>
            <div class="stat-label">Today</div>
          </div>
          <div class="stat">
            <div class="stat-value">${stats.totalCount}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat">
            <div class="stat-value">${stats.currentStreak}🔥</div>
            <div class="stat-label">Streak</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" id="stats-btn" style="margin-top: 1rem;">📊 View History</button>
      </div>
      `
        : ''
      }
      
      <button class="settings-trigger" id="settings-btn" title="Settings">⚙️</button>
      
      ${this.renderSettingsModal(state)}
      ${this.renderAnalyticsModal()}
    `;

    this.attachEventListeners();
    this.updateThemeColors(state);
  }

  private getSessionLabel(session: TomatoSession): string {
    switch (session) {
      case 'work': return 'Focus Time';
      case 'short': return 'Short Break';
      case 'long': return 'Long Break';
    }
  }

  private renderEggDurationPicker(state: AppState): string {
    const presets = [1, 3, 5, 10, 15, 30];
    const currentMinutes = Math.round(state.totalMs / 60000);
    const isCustom = !presets.includes(currentMinutes);

    return `
      <div class="duration-picker">
        ${presets.map(min => `
          <button 
            class="duration-btn" 
            data-minutes="${min}"
            aria-pressed="${currentMinutes === min && !isCustom}"
          >${min} min</button>
        `).join('')}
      </div>
      <div class="custom-duration">
        <label for="custom-time">Custom:</label>
        <input 
          type="number" 
          inputmode="numeric"
          id="custom-time" 
          class="custom-time-input" 
          value="${isCustom ? Math.round(state.totalMs / 60000) : ''}"
          placeholder="min"
          min="1"
          max="180"
        />
        <button class="btn btn-secondary btn-sm" id="set-custom" aria-pressed="${isCustom}">Set</button>
      </div>
    `;
  }

  private renderSettingsModal(state: AppState): string {
    const settings = storage.getTomatoSettings();
    const darkMode = storage.getDarkMode();

    return `
      <div class="modal-overlay" id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="modal">
          <h2 id="settings-title">⚙️ Settings</h2>
          
          ${state.mode === 'tomato'
        ? `
            <div class="setting-row">
              <span class="setting-label">Work Duration</span>
              <input type="number" class="setting-input" id="setting-work" value="${settings.workMinutes}" min="1" max="90" /> min
            </div>
            <div class="setting-row">
              <span class="setting-label">Short Break</span>
              <input type="number" class="setting-input" id="setting-short" value="${settings.shortBreakMinutes}" min="1" max="30" /> min
            </div>
            <div class="setting-row">
              <span class="setting-label">Long Break</span>
              <input type="number" class="setting-input" id="setting-long" value="${settings.longBreakMinutes}" min="1" max="60" /> min
            </div>
          `
        : ''
      }
          
          <div class="setting-row">
            <span class="setting-label">Dark Mode</span>
            <select class="setting-input" id="setting-dark" style="width: auto;">
              <option value="auto" ${darkMode === 'auto' ? 'selected' : ''}>Auto</option>
              <option value="light" ${darkMode === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${darkMode === 'dark' ? 'selected' : ''}>Dark</option>
            </select>
          </div>
          
          
          <div class="setting-row">
            <span class="setting-label">Ambient Sound</span>
            <div style="display: flex; align-items: center; gap: var(--space-sm);">
                <select class="setting-input" id="setting-ambient" style="width: auto;">
                <option value="none" ${state.ambientSoundId === 'none' ? 'selected' : ''}>None</option>
                <option value="rain" ${state.ambientSoundId === 'rain' ? 'selected' : ''}>🌧️ Rain</option>
                <option value="forest" ${state.ambientSoundId === 'forest' ? 'selected' : ''}>🌲 Forest</option>
                <option value="brown_noise" ${state.ambientSoundId === 'brown_noise' ? 'selected' : ''}>🟤 Brown Noise</option>
                <option value="white_noise" ${state.ambientSoundId === 'white_noise' ? 'selected' : ''}>⚪ White Noise</option>
                </select>
                <button class="btn btn-secondary btn-icon" id="toggle-ambient" title="Enable/Disable">
                    ${state.isAmbientEnabled ? '🔊' : '🔇'}
                </button>
            </div>
          </div>

          <div class="setting-row">
            <span class="setting-label">Test Sound</span>
            <button class="btn btn-secondary" id="test-sound">🔔 Play</button>
          </div>
          
          <div style="margin-top: var(--space-md); font-size: 0.75rem; opacity: 0.6; text-align: center;">
            Audio from Brad Traversy & community via MIT.
          </div>
          
          <button class="btn btn-primary" id="close-settings" style="width: 100%; margin-top: var(--space-md);">Done</button>
        </div>
      </div>
    `;
  }

  private attachEventListeners() {
    // Mode Switch
    document.getElementById('mode-egg')?.addEventListener('click', () => this.actions.onSwitchMode('egg'));
    document.getElementById('mode-tomato')?.addEventListener('click', () => this.actions.onSwitchMode('tomato'));

    // Controls
    document.getElementById('btn-start')?.addEventListener('click', this.actions.onStart);
    document.getElementById('btn-pause')?.addEventListener('click', this.actions.onPause);
    document.getElementById('btn-reset')?.addEventListener('click', this.actions.onReset);
    document.getElementById('btn-skip')?.addEventListener('click', this.actions.onSkip);

    // Duration Picker
    document.querySelectorAll('.duration-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const minutes = parseInt((e.target as HTMLElement).dataset.minutes || '5');
        this.actions.onSetDuration(minutes * 60 * 1000);
      });
    });

    // Custom Duration logic helper
    const handleCustom = () => {
      const input = document.getElementById('custom-time') as HTMLInputElement;
      if (!input) return;
      const mins = parseInt(input.value.trim(), 10);
      if (!isNaN(mins) && mins > 0) this.actions.onSetDuration(mins * 60 * 1000);
    };

    document.getElementById('set-custom')?.addEventListener('click', handleCustom);
    document.getElementById('custom-time')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCustom();
    });

    // Settings
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('settings-modal');
      if (modal) {
        modal.classList.add('open');

        const closeBtn = document.getElementById('close-settings');

        const overlayClick = (e: MouseEvent) => {
          if ((e.target as HTMLElement).id === 'settings-modal') close();
        };
        modal.addEventListener('click', overlayClick);

        const btnClick = () => close();
        closeBtn?.addEventListener('click', btnClick);

        // Trap focus
        const close = this.trapFocus(modal, () => {
          // This onClose callback is called when the modal is closed by trapFocus (e.g., Escape key)
          // or when the returned `close` function is explicitly called.
          modal.removeEventListener('click', overlayClick);
          closeBtn?.removeEventListener('click', btnClick);
        });
      }
    });

    // Analytics
    document.getElementById('stats-btn')?.addEventListener('click', () => {
      const modal = document.getElementById('analytics-modal');
      if (modal) {
        modal.classList.add('open');

        const closeBtn = document.getElementById('close-analytics');
        const overlayClick = (e: MouseEvent) => {
          if ((e.target as HTMLElement).id === 'analytics-modal') close();
        };
        modal.addEventListener('click', overlayClick);

        const btnClick = () => close();
        closeBtn?.addEventListener('click', btnClick);

        const close = this.trapFocus(modal, () => {
          modal.removeEventListener('click', overlayClick);
          closeBtn?.removeEventListener('click', btnClick);
        });
      }
    });

    // Save Settings
    const saveSettings = () => {
      const work = parseInt((document.getElementById('setting-work') as HTMLInputElement)?.value || '25');
      const short = parseInt((document.getElementById('setting-short') as HTMLInputElement)?.value || '5');
      const long = parseInt((document.getElementById('setting-long') as HTMLInputElement)?.value || '15');

      this.actions.onSaveSettings({
        ...storage.DEFAULT_TOMATO_SETTINGS, // merge base to be safe
        workMinutes: work,
        shortBreakMinutes: short,
        longBreakMinutes: long,
        sessionsBeforeLongBreak: 4, // kept default for now
        autoStartBreaks: false
      });
    };

    ['setting-work', 'setting-short', 'setting-long'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', saveSettings);
    });

    document.getElementById('setting-dark')?.addEventListener('change', (e) => {
      const mode = (e.target as HTMLSelectElement).value as 'auto' | 'light' | 'dark';
      this.actions.onSaveDarkMode(mode);
    });

    document.getElementById('setting-ambient')?.addEventListener('change', (e) => {
      this.actions.onSetAmbient((e.target as HTMLSelectElement).value);
    });

    document.getElementById('toggle-ambient')?.addEventListener('click', () => {
      this.actions.onToggleAmbient();
    });

    document.getElementById('test-sound')?.addEventListener('click', this.actions.onTestSound);
  }

  updateTimerDisplay(state: AppState) {
    // Optimized update for ticks
    const timerEl = document.querySelector('.timer-display');
    const ringEl = document.querySelector('.ring-progress') as SVGCircleElement;
    if (timerEl) timerEl.textContent = formatTime(state.remainingMs);
    if (ringEl) {
      const circumference = 2 * Math.PI * 90;
      const progress = calculateProgress(state.remainingMs, state.totalMs);
      ringEl.style.strokeDashoffset = String(circumference * (1 - progress));
    }
  }

  updateThemeColors(state: AppState) {
    const root = document.documentElement;
    // ... logic from main.ts
    if (state.mode === 'egg') {
      this.setProperties(root, 'egg');
    } else {
      this.setProperties(root, state.tomatoSession);
    }
  }

  private setProperties(root: HTMLElement, prefix: string) {
    // Mapping 'work' -> var(--color-work) etc
    // Since prefix matches the variable name suffix mostly
    // egg -> egg, work -> work, short -> short, long -> long
    root.style.setProperty('--current-color', `var(--color-${prefix})`);
    root.style.setProperty('--current-color-light', `var(--color-${prefix}-light)`);
    root.style.setProperty('--current-bg', `var(--color-${prefix}-bg)`);
    root.style.setProperty('--current-text', `var(--color-${prefix}-text)`);
  }

  private trapFocus(modal: HTMLElement, onClose: () => void) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    const previousActiveElement = document.activeElement as HTMLElement;

    if (firstElement) firstElement.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      } else if (e.key === 'Escape') {
        close();
      }
    };

    const close = () => {
      modal.classList.remove('open');
      modal.removeEventListener('keydown', handleTab);
      if (previousActiveElement) previousActiveElement.focus();
      onClose();
    };

    modal.addEventListener('keydown', handleTab);
    return close;
  }

  private renderAnalyticsModal(): string {
    const stats = storage.getTomatoStats();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const counts = dates.map(d => stats.history ? (stats.history[d] || 0) : 0);
    const max = Math.max(...counts, 5); // Minimum scale of 5

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return `
      <div class="modal-overlay" id="analytics-modal" role="dialog" aria-modal="true" aria-labelledby="analytics-title">
        <div class="modal">
          <h2 id="analytics-title">📊 Weekly Progress</h2>
          
          <div class="chart-container">
            ${dates.map((date, i) => {
      const height = (counts[i] / max) * 100;
      const d = new Date(date);
      const dayName = days[d.getDay()];
      const isToday = date === stats.todayDate;

      return `
                  <div class="bar-group" title="${date}: ${counts[i]} sessions">
                    <div class="bar-fill-bg">
                      <div class="bar-fill" style="height: ${height}%"></div>
                    </div>
                    <div class="bar-label ${isToday ? 'today' : ''}">${dayName}</div>
                  </div>
                `;
    }).join('')}
          </div>
          
          <div class="stats-summary" style="margin-top: var(--space-lg); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
             <div class="stat-card" style="background: var(--bg-secondary); padding: var(--space-md); border-radius: 12px; text-align: center;">
               <div style="font-size: 1.5rem; font-weight: 700;">${stats.totalCount}</div>
               <div style="font-size: 0.85rem; color: var(--text-secondary);">Total</div>
             </div>
             <div class="stat-card" style="background: var(--bg-secondary); padding: var(--space-md); border-radius: 12px; text-align: center;">
               <div style="font-size: 1.5rem; font-weight: 700;">${stats.currentStreak}🔥</div>
               <div style="font-size: 0.85rem; color: var(--text-secondary);">Streak</div>
             </div>
          </div>

          <button class="btn btn-primary" id="close-analytics" style="width: 100%; margin-top: var(--space-md);">Close</button>
        </div>
      </div>
    `;
  }

  // Updated showCompletion to use trap
  showCompletion(title: string, message: string, onConfirm: () => void, startAlarm: () => void, stopAlarm: () => void) {
    startAlarm();
    let modal = document.getElementById('completion-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'completion-modal';
      modal.className = 'completion-modal';
      modal.role = 'dialog';
      modal.ariaModal = 'true';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="completion-content">
          <div class="completion-title">${title}</div>
          <div class="completion-message">${message}</div>
          <button class="btn btn-primary btn-lg" id="completion-confirm">OK</button>
        </div>
      `;

    const confirmBtn = document.getElementById('completion-confirm');

    // Trap focus
    const closeTrap = this.trapFocus(modal, () => {
      stopAlarm();
      onConfirm();
    });

    confirmBtn?.addEventListener('click', () => {
      closeTrap(); // This closes modal and restores focus
    });

    requestAnimationFrame(() => modal?.classList.add('open'));
  }
}
