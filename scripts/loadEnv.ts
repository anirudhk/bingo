/**
 * Load `.env` into process.env for Node scripts (db:migrate, puzzles:import-db),
 * without overriding variables already set in the shell. Vite loads .env for
 * the app; plain Node scripts don't, which made `npm run db:migrate` fail with
 * "DATABASE_URL is required" unless the shell exported it first.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const file = join(process.cwd(), '.env');
if (existsSync(file)) {
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trimStart().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
