import type { Tile, GameCombination, DifficultyLevel, DifficultyConfig } from '../types/game';
import { DIFFICULTY_CONFIGS, MIN_NUMBER, MAX_NUMBER } from '../constants/game';
import { calculateResult } from './calculator';
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

export const getAllCombinationsFromConfig = (
  grid: Tile[],
  config: DifficultyConfig
): GameCombination[] => {
  const combinations: GameCombination[] = [];
  const gridSize = config.gridSize;
  const tilesCount = config.tilesCount;
  const operatorsCount = config.operatorsCount;
  const availableOperators = config.availableOperators;

  if (tilesCount === 2 && operatorsCount === 1) {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize - 1; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[row * gridSize + col + 1];

        availableOperators.forEach((operator) => {
          const result = calculateTwoNumbers(tile1.value, operator, tile2.value);
          if (result >= config.targetRange.min && result <= config.targetRange.max) {
            combinations.push({
              tiles: [tile1, tile2],
              operators: [operator],
              result,
            });
          }
        });
      }
    }

    for (let row = 0; row < gridSize - 1; row++) {
      for (let col = 0; col < gridSize; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[(row + 1) * gridSize + col];

        availableOperators.forEach((operator) => {
          const result = calculateTwoNumbers(tile1.value, operator, tile2.value);
          if (result >= config.targetRange.min && result <= config.targetRange.max) {
            combinations.push({
              tiles: [tile1, tile2],
              operators: [operator],
              result,
            });
          }
        });
      }
    }
  }

  if (tilesCount === 3 && operatorsCount === 2) {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize - 2; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[row * gridSize + col + 1];
        const tile3 = grid[row * gridSize + col + 2];

        availableOperators.forEach((op1) => {
          availableOperators.forEach((op2) => {
            const result = calculateResult(tile1.value, op1, tile2.value, op2, tile3.value);
            if (
              result >= config.targetRange.min &&
              result <= config.targetRange.max &&
              result >= 0
            ) {
              combinations.push({
                tiles: [tile1, tile2, tile3],
                operators: [op1, op2],
                result,
              });
            }
          });
        });
      }
    }

    for (let row = 0; row < gridSize - 2; row++) {
      for (let col = 0; col < gridSize; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[(row + 1) * gridSize + col];
        const tile3 = grid[(row + 2) * gridSize + col];

        availableOperators.forEach((op1) => {
          availableOperators.forEach((op2) => {
            const result = calculateResult(tile1.value, op1, tile2.value, op2, tile3.value);
            if (
              result >= config.targetRange.min &&
              result <= config.targetRange.max &&
              result >= 0
            ) {
              combinations.push({
                tiles: [tile1, tile2, tile3],
                operators: [op1, op2],
                result,
              });
            }
          });
        });
      }
    }
  }

  return combinations;
};

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
  const byResult = new Map<number, TargetCandidate>();
  for (const combo of combinations) {
    const mixed = combo.operators.length > 1 && combo.operators[0] !== combo.operators[1];
    const existing = byResult.get(combo.result);
    if (existing) {
      existing.solutionCount += 1;
      existing.hasMixedOperators ||= mixed;
    } else {
      byResult.set(combo.result, {
        result: combo.result,
        solutionCount: 1,
        hasMixedOperators: mixed,
      });
    }
  }
  return [...byResult.values()];
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

/** A grid is playable when it offers enough *distinct* targets for every round. */
export const validateGridHasSolutionsFromConfig = (
  grid: Tile[],
  config: DifficultyConfig
): boolean => {
  const combinations = getAllCombinationsFromConfig(grid, config);
  return new Set(combinations.map((c) => c.result)).size >= config.totalRounds;
};

export const generateValidGridFromConfig = (
  config: DifficultyConfig,
  maxAttempts: number = 10
): Tile[] => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = generateGridFromConfig(config);
    if (validateGridHasSolutionsFromConfig(grid, config)) {
      return grid;
    }
  }

  // Pathological fallback. Real game ranges + 9-value tiles make this
  // virtually unreachable; logged so we notice if it ever fires in production.
  logger.warn('Could not generate valid grid after max attempts, returning fallback');
  return generateGridFromConfig(config);
};

/**
 * Deterministic solvable grid + targets for a string seed (head-to-head rounds).
 */
export const generateValidGridFromConfigSeeded = (
  config: DifficultyConfig,
  seed: string,
  maxAttempts: number = 12
): { grid: Tile[]; targetNumbers: number[] } | null => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = makeRng(`${seed}|${attempt}`);
    const grid = generateGridFromConfigSeeded(config, rng);
    if (!validateGridHasSolutionsFromConfig(grid, config)) continue;
    const combinations = getAllCombinationsFromConfig(grid, config);
    const targetNumbers = generateTargetsFromConfigSeeded(combinations, config, rng);
    if (targetNumbers.length >= config.totalRounds) {
      return { grid, targetNumbers };
    }
  }
  return null;
};

const calculateTwoNumbers = (num1: number, operator: string, num2: number): number => {
  switch (operator) {
    case '+':
      return num1 + num2;
    case '-':
      return num1 - num2;
    case '*':
      return num1 * num2;
    default:
      return 0;
  }
};

// ---------------------------------------------------------------------------
// Back-compat wrappers — the older API takes a DifficultyLevel string.
// New code should call the *FromConfig variants directly.
// ---------------------------------------------------------------------------

export const generateGrid = (difficulty: DifficultyLevel): Tile[] =>
  generateGridFromConfig(DIFFICULTY_CONFIGS[difficulty]);

export const getAllCombinations = (grid: Tile[], difficulty: DifficultyLevel): GameCombination[] =>
  getAllCombinationsFromConfig(grid, DIFFICULTY_CONFIGS[difficulty]);

export const generateTargets = (
  combinations: GameCombination[],
  difficulty: DifficultyLevel
): number[] => generateTargetsFromConfig(combinations, DIFFICULTY_CONFIGS[difficulty]);

export const validateGridHasSolutions = (grid: Tile[], difficulty: DifficultyLevel): boolean =>
  validateGridHasSolutionsFromConfig(grid, DIFFICULTY_CONFIGS[difficulty]);

export const generateValidGrid = (difficulty: DifficultyLevel, maxAttempts: number = 10): Tile[] =>
  generateValidGridFromConfig(DIFFICULTY_CONFIGS[difficulty], maxAttempts);
