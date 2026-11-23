import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LEVELS } from '../constants/levels';

export type Stars = 0 | 1 | 2 | 3;

export interface LevelProgress {
  completed: boolean;
  bestStars: Stars;
  bestScore: number;
  playCount: number;
}

export interface StreakState {
  count: number;
  /** ISO date string (UTC) of the most recent day with at least one completion. */
  lastPlayedDate: string | null;
}

export interface DailyPuzzleResult {
  /** Puzzle id that was solved on this date. */
  puzzleId: string;
  /** Wrong submissions before the solve. 0 = first try. */
  wrongAttempts: number;
  /** Wall-clock seconds taken to solve. */
  seconds: number;
}

/** Best-of stats for Play tab modes (persisted locally). */
export interface PlayModePersonalBests {
  /** Lowest total time (ms) for a finished Quick Game run. */
  quickGameBestTimeMs: number | null;
  /** Highest rounds cleared in a single Time Attack session. */
  timeAttackBestRounds: number | null;
}

export interface ProgressState {
  levels: Record<string, LevelProgress>;
  xp: number;
  streak: StreakState;
  /** Per-UTC-date result of the daily puzzle. Key = `YYYY-MM-DD`. */
  daily: Record<string, DailyPuzzleResult>;
  /** Daily-puzzle-specific streak (independent of the learning streak). */
  dailyStreak: StreakState;
  playBests: PlayModePersonalBests;
}

export interface ProgressActions {
  /**
   * Record the result of finishing a level. Best-of: bestStars and bestScore
   * never decrease. XP is credited once for the *initial* completion plus the
   * delta when stars improve. Streak rolls over on UTC date boundaries.
   */
  completeLevel: (id: string, stars: Stars, score: number, now?: Date) => void;
  /**
   * Record a daily-puzzle completion. No-op if today's date already has a
   * record (don't double-count same-day repeat solves). Updates `dailyStreak`.
   */
  completeDailyPuzzle: (
    puzzleId: string,
    wrongAttempts: number,
    seconds: number,
    now?: Date
  ) => void;
  /** Wipe all progress. Used by Settings → Reset progress (future). */
  resetProgress: () => void;
  /** Update Quick Game / Time Attack personal bests after a completed session. */
  recordPlayModeBests: (input: {
    gameMode: 'quickGame' | 'classic' | 'timeAttack';
    totalTimeMs: number;
    timeAttackRoundsCompleted: number;
  }) => void;
}

export type ProgressStore = ProgressState & ProgressActions;

const XP_PER_STAR = 10;

const emptyPlayBests = (): PlayModePersonalBests => ({
  quickGameBestTimeMs: null,
  timeAttackBestRounds: null,
});

const emptyState = (): ProgressState => ({
  levels: {},
  xp: 0,
  streak: { count: 0, lastPlayedDate: null },
  daily: {},
  dailyStreak: { count: 0, lastPlayedDate: null },
  playBests: emptyPlayBests(),
});

const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

const daysBetween = (a: string, b: string): number => {
  const ms = Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z');
  return Math.round(ms / 86_400_000);
};

const rollStreak = (prev: StreakState, today: string): StreakState => {
  if (!prev.lastPlayedDate) return { count: 1, lastPlayedDate: today };
  const gap = daysBetween(prev.lastPlayedDate, today);
  if (gap === 0) return prev; // already counted today
  if (gap === 1) return { count: prev.count + 1, lastPlayedDate: today };
  return { count: 1, lastPlayedDate: today };
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      ...emptyState(),

      completeLevel: (id, stars, score, now = new Date()) =>
        set((state) => {
          const prev: LevelProgress = state.levels[id] ?? {
            completed: false,
            bestStars: 0,
            bestScore: 0,
            playCount: 0,
          };

          const newStars = Math.max(prev.bestStars, stars) as Stars;
          const xpGain = (newStars - prev.bestStars) * XP_PER_STAR;

          const today = isoDay(now);
          const nextStreak = rollStreak(state.streak, today);

          return {
            levels: {
              ...state.levels,
              [id]: {
                completed: true,
                bestStars: newStars,
                bestScore: Math.max(prev.bestScore, score),
                playCount: prev.playCount + 1,
              },
            },
            xp: state.xp + xpGain,
            streak: nextStreak,
          };
        }),

      completeDailyPuzzle: (puzzleId, wrongAttempts, seconds, now = new Date()) =>
        set((state) => {
          const today = isoDay(now);
          // Repeat solves on the same day don't update the record or streak.
          if (state.daily[today]) return state;
          return {
            daily: {
              ...state.daily,
              [today]: { puzzleId, wrongAttempts, seconds },
            },
            dailyStreak: rollStreak(state.dailyStreak, today),
          };
        }),

      resetProgress: () => set(() => emptyState()),

      recordPlayModeBests: ({ gameMode, totalTimeMs, timeAttackRoundsCompleted }) =>
        set((state) => {
          const prev = state.playBests;
          let quickGameBestTimeMs = prev.quickGameBestTimeMs;
          let timeAttackBestRounds = prev.timeAttackBestRounds;

          if (gameMode === 'quickGame' && totalTimeMs > 0) {
            quickGameBestTimeMs =
              quickGameBestTimeMs === null
                ? totalTimeMs
                : Math.min(quickGameBestTimeMs, totalTimeMs);
          }

          if (gameMode === 'timeAttack' && timeAttackRoundsCompleted > 0) {
            timeAttackBestRounds = Math.max(timeAttackBestRounds ?? 0, timeAttackRoundsCompleted);
          }

          if (
            quickGameBestTimeMs === prev.quickGameBestTimeMs &&
            timeAttackBestRounds === prev.timeAttackBestRounds
          ) {
            return state;
          }
          return { ...state, playBests: { quickGameBestTimeMs, timeAttackBestRounds } };
        }),
    }),
    {
      name: 'gridgenius:progress:v1',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') return emptyState();
        if (version < 2) {
          const empties = emptyState();
          return {
            ...empties,
            ...(persisted as Partial<ProgressState>),
            daily: empties.daily,
            dailyStreak: empties.dailyStreak,
            playBests: empties.playBests,
          };
        }
        const prev = persisted as ProgressState;
        return {
          ...prev,
          playBests: prev.playBests ?? emptyPlayBests(),
        };
      },
    }
  )
);

// ─────────────────────────── Selectors / helpers ───────────────────────────

/**
 * A level is unlocked when the previous level in `LEVELS` order has been
 * completed (bestStars >= 1). The very first level is always unlocked.
 *
 * This rule spans units: e.g. u2-l1 unlocks when u1-l5 is completed.
 */
export const isLevelUnlocked = (id: string, levels: Record<string, LevelProgress>): boolean => {
  const idx = LEVELS.findIndex((l) => l.id === id);
  if (idx <= 0) return idx === 0;
  const prevId = LEVELS[idx - 1].id;
  return Boolean(levels[prevId]?.completed);
};

export const getLevelProgress = (
  id: string,
  levels: Record<string, LevelProgress>
): LevelProgress => levels[id] ?? { completed: false, bestStars: 0, bestScore: 0, playCount: 0 };

/** Pure helper to compute stars from accuracy. Exported so ResultPage and tests share it. */
export const computeStars = (wrongAttempts: number): Stars => {
  if (wrongAttempts === 0) return 3;
  if (wrongAttempts <= 1) return 2;
  return 1;
};
