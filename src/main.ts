import './style.css';
import { Store } from './store';
import { View, type ViewActions } from './view';
import { createTimer } from './timer';
import {
  playChime,
  startAlarm,
  stopAlarm,
  showNotification,
  requestNotificationPermission,
  ambientPlayer,
} from './audio';
import * as storage from './storage';
import { confettiBurst } from './confetti';

// Confetti was in main.ts. I should extract it to utils or just keep it here? 
// I'll extract it to confetti.ts for cleanliness, or just put it at bottom of main.ts.
// I'll put it at bottom for now.

const store = new Store();
let timerInstance: ReturnType<typeof createTimer> | null = null;

// Actions implementation
const actions: ViewActions = {
  onStart: () => {
    requestNotificationPermission();
    if (!timerInstance) createTimerInstance();
    timerInstance?.start();
    store.setStatus('running');
  },

  onPause: () => {
    timerInstance?.pause();
    store.setStatus('paused');
  },

  onReset: () => {
    timerInstance?.reset();
    const state = store.getState();
    store.updateRemaining(state.totalMs);
    store.setStatus('idle');
  },

  onSkip: () => {
    store.advanceTomatoSession();
    timerInstance?.destroy();
    timerInstance = null;
  },

  onSwitchMode: (mode) => {
    timerInstance?.destroy();
    timerInstance = null;
    store.setMode(mode);
  },

  onSetDuration: (ms) => {
    timerInstance?.destroy();
    timerInstance = null;
    store.setDuration(ms);
  },

  onSaveSettings: (settings) => {
    storage.setTomatoSettings(settings);
    // If idle and tomato, re-init session
    const state = store.getState();
    if (state.status === 'idle' && state.mode === 'tomato') {
      store.initTomatoSessionState();
    }
  },

  onSaveDarkMode: (mode) => {
    storage.setDarkMode(mode);
    const root = document.documentElement;
    root.removeAttribute('data-theme-mode');
    if (mode !== 'auto') root.setAttribute('data-theme-mode', mode);
  },

  onTestSound: () => {
    playChime();
  },
  onSetAmbient: (id) => {
    store.setAmbientSound(id);
  },
  onToggleAmbient: () => {
    store.toggleAmbient();
  },
};

// Initialize View
const app = document.getElementById('app')!;
const view = new View(app, actions);

function createTimerInstance() {
  const state = store.getState();
  timerInstance = createTimer(
    state.remainingMs,
    (remaining) => {
      view.updateTimerDisplay({ ...store.getState(), remainingMs: remaining });
    },
    handleTimerComplete
  );
}

function handleTimerComplete() {
  showNotification('Timer Complete', 'Your timer has finished!');
  const state = store.getState();
  store.setStatus('idle');
  timerInstance = null;

  if (state.mode === 'egg') {
    view.showCompletion("Time's Up!", 'Your egg timer has finished.', () => {
      // On confirm
    }, startAlarm, stopAlarm);
  } else {
    // Tomato Logic
    if (state.tomatoSession === 'work') {
      storage.incrementTomatoStats(); // Update stats

      const settings = storage.getTomatoSettings();
      // Calculate next phase logic is inside store.advanceTomatoSession?
      // Wait, handleComplete needs to know what comes next to show message.
      // But store manages logic.

      // Let's predict next state for the message?
      // Or ask store?
      // Store implementation: `advanceTomatoSession` does the increment cycle logic.
      // We haven't called it yet.

      const currentCycle = state.cyclePosition + 1;
      const isLong = currentCycle >= settings.sessionsBeforeLongBreak;
      const msg = isLong ? 'Great work! Time for a long break.' : 'Pomodoro complete! Time for a short break.';

      view.showCompletion('Focus Complete!', msg, () => {
        store.advanceTomatoSession();
      }, startAlarm, stopAlarm);

      confettiBurst();
    } else {
      // Break is over
      view.showCompletion('Break Over!', 'Ready for another focus session?', () => {
        store.advanceTomatoSession();
      }, startAlarm, stopAlarm);
    }
  }

  // Full re-render to update UI (buttons back to Start)
  view.render(store.getState());
}



// Helper to sync audio
function syncAmbient(state: any) {
  if (state.isAmbientEnabled && state.status === 'running' && state.ambientSoundId !== 'none') {
    ambientPlayer.play(state.ambientSoundId as any);
  } else {
    ambientPlayer.stop();
  }
}

// Re-implement Subscription:
store.subscribe((newState) => {
  // Basic Render
  view.render(newState);
  syncAmbient(newState);
});




// Init
const darkMode = storage.getDarkMode();
if (darkMode !== 'auto') document.documentElement.setAttribute('data-theme-mode', darkMode);

view.render(store.getState());

// Assign createTimerInstanceSafe to the Actions usage
actions.onStart = () => {
  requestNotificationPermission();
  if (!timerInstance) createTimerInstance();
  timerInstance?.start();
  // store.setStatus trigger render?
  store.setStatus('running');
  // This render might wipe the DOM, but timer is running in background JS?
  // If render wipes DOM, the timerInstance is still valid, 
  // but the DOM nodes it was updating (via view.updateTimerDisplay?) might be gone?
  // view.render RE-CREATES DOM nodes.
  // So subsequent ticks need to find NEW nodes.
  // view.updateTimerDisplay does querySelector. So it finds new nodes. Safe.
};

actions.onPause = () => {
  timerInstance?.pause();
  // Sync store with actual remaining
  if (timerInstance) store.updateRemaining(timerInstance.getRemaining());
  store.setStatus('paused');
};

actions.onReset = () => {
  timerInstance?.reset();
  timerInstance = null;
  store.updateRemaining(store.getState().totalMs);
  store.setStatus('idle');
};

