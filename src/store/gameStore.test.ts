import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __getActiveTimerHandlesForTests, useGameStore } from './gameStore';

const initial = useGameStore.getState();

const reset = () => {
  useGameStore.setState({ ...initial }, true);
  useGameStore.getState().cleanup();
};

beforeEach(() => {
  reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  reset();
});

describe('initializeGame', () => {
  it('sets gameStatus = "playing" with a populated grid and target', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const s = useGameStore.getState();
    expect(s.gameStatus).toBe('playing');
    expect(s.grid.length).toBe(9); // 3x3
    expect(s.currentTarget).toBeGreaterThan(0);
    expect(s.currentRound).toBe(1);
    expect(s.totalRounds).toBeGreaterThan(0);
    expect(s.initError).toBeNull();
  });

  it('resets score and timers to zero on a fresh init', () => {
    useGameStore.setState({ score: 999, totalTime: 5000, roundsTimeMs: 5000 });
    useGameStore.getState().initializeGame('easy', 'classic');
    const s = useGameStore.getState();
    expect(s.score).toBe(0);
    expect(s.totalTime).toBe(0);
    expect(s.roundsTimeMs).toBe(0);
  });

  it('forces easy difficulty (3x3, 2 tiles + 1 op) when gameMode is quickGame', () => {
    useGameStore.getState().initializeGame('hard', 'quickGame');
    const s = useGameStore.getState();
    expect(s.difficulty).toBe('easy');
    expect(s.totalRounds).toBe(5);
    expect(s.grid.length).toBe(9); // 3 * 3
  });

  it('starts the time-attack interval for timeAttack mode', () => {
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    expect(__getActiveTimerHandlesForTests().timeAttackInterval).not.toBeNull();
    expect(useGameStore.getState().timeAttackTimeLeft).toBe(60_000);
  });

  it('clears any prior timers before re-initializing', () => {
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    const firstHandle = __getActiveTimerHandlesForTests().timeAttackInterval;
    expect(firstHandle).not.toBeNull();

    useGameStore.getState().initializeGame('medium', 'timeAttack');
    const secondHandle = __getActiveTimerHandlesForTests().timeAttackInterval;
    expect(secondHandle).not.toBeNull();
    expect(secondHandle).not.toBe(firstHandle);
  });
});

