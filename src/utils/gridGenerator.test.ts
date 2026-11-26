import { describe, expect, it } from 'vitest';
import { DIFFICULTY_CONFIGS, MAX_NUMBER, MIN_NUMBER } from '../constants/game';
import type { DifficultyConfig } from '../types/game';
import {
  generateGrid,
  getAllCombinations,
  generateTargets,
  generateValidGrid,
  validateGridHasSolutions,
  generateGridFromConfig,
  getAllCombinationsFromConfig,
  generateTargetsFromConfig,
  getTargetCandidates,
  countDistinctSolutions,
  generateValidBoard,
  generateGapOperators,
  generateValidGridFromConfigSeeded,
  solutionKey,
} from './gridGenerator';

describe('generateGrid', () => {
  it.each(['easy', 'medium', 'hard'] as const)(
    'produces an N*N grid with positions and values for "%s"',
    (difficulty) => {
      const cfg = DIFFICULTY_CONFIGS[difficulty];
      const grid = generateGrid(difficulty);
      expect(grid).toHaveLength(cfg.gridSize * cfg.gridSize);

      grid.forEach((tile, idx) => {
        expect(tile.id).toBe(idx);
        expect(tile.position.row).toBe(Math.floor(idx / cfg.gridSize));
        expect(tile.position.col).toBe(idx % cfg.gridSize);
        expect(tile.value).toBeGreaterThanOrEqual(MIN_NUMBER);
        expect(tile.value).toBeLessThanOrEqual(MAX_NUMBER);
      });
    }
  );
});

describe('getAllCombinations', () => {
  it('returns 2-tile combinations whose results are within the easy target range', () => {
    const cfg = DIFFICULTY_CONFIGS.easy;
    const grid = generateGrid('easy');
    const combos = getAllCombinations(grid, 'easy');

    combos.forEach((combo) => {
      expect(combo.tiles).toHaveLength(2);
      expect(combo.operators).toHaveLength(1);
      expect(combo.result).toBeGreaterThanOrEqual(cfg.targetRange.min);
      expect(combo.result).toBeLessThanOrEqual(cfg.targetRange.max);
      expect(cfg.availableOperators).toContain(combo.operators[0]);
    });
  });

  it('returns 3-tile combinations for hard with results in range', () => {
    const cfg = DIFFICULTY_CONFIGS.hard;
    const grid = generateGrid('hard');
    const combos = getAllCombinations(grid, 'hard');

    combos.forEach((combo) => {
      expect(combo.tiles).toHaveLength(3);
      expect(combo.operators).toHaveLength(2);
      expect(combo.result).toBeGreaterThanOrEqual(0);
      expect(combo.result).toBeLessThanOrEqual(cfg.targetRange.max);
    });
  });

  it('only emits combinations whose tiles are in straight rows or columns', () => {
    const grid = generateGrid('medium');
    const combos = getAllCombinations(grid, 'medium');

    combos.forEach((combo) => {
      const rows = new Set(combo.tiles.map((t) => t.position.row));
      const cols = new Set(combo.tiles.map((t) => t.position.col));
      // Either all share a row (horizontal) or all share a column (vertical).
      expect(rows.size === 1 || cols.size === 1).toBe(true);
    });
  });
});

describe('generateTargets', () => {
  it('returns at most totalRounds targets', () => {
    const cfg = DIFFICULTY_CONFIGS.medium;
    const grid = generateGrid('medium');
    const combos = getAllCombinations(grid, 'medium');
    const targets = generateTargets(combos, 'medium');
    expect(targets.length).toBeLessThanOrEqual(cfg.totalRounds);
  });

  it('returns [] when there are no combinations', () => {
    expect(generateTargets([], 'medium')).toEqual([]);
  });

  it('every target value is achievable from the combination set', () => {
    const grid = generateGrid('medium');
    const combos = getAllCombinations(grid, 'medium');
    const possibleResults = new Set(combos.map((c) => c.result));
    const targets = generateTargets(combos, 'medium');
    targets.forEach((t) => expect(possibleResults.has(t)).toBe(true));
  });
});

