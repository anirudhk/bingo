import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { utcDateKey } from '../../utils/puzzleStore';
import { logger } from '../../utils/logger';

interface LbRow {
  seconds: number;
  wrong_attempts: number;
  puzzle_id: string;
  user_id: string;
  profiles: { handle: string; display_name: string } | null;
}

export const DailyLeaderboardPage: React.FC = () => {
  const [params] = useSearchParams();
  const sb = useMemo(() => getSupabase(), []);
  const defaultDate = useMemo(() => utcDateKey(new Date()), []);
  const date = params.get('date') || defaultDate;

  const [rows, setRows] = useState<LbRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sb || !isSupabaseConfigured()) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await sb
          .from('daily_leaderboard_entries')
          .select('seconds,wrong_attempts,puzzle_id,user_id,profiles(handle,display_name)')
          .eq('puzzle_utc_date', date)
          .order('seconds', { ascending: true })
          .order('wrong_attempts', { ascending: true })
          .limit(100);

        if (cancelled) return;
        if (error) {
          setErr(error.message);
          setRows([]);
          return;
        }
        setErr(null);
        const normalized = (data ?? []).map((row) => {
          const r = row as Record<string, unknown>;
          let profiles = r.profiles as LbRow['profiles'];
          if (Array.isArray(profiles)) profiles = (profiles[0] as LbRow['profiles']) ?? null;
          return { ...r, profiles } as LbRow;
        });
        setRows(normalized);
      } catch (e) {
        logger.warn('leaderboard load failed', String(e));
        if (!cancelled) {
          setErr(String(e));
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sb, date]);

  if (!isSupabaseConfigured() || !sb) {
    return (
      <div className="h-full overflow-auto p-4 text-sm">
        <Link to="/learn" className="font-bold text-lime-700 dark:text-lime-400">
          ← Back
        </Link>
        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Leaderboards require Supabase configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto safe-pad">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Link to="/learn" className="text-sm font-bold text-lime-700 dark:text-lime-400">
          ← Back to Learn
        </Link>
        <h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">
          Daily leaderboard
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          UTC date <span className="font-mono">{date}</span>. Ranked by time, then accuracy.
        </p>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        {rows === null ? (
          <p className="mt-6 text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No scores yet for this day.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {rows.map((r, i) => (
              <li
                key={`${r.user_id}-${i}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-right font-black text-slate-400">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-slate-900 dark:text-slate-100">
                      {r.profiles?.display_name ?? r.profiles?.handle ?? 'Player'}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      @{r.profiles?.handle ?? '—'} · {r.wrong_attempts} miss
                      {r.wrong_attempts === 1 ? '' : 'es'}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 font-mono font-bold text-lime-700 dark:text-lime-400">
                  {formatSecs(r.seconds)}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

function formatSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