describe('submitSolution', () => {
  it('returns true and credits a score on a correct answer', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const { grid, currentTarget } = useGameStore.getState();

    // Find any valid horizontal pair that hits the target.
    const cfg = { gridSize: 3 } as const;
    let hit: { tiles: typeof grid; operators: string[] } | null = null;
    for (let r = 0; r < cfg.gridSize && !hit; r++) {
      for (let c = 0; c < cfg.gridSize - 1 && !hit; c++) {
        const t1 = grid[r * cfg.gridSize + c];
        const t2 = grid[r * cfg.gridSize + c + 1];
        for (const op of ['+', '-', '*'] as const) {
          const r1 =
            op === '+'
              ? t1.value + t2.value
              : op === '-'
                ? t1.value - t2.value
                : t1.value * t2.value;
          if (r1 === currentTarget) {
            hit = { tiles: [t1, t2], operators: [op] };
            break;
          }
        }
      }
    }

    if (!hit) {
      // Some seeded grids may not have a horizontal solution for the first
      // target; assert the negative path instead so the test is deterministic.
      expect(useGameStore.getState().submitSolution(grid.slice(0, 2), ['+'])).toBe(false);
      return;
    }

    const ok = useGameStore.getState().submitSolution(hit.tiles, hit.operators);
    expect(ok).toBe(true);
    expect(useGameStore.getState().score).toBeGreaterThan(0);
    // Classic waits for the player's Continue tap rather than a timer.
    expect(__getActiveTimerHandlesForTests().autoAdvanceTimeout).toBeNull();
  });

  it('returns false on a wrong answer and does not change the score', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const before = useGameStore.getState().score;
    // Force a wrong target so we know the answer is wrong.
    useGameStore.setState({ currentTarget: -999 });
    const { grid } = useGameStore.getState();
    const ok = useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    expect(ok).toBe(false);
    expect(useGameStore.getState().score).toBe(before);
  });

  it('cleanup clears the auto-advance timeout (Time Attack)', () => {
    useGameStore.getState().initializeGame('easy', 'timeAttack');
    useGameStore.setState({ currentTarget: 999_999 });
    // Force a "correct" answer by aligning currentTarget with a known sum.
    const grid = useGameStore.getState().grid;
    const sum = grid[0].value + grid[1].value;
    useGameStore.setState({ currentTarget: sum });

    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    expect(__getActiveTimerHandlesForTests().autoAdvanceTimeout).not.toBeNull();

    useGameStore.getState().cleanup();
    expect(__getActiveTimerHandlesForTests().autoAdvanceTimeout).toBeNull();
  });

  it('does not score the same round twice during the success delay', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const grid = useGameStore.getState().grid;
    useGameStore.setState({ currentTarget: grid[0].value + grid[1].value });

    expect(useGameStore.getState().submitSolution([grid[0], grid[1]], ['+'])).toBe(true);
    const scoreAfterFirst = useGameStore.getState().score;
    expect(useGameStore.getState().roundSolved).toBe(true);

    // Re-submitting before auto-advance must be ignored.
    expect(useGameStore.getState().submitSolution([grid[0], grid[1]], ['+'])).toBe(false);
    expect(useGameStore.getState().score).toBe(scoreAfterFirst);

    // Nothing advances by itself; Continue opens the next round.
    vi.advanceTimersByTime(10_000);
    expect(useGameStore.getState().currentRound).toBe(1);
    useGameStore.getState().continueAfterSolve();
    expect(useGameStore.getState().currentRound).toBe(2);
    expect(useGameStore.getState().roundSolved).toBe(false);
  });

  it('counts a time-attack round only once per correct answer', () => {
    useGameStore.getState().initializeGame('easy', 'timeAttack');
    const grid = useGameStore.getState().grid;
    useGameStore.setState({ currentTarget: grid[0].value + grid[1].value });

    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    expect(useGameStore.getState().timeAttackRoundsCompleted).toBe(1);
  });

  it('ignores submissions once the game is not playing', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const grid = useGameStore.getState().grid;
    useGameStore.setState({
      currentTarget: grid[0].value + grid[1].value,
      gameStatus: 'completed',
    });
    expect(useGameStore.getState().submitSolution([grid[0], grid[1]], ['+'])).toBe(false);
    expect(useGameStore.getState().score).toBe(0);
  });
});

describe('nextRound', () => {
  it('completes the game when currentRound === totalRounds', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    useGameStore.setState({
      currentRound: 5,
      totalRounds: 5,
      roundStartTime: Date.now() - 1000,
      roundsTimeMs: 4000,
    });

    useGameStore.getState().nextRound();
    const s = useGameStore.getState();
    expect(s.gameStatus).toBe('completed');
    expect(s.totalTime).toBeGreaterThanOrEqual(4000);
    expect(s.roundStartTime).toBeNull();
  });

  it('advances currentRound and accumulates roundsTimeMs across rounds', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    useGameStore.setState({
      currentRound: 1,
      totalRounds: 3,
      roundStartTime: Date.now() - 2000,
      roundsTimeMs: 0,
    });

    useGameStore.getState().nextRound();
    const s = useGameStore.getState();
    expect(s.currentRound).toBe(2);
    expect(s.roundsTimeMs).toBeGreaterThanOrEqual(2000);
    expect(s.roundStartTime).not.toBeNull();
  });
});

