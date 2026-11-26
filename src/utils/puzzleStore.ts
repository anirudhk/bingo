import type { DifficultyLevel, Puzzle, PuzzleBundle, PuzzleThemeId } from '../types/game';
import { makeRng } from './rng';
import { countDistinctSolutions, getAllCombinationsFromConfig } from './gridGenerator';

/**
 * Lazy puzzle bundle loader + pure query helpers.
 *
 * Why not Zustand? The bundle is read-once, immutable, ~600 KB. A module-local
 * cache is simpler and means the hook returns identical references on
 * re-renders so React.memo'd consumers don't thrash.
 */

// Resolved lazily: `import.meta.env` doesn't exist when Node scripts import
// this module for the pure helpers (e.g. scripts/import-puzzles-to-db.ts).
const bundleUrl = (): string => `${import.meta.env.BASE_URL}puzzles.json`;

let cached: Promise<PuzzleBundle> | null = null;

export const loadPuzzleBundle = (): Promise<PuzzleBundle> => {
  if (cached) return cached;
  cached = fetch(bundleUrl())
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load puzzles.json: ${res.status} ${res.statusText}`);
      return res.json() as Promise<PuzzleBundle>;
    })
    .then((bundle) => {
      if (bundle.schemaVersion !== 1) {
        throw new Error(`puzzles.json schemaVersion=${bundle.schemaVersion}; this build expects 1`);
      }
      return bundle;
    });
  // Drop the cache on failure so a transient error doesn't poison every later attempt.
  cached.catch(() => {
    cached = null;
  });
  return cached;
};

/** Test-only escape hatch — clears the in-memory bundle cache. */
export const __resetPuzzleCache = (): void => {
  cached = null;
};

/** Test-only escape hatch — synchronously seed the cache without fetching. */
export const __setPuzzleCache = (bundle: PuzzleBundle): void => {
  cached = Promise.resolve(bundle);
};

// ─────────────────────── Pure query helpers (testable) ─────────────────────

export interface PuzzleQuery {
  theme?: PuzzleThemeId;
  difficulty?: DifficultyLevel;
  /** Inclusive minimum rating. */
  minRating?: number;
  /** Inclusive maximum rating. */
  maxRating?: number;
}

export const queryPuzzles = (puzzles: Puzzle[], q: PuzzleQuery = {}): Puzzle[] =>
  puzzles.filter((p) => {
    if (q.theme && !p.themes.includes(q.theme)) return false;
    if (q.difficulty && p.difficulty !== q.difficulty) return false;
    if (q.minRating !== undefined && p.rating < q.minRating) return false;
    if (q.maxRating !== undefined && p.rating > q.maxRating) return false;
    return true;
  });

/** Index a bundle by id once for O(1) lookups. */
export const indexById = (puzzles: Puzzle[]): Map<string, Puzzle> =>
  new Map(puzzles.map((p) => [p.id, p]));

// ─────────────────────────── Daily puzzle picker ───────────────────────────

/** UTC `YYYY-MM-DD` for the supplied date (defaults to now). */
export const utcDateKey = (date: Date = new Date()): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Pick the puzzle for the given UTC date. Deterministic: every device on the
 * same date selects the same puzzle. Optional difficulty constraint biases
 * the picker (so e.g. "today's medium puzzle" is also stable).
 *
 * Returns null only if `puzzles` is empty after filtering.
 */
export const pickDailyPuzzle = (
  puzzles: Puzzle[],
  date: Date = new Date(),
  filter: { difficulty?: DifficultyLevel; theme?: PuzzleThemeId } = {}
): Puzzle | null => {
  const candidates = queryPuzzles(puzzles, filter);
  if (candidates.length === 0) return null;
  const key = utcDateKey(date);
  const seedParts = ['daily', key, filter.difficulty ?? 'any', filter.theme ?? 'any'].join('|');
  const idx = makeRng(seedParts).int(candidates.length);
  return candidates[idx];
};

// ───────────────────────── Weekly difficulty schedule ───────────────────────

/**
 * Daily difficulty ramps through the week (like a newspaper crossword):
 * Mon–Tue easy, Wed–Thu medium, Fri–Sun hard. Kids get friendly weekdays;
 * adults get a real challenge — and something worth sharing — at the weekend.
 */
export const dailyDifficultyFor = (date: Date = new Date()): DifficultyLevel => {
  const day = date.getUTCDay(); // 0 = Sunday
  if (day === 1 || day === 2) return 'easy';
  if (day === 3 || day === 4) return 'medium';
  return 'hard';
};

/** Distinct solutions (tiles + sign in each gap, either tap direction) that hit the target. */
export const countPuzzleSolutions = (puzzle: Puzzle): number =>
  countDistinctSolutions(
    getAllCombinationsFromConfig(puzzle.tiles, {
      gridSize: puzzle.gridSize,
      tilesCount: puzzle.optimalSolution.tileIds.length,
      operatorsCount: puzzle.optimalSolution.operators.length,
      availableOperators: puzzle.availableOperators,
      targetRange: { min: puzzle.target, max: puzzle.target },
      totalRounds: 1,
    })
  );

/**
 * Today's daily puzzle following the weekly schedule. Hard days prefer
 * puzzles with exactly one solution. Deterministic per UTC date, so every
 * device (and the leaderboard) sees the same puzzle.
 */
export const pickTodaysDailyPuzzle = (
  puzzles: Puzzle[],
  date: Date = new Date()
): Puzzle | null => {
  const difficulty = dailyDifficultyFor(date);
  let pool = queryPuzzles(puzzles, { difficulty });
  if (difficulty === 'hard') {
    const unique = pool.filter((p) => countPuzzleSolutions(p) === 1);
    if (unique.length > 0) pool = unique;
  }
  if (pool.length === 0) return pickDailyPuzzle(puzzles, date);
  const idx = makeRng(['daily', utcDateKey(date), 'weekly-v1'].join('|')).int(pool.length);
  return pool[idx];
};
