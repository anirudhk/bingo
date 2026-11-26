import type { DifficultyConfig } from '../types/game';

/**
 * Play-mode difficulty ladder. Each gap between two tiles shows only
 * `signsPerGap` of the signs (picked at random per board), so the puzzle is
 * spotting where numbers and signs line up — and the sign buttons get big
 * enough to tap.
 *   Easy:   2 numbers, 1 sign per gap (the player still taps it: number → sign → number)
 *   Medium: 2 numbers, 2 signs per gap
 *   Hard:   3 numbers, 2 signs per gap, every target has exactly one answer
 */
export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    gridSize: 3,
    tilesCount: 2,
    operatorsCount: 1,
    availableOperators: ['+', '-', '*'],
    signsPerGap: 1,
    targetRange: { min: 1, max: 50 },
    totalRounds: 5,
  },
  medium: {
    gridSize: 4,
    tilesCount: 2,
    operatorsCount: 1,
    availableOperators: ['+', '-', '*'],
    signsPerGap: 2,
    targetRange: { min: 1, max: 60 },
    totalRounds: 5,
  },
  hard: {
    gridSize: 4,
    tilesCount: 3,
    operatorsCount: 2,
    availableOperators: ['+', '-', '*'],
    signsPerGap: 2,
    targetRange: { min: 1, max: 60 },
    totalRounds: 5,
    // Every target has exactly one solving path (falls back to the
    // fewest-solution targets when a board can't supply enough).
    maxSolutionsPerTarget: 1,
  },
};

/** Quick Game keeps its original shape: 3×3, 2 numbers, + and − in every gap. */
export const QUICK_GAME_CONFIG: DifficultyConfig = {
  gridSize: 3,
  tilesCount: 2,
  operatorsCount: 1,
  availableOperators: ['+', '-'],
  targetRange: { min: 1, max: 20 },
  totalRounds: 5,
};

/** The board config for a Play mode (Quick Game has its own fixed shape). */
export const getPlayConfig = (gameMode: string, difficulty: string): DifficultyConfig =>
  gameMode === 'quickGame' ? QUICK_GAME_CONFIG : DIFFICULTY_CONFIGS[difficulty];

export const OPERATORS = {
  ADDITION: '+',
  SUBTRACTION: '-',
  MULTIPLICATION: '*',
} as const;

export const GRID_DIRECTIONS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const;

export const GAME_STATUS = {
  PLAYING: 'playing',
  COMPLETED: 'completed',
  PAUSED: 'paused',
} as const;

export const MIN_NUMBER = 1;
export const MAX_NUMBER = 9;
export const ANIMATION_DURATION = 300;
/** Delay before auto-advancing to the next round after a correct answer (ms). */
export const SUCCESS_DELAY_MS = 1500;
/** Delay before clearing the selection after feedback (wrong or right), aligned with feedback visibility (ms). */
export const FEEDBACK_CLEAR_DELAY_MS = 2000;

/** @deprecated Use SUCCESS_DELAY_MS */
export const SUCCESS_DELAY = SUCCESS_DELAY_MS;

/** Score removed when the player uses a hint (per round). */
export const HINT_SCORE_PENALTY = 5;
