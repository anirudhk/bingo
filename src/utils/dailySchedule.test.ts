import { describe, expect, it } from 'vitest';
import type { PuzzleBundle } from '../types/game';
import bundleRaw from '../../public/puzzles.json?raw';
import { countPuzzleSolutions, dailyDifficultyFor, pickTodaysDailyPuzzle } from './puzzleStore';

const bundle = JSON.parse(bundleRaw) as PuzzleBundle;

describe('daily weekly schedule', () => {
  it('ramps Mon–Tue easy, Wed–Thu medium, Fri–Sun hard', () => {
    // 2026-11-09 is a Monday.
    const days = Array.from({ length: 7 }, (_, i) =>
      dailyDifficultyFor(new Date(Date.UTC(2026, 10, 9 + i, 12)))
    );
    expect(days).toEqual(['easy', 'easy', 'medium', 'medium', 'hard', 'hard', 'hard']);
  });

  it('is deterministic per date and matches the day’s difficulty', () => {
    for (let i = 0; i < 14; i++) {
      const date = new Date(Date.UTC(2026, 10, 9 + i, 6));
      const a = pickTodaysDailyPuzzle(bundle.puzzles, date);
      const b = pickTodaysDailyPuzzle(bundle.puzzles, new Date(date.getTime() + 3 * 3600_000));
      expect(a?.id).toBe(b?.id);
      expect(a?.difficulty).toBe(dailyDifficultyFor(date));
    }
  });

  it('hard days serve a puzzle with exactly one solution', () => {
    const friday = new Date(Date.UTC(2026, 10, 13, 12));
    const p = pickTodaysDailyPuzzle(bundle.puzzles, friday)!;
    expect(countPuzzleSolutions(p)).toBe(1);
  });
});
