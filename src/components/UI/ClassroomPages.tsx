import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuthOptional } from '../../auth/authContext';
import { useSupabase } from '../../lib/supabase/client';
import { fetchServerClockOffsetMs } from '../../multiplayer/serverClock';
import { useGameStore } from '../../store/gameStore';
import type { DifficultyLevel } from '../../types/game';
import { ButtonGameBoard } from '../GameBoard/ButtonGameBoard';
import { Mascot } from './Mascot';
import {
  CLASS_DURATIONS,
  boardSeed,
  createRoom,
  endRoom,
  joinRoom,
  rankPlayers,
  startRoom,
  submitClassAnswer,
  useClassRoom,
  type ClassPlayer,
} from '../../services/classroom';

// ─── shared bits ────────────────────────────────────────────────────────────

const useServerOffset = () => {
  const sb = useSupabase();
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (sb) void fetchServerClockOffsetMs(sb).then(setOffset);
  }, [sb]);
  return offset;
};

/** Seconds left until `endsAt` (server-aligned); null when not running. */
const useSecondsLeft = (endsAt: string | null | undefined, offset: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - (now + offset)) / 1000));
};

const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

/** Make sure we have a (guest) session before calling class_* functions. */
const useEnsureSession = () => {
  const auth = useAuthOptional();
  return useCallback(async (): Promise<string | null> => {
    if (!auth) return 'Online play is not available right now.';
    if (auth.user) return null;
    const err = await auth.signInAsGuest();
    if (!err) return null;
    return err.toLowerCase().includes('anonymous')
      ? 'Guest play is switched off on this server.'
      : err;
  }, [auth]);
};

const Shell: React.FC<{ children: React.ReactNode; wide?: boolean }> = ({ children, wide }) => (
  <div className="h-full overflow-auto">
    <div className={`mx-auto px-4 py-6 ${wide ? 'max-w-5xl' : 'max-w-md'}`}>{children}</div>
  </div>
);

const DIFFICULTIES: { id: DifficultyLevel; label: string; note: string }[] = [
  { id: 'easy', label: 'Easy', note: 'Tap 2 numbers' },
  { id: 'medium', label: 'Medium', note: '2 numbers, pick the sign' },
  { id: 'hard', label: 'Hard', note: '3 numbers, one answer' },
];

// ─── Teacher: create a room ─────────────────────────────────────────────────

export const ClassHostSetupPage: React.FC = () => {
  const sb = useSupabase();
  const navigate = useNavigate();
  const ensureSession = useEnsureSession();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [duration, setDuration] = useState<number>(300);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    const err = await ensureSession();
    if (err || !sb) {
      setError(err ?? 'Online play is not available right now.');
      setBusy(false);
      return;
    }
    const res = await createRoom(sb, difficulty, duration);
    setBusy(false);
    if ('error' in res) setError(res.error);
    else navigate(`/class/host/${res.roomId}`);
  };

  return (
    <Shell>
      <Link to="/play" className="text-sm font-bold text-green-700 dark:text-lime-400">
        ← Back
      </Link>
      <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">Class race</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Your class races the same puzzles for a few minutes, with a live leaderboard for the big
        screen. Students join on any device with a code and a nickname — no accounts.
      </p>

      <h2 className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">
        Difficulty
      </h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDifficulty(d.id)}
            aria-pressed={difficulty === d.id}
            className={`min-h-[64px] rounded-2xl p-2 text-center ring-1 ${
              difficulty === d.id
                ? 'bg-green-50 ring-2 ring-green-600 dark:bg-green-950/40'
                : 'bg-white ring-slate-200 dark:bg-slate-900 dark:ring-slate-700'
            }`}
          >
            <span className="block text-sm font-black text-slate-900 dark:text-white">
              {d.label}
            </span>
            <span className="block text-[11px] text-slate-600 dark:text-slate-400">{d.note}</span>
          </button>
        ))}
      </div>

      <h2 className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">Length</h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {CLASS_DURATIONS.map((secs) => (
          <button
            key={secs}
            type="button"
            onClick={() => setDuration(secs)}
            aria-pressed={duration === secs}
            className={`min-h-[48px] rounded-2xl text-sm font-black ring-1 ${
              duration === secs
                ? 'bg-green-50 text-green-800 ring-2 ring-green-600 dark:bg-green-950/40 dark:text-green-200'
                : 'bg-white text-slate-800 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700'
            }`}
          >
            {secs / 60} min
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void create()}
        disabled={busy}
        className="mt-6 min-h-[52px] w-full rounded-2xl bg-green-700 text-base font-black text-white shadow-sm hover:bg-green-800 disabled:opacity-60"
      >
        {busy ? 'Creating…' : 'Create room'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </Shell>
  );
};

