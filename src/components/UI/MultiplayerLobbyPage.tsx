import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthOptional } from '../../auth/authContext';
import { MultiplayerGuestGate } from './MultiplayerGuestGate';
import { useSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import type { DifficultyLevel } from '../../types/game';
import { logger } from '../../utils/logger';

function inviteUrl(token: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${base}play/join/${token}`;
}

interface OpenChallengeRow {
  id: string;
  invite_token: string;
  difficulty: DifficultyLevel;
  host_id: string;
}

/**
 * EPIC-35 / EPIC-37 hub — quick match, create invite, browse open games (difficulty filter EPIC-35.03).
 */
export const MultiplayerLobbyPage: React.FC = () => {
  const auth = useAuthOptional();
  const navigate = useNavigate();
  const sb = useSupabase();

  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [rounds, setRounds] = useState(3);
  const [timeSec, setTimeSec] = useState<number | ''>('');
  const [listingFilter, setListingFilter] = useState<DifficultyLevel | 'all'>('all');
  const [openRows, setOpenRows] = useState<OpenChallengeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const matchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!auth?.user || !sb || !isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data: listings } = await sb.from('mp_public_invites').select('session_id');
        const ids = (listings ?? []).map((r: { session_id: string }) => r.session_id);
        if (ids.length === 0) {
          if (!cancelled) setOpenRows([]);
          return;
        }
        const { data: sessions } = await sb
          .from('mp_sessions')
          .select('id, invite_token, difficulty, host_id, state, guest_id')
          .in('id', ids)
          .eq('state', 'pending')
          .is('guest_id', null);
        if (!cancelled) setOpenRows((sessions ?? []) as OpenChallengeRow[]);
      } catch (e) {
        logger.warn('open challenges load failed', String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth?.user, sb]);

  const filteredOpen = openRows.filter(
    (r) => listingFilter === 'all' || r.difficulty === listingFilter
  );

  const stopMatchPoll = useCallback(() => {
    if (matchPollRef.current) {
      clearInterval(matchPollRef.current);
      matchPollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopMatchPoll(), [stopMatchPoll]);

  useEffect(() => {
    if (!auth?.user || !sb) return;
    void sb.rpc('mp_leave_queue');
    return () => {
      void sb.rpc('mp_leave_queue');
    };
  }, [auth?.user, sb]);

  if (!isSupabaseConfigured() || !sb) {
    return (
      <div className="p-4 text-sm text-slate-600 dark:text-slate-300">
        <Link className="font-bold text-lime-700 dark:text-lime-400" to="/play">
          ← Back
        </Link>
        <p className="mt-4">Multiplayer requires Supabase env vars.</p>
      </div>
    );
  }

  if (!auth?.user) {
    return <MultiplayerGuestGate />;
  }

  const createInvite = async (listPublic: boolean) => {
    setBusy(true);
    setMsg(null);
    try {
      const { data, error } = await sb.rpc('mp_create_invite', {
        p_difficulty: difficulty,
        p_rounds: rounds,
        p_time_sec: timeSec === '' ? null : timeSec,
        p_public: listPublic,
        p_bracket_mu: null,
        p_bracket_half: null,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as { session_id?: string; token?: string };
      const sid = row?.session_id;
      const token = row?.token;
      if (!sid || !token) throw new Error('No session returned');
      await navigator.clipboard?.writeText(inviteUrl(token));
      setMsg(`Room ready — invite link copied. Share: ${inviteUrl(token)}`);
      void navigate(`/play/mp/${sid}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  const startQuickMatch = () => {
    setMsg(null);
    stopMatchPoll();
    void (async () => {
      setBusy(true);
      try {
        const { error } = await sb.rpc('mp_enter_queue', { p_difficulty: difficulty });
        if (error) throw error;
        const poll = setInterval(async () => {
          try {
            const { data: sid, error: pe } = await sb.rpc('mp_poll_matchmaking');
            if (pe) return;
            if (sid) {
              stopMatchPoll();
              void navigate(`/play/mp/${sid}`);
            }
          } catch {
            /* ignore */
          }
        }, 2000);
        matchPollRef.current = poll;
        setMsg('Searching for an opponent… bracket expands every ~10s.');
      } catch (e) {
        setMsg(String(e));
      } finally {
        setBusy(false);
      }
    })();
  };

  const joinToken = async (token: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const { data: sid, error } = await sb.rpc('mp_join_invite', { p_token: token });
      if (error) throw error;
      void navigate(`/play/mp/${sid}`);
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-auto safe-pad">
      <div className="mx-auto max-w-lg px-4 py-6">
        <Link to="/play" className="text-sm font-bold text-lime-700 dark:text-lime-400">
          ← Play modes
        </Link>
        <h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">Multiplayer</h1>
        {auth.isGuest && (
          <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
            Playing as a guest — games are unrated.
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Race a friend or a random opponent to solve the same board first.
        </p>

        <section className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/80">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Match settings
          </h2>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Rounds (1–10)
            <input
              type="number"
              min={1}
              max={10}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
            Round time limit (seconds, optional)
            <input
              type="number"
              min={10}
              placeholder="Untimed"
              value={timeSec}
              onChange={(e) =>
                setTimeSec(e.target.value === '' ? '' : Math.max(10, Number(e.target.value)))
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
        </section>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={startQuickMatch}
            className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-lime-600 disabled:opacity-40"
          >
            Quick match
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createInvite(false)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-600"
          >
            Private room
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createInvite(true)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-600"
          >
            Public challenge
          </button>
        </div>

        <section className="mt-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
              Open challenges
            </h2>
            <select
              value={listingFilter}
              onChange={(e) => setListingFilter(e.target.value as DifficultyLevel | 'all')}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
            >
              <option value="all">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          {filteredOpen.length === 0 ? (
            <p className="text-xs text-slate-500">No listed games right now.</p>
          ) : (
            <ul className="space-y-2">
              {filteredOpen.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <span className="font-semibold capitalize">{r.difficulty}</span>
                  <button
                    type="button"
                    disabled={busy || r.host_id === auth.user?.id}
                    onClick={() => void joinToken(r.invite_token)}
                    className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white dark:bg-lime-600 disabled:opacity-40"
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {msg && <p className="mt-4 text-xs text-slate-600 dark:text-slate-300">{msg}</p>}
      </div>
    </div>
  );
};