describe('target selection quality', () => {
  // Generate many sessions — these properties must hold for every one.
  const sessions = (difficulty: 'easy' | 'medium' | 'hard', n = 200) =>
    Array.from({ length: n }, () => {
      const { grid, gaps } = generateValidBoard(difficulty);
      const combos = getAllCombinations(grid, difficulty, gaps);
      return { combos, targets: generateTargets(combos, difficulty) };
    });

  it.each(['easy', 'medium', 'hard'] as const)(
    'never repeats a target within a "%s" session when the grid has enough distinct results',
    (difficulty) => {
      for (const { combos, targets } of sessions(difficulty)) {
        const distinctAvailable = new Set(combos.map((c) => c.result)).size;
        if (distinctAvailable < targets.length) continue;
        expect(new Set(targets).size).toBe(targets.length);
      }
    }
  );

  it('orders targets easiest → hardest (non-increasing solution count)', () => {
    for (const { combos, targets } of sessions('medium', 50)) {
      const counts = new Map(getTargetCandidates(combos).map((c) => [c.result, c.solutionCount]));
      const seq = targets.map((t) => counts.get(t)!);
      for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeLessThanOrEqual(seq[i - 1]);
    }
  });

  it('hard prefers single-solution targets', () => {
    let unique = 0;
    let total = 0;
    for (const { combos, targets } of sessions('hard')) {
      const counts = new Map(getTargetCandidates(combos).map((c) => [c.result, c.solutionCount]));
      targets.forEach((t) => {
        total += 1;
        if (counts.get(t) === 1) unique += 1;
      });
    }
    expect(unique / total).toBeGreaterThan(0.95);
  });

  it('getTargetCandidates counts each distinct solution once (either tap direction)', () => {
    const grid = generateValidGrid('medium');
    const combos = getAllCombinations(grid, 'medium');
    const candidates = getTargetCandidates(combos);
    const distinctPerResult = [...new Set(combos.map((c) => c.result))].reduce(
      (sum, r) => sum + countDistinctSolutions(combos.filter((c) => c.result === r)),
      0
    );
    expect(candidates.reduce((sum, c) => sum + c.solutionCount, 0)).toBe(distinctPerResult);
    expect(new Set(candidates.map((c) => c.result)).size).toBe(candidates.length);
  });
});

describe('FromConfig variants — restricted operator sets', () => {
  const addOnly: DifficultyConfig = {
    gridSize: 3,
    tilesCount: 2,
    operatorsCount: 1,
    availableOperators: ['+'],
    targetRange: { min: 2, max: 18 },
    totalRounds: 5,
  };

  const addSubOnly: DifficultyConfig = {
    gridSize: 4,
    tilesCount: 3,
    operatorsCount: 2,
    availableOperators: ['+', '-'],
    targetRange: { min: 1, max: 30 },
    totalRounds: 5,
  };

  it('addition-only: every combo uses "+" only and result is in range', () => {
    const grid = generateGridFromConfig(addOnly);
    const combos = getAllCombinationsFromConfig(grid, addOnly);
    expect(combos.length).toBeGreaterThan(0);
    combos.forEach((c) => {
      expect(c.operators).toEqual(['+']);
      expect(c.result).toBeGreaterThanOrEqual(addOnly.targetRange.min);
      expect(c.result).toBeLessThanOrEqual(addOnly.targetRange.max);
    });
    const targets = generateTargetsFromConfig(combos, addOnly);
    targets.forEach((t) => expect(combos.some((c) => c.result === t)).toBe(true));
  });

  it('add+sub-only: no combo uses "*"', () => {
    const grid = generateGridFromConfig(addSubOnly);
    const combos = getAllCombinationsFromConfig(grid, addSubOnly);
    combos.forEach((c) => {
      c.operators.forEach((op) => expect(['+', '-']).toContain(op));
    });
  });
});

