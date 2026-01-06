// Audio notification using Web Audio API
// Generates a gentle chime programmatically (no external file needed)
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AmbientSoundId } from './types';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

const AMBIENT_URLS: Record<string, string> = {
  rain: 'https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/audio/rain.mp3',
  forest: 'https://raw.githubusercontent.com/bradtraversy/ambient-sound-mixer/main/audio/birds.mp3',
  ticking: 'https://cdn.pixabay.com/audio/2025/09/28/audio_ae4b62f063.mp3',
};

class AmbientPlayer {
  private audio: HTMLAudioElement | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  async play(id: AmbientSoundId) {
    this.stop();
    if (id === 'none') return;

    if (id === 'white_noise' || id === 'brown_noise') {
      await this.playNoise(id);
    } else if (AMBIENT_URLS[id]) {
      this.playUrl(AMBIENT_URLS[id]);
    }
  }

  private playUrl(url: string) {
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = 0.3;
    this.audio.play().catch(e => console.error('Audio play failed:', e));
  }

  private async playNoise(type: 'white_noise' | 'brown_noise') {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown_noise') {
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      } else {
        data[i] = white * 0.1; // White noise is harsh, keep low
      }
    }

    this.noiseNode = ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.1;

    this.noiseNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);
    this.noiseNode.start();
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.noiseNode) {
      this.noiseNode.stop();
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  setVolume(vol: number) {
    if (this.audio) this.audio.volume = vol * 0.5;
    if (this.gainNode) this.gainNode.gain.value = vol * 0.2;
  }
}

export const ambientPlayer = new AmbientPlayer();

class TickPlayer {
  private buffer: AudioBuffer | null = null;
  private isLoading = false;

  async load() {
    if (this.buffer || this.isLoading) return;
    this.isLoading = true;
    try {
      const ctx = getAudioContext();
      const response = await fetch(AMBIENT_URLS.ticking);
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error('Failed to load tick sound:', e);
    } finally {
      this.isLoading = false;
    }
  }

  play() {
    if (!this.buffer) {
      this.load();
      return;
    }
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = this.buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }
}

export const tickPlayer = new TickPlayer();


// Generate a gentle, pleasant chime
export function playChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Resume context if suspended (required for some browsers)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    // Create oscillators for a pleasant chord
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Gentle envelope
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5 + i * 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08); // Slight stagger for arpeggio effect
      osc.stop(now + 2);
    });

    // Add a soft high bell tone
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();

    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1046.5, now); // C6

    bellGain.gain.setValueAtTime(0, now + 0.2);
    bellGain.gain.linearRampToValueAtTime(0.08, now + 0.25);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 2);

    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);

    bellOsc.start(now + 0.2);
    bellOsc.stop(now + 2.5);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
}

let alarmInterval: number | null = null;

export function startAlarm(): void {
  if (alarmInterval) return;
  playChime();
  alarmInterval = window.setInterval(playChime, 2500); // Loop every 2.5s
}

export function stopAlarm(): void {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Show browser notification
export function showNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'timer-complete',
    renotify: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}
