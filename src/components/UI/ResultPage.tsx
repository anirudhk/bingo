import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { computeStars, useProgressStore } from '../../store/progressStore';
import { LEVELS, UNITS, getLevel, getNextLevelId } from '../../constants/levels';
import type { DailyGuessResult } from '../../services/dailyLeaderboardCloud';
import { feedback } from '../../utils/feedback';
import { buildDailyShareText, shareText, type ShareOutcome } from '../../utils/share';
import { challengeShareText, type Challenge } from '../../utils/challenge';
import { themesUnlockedBetween, type BoardTheme } from '../../constants/boardThemes';
import { usePrefsStore } from '../../store/prefsStore';
import { Mascot } from './Mascot';
import { Buddy } from './Buddy';
import { getBuddy, type BuddyDef } from '../../constants/buddies';

const formatTime = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const StarRow: React.FC<{ stars: 0 | 1 | 2 | 3 }> = ({ stars }) => (
  <div className="my-3 flex justify-center gap-2" aria-label={`${stars} of 3 stars`}>
    {[1, 2, 3].map((i) => (
      <motion.span
        key={i}
        initial={{ scale: 0, rotate: -90, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ delay: 0.2 * i, type: 'spring', stiffness: 240 }}
        className={`text-5xl drop-shadow-sm ${stars >= i ? 'text-yellow-400' : 'text-slate-200'}`}
        aria-hidden
      >
        ★
      </motion.span>
    ))}
  </div>
);

