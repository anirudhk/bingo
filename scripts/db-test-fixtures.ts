/**
 * Writes fixtures for supabase/tests/security_and_flows.test.sql into <outDir>:
 *   fixtures.sql       two real puzzles from public/puzzles.json (+ psql vars)
 *   glicko_checks.sql  server Glicko-2 vs the `glicko2` npm package the app used
 *
 * Usage: tsx scripts/db-test-fixtures.ts <outDir>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Puzzle, PuzzleBundle } from '../src/types/game';
import { updateAfterMatch, type GlickoPlayer } from '../src/utils/glicko2';

const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: tsx scripts/db-test-fixtures.ts <outDir>');
  process.exit(1);
}

const bundle = JSON.parse(readFileSync('public/puzzles.json', 'utf8')) as PuzzleBundle;
const pick = (d: string): Puzzle => {
  const p = bundle.puzzles.find((x) => x.difficulty === d);
  if (!p) throw new Error(`no ${d} puzzle in bundle`);
  return p;
};
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

let sql = '';
for (const p of [pick('easy'), pick('hard')]) {
  const tiles = p.tiles.map(({ id, value, position }) => ({ id, value, position }));
  sql +=
    `insert into public.puzzles(id,tiles,target,difficulty,rating,optimal_solution,available_operators) values (` +
    `${lit(p.id)}, ${lit(JSON.stringify(tiles))}::jsonb, ${p.target}, ${lit(p.difficulty)}, ${p.rating}, ` +
    `${lit(JSON.stringify(p.optimalSolution))}::jsonb, array[${p.availableOperators.map(lit).join(',')}]);\n`;
}
sql += `\\set easy_id ${lit(pick('easy').id)}\n`;
writeFileSync(join(outDir, 'fixtures.sql'), sql);

const cases: [GlickoPlayer, GlickoPlayer, 0 | 0.5 | 1][] = [
  [{ rating: 1500, rd: 350, vol: 0.06 }, { rating: 1500, rd: 350, vol: 0.06 }, 1],
  [{ rating: 1500, rd: 350, vol: 0.06 }, { rating: 1800, rd: 80, vol: 0.06 }, 0],
  [{ rating: 1620, rd: 120, vol: 0.059 }, { rating: 1400, rd: 200, vol: 0.06 }, 0.5],
  [{ rating: 1500, rd: 200, vol: 0.06 }, { rating: 1400, rd: 30, vol: 0.06 }, 1],
];
const checks = cases
  .map(([p, o, s], i) => {
    const ref = updateAfterMatch(p, o, s);
    return (
      `select pg_temp.check('glicko case ${i + 1} matches npm glicko2', ` +
      `abs(rating-${ref.rating})<0.01 and abs(rd-${ref.rd})<0.01 and abs(vol-${ref.vol})<0.00001, ` +
      `format('sql=%s/%s/%s', round(rating::numeric,3), round(rd::numeric,3), round(vol::numeric,6))) ` +
      `from public.internal_glicko2(${p.rating},${p.rd},${p.vol},${o.rating},${o.rd},${s});`
    );
  })
  .join('\n');
writeFileSync(join(outDir, 'glicko_checks.sql'), checks + '\n');
