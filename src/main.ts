import './style.css';
import type { TimerStatus, TomatoSession } from './types';
import { createTimer, formatTime, calculateProgress } from './timer';
import {
  getCurrentMode, setCurrentMode,
  getEggLastDuration, setEggLastDuration,
  getTomatoSettings, getTomatoStats, incrementTomatoStats,
  getDarkMode
} from './storage';
import { playChime, showNotification, requestNotificationPermission } from './audio';

// ===========================
// State
// ===========================
type Mode = 'egg' | 'tomato';

interface AppState {
  mode: Mode;
  remainingMs: number;
  totalMs: number;
  status: TimerStatus;
  tomatoSession: TomatoSession;
  cyclePosition: number; // 0-3
}

let state: AppState = {
  mode: getCurrentMode(),
  remainingMs: 0,
  totalMs: 0,
  status: 'idle',
  tomatoSession: 'work',
  cyclePosition: 0,
};

let timerInstance: ReturnType<typeof createTimer> | null = null;

// ===========================
// DOM Elements
// ===========================
const app = document.getElementById('app')!;

// ===========================
// Render Functions
// ===========================
function render(): void {
  const stats = getTomatoStats();
  const settings = getTomatoSettings();

  app.innerHTML = `
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

    ${state.mode === 'tomato' ? `
      <div class="session-label">${getSessionLabel(state.tomatoSession)}</div>
      <div class="pomo-dots">
        ${Array.from({ length: settings.sessionsBeforeLongBreak }, (_, i) =>
    `<div class="pomo-dot ${i < state.cyclePosition ? 'filled' : ''}"></div>`
  ).join('')}
      </div>
    ` : ''}
    
    ${state.mode === 'egg' ? renderEggDurationPicker() : ''}
    
    <div class="controls">
      ${state.status === 'running'
      ? `<button class="btn btn-primary" id="btn-pause">Pause</button>`
      : `<button class="btn btn-primary" id="btn-start">${state.status === 'paused' ? 'Resume' : 'Start'}</button>`
    }
      <button class="btn btn-secondary btn-icon" id="btn-reset" title="Reset">↺</button>
      ${state.mode === 'tomato' ? `<button class="btn btn-secondary btn-icon" id="btn-skip" title="Skip">⏭</button>` : ''}
    </div>
    
    ${state.mode === 'tomato' ? `
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
    ` : ''}
    
    <button class="settings-trigger" id="settings-btn" title="Settings">⚙️</button>
    
    ${renderSettingsModal()}
  `;

  attachEventListeners();
  updateThemeColors();
}

function getSessionLabel(session: TomatoSession): string {
  switch (session) {
    case 'work': return 'Focus Time';
    case 'short': return 'Short Break';
    case 'long': return 'Long Break';
  }
}

