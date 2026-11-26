/**
 * Sound effects + haptics for game feedback.
 *
 * Sounds are synthesised with the Web Audio API (no audio assets to download,
 * works offline, ~0 KB). Haptics use `navigator.vibrate` — supported on
 * Android browsers / WebViews; iOS Safari ignores it silently.
 *
 * Both respect the player's Settings toggles (prefsStore) and fail silently
 * when the platform lacks support (e.g. jsdom in tests).
 */
import { usePrefsStore } from '../store/prefsStore';

export type FeedbackEvent =
  | 'tap' // selected a number tile
  | 'operator' // selected an operator
  | 'invalid' // tapped something that isn't allowed right now
  | 'correct' // solved the round
  | 'combo' // solved the round, 3+ in a row
  | 'wrong' // submitted a wrong answer
  | 'hint' // revealed a hint
  | 'complete' // finished a game / level
  | 'unlock'; // unlocked a reward

type Wave = OscillatorType;
interface Note {
  freq: number;
  /** Start offset in seconds. */
  at: number;
  dur: number;
  wave?: Wave;
  gain?: number;
  /** Optional pitch glide target. */
  slideTo?: number;
}

// C major-ish palette — bright, friendly, never harsh.
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.5;

const SOUNDS: Record<FeedbackEvent, Note[]> = {
  tap: [{ freq: 660, at: 0, dur: 0.05, wave: 'sine', gain: 0.12 }],
  operator: [{ freq: 880, at: 0, dur: 0.045, wave: 'triangle', gain: 0.1 }],
  invalid: [{ freq: 180, at: 0, dur: 0.08, wave: 'triangle', gain: 0.12, slideTo: 140 }],
  correct: [
    { freq: C5, at: 0, dur: 0.09, wave: 'triangle', gain: 0.14 },
    { freq: E5, at: 0.07, dur: 0.09, wave: 'triangle', gain: 0.14 },
    { freq: G5, at: 0.14, dur: 0.16, wave: 'triangle', gain: 0.14 },
    { freq: C6, at: 0.14, dur: 0.2, wave: 'sine', gain: 0.06 },
  ],
  combo: [
    { freq: E5, at: 0, dur: 0.08, wave: 'triangle', gain: 0.14 },
    { freq: G5, at: 0.06, dur: 0.08, wave: 'triangle', gain: 0.14 },
    { freq: C6, at: 0.12, dur: 0.1, wave: 'triangle', gain: 0.14 },
    { freq: E6, at: 0.18, dur: 0.22, wave: 'sine', gain: 0.1 },
  ],
  wrong: [
    { freq: 330, at: 0, dur: 0.12, wave: 'triangle', gain: 0.12, slideTo: 300 },
    { freq: 247, at: 0.11, dur: 0.18, wave: 'triangle', gain: 0.12, slideTo: 220 },
  ],
  hint: [
    { freq: E5, at: 0, dur: 0.08, wave: 'sine', gain: 0.08 },
    { freq: C6, at: 0.06, dur: 0.14, wave: 'sine', gain: 0.07 },
  ],
  complete: [
    { freq: C5, at: 0, dur: 0.12, wave: 'triangle', gain: 0.13 },
    { freq: E5, at: 0.1, dur: 0.12, wave: 'triangle', gain: 0.13 },
    { freq: G5, at: 0.2, dur: 0.12, wave: 'triangle', gain: 0.13 },
    { freq: C6, at: 0.3, dur: 0.45, wave: 'triangle', gain: 0.13 },
    { freq: E6, at: 0.3, dur: 0.45, wave: 'sine', gain: 0.05 },
    { freq: G5, at: 0.3, dur: 0.45, wave: 'sine', gain: 0.06 },
  ],
  unlock: [
    { freq: 600, at: 0, dur: 0.25, wave: 'sine', gain: 0.1, slideTo: 1200 },
    { freq: E6, at: 0.22, dur: 0.12, wave: 'sine', gain: 0.07 },
    { freq: C6 * 1.5, at: 0.3, dur: 0.2, wave: 'sine', gain: 0.06 },
  ],
};

/** Vibration patterns in ms (vibrate, pause, vibrate, …). */
const HAPTICS: Record<FeedbackEvent, number | number[]> = {
  tap: 8,
  operator: 8,
  invalid: 35,
  correct: [15, 50, 30],
  combo: [15, 40, 15, 40, 40],
  wrong: [50, 40, 50],
  hint: 12,
  complete: [20, 60, 20, 60, 45],
  unlock: [10, 30, 10, 30, 10, 30, 60],
};

let ctx: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  // Browsers start contexts suspended until a user gesture; game sounds are
  // triggered from taps, so resuming here unlocks audio on first interaction.
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
};

const playNotes = (notes: Note[]): void => {
  const ac = getContext();
  if (!ac) return;
  const now = ac.currentTime + 0.005;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = n.wave ?? 'sine';
    const start = now + n.at;
    const end = start + n.dur;
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.slideTo) osc.frequency.exponentialRampToValueAtTime(n.slideTo, end);
    // Quick attack, exponential release — avoids clicks.
    const peak = n.gain ?? 0.1;
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(amp).connect(ac.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
};

const vibrate = (pattern: number | number[]): void => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw when called without user activation — ignore.
  }
};

/** Play the sound and haptic for a game event, honouring the player's settings. */
export const feedback = (event: FeedbackEvent): void => {
  const { soundEnabled, hapticsEnabled } = usePrefsStore.getState();
  if (soundEnabled) {
    try {
      playNotes(SOUNDS[event]);
    } catch {
      // Audio must never break gameplay.
    }
  }
  if (hapticsEnabled) vibrate(HAPTICS[event]);
};

/** True when this device can vibrate (used to hide the Settings toggle elsewhere). */
export const supportsHaptics = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
