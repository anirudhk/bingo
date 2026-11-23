#!/usr/bin/env tsx
/**
 * Lint `public/puzzles.json`:
 *   - schemaVersion is current
 *   - every puzzle's `optimalSolution` actually evaluates to its `target`
 *   - tile ids are unique and 0..gridSize²-1
 *   - solution tile ids exist in the puzzle's grid
 *   - rating is in the documented [800, 2200] range
 *   - difficulty is one of easy/medium/hard
 *
 * Exit code is non-zero on the first failure so CI fails loudly.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Puzzle, PuzzleBundle } from '../src/types/game';
import { calculatePathResult } from '../src/utils/calculator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN_PATH = resolve(__dirname, '../public/puzzles.json');

const fail = (msg: string): never => {
  console.error(`[validate-puzzles] FAIL: ${msg}`);
  process.exit(1);
};

const validatePuzzle = (p: Puzzle, idx: number): void => {
  const where = `#${idx} (${p.id})`;
  const expectedTiles = p.gridSize * p.gridSize;
  if (p.tiles.length !== expectedTiles) {
    fail(`${where}: tiles.length=${p.tiles.length} but gridSize²=${expectedTiles}`);
  }

  const ids = new Set<number>();
  for (const t of p.tiles) {
    if (ids.has(t.id)) fail(`${where}: duplicate tile id ${t.id}`);
    ids.add(t.id);
    if (t.id < 0 || t.id >= expectedTiles) {
      fail(`${where}: tile id ${t.id} out of range [0, ${expectedTiles})`);
    }
  }

  const sol = p.optimalSolution;
  if (sol.tileIds.length !== sol.operators.length + 1) {
    fail(
      `${where}: solution has ${sol.tileIds.length} tiles and ${sol.operators.length} ops` +
        ` (expected ops = tiles - 1)`
    );
  }

  const tilesById = new Map(p.tiles.map((t) => [t.id, t]));
  const solTiles = sol.tileIds.map((id) => {
    const t = tilesById.get(id);
    if (!t) fail(`${where}: solution refers to missing tile id ${id}`);
    return t!;
  });

  const result = calculatePathResult(solTiles, sol.operators);
  if (result === null) {
    fail(`${where}: solution returned null (calculator rejected the path)`);
  }
  if (result !== p.target) {
    fail(`${where}: solution evaluates to ${result}, target is ${p.target}`);
  }

  if (p.rating < 800 || p.rating > 2200) {
    fail(`${where}: rating ${p.rating} outside [800, 2200]`);
  }
  if (!['easy', 'medium', 'hard'].includes(p.difficulty)) {
    fail(`${where}: bad difficulty ${p.difficulty}`);
  }
};

const main = (): void => {
  const raw = readFileSync(IN_PATH, 'utf8');
  const bundle = JSON.parse(raw) as PuzzleBundle;

  if (bundle.schemaVersion !== 1) {
    fail(`schemaVersion=${bundle.schemaVersion}, expected 1`);
  }
  if (bundle.count !== bundle.puzzles.length) {
    fail(`count=${bundle.count} but puzzles.length=${bundle.puzzles.length}`);
  }

  bundle.puzzles.forEach(validatePuzzle);

  console.log(
    `[validate-puzzles] OK — ${bundle.puzzles.length} puzzles, schema v${bundle.schemaVersion}, generated ${bundle.generatedAt}`
  );
};

main();