// ─── Teacher: projector view ────────────────────────────────────────────────

const LeaderRow: React.FC<{ rank: number; p: ClassPlayer; big?: boolean }> = ({ rank, p, big }) => (
  <li
    className={`flex items-center gap-3 rounded-2xl bg-white px-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${big ? 'py-3' : 'py-2'}`}
  >
    <span
      className={`w-8 text-right font-black tabular-nums text-slate-500 ${big ? 'text-2xl' : 'text-base'}`}
    >
      {rank}
    </span>
    <span
      className={`min-w-0 flex-1 truncate font-black text-slate-900 dark:text-white ${big ? 'text-2xl' : 'text-base'}`}
    >
      {p.nickname}
    </span>
    <span
      className={`font-black tabular-nums text-green-700 dark:text-green-300 ${big ? 'text-2xl' : 'text-base'}`}
    >
      {p.score}
    </span>
    <span className="w-20 text-right text-sm font-semibold text-slate-500">{p.solved} solved</span>
  </li>
);

export const ClassHostRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const sb = useSupabase();
  const navigate = useNavigate();
  const offset = useServerOffset();
  const { room, players, refresh } = useClassRoom(sb, roomId);
  const secsLeft = useSecondsLeft(room?.state === 'live' ? room.ends_at : null, offset);
  const ranked = rankPlayers(players);
  const timeUp = room?.state === 'finished' || (room?.state === 'live' && secsLeft === 0);
  const endedRef = useRef(false);

  // When the clock runs out, close the room so late answers are refused.
  useEffect(() => {
    if (sb && roomId && room?.state === 'live' && secsLeft === 0 && !endedRef.current) {
      endedRef.current = true;
      void endRoom(sb, roomId).then(() => refresh());
    }
  }, [sb, roomId, room?.state, secsLeft, refresh]);

  if (room === undefined) return <Shell>Loading…</Shell>;
  if (room === null)
    return (
      <Shell>
        <p>This room isn&apos;t available.</p>
        <Link to="/class" className="underline">
          Create a new room
        </Link>
      </Shell>
    );

  const joinUrl = `${window.location.host}${import.meta.env.BASE_URL}join`;

  if (timeUp) {
    const podium = ranked.slice(0, 3);
    return (
      <Shell wide>
        <div className="text-center">
          <Mascot mood="cheer" size={96} className="mx-auto" />
          <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-white">
            Time&apos;s up!
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">{players.length} players</p>
        </div>
        <ol className="mx-auto mt-6 flex max-w-3xl items-end justify-center gap-3">
          {[podium[1], podium[0], podium[2]].map((p, i) =>
            p ? (
              <li key={p.user_id} className="flex w-1/3 flex-col items-center">
                <span className="truncate text-xl font-black text-slate-900 dark:text-white">
                  {p.nickname}
                </span>
                <span className="text-lg font-black text-green-700 dark:text-green-300">
                  {p.score}
                </span>
                <span
                  className={`mt-1 flex w-full items-start justify-center rounded-t-2xl pt-2 text-3xl font-black text-white ${
                    i === 1
                      ? 'h-32 bg-amber-400'
                      : i === 0
                        ? 'h-24 bg-slate-400'
                        : 'h-16 bg-orange-400'
                  }`}
                >
                  {i === 1 ? 1 : i === 0 ? 2 : 3}
                </span>
              </li>
            ) : (
              <li key={i} className="w-1/3" />
            )
          )}
        </ol>
        <ol className="mx-auto mt-6 max-w-3xl space-y-2">
          {ranked.slice(3).map((p, i) => (
            <LeaderRow key={p.user_id} rank={i + 4} p={p} />
          ))}
        </ol>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/class')}
            className="min-h-[48px] rounded-2xl bg-green-700 px-6 font-black text-white hover:bg-green-800"
          >
            New race
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <div className="flex items-center justify-between">
        <Link to="/class" className="text-sm font-bold text-green-700 dark:text-lime-400">
          ← Back
        </Link>
        {room.state === 'live' && sb && (
          <button
            type="button"
            onClick={() => void endRoom(sb, room.id).then(() => refresh())}
            className="min-h-[44px] rounded-xl px-3 text-sm font-bold text-slate-600 ring-1 ring-slate-300 dark:text-slate-300 dark:ring-slate-600"
          >
            End now
          </button>
        )}
      </div>

      {room.state === 'lobby' ? (
        <div className="mt-4 text-center">
          <p className="text-lg font-bold text-slate-700 dark:text-slate-200">
            Go to <span className="font-black text-slate-900 dark:text-white">{joinUrl}</span> and
            enter
          </p>
          <p
            className="mt-2 font-mono text-7xl font-black tracking-[0.2em] text-green-700 dark:text-green-300 sm:text-8xl"
            aria-label={`Room code ${room.code.split('').join(' ')}`}
          >
            {room.code}
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {players.length} joined · {room.difficulty} · {room.duration_sec / 60} minutes
          </p>
          <ul className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2">
            {players.map((p) => (
              <li
                key={p.user_id}
                className="rounded-full bg-white px-3 py-1 text-base font-bold text-slate-800 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
              >
                {p.nickname}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={players.length === 0 || !sb}
            onClick={() => sb && void startRoom(sb, room.id).then(() => refresh())}
            className="mt-6 min-h-[56px] rounded-2xl bg-green-700 px-10 text-lg font-black text-white shadow-sm hover:bg-green-800 disabled:opacity-50"
          >
            Start race
          </button>
          {players.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">Waiting for the first player…</p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-wider text-slate-500">Time left</p>
            <p className="font-mono text-6xl font-black tabular-nums text-slate-900 dark:text-white">
              {clock(secsLeft ?? 0)}
            </p>
          </div>
          <ol className="mx-auto mt-4 max-w-3xl space-y-2">
            {ranked.slice(0, 10).map((p, i) => (
              <LeaderRow key={p.user_id} rank={i + 1} p={p} big />
            ))}
          </ol>
          {ranked.length > 10 && (
            <p className="mt-2 text-center text-sm text-slate-500">
              + {ranked.length - 10} more playing
            </p>
          )}
        </div>
      )}
    </Shell>
  );
};

// ─── Student: join ──────────────────────────────────────────────────────────

export const ClassJoinPage: React.FC = () => {
  const { code: codeParam } = useParams<{ code?: string }>();
  const sb = useSupabase();
  const navigate = useNavigate();
  const ensureSession = useEnsureSession();
  const [code, setCode] = useState((codeParam ?? '').toUpperCase());
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    const err = await ensureSession();
    if (err || !sb) {
      setError(err ?? 'Online play is not available right now.');
      setBusy(false);
      return;
    }
    const res = await joinRoom(sb, code, nickname);
    setBusy(false);
    if ('error' in res) setError(res.error);
    else navigate(`/class/play/${res.roomId}`);
  };

  const ready = code.trim().length === 6 && nickname.trim().length >= 2;

  return (
    <Shell>
      <Link to="/play" className="text-sm font-bold text-green-700 dark:text-lime-400">
        ← Back
      </Link>
      <div className="mt-4 text-center">
        <Mascot mood="happy" size={72} className="mx-auto" />
        <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
          Join a class race
        </h1>
      </div>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) void join();
        }}
      >
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Room code</span>
          <input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 6)
              )
            }
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABC123"
            className="mt-1 block w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-center font-mono text-3xl font-black tracking-[0.3em] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Nickname</span>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 16))}
            autoComplete="off"
            placeholder="e.g. Maya"
            className="mt-1 block w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <span className="mt-1 block text-xs text-slate-500">
            Use a nickname, not your full name. Letters and numbers only.
          </span>
        </label>
        <button
          type="submit"
          disabled={!ready || busy}
          className="min-h-[52px] w-full rounded-2xl bg-green-700 text-base font-black text-white hover:bg-green-800 disabled:opacity-50"
        >
          {busy ? 'Joining…' : 'Join'}
        </button>
        {error && (
          <p className="text-sm text-red-700 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </form>
    </Shell>
  );
};

