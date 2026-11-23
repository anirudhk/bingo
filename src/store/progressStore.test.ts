import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useProgressStore } from './progressStore';

const reset = () => {
  useProgressStore.getState().resetProgress();
  localStorage.clear();
};

beforeEach(reset);
afterEach(reset);

describe('progressStore.completeDailyPuzzle', () => {
  it("records today's solve and starts a 1-day streak", () => {
    const day = new Date(Date.UTC(2026, 4, 10));
    useProgressStore.getState().completeDailyPuzzle('p-foo', 0, 42, day);
    const s = useProgressStore.getState();
    expect(s.daily['2026-05-10']).toEqual({ puzzleId: 'p-foo', wrongAttempts: 0, seconds: 42 });
    expect(s.dailyStreak).toEqual({ count: 1, lastPlayedDate: '2026-05-10' });
  });

  it('does not double-count a same-day repeat solve', () => {
    const day = new Date(Date.UTC(2026, 4, 10));
    useProgressStore.getState().completeDailyPuzzle('p-foo', 0, 42, day);
    useProgressStore.getState().completeDailyPuzzle('p-foo', 3, 99, day);
    const s = useProgressStore.getState();
    // First record wins; second call is a no-op.
    expect(s.daily['2026-05-10'].wrongAttempts).toBe(0);
    expect(s.daily['2026-05-10'].seconds).toBe(42);
    expect(s.dailyStreak.count).toBe(1);
  });

  it('increments the streak on consecutive UTC days', () => {
    useProgressStore.getState().completeDailyPuzzle('a', 0, 10, new Date(Date.UTC(2026, 4, 10)));
    useProgressStore.getState().completeDailyPuzzle('b', 1, 20, new Date(Date.UTC(2026, 4, 11)));
    useProgressStore.getState().completeDailyPuzzle('c', 0, 30, new Date(Date.UTC(2026, 4, 12)));
    expect(useProgressStore.getState().dailyStreak.count).toBe(3);
  });

  it('resets the streak when a day is skipped', () => {
    useProgressStore.getState().completeDailyPuzzle('a', 0, 10, new Date(Date.UTC(2026, 4, 10)));
    useProgressStore.getState().completeDailyPuzzle('c', 0, 30, new Date(Date.UTC(2026, 4, 12)));
    expect(useProgressStore.getState().dailyStreak.count).toBe(1);
  });

  it('keeps the daily streak independent from the learning streak', () => {
    const day = new Date(Date.UTC(2026, 4, 10));
    useProgressStore.getState().completeDailyPuzzle('p-foo', 0, 42, day);
    expect(useProgressStore.getState().streak.count).toBe(0); // learning streak untouched
    expect(useProgressStore.getState().dailyStreak.count).toBe(1);
  });

  it('resetProgress clears daily state too', () => {
    useProgressStore.getState().completeDailyPuzzle('a', 0, 10, new Date());
    useProgressStore.getState().resetProgress();
    expect(useProgressStore.getState().daily).toEqual({});
    expect(useProgressStore.getState().dailyStreak.count).toBe(0);
  });
});

describe('progressStore.recordPlayModeBests', () => {
  it('tracks best quick game time (lower is better)', () => {
    useProgressStore.getState().recordPlayModeBests({
      gameMode: 'quickGame',
      totalTimeMs: 50_000,
      timeAttackRoundsCompleted: 0,
    });
    expect(useProgressStore.getState().playBests.quickGameBestTimeMs).toBe(50_000);

    useProgressStore.getState().recordPlayModeBests({
      gameMode: 'quickGame',
      totalTimeMs: 40_000,
      timeAttackRoundsCompleted: 0,
    });
    expect(useProgressStore.getState().playBests.quickGameBestTimeMs).toBe(40_000);

    useProgressStore.getState().recordPlayModeBests({
      gameMode: 'quickGame',
      totalTimeMs: 45_000,
      timeAttackRoundsCompleted: 0,
    });
    expect(useProgressStore.getState().playBests.quickGameBestTimeMs).toBe(40_000);
  });

  it('tracks best time attack rounds (higher is better)', () => {
    useProgressStore.getState().recordPlayModeBests({
      gameMode: 'timeAttack',
      totalTimeMs: 0,
      timeAttackRoundsCompleted: 4,
    });
    expect(useProgressStore.getState().playBests.timeAttackBestRounds).toBe(4);

    useProgressStore.getState().recordPlayModeBests({
      gameMode: 'timeAttack',
      totalTimeMs: 0,
      timeAttackRoundsCompleted: 8,
    });
    expect(useProgressStore.getState().playBests.timeAttackBestRounds).toBe(8);
  });
});