interface ResultPageProps {
  /** Daily only: the server's verdict for signed-in players (official time, streak, rating). */
  dailyCloudResult?: DailyGuessResult | null;
  /** Playing a friend's "beat my time" link: compare against their time. */
  challenge?: Challenge;
  /** Replay the challenge boards from the start. */
  onRematch?: () => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({
  dailyCloudResult,
  challenge,
  onRematch,
}) => {
  const navigate = useNavigate();
  const score = useGameStore((s) => s.score);
  const totalTime = useGameStore((s) => s.totalTime);
  const difficulty = useGameStore((s) => s.difficulty);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const gameMode = useGameStore((s) => s.gameMode);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const currentPuzzleId = useGameStore((s) => s.currentPuzzleId);
  const wrongAttempts = useGameStore((s) => s.wrongAttempts);
  const hintsUsed = useGameStore((s) => s.hintsUsed);
  const timeAttackRoundsCompleted = useGameStore((s) => s.timeAttackRoundsCompleted);
  const resetGame = useGameStore((s) => s.resetGame);
  const gameSeed = useGameStore((s) => s.gameSeed);
  const [challengeShare, setChallengeShare] = useState<ShareOutcome | null>(null);
  const completeLevel = useProgressStore((s) => s.completeLevel);
  const completeDailyPuzzle = useProgressStore((s) => s.completeDailyPuzzle);
  const recordPlayModeBests = useProgressStore((s) => s.recordPlayModeBests);
  const playBests = useProgressStore((s) => s.playBests);
  const dailyStreakCount = useProgressStore((s) => s.dailyStreak.count);

  const [xpGained, setXpGained] = useState<number | null>(null);
  const [unlockedThemes, setUnlockedThemes] = useState<BoardTheme[]>([]);
  const [newBuddies, setNewBuddies] = useState<BuddyDef[]>([]);
  const syncBuddies = useProgressStore((s) => s.syncBuddies);
  const [shareState, setShareState] = useState<ShareOutcome | null>(null);

  const isLearning = gameMode === 'learning' && currentLevelId !== null;
  const isDaily = gameMode === 'dailyPuzzle' && currentPuzzleId !== null;
  const stars = isLearning ? computeStars(wrongAttempts, hintsUsed) : 0;
  const level = isLearning && currentLevelId ? getLevel(currentLevelId) : undefined;
  const nextLevelId = isLearning && currentLevelId ? getNextLevelId(currentLevelId) : undefined;
  const unit = level ? UNITS.find((u) => u.id === level.unitId) : undefined;
  const levelIndex = level ? LEVELS.findIndex((l) => l.id === level.id) : -1;

  // Record progress exactly once when the result page mounts. The ref guard
  // prevents double-recording on StrictMode double-invoke.
  const recordedRef = useRef(false);
  const recordedPlayBestsRef = useRef(false);
  useEffect(() => {
    if (recordedRef.current) return;
    if (isLearning && currentLevelId) {
      recordedRef.current = true;
      const xpBefore = useProgressStore.getState().xp;
      completeLevel(currentLevelId, stars, score);
      const xpAfter = useProgressStore.getState().xp;
      setXpGained(xpAfter - xpBefore);
      setUnlockedThemes(themesUnlockedBetween(xpBefore, xpAfter));
    } else if (isDaily && currentPuzzleId) {
      recordedRef.current = true;
      completeDailyPuzzle(currentPuzzleId, wrongAttempts, Math.round(totalTime / 1000));
    }
  }, [
    isLearning,
    isDaily,
    currentLevelId,
    currentPuzzleId,
    stars,
    score,
    wrongAttempts,
    totalTime,
    completeLevel,
    completeDailyPuzzle,
  ]);

  // Celebrate once on arrival; a reward unlock gets its own sound after the fanfare.
  const playedSoundRef = useRef(false);
  useEffect(() => {
    if (playedSoundRef.current) return;
    playedSoundRef.current = true;
    feedback('complete');
  }, []);
  useEffect(() => {
    if (unlockedThemes.length === 0 && newBuddies.length === 0) return;
    const t = setTimeout(() => feedback('unlock'), 1100);
    return () => clearTimeout(t);
  }, [unlockedThemes, newBuddies]);

  useEffect(() => {
    if (recordedPlayBestsRef.current) return;
    if (gameMode !== 'quickGame' && gameMode !== 'classic' && gameMode !== 'timeAttack') return;
    recordedPlayBestsRef.current = true;
    recordPlayModeBests({
      gameMode,
      totalTimeMs: totalTime,
      timeAttackRoundsCompleted: timeAttackRoundsCompleted ?? 0,
    });
  }, [gameMode, totalTime, timeAttackRoundsCompleted, recordPlayModeBests]);

  // After this game's progress is saved (effects above run first), unlock
  // any Number Buddies it earned.
  const syncedBuddiesRef = useRef(false);
  useEffect(() => {
    if (syncedBuddiesRef.current) return;
    syncedBuddiesRef.current = true;
    const fresh = syncBuddies()
      .map(getBuddy)
      .filter((b): b is BuddyDef => Boolean(b));
    setNewBuddies(fresh);
  }, [syncBuddies]);

  // ──────────────────────────── Learn-mode result ───────────────────────────
  if (isLearning && level) {
    return (
      <ResultShell>
        <div className="text-center">
          <div className="mx-auto mb-1 flex justify-center">
            <Mascot mood={stars === 3 ? 'cheer' : stars === 2 ? 'happy' : 'encourage'} size={88} />
          </div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-green-700">
            Level complete
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {stars === 3 ? 'Perfect!' : stars === 2 ? 'Great job!' : 'Level complete!'}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
            {unit?.title ?? 'Learn'} · {level.title}
            {levelIndex >= 0 ? ` · Level ${levelIndex + 1} of ${LEVELS.length}` : ''}
          </p>

          <StarRow stars={stars} />
          {stars < 3 && (
            <p className="-mt-1 mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Finish with no wrong answers and no hints for 3 stars.
            </p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mx-auto inline-flex rounded-full bg-emerald-100 px-4 py-2 text-base font-black text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          >
            {xpGained === 0 ? 'Best stars already earned' : `+${xpGained ?? stars * 10} XP`}
          </motion.div>

          {newBuddies.map((buddy) => (
            <BuddyUnlockedBanner key={buddy.id} buddy={buddy} />
          ))}
          {unlockedThemes.map((theme) => (
            <ThemeUnlockedBanner key={theme.id} theme={theme} />
          ))}

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <Stat label="Time" value={formatTime(totalTime)} />
            <Stat label="Wrong taps" value={String(wrongAttempts)} />
            <Stat label="Hints" value={String(hintsUsed)} />
            <Stat label="Score" value={String(score)} />
          </div>

          <div className="mt-6 space-y-2">
            {nextLevelId ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetGame();
                  navigate(`/game?level=${nextLevelId}`);
                }}
                className="w-full rounded-2xl bg-green-700 px-4 py-3 text-base font-black text-white shadow-lg shadow-lime-200"
              >
                Next level →
              </motion.button>
            ) : (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                You finished the path. Try Play mode for free play.
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                resetGame();
                navigate('/learn');
              }}
              className="w-full rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Back to path
            </motion.button>
          </div>
        </div>
      </ResultShell>
    );
  }

