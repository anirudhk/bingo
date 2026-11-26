import type {
  Tile,
  GameCombination,
  DifficultyLevel,
  DifficultyConfig,
  GapOperators,
} from '../types/game';
import { DIFFICULTY_CONFIGS, MIN_NUMBER, MAX_NUMBER } from '../constants/game';
import { logger } from './logger';
import { shuffleUniform, type SeededRng, makeRng } from './rng';

// All public helpers accept a `DifficultyConfig` directly. Thin wrappers
// preserve the older `DifficultyLevel` API so existing call sites and tests
// keep working unchanged. New code (e.g. learning-mode levels) passes a
// LevelConfig — which extends DifficultyConfig — through the *FromConfig*
// variants.

export const generateGridFromConfigSeeded = (config: DifficultyConfig, rng: SeededRng): Tile[] => {
  const gridSize = config.gridSize;
  const tiles: Tile[] = [];

  for (let i = 0; i < gridSize * gridSize; i++) {
    tiles.push({
      id: i,
      value: rng.intBetween(MIN_NUMBER, MAX_NUMBER),
      position: {
        row: Math.floor(i / gridSize),
        col: i % gridSize,
      },
    });
  }

  return tiles;
};

export const generateGridFromConfig = (config: DifficultyConfig): Tile[] => {
  const gridSize = config.gridSize;
  const tiles: Tile[] = [];

  for (let i = 0; i < gridSize * gridSize; i++) {
    tiles.push({
      id: i,
      value: Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER,
      position: {
        row: Math.floor(i / gridSize),
        col: i % gridSize,
      },
    });
  }

  return tiles;
};

// ─── Gaps between tiles ─────────────────────────────────────────────────────

type Pos = { row: number; col: number };

/** Key for the gap right of (row, col) — 'h' — or below it — 'v'. */
export const gapKey = (orientation: 'h' | 'v', row: number, col: number): string =>
  `${orientation}:${row}:${col}`;

/** The gap between two orthogonally adjacent positions, or null if they aren't neighbours. */
export const gapBetween = (
  a: Pos,
  b: Pos
): { key: string; position: 'horizontal' | 'vertical'; row: number; col: number } | null => {
  const dr = b.row - a.row;
  const dc = b.col - a.col;
  if (dr === 0 && Math.abs(dc) === 1) {
    const col = Math.min(a.col, b.col);
    return { key: gapKey('h', a.row, col), position: 'horizontal', row: a.row, col };
  }
  if (dc === 0 && Math.abs(dr) === 1) {
    const row = Math.min(a.row, b.row);
    return { key: gapKey('v', row, a.col), position: 'vertical', row, col: a.col };
  }
  return null;
};

const SIGN_ORDER = ['+', '-', '*'];

/**
 * Pick the signs each gap shows. Returns null when every gap shows every
 * available sign (no `signsPerGap`, or it covers them all).
 */
export const generateGapOperators = (
  config: DifficultyConfig,
  shuffle: <T>(arr: readonly T[]) => T[] = shuffleUniform
): GapOperators | null => {
  const k = config.signsPerGap;
  if (k === undefined || k >= config.availableOperators.length) return null;
  const n = config.gridSize;
  const gaps: GapOperators = {};
  const pick = () =>
    shuffle(config.availableOperators)
      .slice(0, k)
      .sort((a, b) => SIGN_ORDER.indexOf(a) - SIGN_ORDER.indexOf(b));
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (col < n - 1) gaps[gapKey('h', row, col)] = pick();
      if (row < n - 1) gaps[gapKey('v', row, col)] = pick();
    }
  }
  return gaps;
};

/** Signs available in one gap. */
export const signsForGap = (
  gaps: GapOperators | null | undefined,
  config: DifficultyConfig,
  key: string
): string[] => gaps?.[key] ?? config.availableOperators;

const applySign = (acc: number, op: string, v: number): number =>
  op === '+' ? acc + v : op === '-' ? acc - v : acc * v;

/**
 * Every straight path of `tilesCount` tiles — in all four directions, since
 * players can tap either way — with every sign choice its gaps allow, whose
 * left-to-right value lands in the target range.
 */
