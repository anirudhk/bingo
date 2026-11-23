#!/usr/bin/env tsx
/**
 * Generate the static puzzle bundle and write it to `public/puzzles.json`.
 *
 *   npm run puzzles:generate            # default counts
 *   npm run puzzles:generate -- --per 30
 *
 * Determinism: seeds are derived from `${theme}|${difficulty}|${index}`. Run
 * the script twice and you get byte-identical output. To rotate puzzles
 * (e.g. between releases), bump `BUNDLE_REV` below.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DifficultyLevel, Puzzle, PuzzleBundle } from '../src/types/game';
import { PUZZLE_THEMES } from '../src/constants/puzzleThemes';
import { buildPuzzle } from '../src/utils/puzzleBuilder';
import { countPuzzleSolutions } from '../src/utils/puzzleStore';

const BUNDLE_REV = 1;
const DIFFICULTIES: DifficultyLevel[] = ['easy', 'medium', 'hard'];

/**
 * Weekend dailies (Fri–Sun) use hard puzzles with exactly one solution. The
 * theme buckets yield only ~13% of those, so generate a dedicated batch:
 * 160 puzzles ≈ a year of weekends before any repeat. Ids are separate from
 * the theme buckets, so adding this batch never changes an existing puzzle.
 */
const DAILY_HARD_COUNT = 160;

const argPer = (() => {
  const i = process.argv.indexOf('--per');
  if (i >= 0 && process.argv[i + 1]) {
    const n = Number(process.argv[i + 1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 25; // default puzzles per (theme, difficulty)
})();

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '../public/puzzles.json');

const main = (): void => {
  const all: Puzzle[] = [];
  // Track signatures so we don't ship duplicates: same grid + same target.
  const seen = new Set<string>();
  let skipped = 0;
  let unbuildable = 0;

  for (const theme of PUZZLE_THEMES) {
    for (const difficulty of DIFFICULTIES) {
      const config = theme.variants[difficulty];
      let acceptedForBucket = 0;
      let attempt = 0;
      // Allow some slack: try up to 3× the desired count to account for
      // dedupe collisions / unbuildable seeds.
      while (acceptedForBucket < argPer && attempt < argPer * 3) {
        const seed = `r${BUNDLE_REV}|${theme.id}|${difficulty}|${attempt}`;
        attempt++;
        const puzzle = buildPuzzle({
          seed,
          config,
          difficulty,
          themes: [theme.id],
          id: `p-${theme.id}-${difficulty}-${String(acceptedForBucket).padStart(4, '0')}`,
        });
        if (!puzzle) {
          unbuildable++;
          continue;
        }
        const sig = `${puzzle.tiles.map((t) => t.value).join(',')}|${puzzle.target}`;
        if (seen.has(sig)) {
          skipped++;
          continue;
        }
        seen.add(sig);
        all.push(puzzle);
        acceptedForBucket++;
      }
      if (acceptedForBucket < argPer) {
        console.warn(
          `[puzzles] ${theme.id}/${difficulty}: only ${acceptedForBucket}/${argPer} after ${attempt} tries`
        );
      }
    }
  }

  // ── Unique-solution hard puzzles for weekend dailies ──
  const dailyTheme = PUZZLE_THEMES.find((t) => t.id === 'mixed-all');
  if (!dailyTheme) throw new Error('mixed-all theme missing');
  let dailyAccepted = 0;
  for (
    let attempt = 0;
    dailyAccepted < DAILY_HARD_COUNT && attempt < DAILY_HARD_COUNT * 40;
    attempt++
  ) {
    const puzzle = buildPuzzle({
      seed: `r${BUNDLE_REV}|daily-hard|${attempt}`,
      config: dailyTheme.variants.hard,
      difficulty: 'hard',
      themes: [dailyTheme.id],
      id: `p-daily-hard-${String(dailyAccepted).padStart(4, '0')}`,
    });
    if (!puzzle || countPuzzleSolutions(puzzle) !== 1) continue;
    const sig = `${puzzle.tiles.map((t) => t.value).join(',')}|${puzzle.target}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    all.push(puzzle);
    dailyAccepted++;
  }
  if (dailyAccepted < DAILY_HARD_COUNT) {
    console.warn(`[puzzles] daily-hard: only ${dailyAccepted}/${DAILY_HARD_COUNT}`);
  }

  const bundle: PuzzleBundle = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: all.length,
    puzzles: all,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(bundle) + '\n', 'utf8');

  console.log(
    `[puzzles] wrote ${all.length} puzzles to ${OUT_PATH}` +
      ` (dedup-skipped ${skipped}, unbuildable ${unbuildable}, per-bucket target ${argPer})`
  );
};

main();