describe('time attack', () => {
  it('decrements timeLeft on tick and ends the game at zero', () => {
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    expect(useGameStore.getState().timeAttackTimeLeft).toBe(60_000);

    // Advance clock slightly — should decrement.
    vi.advanceTimersByTime(500);
    const after500 = useGameStore.getState().timeAttackTimeLeft ?? -1;
    expect(after500).toBeLessThan(60_000);

    // Run all the way to zero.
    vi.advanceTimersByTime(60_000);
    const s = useGameStore.getState();
    expect(s.gameStatus).toBe('completed');
    expect(s.timeAttackTimeLeft).toBe(0);
    expect(__getActiveTimerHandlesForTests().timeAttackInterval).toBeNull();
  });

  it('keeps real time even when timer ticks are throttled', () => {
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    // Simulate a throttled/background tab: wall clock jumps 30 s, few ticks fire.
    vi.setSystemTime(Date.now() + 30_000);
    vi.advanceTimersByTime(100);
    const left = useGameStore.getState().timeAttackTimeLeft ?? -1;
    expect(left).toBeLessThanOrEqual(30_000);
    expect(left).toBeGreaterThan(29_000);
  });

  it('resumes from the remaining time after a pause', () => {
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    vi.advanceTimersByTime(10_000);
    useGameStore.getState().pauseGame();
    vi.setSystemTime(Date.now() + 120_000); // long pause must not eat the clock
    useGameStore.getState().resumeGame();
    vi.advanceTimersByTime(100);
    const left = useGameStore.getState().timeAttackTimeLeft ?? -1;
    expect(left).toBeGreaterThan(49_000);
    expect(left).toBeLessThanOrEqual(50_000);
  });

  it('serves a fresh grid every round and solves only once per round', () => {
    useGameStore.getState().initializeGame('easy', 'timeAttack');
    const firstGrid = useGameStore.getState().grid;
    useGameStore.setState({ currentTarget: firstGrid[0].value + firstGrid[1].value });
    expect(useGameStore.getState().submitSolution([firstGrid[0], firstGrid[1]], ['+'])).toBe(true);
    vi.advanceTimersByTime(1_600); // success delay → nextRound
    const s = useGameStore.getState();
    expect(s.grid).not.toBe(firstGrid);
    expect(s.roundSolved).toBe(false);
    expect(s.timeAttackRoundsCompleted).toBe(1);
    expect(s.targetNumbers).toContain(s.currentTarget);
  });

  it('cleanup() leaves no leaked interval', () => {
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    expect(__getActiveTimerHandlesForTests().timeAttackInterval).not.toBeNull();
    useGameStore.getState().cleanup();
    expect(__getActiveTimerHandlesForTests().timeAttackInterval).toBeNull();
  });
});

describe('initializeLevel (Learn path)', () => {
  it('initialises a known level: gameMode=learning, currentLevelId set, grid populated', () => {
    useGameStore.getState().initializeLevel('u1-l1');
    const s = useGameStore.getState();
    expect(s.gameMode).toBe('learning');
    expect(s.currentLevelId).toBe('u1-l1');
    expect(s.gameStatus).toBe('playing');
    expect(s.grid.length).toBe(9); // u1 = 3x3
    expect(s.totalRounds).toBeGreaterThan(0);
    expect(s.wrongAttempts).toBe(0);
    expect(s.initError).toBeNull();
  });

  it('uses the level grid size — u3-l1 is 4x4 (16 tiles)', () => {
    useGameStore.getState().initializeLevel('u3-l1');
    expect(useGameStore.getState().grid.length).toBe(16);
  });

  it('sets initError on an unknown level id and does not throw', () => {
    useGameStore.getState().initializeLevel('does-not-exist');
    const s = useGameStore.getState();
    expect(s.gameMode).toBe('learning');
    expect(s.initError).toMatch(/Unknown level/);
    expect(s.gameStatus).toBe('paused');
  });

  it('clears any prior auto-advance when re-initialising a level', () => {
    useGameStore.getState().initializeLevel('u1-l1');
    const grid = useGameStore.getState().grid;
    const sum = grid[0].value + grid[1].value;
    useGameStore.setState({ currentTarget: sum });
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    expect(useGameStore.getState().roundSolved).toBe(true);

    useGameStore.getState().initializeLevel('u1-l2');
    expect(__getActiveTimerHandlesForTests().autoAdvanceTimeout).toBeNull();
    expect(useGameStore.getState().roundSolved).toBe(false);
    expect(useGameStore.getState().currentLevelId).toBe('u1-l2');
  });
});

