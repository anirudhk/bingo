import type { DifficultyConfig } from '../types/game';

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    gridSize: 3,
    tilesCount: 2,
    operatorsCount: 1,
    availableOperators: ['+', '-'],
    targetRange: { min: 1, max: 20 },
    totalRounds: 5,
  },
  medium: {
    gridSize: 4,
    tilesCount: 3,
    operatorsCount: 2,
    availableOperators: ['+', '-', '*'],
    targetRange: { min: 1, max: 35 },
    totalRounds: 5,
  },
  hard: {
    gridSize: 4,
    tilesCount: 3,
    operatorsCount: 2,
    availableOperators: ['+', '-', '*'],
    targetRange: { min: 1, max: 50 },
    totalRounds: 5,
    // What makes Hard hard: every target has exactly one solving path
    // (feasible on ~99% of grids; falls back to the fewest-solution targets).
    maxSolutionsPerTarget: 1,
  },
};

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
