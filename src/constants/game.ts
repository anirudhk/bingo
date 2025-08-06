import { DifficultyConfig } from '../types/game';

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfig> = {
  easy: {
    gridSize: 3,
    tilesCount: 2,
    operatorsCount: 1,
    availableOperators: ['+', '-'],
    targetRange: { min: 1, max: 20 },
    totalRounds: 5
  },
  medium: {
    gridSize: 4,
    tilesCount: 3,
    operatorsCount: 2,
    availableOperators: ['+', '-', '*'],
    targetRange: { min: 1, max: 35 },
    totalRounds: 5
  },
  hard: {
    gridSize: 4,
    tilesCount: 3,
    operatorsCount: 2,
    availableOperators: ['+', '-', '*'],
    targetRange: { min: 1, max: 50 },
    totalRounds: 5
  }
};

export const OPERATORS = {
  ADDITION: '+',
  SUBTRACTION: '-',
  MULTIPLICATION: '*'
} as const;

export const GRID_DIRECTIONS = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical'
} as const;

export const GAME_STATUS = {
  PLAYING: 'playing',
  COMPLETED: 'completed',
  PAUSED: 'paused'
} as const;

export const TOUCH_THRESHOLD = 10; // Minimum distance for touch detection
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 9;
export const ANIMATION_DURATION = 300;
export const SUCCESS_DELAY = 1500;