import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ButtonGameBoard } from '../GameBoard/ButtonGameBoard';
import { ResultPage } from './ResultPage';
import { useGameStore } from '../../store/gameStore';
import { usePuzzles } from '../../hooks/usePuzzles';
import { pickTodaysDailyPuzzle, utcDateKey } from '../../utils/puzzleStore';
import { useAuthOptional } from '../../auth/authContext';
import { useSupabase } from '../../lib/supabase/client';
import {
  startDailyAttempt,
  submitDailyGuess,
  type DailyAttempt,
  type DailyGuessResult,
} from '../../services/dailyLeaderboardCloud';

/**
 * Top-level route for `/daily`. Loads the puzzle bundle, picks today's
 * puzzle by UTC date, then renders the same board the rest of the app uses.
 * Shows a tiny "loading puzzles…" / "couldn't load puzzles" affordance for
 * the cold-cache and error cases — no router shim, no skeleton state.
 */
export const DailyPuzzlePage: React.FC = () => {
  const navigate = useNavigate();
  const gameStatus = useGameStore((s) => s.gameStatus);
  const { puzzles, loading, error } = usePuzzles();
  const today = useMemo(() => new Date(), []);
  const auth = useAuthOptional();
  const sb = useSupabase();
  const signedIn = Boolean(sb && auth?.user);

  // Signed-in players get today's puzzle from the server, which also starts
  // the official clock. undefined = still asking; null = play offline.
  const [cloudAttempt, setCloudAttempt] = useState<DailyAttempt | null | undefined>(undefined);
  const [cloudResult, setCloudResult] = useState<DailyGuessResult | null>(null);

  useEffect(() => {
    if (auth?.loading) return;
    if (!sb || !auth?.user) {
      setCloudAttempt(null);
      return;
    }
    let cancelled = false;
    void startDailyAttempt(sb).then((a) => {
      if (!cancelled) setCloudAttempt(a);
    });
    return () => {
      cancelled = true;
    };
  }, [sb, auth?.user, auth?.loading]);

  const puzzle = useMemo(() => {
    if (!puzzles.length) return null;
    const fromServer = cloudAttempt && puzzles.find((p) => p.id === cloudAttempt.puzzleId);
    return fromServer ?? pickTodaysDailyPuzzle(puzzles, today);
  }, [puzzles, today, cloudAttempt]);

  const handleAttempt = useCallback(
    (attempt: { tileIds: number[]; operators: string[] }) => {
      if (!sb || !cloudAttempt) return;
      void submitDailyGuess(sb, attempt.tileIds, attempt.operators).then((r) => {
        if (r?.correct) setCloudResult(r);
      });
    },
    [sb, cloudAttempt]
  );

  if (loading || (signedIn && cloudAttempt === undefined)) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-300">
        Loading today's puzzle…
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-2xl shadow-xl p-6 max-w-sm text-center">
          <h2 className="text-base font-bold mb-2">No daily puzzle today</h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
            {error
              ? "Couldn't load the puzzle bundle. Try again in a moment."
              : 'The puzzle pack is empty. Run `npm run puzzles:generate` and rebuild.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            Back home
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === 'completed') {
    return <ResultPage dailyCloudResult={cloudResult} />;
  }

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <ButtonGameBoard
        difficulty={puzzle.difficulty}
        gameMode="dailyPuzzle"
        puzzle={puzzle}
        onAttempt={handleAttempt}
      />
      {/* Hidden meta — useful for screen readers landing on the route. */}
      <div className="sr-only">Daily puzzle for {utcDateKey(today)}.</div>
    </motion.div>
  );
};