export const getAllCombinationsFromConfig = (
  grid: Tile[],
  config: DifficultyConfig,
  gaps: GapOperators | null = null
): GameCombination[] => {
  const n = config.gridSize;
  const len = config.tilesCount;
  const at = (row: number, col: number) => grid[row * n + col];
  const combinations: GameCombination[] = [];
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      for (const [dr, dc] of directions) {
        const endRow = row + dr * (len - 1);
        const endCol = col + dc * (len - 1);
        if (endRow < 0 || endRow >= n || endCol < 0 || endCol >= n) continue;
        const tiles = Array.from({ length: len }, (_, i) => at(row + dr * i, col + dc * i));
        if (tiles.some((t) => !t)) continue;
        const gapSigns = tiles
          .slice(1)
          .map((t, i) => signsForGap(gaps, config, gapBetween(tiles[i].position, t.position)!.key));

        // Cartesian product of the signs in each gap.
        const walk = (i: number, ops: string[], acc: number) => {
          if (i === len - 1) {
            if (acc >= config.targetRange.min && acc <= config.targetRange.max) {
              combinations.push({ tiles, operators: ops, result: acc });
            }
            return;
          }
          for (const op of gapSigns[i])
            walk(i + 1, [...ops, op], applySign(acc, op, tiles[i + 1].value));
        };
        walk(0, [], tiles[0].value);
      }
    }
  }
  return combinations;
};

/**
 * A solution's identity: which tiles and which sign in each gap. The same
 * line tapped in the other direction is the same solution, so 3 + 4 and
 * 4 + 3 don't count twice.
 */
export const solutionKey = (combo: GameCombination): string => {
  const tiles = combo.tiles.map((t) => t.id).sort((a, b) => a - b);
  const signs = combo.operators
    .map(
      (op, i) => `${gapBetween(combo.tiles[i].position, combo.tiles[i + 1].position)!.key}=${op}`
    )
    .sort();
  return `${tiles.join(',')}|${signs.join(',')}`;
};

/** Distinct solutions (ignoring tap direction) among combinations. */
export const countDistinctSolutions = (combinations: GameCombination[]): number =>
  new Set(combinations.map(solutionKey)).size;

/** One reachable target on a grid, with how many distinct paths hit it. */
export interface TargetCandidate {
  result: number;
  /** Number of (path, operators) combinations that evaluate to `result`.
   *  Fewer solutions ⇒ harder to find — this is the puzzle's difficulty. */
  solutionCount: number;
  /** True if at least one solution mixes two different operators. */
  hasMixedOperators: boolean;
}

/** Group combinations by result so each target appears once, with its solution count. */
export const getTargetCandidates = (combinations: GameCombination[]): TargetCandidate[] => {
  const byResult = new Map<number, TargetCandidate & { keys: Set<string> }>();
  for (const combo of combinations) {
    const mixed = combo.operators.length > 1 && combo.operators[0] !== combo.operators[1];
    const key = solutionKey(combo);
    const existing = byResult.get(combo.result);
    if (existing) {
      existing.keys.add(key);
      existing.solutionCount = existing.keys.size;
      existing.hasMixedOperators ||= mixed;
    } else {
      byResult.set(combo.result, {
        result: combo.result,
        solutionCount: 1,
        hasMixedOperators: mixed,
        keys: new Set([key]),
      });
    }
  }
  return [...byResult.values()].map(({ keys: _keys, ...c }) => c);
};

/**
 * Pick `config.totalRounds` targets from the reachable combinations.
 *
 * - Each target is distinct within a session (repeats only if the grid can't
 *   supply enough distinct results).
 * - When `config.maxSolutionsPerTarget` is set, targets with at most that many
 *   solutions are preferred (harder puzzles); the hardest remaining are used
 *   as a fallback.
 * - Targets reachable with mixed operators are preferred — more interesting.
 * - The returned order ramps from easiest (most solutions) to hardest.
 */
const selectTargets = (
  combinations: GameCombination[],
  config: DifficultyConfig,
  shuffle: <T>(arr: readonly T[]) => T[]
): number[] => {
  const totalRounds = config.totalRounds;

  if (combinations.length === 0) {
    logger.warn('No valid combinations found, generating new grid');
    return [];
  }

  const candidates = shuffle(getTargetCandidates(combinations));
  const cap = config.maxSolutionsPerTarget;
  const preferred =
    cap === undefined ? candidates : candidates.filter((c) => c.solutionCount <= cap);
  const fallback =
    cap === undefined
      ? []
      : candidates
          .filter((c) => c.solutionCount > cap)
          .sort((a, b) => a.solutionCount - b.solutionCount);

  // Stable sort keeps the shuffle order among equals.
  const ordered = [
    ...preferred.sort((a, b) => Number(b.hasMixedOperators) - Number(a.hasMixedOperators)),
    ...fallback,
  ];

  const selected = ordered.slice(0, totalRounds);
  // Tiny grids: pad with repeats rather than leave rounds without a target.
  for (let i = 0; selected.length < totalRounds && ordered.length > 0; i++) {
    selected.push(ordered[i % ordered.length]);
  }

  return selected.sort((a, b) => b.solutionCount - a.solutionCount).map((c) => c.result);
};