// ─── Student: play ──────────────────────────────────────────────────────────

export const ClassPlayPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const sb = useSupabase();
  const auth = useAuthOptional();
  const navigate = useNavigate();
  const offset = useServerOffset();
  const { room, players, refresh } = useClassRoom(sb, roomId);
  const me = players.find((p) => p.user_id === auth?.user?.id);
  const secsLeft = useSecondsLeft(room?.state === 'live' ? room.ends_at : null, offset);
  const timeUp = room?.state === 'finished' || (room?.state === 'live' && secsLeft === 0);

  const gameStatus = useGameStore((s) => s.gameStatus);
  const solvedPathRef = useRef<{ tileIds: number[]; operators: string[] } | null>(null);
  const submittingRef = useRef(false);
  const [index, setIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start from where the server says we are (e.g. after a refresh).
  useEffect(() => {
    if (me && index === null) setIndex(me.solved);
  }, [me, index]);

  // Board solved → send it to the server, then move to the next board.
  useEffect(() => {
    if (!sb || !room || index === null || room.state !== 'live' || timeUp) return;
    if (gameStatus !== 'paused' || submittingRef.current) return;
    const path = solvedPathRef.current;
    if (!path) return;
    submittingRef.current = true;
    const { grid, currentTarget, gapOperators } = useGameStore.getState();
    void submitClassAnswer(sb, {
      roomId: room.id,
      index,
      grid: [...grid].sort((a, b) => a.id - b.id).map((t) => t.value),
      target: currentTarget,
      gaps: gapOperators,
      tileIds: path.tileIds,
      operators: path.operators,
    }).then((res) => {
      submittingRef.current = false;
      solvedPathRef.current = null;
      if ('error' in res) {
        setError(res.error);
        void refresh();
      } else {
        setError(null);
        setIndex(res.solved);
        void refresh();
      }
    });
  }, [sb, room, index, gameStatus, timeUp, refresh]);

  if (room === undefined) return <Shell>Loading…</Shell>;
  if (room === null || !me)
    return (
      <Shell>
        <p className="text-slate-700 dark:text-slate-200">You&apos;re not in this race.</p>
        <Link to="/join" className="mt-2 inline-block font-bold text-green-700 underline">
          Join with a code
        </Link>
      </Shell>
    );

  const ranked = rankPlayers(players);
  const myRank = ranked.findIndex((p) => p.user_id === me.user_id) + 1;

  if (timeUp) {
    return (
      <Shell>
        <div className="text-center">
          <Mascot mood={myRank <= 3 ? 'cheer' : 'happy'} size={96} className="mx-auto" />
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            Time&apos;s up!
          </h1>
          <p className="mt-3 text-5xl font-black text-green-700 dark:text-green-300">#{myRank}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            of {players.length} · {me.solved} solved · {me.score} points
          </p>
          <button
            type="button"
            onClick={() => navigate('/learn')}
            className="mt-6 min-h-[48px] rounded-2xl bg-green-700 px-6 font-black text-white hover:bg-green-800"
          >
            Keep practising
          </button>
        </div>
      </Shell>
    );
  }

  if (room.state === 'lobby' || index === null) {
    return (
      <Shell>
        <div className="mt-8 text-center">
          <Mascot mood="idle" size={96} className="mx-auto" />
          <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
            You&apos;re in, {me.nickname}!
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Waiting for your teacher to start… ({players.length} players)
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <div className="h-full">
      {error && (
        <p
          className="bg-amber-50 px-4 py-1 text-center text-xs font-semibold text-amber-900"
          role="status"
        >
          {error}
        </p>
      )}
      <ButtonGameBoard
        difficulty={room.difficulty}
        gameMode="multiplayer"
        multiplayerSeed={boardSeed(room, index)}
        multiplayerRoundKey={`class-${room.id}-${index}`}
        labelOverride={`Class race · #${myRank} of ${players.length} · ${me.score} pts`}
        timerOverride={
          <span className="rounded-2xl bg-slate-900 px-3 py-1 font-mono text-lg font-black text-white">
            {clock(secsLeft ?? 0)}
          </span>
        }
        onBack={() => navigate('/play')}
        onAttempt={(a) => {
          if (a.correct) solvedPathRef.current = a;
        }}
      />
    </div>
  );
};