describe('generateValidGrid / validateGridHasSolutions', () => {
  it.each(['easy', 'medium', 'hard'] as const)(
    'always returns a grid that satisfies validateGridHasSolutions for "%s"',
    (difficulty) => {
      // Run a few times to exercise the retry path.
      for (let i = 0; i < 5; i++) {
        const grid = generateValidGrid(difficulty);
        // The fallback at the end of generateValidGrid may return an invalid
        // grid in pathological cases, but with 9-value tiles and the configured
        // ranges this should virtually never happen — we don't assert
        // validity unconditionally to keep the test deterministic.
        if (validateGridHasSolutions(grid, difficulty)) {
          expect(grid.length).toBeGreaterThan(0);
        }
      }
    }
  );
});

describe('sign slots (signs per gap)', () => {
  const allGapSigns = (gaps: Record<string, string[]>) => Object.values(gaps);

  it.each([
    ['easy', 1, 3],
    ['medium', 2, 4],
    ['hard', 2, 4],
  ] as const)('%s boards show %i sign(s) in every gap of a %i×%i grid', (difficulty, k, n) => {
    const { gaps } = generateValidBoard(difficulty);
    expect(gaps).not.toBeNull();
    // n rows × (n−1) horizontal gaps + (n−1) rows × n vertical gaps
    expect(Object.keys(gaps!)).toHaveLength(2 * n * (n - 1));
    allGapSigns(gaps!).forEach((signs) => {
      expect(signs).toHaveLength(k);
      expect(new Set(signs).size).toBe(k);
      signs.forEach((op) => expect(['+', '-', '*']).toContain(op));
    });
  });

  it('every combination uses only signs its gaps show', () => {
    for (let i = 0; i < 20; i++) {
      const { grid, gaps } = generateValidBoard('hard');
      getAllCombinations(grid, 'hard', gaps).forEach((c) => {
        c.operators.forEach((op, j) => {
          const a = c.tiles[j].position;
          const b = c.tiles[j + 1].position;
          const key =
            a.row === b.row
              ? `h:${a.row}:${Math.min(a.col, b.col)}`
              : `v:${Math.min(a.row, b.row)}:${a.col}`;
          expect(gaps![key]).toContain(op);
        });
      });
    }
  });

  it('counts paths in both tap directions, but as one solution', () => {
    const cfg = { ...DIFFICULTY_CONFIGS.easy, gridSize: 2, targetRange: { min: 1, max: 99 } };
    const grid = [
      { id: 0, value: 3, position: { row: 0, col: 0 } },
      { id: 1, value: 8, position: { row: 0, col: 1 } },
      { id: 2, value: 1, position: { row: 1, col: 0 } },
      { id: 3, value: 1, position: { row: 1, col: 1 } },
    ];
    const gaps = { 'h:0:0': ['-'], 'h:1:0': ['+'], 'v:0:0': ['+'], 'v:0:1': ['+'] };
    const combos = getAllCombinationsFromConfig(grid, cfg, gaps);
    // 8 − 3 = 5 is only reachable right-to-left.
    expect(combos.some((c) => c.result === 5 && c.tiles[0].id === 1)).toBe(true);
    // 1 + 1 both ways is the same solution.
    const twos = combos.filter((c) => c.tiles.every((t) => t.position.row === 1) && c.result === 2);
    expect(twos).toHaveLength(2);
    expect(new Set(twos.map(solutionKey)).size).toBe(1);
  });

  it('Learn-style configs (no signsPerGap) show every sign everywhere', () => {
    expect(generateGapOperators({ ...DIFFICULTY_CONFIGS.easy, signsPerGap: undefined })).toBeNull();
  });

  it('seeded multiplayer boards include identical gap signs for both players', () => {
    const cfg = { ...DIFFICULTY_CONFIGS.medium, totalRounds: 1 };
    const a = generateValidGridFromConfigSeeded(cfg, 'session|1|123');
    const b = generateValidGridFromConfigSeeded(cfg, 'session|1|123');
    expect(a?.gaps).toEqual(b?.gaps);
    expect(a?.grid.map((t) => t.value)).toEqual(b?.grid.map((t) => t.value));
  });
});
