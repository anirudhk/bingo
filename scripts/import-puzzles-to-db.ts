/**
 * EPIC-28 — bulk import `public/puzzles.json` into Postgres (themes, puzzles, puzzle_themes).
 * Run after `npm run db:migrate`. Requires DATABASE_URL.
 *
 * Usage: `DATABASE_URL=... npm run puzzles:import-db`
 */
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import type { Puzzle, PuzzleBundle } from '../src/types/game';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

function normalizeTiles(puzzle: Puzzle) {
  return puzzle.tiles.map(({ id, value, position }) => ({ id, value, position }));
}

function themeTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(' ');
}

async function main(): Promise<void> {
  const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'puzzles.json'), 'utf8');
  const bundle = JSON.parse(raw) as PuzzleBundle;
  const puzzles = bundle.puzzles;

  const themeSlugs = new Set<string>();
  for (const p of puzzles) {
    for (const t of p.themes) themeSlugs.add(t);
  }

  const slugToId = new Map<string, string>();

  for (const slug of themeSlugs) {
    const rows = await sql<{ id: string }[]>`
      insert into public.themes (slug, name)
      values (${slug}, ${themeTitle(slug)})
      on conflict (slug) do update set name = excluded.name
      returning id
    `;
    slugToId.set(slug, rows[0]!.id);
  }

  let n = 0;
  for (const p of puzzles) {
    await sql`
      insert into public.puzzles (
        id,
        tiles,
        target,
        difficulty,
        rating,
        rating_rd,
        rating_vol,
        optimal_solution
      )
      values (
        ${p.id},
        ${sql.json(normalizeTiles(p))},
        ${p.target},
        ${p.difficulty},
        ${p.rating},
        ${350},
        ${0.06},
        ${sql.json(p.optimalSolution)}
      )
      on conflict (id) do update set
        tiles = excluded.tiles,
        target = excluded.target,
        difficulty = excluded.difficulty,
        rating = excluded.rating,
        optimal_solution = excluded.optimal_solution
    `;

    for (const themeSlug of p.themes) {
      const themeId = slugToId.get(themeSlug);
      if (!themeId) continue;
      await sql`
        insert into public.puzzle_themes (puzzle_id, theme_id)
        values (${p.id}, ${themeId}::uuid)
        on conflict do nothing
      `;
    }

    n += 1;
    if (n % 50 === 0) console.log('imported', n);
  }

  await sql.end();
  console.log('imported', n, 'puzzles');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