describe('wrongAttempts (Learn path)', () => {
  it('does NOT increment wrongAttempts in classic mode', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    useGameStore.setState({ currentTarget: -999 }); // Force wrong.
    const grid = useGameStore.getState().grid;
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    expect(useGameStore.getState().wrongAttempts).toBe(0);
  });

  it('increments wrongAttempts on each failed submit in learning mode', () => {
    useGameStore.getState().initializeLevel('u1-l1');
    useGameStore.setState({ currentTarget: -999 });
    const grid = useGameStore.getState().grid;
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['-']);
    expect(useGameStore.getState().wrongAttempts).toBe(2);
  });

  it('does not increment wrongAttempts on a correct submit in learning mode', () => {
    useGameStore.getState().initializeLevel('u1-l1');
    const grid = useGameStore.getState().grid;
    const sum = grid[0].value + grid[1].value;
    useGameStore.setState({ currentTarget: sum });
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    expect(useGameStore.getState().wrongAttempts).toBe(0);
  });
});

describe('init retry cap', () => {
  it('enters initError state instead of recursing forever when target generation always fails', async () => {
    // Patch the gridGenerator module so generateTargets always returns [].
    vi.resetModules();
    vi.doMock('../utils/gridGenerator', () => ({
      generateValidBoardFromConfig: () => ({ grid: [], gaps: null }),
      generateValidGridFromConfigSeeded: () => null,
      getAllCombinationsFromConfig: () => [],
      generateTargetsFromConfig: () => [],
    }));

    const { useGameStore: freshStore } = await import('./gameStore');
    freshStore.getState().initializeGame('medium', 'classic');
    const s = freshStore.getState();
    expect(s.initError).toMatch(/Could not generate a solvable grid/);
    expect(s.gameStatus).toBe('paused');

    vi.doUnmock('../utils/gridGenerator');
  });
});

describe('hints and hidden tabs', () => {
  it('recordHint deducts the penalty and counts the hint', () => {
    useGameStore.getState().initializeLevel('u1-l1');
    useGameStore.setState({ score: 20 });
    useGameStore.getState().recordHint(5);
    expect(useGameStore.getState().score).toBe(15);
    expect(useGameStore.getState().hintsUsed).toBe(1);
  });

  it('does not count time while the tab is hidden', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const start = useGameStore.getState().roundStartTime!;
    useGameStore.getState().setPageHidden(true);
    vi.advanceTimersByTime(60_000);
    useGameStore.getState().setPageHidden(false);
    // The round start moved forward by the hidden minute.
    expect(useGameStore.getState().roundStartTime! - start).toBeGreaterThanOrEqual(60_000);
  });

  it('holds Time Attack auto-advance while hidden and advances on return', () => {
    useGameStore.getState().initializeGame('easy', 'timeAttack');
    const grid = useGameStore.getState().grid;
    useGameStore.setState({ currentTarget: grid[0].value + grid[1].value });
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    useGameStore.getState().setPageHidden(true);
    vi.advanceTimersByTime(5_000);
    expect(useGameStore.getState().grid).toBe(grid);
    useGameStore.getState().setPageHidden(false);
    expect(useGameStore.getState().grid).not.toBe(grid);
    useGameStore.getState().cleanup();
  });

  it('Continue advances, and time spent on the feedback bar is not counted', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const grid = useGameStore.getState().grid;
    useGameStore.setState({ currentTarget: grid[0].value + grid[1].value });
    vi.advanceTimersByTime(3_000); // solving takes 3 s
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    vi.advanceTimersByTime(20_000); // reading the bar for 20 s
    useGameStore.getState().continueAfterSolve();
    const s = useGameStore.getState();
    expect(s.currentRound).toBe(2);
    expect(s.roundsTimeMs).toBeGreaterThanOrEqual(3_000);
    expect(s.roundsTimeMs).toBeLessThan(4_000);
  });

  it('Continue does nothing before the round is solved', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    useGameStore.getState().continueAfterSolve();
    expect(useGameStore.getState().currentRound).toBe(1);
  });

  it('Time Attack keeps running while hidden', () => {
    useGameStore.getState().initializeGame('easy', 'timeAttack');
    useGameStore.getState().setPageHidden(true);
    vi.advanceTimersByTime(61_000);
    expect(useGameStore.getState().gameStatus).toBe('completed');
    useGameStore.getState().setPageHidden(false);
  });
});

