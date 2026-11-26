import type { DifficultyLevel } from '../types/game';
import pkg from '../../package.json';

/**
 * "Beat my time" links. Everything needed to replay the exact same game lives
 * in the link itself — no server, no account: mode, difficulty, the board
 * seed and the time to beat. A friend opening the link plays the identical
 * five boards and sees how they compare.
 */
export interface Challenge {
  /** Format version (bump if the board generator changes incompatibly). */
  v: 1;
  mode: 'classic' | 'quickGame';
  difficulty: DifficultyLevel;
  seed: string;
  /** Sender's total time in ms. */
  timeMs: number;
}

const toBase64Url = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromBase64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64 + '==='.slice((b64.length + 3) % 4))));
};

export const encodeChallenge = (c: Challenge): string =>
  toBase64Url(
    JSON.stringify([
      c.v,
      c.mode === 'quickGame' ? 'q' : 'c',
      c.difficulty[0],
      c.seed,
      Math.round(c.timeMs),
    ])
  );

/** Decode a link payload; null if it's damaged or from an unknown version. */
export const decodeChallenge = (payload: string): Challenge | null => {
  try {
    const raw = JSON.parse(fromBase64Url(payload)) as unknown;
    if (!Array.isArray(raw) || raw[0] !== 1) return null;
    const [, m, d, seed, timeMs] = raw as [number, string, string, string, number];
    const difficulty = ({ e: 'easy', m: 'medium', h: 'hard' } as const)[d as 'e' | 'm' | 'h'];
    if (!difficulty || (m !== 'q' && m !== 'c')) return null;
    if (typeof seed !== 'string' || !/^[a-z0-9]{4,32}$/i.test(seed)) return null;
    if (typeof timeMs !== 'number' || !Number.isFinite(timeMs) || timeMs <= 0 || timeMs > 3_600_000)
      return null;
    return { v: 1, mode: m === 'q' ? 'quickGame' : 'classic', difficulty, seed, timeMs };
  } catch {
    return null;
  }
};

export const challengeUrl = (c: Challenge): string =>
  `${pkg.homepage}/challenge/${encodeChallenge(c)}`;

const clock = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const formatChallengeTime = clock;

export const challengeShareText = (c: Challenge): string => {
  const label =
    c.mode === 'quickGame'
      ? 'Quick Game'
      : `Classic · ${c.difficulty[0].toUpperCase()}${c.difficulty.slice(1)}`;
  return `I solved Grid Genius (${label}) in ${clock(c.timeMs)}. Same puzzles — can you beat me? 🧮\n${challengeUrl(c)}`;
};

/** Random board seed for a new game. */
export const newGameSeed = (): string => Math.random().toString(36).slice(2, 12).padEnd(8, '0');
