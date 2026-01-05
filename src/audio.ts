// Audio notification using Web Audio API
// Generates a gentle chime programmatically (no external file needed)

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

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
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5 + (i * 0.1));

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + (i * 0.08)); // Slight stagger for arpeggio effect
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
    } as any);
}
