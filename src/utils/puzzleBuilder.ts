import type {
  DifficultyConfig,
  DifficultyLevel,
  Puzzle,
  PuzzleSolution,
  PuzzleThemeId,
  Tile,
} from '../types/game';
import { MIN_NUMBER, MAX_NUMBER } from '../constants/game';
import { getAllCombinationsFromConfig } from './gridGenerator';
import { makeRng, type SeededRng } from './rng';

/**
 * Build one fully-self-contained puzzle from a deterministic seed.
 *
 * Algorithm:
 *   1. Generate a grid of random tiles using the seeded RNG (so the same
 *      seed always yields the same grid).
 *   2. Enumerate all valid combinations on that grid via the existing
 *      `getAllCombinationsFromConfig`.
 *   3. Pick one combination — that becomes the `optimalSolution`, and its
 *      result is the puzzle's `target`.
 *   4. If no combination exists (rare, but possible for tiny ranges), retry
 *      with a fresh sub-seed up to `maxAttempts`.
 *
 * We do *not* attempt to find the genuinely-shortest or best-rated solution;
 * any valid one is fine for v0.3. Difficulty rating (`computeRating`) is a
 * heuristic from grid size + solution length + operator mix + target size.
 */
export interface BuildPuzzleArgs {
  seed: string;
  config: DifficultyConfig;
  difficulty: DifficultyLevel;
  themes: PuzzleThemeId[];
  /** Override the auto-generated id (e.g. add a sequence index). */
  id?: string;
  maxAttempts?: number;
}

const buildGrid = (config: DifficultyConfig, rng: SeededRng): Tile[] => {
  const tiles: Tile[] = [];
  for (let i = 0; i < config.gridSize * config.gridSize; i++) {
    tiles.push({
      id: i,
      value: rng.intBetween(MIN_NUMBER, MAX_NUMBER),
      position: { row: Math.floor(i / config.gridSize), col: i % config.gridSize },
    });
  }
  return tiles;
};

export const computeRating = (
  config: DifficultyConfig,
  solution: PuzzleSolution,
  target: number
): number => {
  // Floor that scales with grid + solution shape.
  const sizeBonus = (config.gridSize - 3) * 200;
  const lengthBonus = (solution.tileIds.length - 2) * 150;
  const opMix = new Set(solution.operators).size;
  const opBonus = (opMix - 1) * 80;
  // Targets above 50 nudge rating up modestly — they imply multiplications
  // or longer chains.
  const targetBonus = Math.min(160, Math.max(0, Math.floor((target - 30) / 1.5)));
  const rating = 800 + sizeBonus + lengthBonus + opBonus + targetBonus;
  return Math.max(800, Math.min(2200, rating));
};

export const buildPuzzle = ({
  seed,
  config,
  difficulty,
  themes,
  id,
  maxAttempts = 12,
}: BuildPuzzleArgs): Puzzle | null => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const subSeed = attempt === 0 ? seed : `${seed}#a${attempt}`;
    const rng = makeRng(subSeed);
    const tiles = buildGrid(config, rng);
    const combos = getAllCombinationsFromConfig(tiles, config);
    if (combos.length === 0) continue;

    const chosen = rng.pick(combos);
    const solution: PuzzleSolution = {
      tileIds: chosen.tiles.map((t) => t.id),
      operators: chosen.operators,
    };
    const target = chosen.result;
    const rating = computeRating(config, solution, target);

    return {
      id: id ?? `p-${seed}`,
      seed: subSeed,
      tiles,
      gridSize: config.gridSize,
      availableOperators: config.availableOperators,
      target,
      optimalSolution: solution,
      difficulty,
      rating,
      themes,
    };
  }
  return null;
};
