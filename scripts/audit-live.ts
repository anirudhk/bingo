/**
 * Live security audit against the real Supabase project, using only what any
 * visitor has: the public URL + anon key from the built app.
 *
 *   npm run db:audit-live          (reads VITE_SUPABASE_URL / _ANON_KEY from .env)
 *
 * Every probe must be refused. Complements `npm run db:test`, which checks the
 * schema in a scratch database; this one proves the deployed project matches.
 */
import { readFileSync } from 'node:fs';

const env: Record<string, string> = { ...process.env } as Record<string, string>;
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2];
  }
} catch {
  // no .env — rely on the environment
}

const url = env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

interface Probe {
  label: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  body?: unknown;
  /** Allowed outcome for GETs on readable tables: rows may come back, but not these columns. */
  forbidColumns?: string[];
}

const fakeUser = '00000000-0000-0000-0000-000000000001';
const probes: Probe[] = [
  {
    label: 'call internal_mp_apply_elo',
    method: 'POST',
    path: '/rest/v1/rpc/internal_mp_apply_elo',
    body: { p_winner: fakeUser, p_loser: fakeUser },
  },
  {
    label: 'call internal_mp_finish',
    method: 'POST',
    path: '/rest/v1/rpc/internal_mp_finish',
    body: { p_session: fakeUser, p_winner: null },
  },
  {
    label: 'call purge_deleted_accounts',
    method: 'POST',
    path: '/rest/v1/rpc/purge_deleted_accounts',
    body: {},
  },
  {
    label: 'call apply_user_rating (removed)',
    method: 'POST',
    path: '/rest/v1/rpc/apply_user_rating',
    body: { p_mode: 'daily', p_rating: 3000, p_rd: 30, p_vol: 0.06 },
  },
  {
    label: 'call submit_daily_leaderboard (removed)',
    method: 'POST',
    path: '/rest/v1/rpc/submit_daily_leaderboard',
    body: {},
  },
  {
    label: 'call start_daily_attempt signed out',
    method: 'POST',
    path: '/rest/v1/rpc/start_daily_attempt',
    body: {},
  },
  {
    label: 'insert leaderboard row',
    method: 'POST',
    path: '/rest/v1/daily_leaderboard_entries',
    body: {
      puzzle_utc_date: '2026-01-01',
      user_id: fakeUser,
      puzzle_id: 'x',
      seconds: 0,
      wrong_attempts: 0,
    },
  },
  {
    label: 'insert rating row',
    method: 'POST',
    path: '/rest/v1/user_ratings',
    body: { user_id: fakeUser, mode: 'daily', rating: 3000, rd: 30, vol: 0.06 },
  },
  {
    label: 'update any profile',
    method: 'PATCH',
    path: `/rest/v1/profiles?id=eq.${fakeUser}`,
    body: { server_daily_streak_count: 999 },
  },
  { label: 'read client_errors', method: 'GET', path: '/rest/v1/client_errors?select=*&limit=1' },
  { label: 'read mp_round_grids', method: 'GET', path: '/rest/v1/mp_round_grids?select=*&limit=1' },
  {
    label: 'read future daily schedule',
    method: 'GET',
    path: '/rest/v1/daily_schedule?select=*&utc_date=gt.2099-01-01',
  },
  {
    label: 'read parent_email column (removed)',
    method: 'GET',
    path: '/rest/v1/profiles?select=parent_email&limit=1',
  },
];

const refused = (status: number, body: string): boolean => {
  if (status >= 400) return true;
  // PostgREST answers 2xx with an empty list when RLS hides every row.
  return body.trim() === '[]' || body.trim() === '';
};

let failures = 0;
for (const p of probes) {
  const res = await fetch(url + p.path, {
    method: p.method,
    headers: { ...headers, Prefer: 'return=representation' },
    body: p.body === undefined ? undefined : JSON.stringify(p.body),
  });
  const text = await res.text();
  const ok = refused(res.status, text);
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} : refused: ${p.label}  (HTTP ${res.status}${ok ? '' : ` ${text.slice(0, 120)}`})`
  );
}

// The one write anonymous visitors are allowed: an error report.
const report = await fetch(`${url}/rest/v1/rpc/report_client_error`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    p_report: { message: 'audit-live probe', source: 'manual', path: '/audit' },
  }),
});
console.log(`${report.ok ? 'PASS' : 'FAIL'} : error reporting reachable (HTTP ${report.status})`);
if (!report.ok) failures++;

console.log(
  failures === 0 ? 'audit-live: all probes refused' : `audit-live: ${failures} problem(s)`
);
process.exit(failures === 0 ? 0 : 1);
