export interface Tile {
  id: number;
  value: number;
  position: { row: number; col: number };
}

export interface GameCombination {
  tiles: Tile[];
  operators: string[];
  result: number;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type GameMode =
  | 'classic'
  | 'timeAttack'
  | 'endless'
  | 'puzzle'
  | 'quickGame'
  /** Curriculum-driven mode used by the Learn path. The active level id is in `currentLevelId`. */
  | 'learning'
  /** Static-puzzle mode (Daily Puzzle, Practice). The active puzzle id is in `currentPuzzleId`. */
  | 'dailyPuzzle'
  /** Head-to-head synced rounds; grid determined by server-provided seed string. */
  | 'multiplayer';

export interface GameState {
  grid: Tile[];
  targetNumbers: number[];
  currentTarget: number;
  currentRound: number;
  totalRounds: number;
  score: number;
  difficulty: DifficultyLevel;
  gameMode: GameMode;
  gameStatus: 'playing' | 'completed' | 'paused';
  /** Wall-clock time elapsed in the *current* round (ms). */
  roundTime: number;
  /** Wall-clock time across the whole game so far (ms). Equal to
   *  `roundsTimeMs + (now - roundStartTime)` while a round is in progress. */
  totalTime: number;
  roundStartTime: number | null;
  /** True once the current round has been answered correctly and is waiting to advance. Blocks re-scoring. */
  roundSolved: boolean;
  /** Sum of wall-clock time of all *completed* rounds (ms). */
  roundsTimeMs: number;
  /** Time Attack mode only — milliseconds remaining. */
  timeAttackTimeLeft?: number;
  /** Time Attack mode only — rounds the player has cleared. */
  timeAttackRoundsCompleted?: number;
  /** Set when initializeGame exhausted retries and could not produce a solvable grid. */
  initError: string | null;
  /** Active learning-path level id (only meaningful when gameMode === 'learning'). */
  currentLevelId: string | null;
  /** Wrong submissions in this session — used by ResultPage to compute stars in learning mode. */
  wrongAttempts: number;
  /** Hints revealed this session — they cost stars like wrong answers. */
  hintsUsed: number;
  /** Active static-puzzle id (only meaningful when gameMode === 'dailyPuzzle'). */
  currentPuzzleId: string | null;
}

export interface GameModeConfig {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  available: boolean;
}

export interface DifficultyConfig {
  gridSize: number;
  tilesCount: number;
  operatorsCount: number;
  availableOperators: string[];
  targetRange: { min: number; max: number };
  totalRounds: number;
  /** Prefer targets reachable by at most this many paths (lower = harder).
   *  Unset = no preference. Falls back to the hardest available targets. */
  maxSolutionsPerTarget?: number;
}

/** A single level on the Learn path. Extends DifficultyConfig with identity. */
export interface LevelConfig extends DifficultyConfig {
  /** Stable id, e.g. "u1-l1". URL-safe; persisted in progressStore. */
  id: string;
  /** The unit this level belongs to. */
  unitId: string;
  /** Short, action-oriented title shown on the level node. */
  title: string;
  /** Optional one-liner shown on the level node or in tooltips. */
  shortDesc?: string;
}

/** A grouping of levels on the Learn path (e.g. "Addition", "Subtraction"). */
export interface UnitConfig {
  id: string;
  title: string;
  shortDesc?: string;
}

export interface GameStats {
  totalGamesPlayed: number;
  totalScore: number;
  averageCompletionTime: number;
  accuracyRate: number;
  favoriteOperator: string;
}

// ───────────────────────────── Puzzle pillar types ─────────────────────────
// EPIC-19. A `Puzzle` is a self-contained, hand-or-machine generated challenge:
// fixed grid, fixed target, with a known optimal solution. Stored as static
// JSON in `public/puzzles.json` and shipped with the bundle. The runtime never
// re-generates a puzzle's grid — what's on disk is what the player solves —
// so puzzles are 100% reproducible across devices and sessions.

/** Curated puzzle theme (string union; values mirror `PUZZLE_THEME_IDS`). */
export type PuzzleThemeId =
  | 'addition-only'
  | 'subtraction-only'
  | 'mixed-add-sub'
  | 'multiplication'
  | 'mixed-all'
  | 'large-grid';

/** Optimal solution path: which tile ids to pick and the operators between them. */
export interface PuzzleSolution {
  /** Tile ids in selection order. Length = operators.length + 1. */
  tileIds: number[];
  /** Operators between consecutive tiles. Each is one of `+ - *`. */
  operators: string[];
}

/** One puzzle. Concrete board, target, and solution — no RNG at runtime. */
export interface Puzzle {
  /** Stable unique id, e.g. `p-add-easy-0001`. URL-safe. */
  id: string;
  /** Seed string used to derive the grid. Kept for reproducibility / debugging. */
  seed: string;
  /** Concrete grid tiles — what the renderer shows. */
  tiles: Tile[];
  /** Side length of the square grid (= sqrt(tiles.length)). */
  gridSize: number;
  /** Operators that may appear between tiles in this puzzle. */
  availableOperators: string[];
  /** The number the player must reach. */
  target: number;
  /** Known-good solution. Validated by `npm run puzzles:validate`. */
  optimalSolution: PuzzleSolution;
  /** Coarse difficulty bucket (matches the existing Play-mode taxonomy). */
  difficulty: DifficultyLevel;
  /**
   * Numeric difficulty rating in [800, 2200], roughly Glicko-style. Derived
   * from grid size, solution length, operator mix, and target magnitude.
   * Phase-3 (EPIC-29) will use this against the player's rating; for now it
   * just lets the daily picker bias by date.
   */
  rating: number;
  /** Themes this puzzle satisfies. A puzzle may belong to several. */
  themes: PuzzleThemeId[];
}

/** Top-level shape of `public/puzzles.json`. */
export interface PuzzleBundle {
  /** Bumps when the on-disk format changes. */
  schemaVersion: 1;
  /** ISO date the bundle was generated. */
  generatedAt: string;
  /** Convenience: `puzzles.length` so consumers can size buffers without parsing. */
  count: number;
  puzzles: Puzzle[];
}
