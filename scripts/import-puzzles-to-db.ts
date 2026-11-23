/**
 * EPIC-28 — bulk import `public/puzzles.json` into Postgres (themes, puzzles, puzzle_themes),
 * then fill `daily_schedule` for the next two years using the same weekly picker the app
 * uses offline, so the server and every device always agree on today's puzzle.
 * Run after `npm run db:migrate` (and again at least once a year). Requires DATABASE_URL.
 *
 * Usage: `DATABASE_URL=... npm run puzzles:import-db`
 */
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import type { Puzzle, PuzzleBundle } from '../src/types/game';
import { pickTodaysDailyPuzzle, utcDateKey } from '../src/utils/puzzleStore';

const SCHEDULE_DAYS_BACK = 7;
const SCHEDULE_DAYS_AHEAD = 730;

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
        optimal_solution,
        available_operators
      )
      values (
        ${p.id},
        ${sql.json(normalizeTiles(p))},
        ${p.target},
        ${p.difficulty},
        ${p.rating},
        ${350},
        ${0.06},
        ${sql.json(p.optimalSolution)},
        ${p.availableOperators}
      )
      on conflict (id) do update set
        tiles = excluded.tiles,
        target = excluded.target,
        difficulty = excluded.difficulty,
        rating = excluded.rating,
        optimal_solution = excluded.optimal_solution,
        available_operators = excluded.available_operators
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

  console.log('imported', n, 'puzzles');

  // Daily schedule. Past days are rewritten only if they had no entry, so an
  // updated bundle never changes a puzzle people have already played.
  const now = new Date();
  let scheduled = 0;
  for (let d = -SCHEDULE_DAYS_BACK; d <= SCHEDULE_DAYS_AHEAD; d++) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + d, 12)
    );
    const pick = pickTodaysDailyPuzzle(puzzles, date);
    if (!pick) continue;
    if (d <= 0) {
      await sql`
        insert into public.daily_schedule (utc_date, puzzle_id)
        values (${utcDateKey(date)}, ${pick.id})
        on conflict (utc_date) do nothing
      `;
    } else {
      await sql`
        insert into public.daily_schedule (utc_date, puzzle_id)
        values (${utcDateKey(date)}, ${pick.id})
        on conflict (utc_date) do update set puzzle_id = excluded.puzzle_id
      `;
    }
    scheduled += 1;
  }
  console.log('scheduled', scheduled, 'daily puzzles');

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