  // ──────────────────────────── Daily Puzzle result ─────────────────────────
  if (isDaily) {
    const firstTry = wrongAttempts === 0;
    return (
      <ResultShell>
        <div className="text-center">
          <div className="mx-auto mb-1 flex justify-center">
            <Mascot mood={firstTry ? 'cheer' : 'happy'} size={88} />
          </div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-green-700">
            Daily puzzle
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {firstTry ? 'First try!' : 'Solved!'}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">
            Come back tomorrow for a new one.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <Stat label="Time" value={formatTime(totalTime)} />
            <Stat label="Wrong taps" value={String(wrongAttempts)} />
            <Stat
              label="Streak"
              value={`${dailyStreakCount} day${dailyStreakCount === 1 ? '' : 's'}`}
            />
            <Stat label="Difficulty" value={difficulty} />
          </div>
          {dailyCloudResult?.correct && typeof dailyCloudResult.seconds === 'number' && (
            <p
              className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
              role="status"
            >
              Leaderboard time {formatTime(dailyCloudResult.seconds * 1000)}
              {typeof dailyCloudResult.rating === 'number' &&
                ` · daily rating ${dailyCloudResult.rating}`}
            </p>
          )}
          <div className="mt-6 space-y-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                const text = buildDailyShareText({
                  date: new Date(),
                  difficulty,
                  wrongAttempts,
                  seconds: Math.round(totalTime / 1000),
                  streak: dailyStreakCount,
                });
                const outcome = await shareText(text);
                setShareState(outcome);
                if (outcome !== 'failed') feedback('tap');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-base font-black text-white shadow-lg shadow-sky-200 dark:shadow-none"
              aria-live="polite"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
                <path
                  d="M10 3v9M6.5 6.5L10 3l3.5 3.5M4 11v4a2 2 0 002 2h8a2 2 0 002-2v-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {shareState === 'copied'
                ? 'Copied! Paste it to a friend'
                : shareState === 'shared'
                  ? 'Shared!'
                  : 'Share result'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetGame();
                navigate('/');
              }}
              className="w-full rounded-2xl bg-green-700 px-4 py-3 text-base font-black text-white shadow-lg shadow-lime-200"
            >
              Back home
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                resetGame();
                navigate('/learn');
              }}
              className="w-full rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              Open Learn path
            </motion.button>
          </div>
        </div>
      </ResultShell>
    );
  }

  // ───────────────────────── Play-mode result (unchanged) ───────────────────
  const maxScore =
    totalRounds * 10 * (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2);
  const percentage = (score / maxScore) * 100;
  const message =
    percentage >= 90
      ? "🎉 Outstanding! You're a math genius!"
      : percentage >= 75
        ? "🌟 Excellent work! You've got great skills!"
        : percentage >= 60
          ? '👍 Good job! You’re getting better!'
          : percentage >= 40
            ? '💪 Not bad! Keep practicing!'
            : '📚 Keep learning! You’ll get there!';
  return (
    <ResultShell>
      <div className="text-center">
        <div className="mx-auto mb-1 flex justify-center">
          <Mascot mood={percentage >= 75 ? 'cheer' : 'happy'} size={88} />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Game complete!
        </h1>
        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">{message}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Stat label="Score" value={String(score)} />
          <Stat label="Time" value={formatTime(totalTime)} />
          <Stat label="Difficulty" value={difficulty} />
          <Stat label="Rounds" value={String(totalRounds)} />
        </div>

        {(playBests.quickGameBestTimeMs !== null || playBests.timeAttackBestRounds !== null) && (
          <div className="mt-4 rounded-2xl border border-lime-200 bg-lime-50/90 px-3 py-3 text-left dark:border-lime-900 dark:bg-lime-950/40">
            <div className="text-[10px] font-black uppercase tracking-wide text-lime-700 dark:text-lime-300">
              Personal bests
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              {playBests.quickGameBestTimeMs !== null && (
                <Stat label="Best quick game" value={formatTime(playBests.quickGameBestTimeMs)} />
              )}
              {playBests.timeAttackBestRounds !== null && (
                <Stat label="Best time attack" value={`${playBests.timeAttackBestRounds} rounds`} />
              )}
            </div>
          </div>
        )}

        {challenge && <ChallengeComparison myMs={totalTime} theirMs={challenge.timeMs} />}

        <div className="mt-6 space-y-2">
          {challenge ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onRematch?.()}
              className="w-full rounded-2xl bg-green-700 px-4 py-3 text-base font-black text-white shadow-lg shadow-lime-200"
            >
              Rematch
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetGame();
                navigate('/game');
              }}
              className="w-full rounded-2xl bg-green-700 px-4 py-3 text-base font-black text-white shadow-lg shadow-lime-200"
            >
              Play Again
            </motion.button>
          )}

          {gameSeed && (gameMode === 'classic' || gameMode === 'quickGame') && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                const outcome = await shareText(
                  challengeShareText({
                    v: 1,
                    mode: gameMode,
                    difficulty,
                    seed: gameSeed,
                    timeMs: totalTime,
                  })
                );
                setChallengeShare(outcome);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-700"
              aria-live="polite"
            >
              {challengeShare === 'copied'
                ? 'Link copied! Send it to a friend'
                : challengeShare === 'shared'
                  ? 'Challenge sent!'
                  : challenge
                    ? 'Send it back with your time'
                    : 'Challenge a friend'}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              resetGame();
              navigate('/');
            }}
            className="w-full rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            Back to Menu
          </motion.button>
        </div>
      </div>
    </ResultShell>
  );
};

const ResultShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="h-full overflow-hidden bg-gradient-to-br from-lime-100 via-white to-emerald-100 p-4 safe-pad dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
    <div className="flex h-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, type: 'spring', stiffness: 180, damping: 20 }}
        className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl shadow-lime-200/70 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
      >
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime-100 dark:bg-lime-950/40" />
        <div className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-emerald-100 dark:bg-emerald-950/30" />
        <div className="relative">{children}</div>
      </motion.div>
    </div>
  </div>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-left shadow-inner dark:bg-slate-800">
    <div className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </div>
    <div className="mt-1 text-lg font-black capitalize text-slate-900 dark:text-white">{value}</div>
  </div>
);

/** Shown when finishing a level pushes XP past a board-theme threshold. */
const ThemeUnlockedBanner: React.FC<{ theme: BoardTheme }> = ({ theme }) => {
  const boardTheme = usePrefsStore((s) => s.boardTheme);
  const setBoardTheme = usePrefsStore((s) => s.setBoardTheme);
  const active = boardTheme === theme.id;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 20 }}
      className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-3 text-left ring-1 ring-amber-200 dark:bg-amber-950/40 dark:ring-amber-900"
      role="status"
    >
      <span
        className="h-11 w-11 shrink-0 rounded-xl shadow-sm ring-1 ring-black/5"
        style={{ background: theme.swatch }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          New board theme unlocked
        </span>
        <span className="block text-base font-bold text-slate-900 dark:text-white">
          {theme.name}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setBoardTheme(theme.id)}
        disabled={active}
        className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:bg-emerald-500"
      >
        {active ? 'In use ✓' : 'Use it'}
      </button>
    </motion.div>
  );
};

/** Shown when this game unlocked a Number Buddy. */
const BuddyUnlockedBanner: React.FC<{ buddy: BuddyDef }> = ({ buddy }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 8 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 20 }}
    className="mt-4 flex items-center gap-3 rounded-2xl bg-orange-50 p-3 text-left ring-1 ring-orange-200 dark:bg-orange-950/40 dark:ring-orange-900"
    role="status"
  >
    <Buddy buddy={buddy} size={52} />
    <span className="min-w-0 flex-1">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-orange-800 dark:text-orange-300">
        New buddy unlocked
      </span>
      <span className="block text-base font-bold text-slate-900 dark:text-white">{buddy.name}</span>
    </span>
    <Link
      to="/buddies"
      className="shrink-0 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
    >
      See all
    </Link>
  </motion.div>
);

/** Times with tenths, so the shown numbers always agree with the verdict. */
const preciseClock = (ms: number) => {
  const tenths = Math.round(ms / 100);
  const secs = Math.floor(tenths / 10);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}.${tenths % 10}`;
};

/** "You 0:38.2 · Friend 0:42.0 — you won by 3.8 s!" */
const ChallengeComparison: React.FC<{ myMs: number; theirMs: number }> = ({ myMs, theirMs }) => {
  const diffTenths = Math.round(theirMs / 100) - Math.round(myMs / 100);
  const won = diffTenths > 0;
  const gap = `${(Math.abs(diffTenths) / 10).toFixed(1)} s`;
  return (
    <div
      className={`mt-4 rounded-2xl p-3 ring-1 ${
        won
          ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900'
          : 'bg-sky-50 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900'
      }`}
      role="status"
    >
      <div className="flex justify-around text-center">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">You</div>
          <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
            {preciseClock(myMs)}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Friend
          </div>
          <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
            {preciseClock(theirMs)}
          </div>
        </div>
      </div>
      <p className="mt-2 text-center text-sm font-bold text-slate-800 dark:text-slate-100">
        {won
          ? `🎉 You won by ${gap}!`
          : diffTenths === 0
            ? "It's a tie!"
            : `${gap} slower — have another go!`}
      </p>
    </div>
  );
};
