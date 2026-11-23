import type { DifficultyConfig, DifficultyLevel, PuzzleThemeId } from '../types/game';

export interface PuzzleTheme {
  id: PuzzleThemeId;
  /** Short, user-facing label (e.g. "Addition only"). */
  label: string;
  /** One-liner shown in the theme picker. */
  description: string;
  /** Operators allowed by this theme. Subset of `+ - *`. */
  operators: string[];
  /** Per-difficulty geometry recipes. */
  variants: Record<DifficultyLevel, DifficultyConfig>;
}

const baseTargetRange: Record<DifficultyLevel, { min: number; max: number }> = {
  easy: { min: 5, max: 25 },
  medium: { min: 8, max: 50 },
  hard: { min: 10, max: 99 },
};

const variantsForOperators = (
  operators: string[],
  /** Override default geometry; otherwise the default Play-mode shape is used. */
  override?: Partial<Record<DifficultyLevel, Partial<DifficultyConfig>>>
): Record<DifficultyLevel, DifficultyConfig> => {
  const base: Record<DifficultyLevel, DifficultyConfig> = {
    easy: {
      gridSize: 3,
      tilesCount: 2,
      operatorsCount: 1,
      availableOperators: operators,
      targetRange: baseTargetRange.easy,
      totalRounds: 1,
    },
    medium: {
      gridSize: 4,
      tilesCount: 3,
      operatorsCount: 2,
      availableOperators: operators,
      targetRange: baseTargetRange.medium,
      totalRounds: 1,
    },
    hard: {
      gridSize: 5,
      tilesCount: 3,
      operatorsCount: 2,
      availableOperators: operators,
      targetRange: baseTargetRange.hard,
      totalRounds: 1,
    },
  };
  if (!override) return base;
  return {
    easy: { ...base.easy, ...(override.easy ?? {}) },
    medium: { ...base.medium, ...(override.medium ?? {}) },
    hard: { ...base.hard, ...(override.hard ?? {}) },
  };
};

export const PUZZLE_THEMES: PuzzleTheme[] = [
  {
    id: 'addition-only',
    label: 'Addition only',
    description: 'Combine tiles with `+` to reach the target.',
    operators: ['+'],
    variants: variantsForOperators(['+']),
  },
  {
    id: 'subtraction-only',
    label: 'Subtraction only',
    description: 'Combine tiles with `−` to reach the target.',
    operators: ['-'],
    // Subtraction-only chains often land on small or negative results, so we
    // widen the target range and shrink the chain length for medium/hard so
    // the generator can find enough valid puzzles per bucket.
    variants: variantsForOperators(['-'], {
      easy: { targetRange: { min: 1, max: 18 } },
      medium: { tilesCount: 2, operatorsCount: 1, targetRange: { min: 1, max: 18 } },
      hard: { tilesCount: 2, operatorsCount: 1, targetRange: { min: 1, max: 18 } },
    }),
  },
  {
    id: 'mixed-add-sub',
    label: 'Add & subtract',
    description: 'Mix `+` and `−` between tiles.',
    operators: ['+', '-'],
    variants: variantsForOperators(['+', '-']),
  },
  {
    id: 'multiplication',
    label: 'Multiplication',
    description: 'Use `×` (alone or with `+`/`−`) for bigger numbers.',
    operators: ['+', '*'],
    variants: variantsForOperators(['+', '*'], {
      easy: { targetRange: { min: 6, max: 30 } },
      medium: { targetRange: { min: 12, max: 80 } },
      hard: { targetRange: { min: 20, max: 144 } },
    }),
  },
  {
    id: 'mixed-all',
    label: 'Mixed',
    description: 'Anything goes: `+`, `−`, and `×`.',
    operators: ['+', '-', '*'],
    variants: variantsForOperators(['+', '-', '*']),
  },
  {
    id: 'large-grid',
    label: 'Large grid',
    description: 'Bigger boards with longer combinations.',
    operators: ['+', '-', '*'],
    // The hard bucket previously asked for 4-tile chains on a 5×5 — yields
    // very few legal solutions in the target range. Drop back to 3 tiles for
    // hard but keep the 5×5 board (still feels "large").
    variants: variantsForOperators(['+', '-', '*'], {
      easy: { gridSize: 4, tilesCount: 3, operatorsCount: 2 },
      medium: { gridSize: 5, tilesCount: 3, operatorsCount: 2 },
      hard: { gridSize: 5, tilesCount: 3, operatorsCount: 2, targetRange: { min: 20, max: 200 } },
    }),
  },
];

export const PUZZLE_THEMES_BY_ID = new Map<PuzzleThemeId, PuzzleTheme>(
  PUZZLE_THEMES.map((t) => [t.id, t])
);

export const getTheme = (id: PuzzleThemeId): PuzzleTheme | undefined => PUZZLE_THEMES_BY_ID.get(id);