function renderEggDurationPicker(): string {
  const presets = [1, 3, 5, 10, 15, 30];
  const currentMinutes = Math.round(state.totalMs / 60000);
  const isCustom = !presets.includes(currentMinutes);

  // Format current time for the input
  const mins = Math.floor(state.totalMs / 60000);
  const secs = Math.floor((state.totalMs % 60000) / 1000);
  const timeValue = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

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
        type="text" 
        id="custom-time" 
        class="custom-time-input" 
        value="${timeValue}"
        placeholder="MM:SS"
        pattern="[0-9]{1,2}:[0-9]{2}"
      />
      <button class="btn btn-secondary btn-sm" id="set-custom" aria-pressed="${isCustom}">Set</button>
    </div>
  `;
}

function renderSettingsModal(): string {
  const settings = getTomatoSettings();
  const darkMode = getDarkMode();

  return `
    <div class="modal-overlay" id="settings-modal">
      <div class="modal">
        <h2>⚙️ Settings</h2>
        
        ${state.mode === 'tomato' ? `
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
        ` : ''}
        
        <div class="setting-row">
          <span class="setting-label">Dark Mode</span>
          <select class="setting-input" id="setting-dark" style="width: auto;">
            <option value="auto" ${darkMode === 'auto' ? 'selected' : ''}>Auto</option>
            <option value="light" ${darkMode === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${darkMode === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </div>
        
        <div class="setting-row">
          <span class="setting-label">Test Sound</span>
          <button class="btn btn-secondary" id="test-sound">🔔 Play</button>
        </div>
        
        <button class="btn btn-primary" id="close-settings" style="width: 100%; margin-top: var(--space-md);">Done</button>
      </div>
    </div>
  `;
}

// ===========================
// Event Listeners
// ===========================
function attachEventListeners(): void {
  // Mode switch
  document.getElementById('mode-egg')?.addEventListener('click', () => switchMode('egg'));
  document.getElementById('mode-tomato')?.addEventListener('click', () => switchMode('tomato'));

  // Timer controls
  document.getElementById('btn-start')?.addEventListener('click', startTimer);
  document.getElementById('btn-pause')?.addEventListener('click', pauseTimer);
  document.getElementById('btn-reset')?.addEventListener('click', resetTimer);
  document.getElementById('btn-skip')?.addEventListener('click', skipSession);

  // Duration picker (Egg mode)
  document.querySelectorAll('.duration-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const minutes = parseInt((e.target as HTMLElement).dataset.minutes || '5');
      setDuration(minutes * 60 * 1000);
    });
  });

  // Custom duration input (Egg mode)
  document.getElementById('set-custom')?.addEventListener('click', setCustomDuration);
  document.getElementById('custom-time')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') setCustomDuration();
  });

  // Settings modal
  document.getElementById('settings-btn')?.addEventListener('click', openSettings);
  document.getElementById('close-settings')?.addEventListener('click', closeSettings);
  document.getElementById('settings-modal')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'settings-modal') closeSettings();
  });

  // Settings inputs
  document.getElementById('setting-work')?.addEventListener('change', saveSettings);
  document.getElementById('setting-short')?.addEventListener('change', saveSettings);
  document.getElementById('setting-long')?.addEventListener('change', saveSettings);
  document.getElementById('setting-dark')?.addEventListener('change', saveDarkMode);
  document.getElementById('test-sound')?.addEventListener('click', playChime);
}

// ===========================
// Timer Actions
// ===========================
function switchMode(mode: Mode): void {
  if (mode === state.mode) return;

  // Stop current timer
  timerInstance?.destroy();
  timerInstance = null;

  state.mode = mode;
  state.status = 'idle';
  setCurrentMode(mode);

  if (mode === 'egg') {
    state.totalMs = getEggLastDuration();
    state.remainingMs = state.totalMs;
  } else {
    state.tomatoSession = 'work';
    state.cyclePosition = 0;
    initTomatoSession();
  }

  render();
}

function setDuration(ms: number): void {
  state.totalMs = ms;
  state.remainingMs = ms;
  if (state.mode === 'egg') {
    setEggLastDuration(ms);
  }
  timerInstance?.reset(ms);
  render();
}

function setCustomDuration(): void {
  const input = document.getElementById('custom-time') as HTMLInputElement;
  if (!input) return;

  const value = input.value.trim();

  // Parse MM:SS or just M format
  let totalMs = 0;

  if (value.includes(':')) {
    const [mins, secs] = value.split(':').map(v => parseInt(v) || 0);
    totalMs = (mins * 60 + secs) * 1000;
  } else {
    // Treat as minutes
    const mins = parseInt(value) || 0;
    totalMs = mins * 60 * 1000;
  }

  if (totalMs > 0 && totalMs <= 180 * 60 * 1000) { // Max 3 hours
    setDuration(totalMs);
  }
}

function initTomatoSession(): void {
  const settings = getTomatoSettings();
  let minutes: number;

  switch (state.tomatoSession) {
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

  state.totalMs = minutes * 60 * 1000;
  state.remainingMs = state.totalMs;
}

function startTimer(): void {
  // Request notification permission on first start
  requestNotificationPermission();

  if (!timerInstance) {
    timerInstance = createTimer(
      state.remainingMs,
      (remaining, status) => {
        state.remainingMs = remaining;
        state.status = status;
        updateTimerDisplay();
      },
      handleTimerComplete
    );
  }

  timerInstance.start();
}

function pauseTimer(): void {
  timerInstance?.pause();
}

function resetTimer(): void {
  timerInstance?.reset();
  state.remainingMs = state.totalMs;
  state.status = 'idle';
  render();
}

function skipSession(): void {
  if (state.mode !== 'tomato') return;
  advanceToNextSession();
  render();
}

function handleTimerComplete(): void {
  playChime();

  if (state.mode === 'egg') {
    showNotification('Timer Complete!', 'Your egg timer has finished.');
    state.status = 'idle';
    render();
  } else {
    // Tomato mode
    if (state.tomatoSession === 'work') {
      incrementTomatoStats();
      state.cyclePosition++;

      confettiBurst();

      if (state.cyclePosition >= getTomatoSettings().sessionsBeforeLongBreak) {
        showNotification('Great work! 🎉', 'Time for a long break.');
        state.tomatoSession = 'long';
        state.cyclePosition = 0;
      } else {
        showNotification('Pomodoro complete!', 'Time for a short break.');
        state.tomatoSession = 'short';
      }
    } else {
      showNotification('Break over!', 'Ready for another focus session?');
      state.tomatoSession = 'work';
    }

    initTomatoSession();
    timerInstance?.reset(state.totalMs);
    render();
  }
}

function advanceToNextSession(): void {
  timerInstance?.destroy();
  timerInstance = null;

  if (state.tomatoSession === 'work') {
    state.cyclePosition++;
    if (state.cyclePosition >= getTomatoSettings().sessionsBeforeLongBreak) {
      state.tomatoSession = 'long';
      state.cyclePosition = 0;
    } else {
      state.tomatoSession = 'short';
    }
  } else {
    state.tomatoSession = 'work';
  }

  initTomatoSession();
  state.status = 'idle';
}

// ===========================
// UI Updates
// ===========================
function updateTimerDisplay(): void {
  const timerEl = document.querySelector('.timer-display');
  const ringEl = document.querySelector('.ring-progress') as SVGCircleElement;
  const containerEl = document.querySelector('.timer-container');

  if (timerEl) {
    timerEl.textContent = formatTime(state.remainingMs);
  }

  if (ringEl) {
    const circumference = 2 * Math.PI * 90;
    const progress = calculateProgress(state.remainingMs, state.totalMs);
    ringEl.style.strokeDashoffset = String(circumference * (1 - progress));
  }

  if (containerEl) {
    containerEl.classList.toggle('running', state.status === 'running');
  }

  // Update buttons
  const startBtn = document.getElementById('btn-start');
  const pauseBtn = document.getElementById('btn-pause');

  if (state.status === 'running') {
    startBtn?.replaceWith(createButton('btn-pause', 'Pause', pauseTimer, 'btn btn-primary'));
  } else if (state.status === 'paused' || state.status === 'idle') {
    pauseBtn?.replaceWith(createButton('btn-start', state.status === 'paused' ? 'Resume' : 'Start', startTimer, 'btn btn-primary'));
  }
}

function createButton(id: string, text: string, handler: () => void, className: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = className;
  btn.textContent = text;
  btn.addEventListener('click', handler);
  return btn;
}

function updateThemeColors(): void {
  const root = document.documentElement;

  if (state.mode === 'egg') {
    root.style.setProperty('--current-color', 'var(--color-egg)');
    root.style.setProperty('--current-color-light', 'var(--color-egg-light)');
    root.style.setProperty('--current-bg', 'var(--color-egg-bg)');
    root.style.setProperty('--current-text', 'var(--color-egg-text)');
  } else {
    switch (state.tomatoSession) {
      case 'work':
        root.style.setProperty('--current-color', 'var(--color-work)');
        root.style.setProperty('--current-color-light', 'var(--color-work-light)');
        root.style.setProperty('--current-bg', 'var(--color-work-bg)');
        root.style.setProperty('--current-text', 'var(--color-work-text)');
        break;
      case 'short':
        root.style.setProperty('--current-color', 'var(--color-short)');
        root.style.setProperty('--current-color-light', 'var(--color-short-light)');
        root.style.setProperty('--current-bg', 'var(--color-short-bg)');
        root.style.setProperty('--current-text', 'var(--color-short-text)');
        break;
      case 'long':
        root.style.setProperty('--current-color', 'var(--color-long)');
        root.style.setProperty('--current-color-light', 'var(--color-long-light)');
        root.style.setProperty('--current-bg', 'var(--color-long-bg)');
        root.style.setProperty('--current-text', 'var(--color-long-text)');
        break;
    }
  }
}

// ===========================
// Settings
// ===========================
function openSettings(): void {
  document.getElementById('settings-modal')?.classList.add('open');
}

function closeSettings(): void {
  document.getElementById('settings-modal')?.classList.remove('open');
}

function saveSettings(): void {
  const work = parseInt((document.getElementById('setting-work') as HTMLInputElement)?.value || '25');
  const short = parseInt((document.getElementById('setting-short') as HTMLInputElement)?.value || '5');
  const long = parseInt((document.getElementById('setting-long') as HTMLInputElement)?.value || '15');

  const settings = getTomatoSettings();
  settings.workMinutes = work;
  settings.shortBreakMinutes = short;
  settings.longBreakMinutes = long;

  import('./storage').then(m => m.setTomatoSettings(settings));

  // If idle, update current duration
  if (state.status === 'idle' && state.mode === 'tomato') {
    initTomatoSession();
    render();
  }
}

function saveDarkMode(): void {
  const mode = (document.getElementById('setting-dark') as HTMLSelectElement)?.value as 'auto' | 'light' | 'dark';
  import('./storage').then(m => m.setDarkMode(mode));

  document.documentElement.removeAttribute('data-theme-mode');
  if (mode !== 'auto') {
    document.documentElement.setAttribute('data-theme-mode', mode);
  }
}

// ===========================
// Confetti Effect
// ===========================
function confettiBurst(): void {
  const colors = ['#e85d4c', '#3bbf9e', '#5a8fd8', '#f5a623', '#e056fd'];
  const container = document.body;

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
    confetti.style.animationDelay = Math.random() * 0.5 + 's';
    container.appendChild(confetti);

    setTimeout(() => confetti.remove(), 4000);
  }
}

// ===========================
// Initialize
// ===========================
function init(): void {
  // Apply saved dark mode
  const darkMode = getDarkMode();
  if (darkMode !== 'auto') {
    document.documentElement.setAttribute('data-theme-mode', darkMode);
  }

  // Initialize timer state
  if (state.mode === 'egg') {
    state.totalMs = getEggLastDuration();
    state.remainingMs = state.totalMs;
  } else {
    initTomatoSession();
  }

  render();
}

init();

// Clean up unused Vite template files
// Note: counter.ts and typescript.svg from template are no longer used
