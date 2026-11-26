import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthOptional } from '../../auth/authContext';
import { MultiplayerGuestGate } from './MultiplayerGuestGate';
import { useSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { ButtonGameBoard } from '../GameBoard/ButtonGameBoard';
import { useGameStore } from '../../store/gameStore';
import type { MpSessionRow } from '../../multiplayer/mpTypes';
import { timingFingerprint } from '../../multiplayer/timingFingerprint';
import { fetchServerClockOffsetMs } from '../../multiplayer/serverClock';
import { logger } from '../../utils/logger';

function inviteUrl(token: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${base}play/join/${token}`;
}

/** Multiplayer match play surface: realtime session row, round sync, anti-cheat hash submit. */
export const MultiplayerSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const auth = useAuthOptional();
  const navigate = useNavigate();
  const sb = useSupabase();

  const gameStatus = useGameStore((s) => s.gameStatus);
  const totalTime = useGameStore((s) => s.totalTime);
  const wrongAttempts = useGameStore((s) => s.wrongAttempts);
  const resetGame = useGameStore((s) => s.resetGame);

  const [session, setSession] = useState<MpSessionRow | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitKeyRef = useRef<string | null>(null);
  // The path that solved the current round; the server re-checks it.
  const solvedPathRef = useRef<{ tileIds: number[]; operators: string[] } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadSession = useCallback(async () => {
    if (!sb || !sessionId) return;
    try {
      const { data, error } = await sb.from('mp_sessions').select('*').eq('id', sessionId).single();
      if (error) throw error;
      setSession(data as MpSessionRow);
    } catch (e) {
      logger.warn('mp session load failed', String(e));
      setSession(null);
      setErr(String(e));
    }
  }, [sb, sessionId]);

  useEffect(() => {
    if (!sb || !sessionId || !isSupabaseConfigured()) return;
    void fetchServerClockOffsetMs(sb).then(setClockOffsetMs);
  }, [sb, sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!sb || !sessionId || !auth?.user) return;

    const ch = sb
      .channel(`mp:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mp_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as MpSessionRow | null | undefined;
          if (row && typeof row === 'object' && 'id' in row && row.id === sessionId) {
            setSession(row);
          }
        }
      )
      .subscribe();

    return () => {
      void sb.removeChannel(ch);
    };
  }, [sb, sessionId, auth?.user]);

  useEffect(() => {
    if (!sb || !sessionId || !auth?.user) return;
    const id = window.setInterval(() => {
      void sb.rpc('mp_heartbeat', { p_session: sessionId });
    }, 5000);
    return () => window.clearInterval(id);
  }, [sb, sessionId, auth?.user]);

  useEffect(() => {
    if (gameStatus === 'playing') submitKeyRef.current = null;
  }, [gameStatus]);

  const handleAttempt = useCallback(
    (attempt: { tileIds: number[]; operators: string[]; correct: boolean }) => {
      if (attempt.correct) solvedPathRef.current = attempt;
    },
    []
  );

  useEffect(() => {
    if (!auth?.user || !sb || !session || session.state !== 'active') return;
    if (gameStatus !== 'paused') return;
    if (!session.round_seed || session.round_seed === 'pending-seed') return;

    const key = `${session.current_round}|${session.round_seed}`;
    if (submitKeyRef.current === key) return;
    submitKeyRef.current = key;

    void (async () => {
      try {
        const path = solvedPathRef.current;
        if (!path) return;
        // Send the board we were shown plus our answer; the server checks the
        // answer, requires both players' boards to match and times the round.
        const { grid, currentTarget, gapOperators } = useGameStore.getState();
        const gridValues = [...grid].sort((a, b) => a.id - b.id).map((t) => t.value);
        const hash = await timingFingerprint([
          session.id,
          String(session.current_round),
          String(Math.round(totalTime)),
          String(wrongAttempts),
        ]);
        const { error } = await sb.rpc('mp_submit_round', {
          p_session: session.id,
          p_round: session.current_round,
          p_grid: gridValues,
          p_target: currentTarget,
          p_gaps: gapOperators,
          p_tile_ids: path.tileIds,
          p_operators: path.operators,
          p_wrong: wrongAttempts,
          p_timing_hash: hash,
        });
        solvedPathRef.current = null;
        if (error) logger.warn('mp_submit_round', error.message);
      } catch (e) {
        logger.warn('mp_submit_round threw', String(e));
      }
    })();
  }, [auth?.user, sb, session, gameStatus, totalTime, wrongAttempts]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const roundDeadlineMs =
    session && session.round_started_at && session.time_control_sec
      ? new Date(session.round_started_at).getTime() + session.time_control_sec * 1000
      : null;

  const roundSecsLeft =
    roundDeadlineMs && session && session.state === 'active'
      ? Math.max(0, Math.round((roundDeadlineMs + clockOffsetMs - nowTick) / 1000))
      : null;

  const setReady = async () => {
    if (!sb || !sessionId) return;
    setBusy(true);
    setErr(null);
    try {
      const { error } = await sb.rpc('mp_set_ready', { p_session: sessionId });
      if (error) throw error;
      await loadSession();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const rematch = async () => {
    if (!sb || !session) return;
    setBusy(true);
    try {
      const { data, error } = await sb.rpc('mp_create_rematch', { p_prev: session.id });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as { session_id?: string };
      if (row?.session_id) void navigate(`/play/mp/${row.session_id}`, { replace: true });
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const archiveAndLeave = async () => {
    if (!sb || !session) return;
    try {
      await sb.rpc('mp_archive_session', { p_session: session.id });
    } catch {
      /* ignore */
    }
    resetGame();
    void navigate('/play/multiplayer');
  };

  if (!isSupabaseConfigured() || !sb) {
    return (
      <div className="p-4 text-sm">
        <Link to="/play" className="font-bold text-lime-700">
          ← Back
        </Link>
        <p className="mt-4">Configure Supabase for multiplayer.</p>
      </div>
    );
  }

  if (!auth?.user) {
    return <MultiplayerGuestGate reason="Join this match as a guest, or sign in." />;
  }

  if (session === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading…</div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 text-sm">
        <Link to="/play/multiplayer" className="font-bold text-lime-700">
          ← Lobby
        </Link>
        <p className="mt-4 text-red-600">{err ?? 'Session not found.'}</p>
      </div>
    );
  }

  const isHost = auth.user.id === session.host_id;
  const isGuest = auth.user.id === session.guest_id;
  const participant = isHost || isGuest;

  if (!participant) {
    return (
      <div className="p-4 text-sm">
        <Link to="/play/multiplayer" className="font-bold text-lime-700">
          ← Lobby
        </Link>
        <p className="mt-4">You are not in this match.</p>
      </div>
    );
  }

  const inviteLink = inviteUrl(session.invite_token);
  const oppLastSeen = isHost ? session.guest_last_seen : session.host_last_seen;
  const oppStale =
    session.state === 'active' &&
    oppLastSeen &&
    nowTick + clockOffsetMs - new Date(oppLastSeen).getTime() > 18_000;
  // Matches the server's forfeit grace period (mp_claim_forfeit).
  const oppGone = oppStale && nowTick + clockOffsetMs - new Date(oppLastSeen).getTime() > 46_000;

  return (
    <div className="flex h-full min-h-0 flex-col safe-pad">
      <header className="shrink-0 border-b border-slate-200 bg-white/90 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <Link to="/play/multiplayer" className="font-bold text-lime-700 dark:text-lime-400">
            ← Lobby
          </Link>
          <div className="font-mono text-[11px] text-slate-500">
            {session.state.toUpperCase()} · R{session.current_round}/{session.total_rounds} ·{' '}
            {isHost ? 'Host' : 'Guest'} · {session.host_round_wins}-{session.guest_round_wins}
          </div>
        </div>
        {session.state === 'pending' && (
          <div className="mx-auto mt-2 max-w-3xl text-[11px] text-slate-600 dark:text-slate-300">
            Share:{' '}
            <button
              type="button"
              className="break-all text-left text-blue-600 underline dark:text-blue-400"
              onClick={() => void navigator.clipboard?.writeText(inviteLink)}
            >
              {inviteLink}
            </button>
          </div>
        )}
        {roundSecsLeft !== null && (
          <p className="mx-auto mt-1 max-w-3xl text-[11px] text-amber-700 dark:text-amber-300">
            Round limit (aligned to server): {roundSecsLeft}s
          </p>
        )}
        {oppStale && (
          <div className="mx-auto mt-1 flex max-w-3xl items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>Opponent connection looks stale — they may reconnect to the same match.</span>
            {oppGone && (
              <button
                type="button"
                disabled={claiming}
                onClick={async () => {
                  if (!sb) return;
                  setClaiming(true);
                  const { data, error } = await sb.rpc('mp_claim_forfeit', {
                    p_session: session.id,
                  });
                  setClaiming(false);
                  if (error) setErr(error.message);
                  else if (!data) setErr('Your opponent is still connected.');
                  else void loadSession();
                }}
                className="shrink-0 rounded-lg bg-lime-500 px-2 py-1 font-bold text-white disabled:opacity-60"
              >
                Claim win
              </button>
            )}
          </div>
        )}
        {err && <p className="mx-auto mt-1 max-w-3xl text-[11px] text-red-600">{err}</p>}
      </header>

      {session.state === 'pending' && (
        <div className="shrink-0 px-4 py-3 text-center text-sm">
          {!session.guest_id ? (
            <p className="text-slate-600 dark:text-slate-300">Waiting for opponent to join…</p>
          ) : (
            <p className="text-slate-600 dark:text-slate-300">Both players: tap Ready to start.</p>
          )}
          <button
            type="button"
            disabled={busy || (isHost && session.host_ready) || (isGuest && session.guest_ready)}
            onClick={() => void setReady()}
            className="mt-3 rounded-xl bg-lime-500 px-6 py-2 font-black text-white disabled:opacity-40"
          >
            Ready
          </button>
        </div>
      )}

      {session.state === 'finished' && (
        <div className="shrink-0 space-y-3 px-4 py-6 text-center">
          <p className="text-lg font-black text-slate-900 dark:text-white">
            {session.winner_user_id === null
              ? 'Draw!'
              : session.winner_user_id === auth.user.id
                ? 'You win!'
                : 'You lose'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void rematch()}
              className="rounded-xl bg-lime-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
            >
              Rematch
            </button>
            <button
              type="button"
              onClick={() => void archiveAndLeave()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-600"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {session.state === 'active' && session.round_seed && (
        <div className="min-h-0 flex-1 overflow-hidden">
          {gameStatus === 'paused' && (
            <div className="bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              Round sent — waiting for opponent…
            </div>
          )}
          <ButtonGameBoard
            difficulty={session.difficulty}
            gameMode="multiplayer"
            multiplayerSeed={session.round_seed}
            multiplayerRoundKey={`${session.current_round}|${session.round_seed}`}
            lockInteraction={gameStatus === 'paused'}
            onAttempt={handleAttempt}
          />
        </div>
      )}
    </div>
  );
};