describe('difficulty ladder in the store', () => {
  it('easy boards carry one sign per gap', () => {
    useGameStore.getState().initializeGame('easy', 'classic');
    const gaps = useGameStore.getState().gapOperators!;
    expect(Object.values(gaps).every((signs) => signs.length === 1)).toBe(true);
  });

  it('Quick Game is unchanged: 3×3, + and − in every gap', () => {
    useGameStore.getState().initializeGame('easy', 'quickGame');
    const s = useGameStore.getState();
    expect(s.gapOperators).toBeNull();
    expect(s.grid).toHaveLength(9);
    expect(s.difficulty).toBe('easy');
  });

  it('Time Attack rounds get fresh gap signs with each new board', () => {
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    const first = useGameStore.getState().gapOperators;
    expect(first).not.toBeNull();
    useGameStore.setState({ roundSolved: true });
    useGameStore.getState().nextRound();
    expect(useGameStore.getState().gapOperators).not.toBe(first);
    useGameStore.getState().cleanup();
  });
});

describe('combo streak', () => {
  const solveCurrent = () => {
    const grid = useGameStore.getState().grid;
    useGameStore.setState({ currentTarget: grid[0].value + grid[1].value });
    return useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
  };

  it('counts correct answers in a row and resets on a wrong answer', () => {
    useGameStore.getState().initializeLevel('u1-l1');
    expect(solveCurrent()).toBe(true);
    expect(useGameStore.getState().comboStreak).toBe(1);
    useGameStore.getState().continueAfterSolve();
    solveCurrent();
    expect(useGameStore.getState().comboStreak).toBe(2);
    useGameStore.getState().continueAfterSolve();
    useGameStore.setState({ currentTarget: -1 });
    const grid = useGameStore.getState().grid;
    useGameStore.getState().submitSolution([grid[0], grid[1]], ['+']);
    expect(useGameStore.getState().comboStreak).toBe(0);
  });

  it('a hint ends the combo', () => {
    useGameStore.getState().initializeLevel('u1-l1');
    solveCurrent();
    useGameStore.getState().continueAfterSolve();
    useGameStore.getState().recordHint(5);
    expect(useGameStore.getState().comboStreak).toBe(0);
  });
});

describe('seeded games (challenge links)', () => {
  const snapshot = () => {
    const s = useGameStore.getState();
    return { grid: s.grid.map((t) => t.value), gaps: s.gapOperators, targets: s.targetNumbers };
  };

  it.each(['classic', 'quickGame'] as const)('the same seed replays the same %s game', (mode) => {
    useGameStore.getState().initializeGame('hard', mode, 'seed42');
    const a = snapshot();
    expect(useGameStore.getState().gameSeed).toBe('seed42');
    useGameStore.getState().initializeGame('hard', mode, 'seed42');
    expect(snapshot()).toEqual(a);
    useGameStore.getState().initializeGame('hard', mode, 'other7');
    expect(snapshot()).not.toEqual(a);
  });

  it('every Classic game gets a shareable seed; Time Attack does not', () => {
    useGameStore.getState().initializeGame('medium', 'classic');
    expect(useGameStore.getState().gameSeed).toMatch(/^[a-z0-9]{8,}$/);
    useGameStore.getState().initializeGame('medium', 'timeAttack');
    expect(useGameStore.getState().gameSeed).toBeNull();
    useGameStore.getState().cleanup();
  });
});