export const generateTargetsFromConfig = (
  combinations: GameCombination[],
  config: DifficultyConfig
): number[] => selectTargets(combinations, config, shuffleUniform);

/** Same as `generateTargetsFromConfig` but uses a seeded RNG (multiplayer sync). */
export const generateTargetsFromConfigSeeded = (
  combinations: GameCombination[],
  config: DifficultyConfig,
  rng: SeededRng
): number[] => selectTargets(combinations, config, (arr) => rng.shuffle(arr));

/** A board: its tiles plus the signs shown in each gap (null = all signs everywhere). */
export interface Board {
  grid: Tile[];
  gaps: GapOperators | null;
}

/** A board is playable when it offers enough *distinct* targets for every round. */
export const validateBoard = (board: Board, config: DifficultyConfig): boolean => {
  const combinations = getAllCombinationsFromConfig(board.grid, config, board.gaps);
  return new Set(combinations.map((c) => c.result)).size >= config.totalRounds;
};

export const validateGridHasSolutionsFromConfig = (
  grid: Tile[],
  config: DifficultyConfig
): boolean => validateBoard({ grid, gaps: null }, config);

export const generateValidBoardFromConfig = (
  config: DifficultyConfig,
  maxAttempts: number = 10
): Board => {
  let board: Board = { grid: [], gaps: null };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    board = { grid: generateGridFromConfig(config), gaps: generateGapOperators(config) };
    if (validateBoard(board, config)) return board;
  }
  // Pathological fallback; logged so we notice if it ever fires in production.
  logger.warn('Could not generate valid board after max attempts, returning fallback');
  return board;
};

/** Grid-only variant for configs without per-gap signs (Learn levels). */
export const generateValidGridFromConfig = (config: DifficultyConfig, maxAttempts = 10): Tile[] =>
  generateValidBoardFromConfig(config, maxAttempts).grid;

/**
 * Deterministic solvable board + targets for a string seed (head-to-head rounds):
 * both players derive the identical tiles, gap signs and targets.
 */
export const generateValidGridFromConfigSeeded = (
  config: DifficultyConfig,
  seed: string,
  maxAttempts: number = 12
): { grid: Tile[]; gaps: GapOperators | null; targetNumbers: number[] } | null => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = makeRng(`${seed}|${attempt}`);
    const grid = generateGridFromConfigSeeded(config, rng);
    const gaps = generateGapOperators(config, (arr) => rng.shuffle(arr));
    if (!validateBoard({ grid, gaps }, config)) continue;
    const combinations = getAllCombinationsFromConfig(grid, config, gaps);
    const targetNumbers = generateTargetsFromConfigSeeded(combinations, config, rng);
    if (targetNumbers.length >= config.totalRounds) {
      return { grid, gaps, targetNumbers };
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Back-compat wrappers — the older API takes a DifficultyLevel string.
// ---------------------------------------------------------------------------

export const generateGrid = (difficulty: DifficultyLevel): Tile[] =>
  generateGridFromConfig(DIFFICULTY_CONFIGS[difficulty]);

export const getAllCombinations = (
  grid: Tile[],
  difficulty: DifficultyLevel,
  gaps: GapOperators | null = null
): GameCombination[] => getAllCombinationsFromConfig(grid, DIFFICULTY_CONFIGS[difficulty], gaps);

export const generateTargets = (
  combinations: GameCombination[],
  difficulty: DifficultyLevel
): number[] => generateTargetsFromConfig(combinations, DIFFICULTY_CONFIGS[difficulty]);

export const validateGridHasSolutions = (grid: Tile[], difficulty: DifficultyLevel): boolean =>
  validateGridHasSolutionsFromConfig(grid, DIFFICULTY_CONFIGS[difficulty]);

export const generateValidGrid = (difficulty: DifficultyLevel, maxAttempts: number = 10): Tile[] =>
  generateValidGridFromConfig(DIFFICULTY_CONFIGS[difficulty], maxAttempts);

export const generateValidBoard = (difficulty: DifficultyLevel, maxAttempts: number = 10): Board =>
  generateValidBoardFromConfig(DIFFICULTY_CONFIGS[difficulty], maxAttempts);
