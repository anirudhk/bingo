import type { DifficultyLevel } from '../types/game';
import pkg from '../../package.json';

/** Day 1 of the daily puzzle — numbers puzzles like "Grid Genius #42". */
const DAILY_EPOCH_UTC = Date.UTC(2026, 4, 10); // 2026-05-10

/** Public URL used in share text (works from the PWA and native builds alike). */
export const PUBLIC_DAILY_URL = `${pkg.homepage}/daily`;

export const dailyPuzzleNumber = (date: Date = new Date()): number => {
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((today - DAILY_EPOCH_UTC) / 86_400_000) + 1;
};

const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = {
  easy: 'Easy 🟢',
  medium: 'Medium 🟡',
  hard: 'Hard 🔴',
};

const formatClock = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Spoiler-free, Wordle-style result. Each wrong try is a red square, the solve
 * is green — so friends see *how* you did without seeing the answer.
 */
export const buildDailyShareText = (input: {
  date: Date;
  difficulty: DifficultyLevel;
  wrongAttempts: number;
  seconds: number;
  streak: number;
}): string => {
  const shown = Math.min(input.wrongAttempts, 6);
  const tries = '🟥'.repeat(shown) + (input.wrongAttempts > shown ? '…' : '') + '🟩';
  const lines = [
    `Grid Genius #${dailyPuzzleNumber(input.date)} · ${DIFFICULTY_LABEL[input.difficulty]}`,
    `${tries} ${input.wrongAttempts === 0 ? 'first try' : `${input.wrongAttempts + 1} tries`} · ${formatClock(input.seconds)}`,
  ];
  if (input.streak > 1) lines.push(`🔥 ${input.streak}-day streak`);
  lines.push(PUBLIC_DAILY_URL);
  return lines.join('\n');
};

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/** Native share sheet where available (phones), else copy to clipboard. */
export const shareText = async (text: string): Promise<ShareOutcome> => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ text });
      return 'shared';
    }
  } catch (err) {
    // User cancelled the share sheet — not a failure worth surfacing.
    if (err instanceof DOMException && err.name === 'AbortError') return 'failed';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
};
