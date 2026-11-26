/**
 * Runs SQL files in `supabase/migrations/` once per id (tracked in `_gg_migrations`).
 * Requires DATABASE_URL (direct Postgres connection string from Supabase → Database settings).
 *
 * Usage: `DATABASE_URL=... npm run db:migrate`
 */
import fs from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import './loadEnv';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required (set it in .env — see .env.example)');
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function main(): Promise<void> {
  await sql`
    create table if not exists public._gg_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const dir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = await sql<{ exists: boolean }[]>`
      select exists (select 1 from public._gg_migrations where id = ${file}) as exists
    `;
    if (applied[0]?.exists) {
      console.log('skip', file);
      continue;
    }

    const body = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log('apply', file);
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into public._gg_migrations (id) values (${file})`;
    });
  }

  await sql.end();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
