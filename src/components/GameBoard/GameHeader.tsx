import React from 'react';
import { motion } from 'framer-motion';

interface GameHeaderProps {
  onBack: () => void;
  currentTarget: number;
  /** e.g. "Time Attack · Hard" or "Addition · First sum". */
  subtitle: string;
  /** One plain-language rules line (see utils/rhythmInstruction). */
  rules: string;
  score: number;
  /** Clock for timed modes; omit on Learn levels (lessons aren't a race). */
  timer?: React.ReactNode;
  round: number;
  totalRounds: number;
  /** The current question is answered correctly (counts toward progress). */
  roundSolved: boolean;
  /** Correct answers in a row; a 🔥 counter shows from 2. */
  combo?: number;
}

/**
 * One compact card above the board: Back on the left, the target in the
 * middle, clock + score on the right; mode, rules and progress underneath.
 * Keeps vertical space for the board so it never needs to scroll.
 */
export const GameHeader: React.FC<GameHeaderProps> = ({
  onBack,
  currentTarget,
  subtitle,
  rules,
  score,
  timer,
  round,
  totalRounds,
  roundSolved,
  combo = 0,
}) => {
  // Progress counts questions answered correctly — it only moves on a solve.
  // (Time Attack has no fixed number of questions, so no bar there.)
  const showProgress = totalRounds > 1 && totalRounds < 100;
  const solvedCount = Math.max(0, round - 1) + (roundSolved ? 1 : 0);
  const percent = totalRounds > 0 ? (solvedCount / totalRounds) * 100 : 0;

  return (
    <header className="shrink-0 rounded-3xl border border-white/70 bg-white/95 px-3 pb-2.5 pt-2.5 shadow-lg shadow-slate-200/60 dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/20">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="justify-self-start">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-100 px-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <span aria-hidden>←</span>
            <span className="ml-1 hidden sm:inline">Back</span>
            <span className="sr-only sm:hidden">Back</span>
          </button>
        </div>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Make
          </span>
          <motion.div
            key={currentTarget}
            role="status"
            aria-live="polite"
            aria-label={`Target number ${currentTarget}${totalRounds > 1 && showProgress ? `, question ${round} of ${totalRounds}` : ''}`}
            className="min-w-[4.5rem] rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 px-5 py-1 text-center text-3xl font-black tabular-nums text-white shadow-md"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {currentTarget}
          </motion.div>
        </div>

        <div className="flex flex-col items-end gap-1 justify-self-end text-right">
          {timer}
          {combo >= 2 && (
            <motion.span
              key={combo}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-black text-orange-800 dark:bg-orange-950 dark:text-orange-200"
              aria-label={`${combo} correct in a row`}
            >
              🔥 {combo}
            </motion.span>
          )}
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Score {score}
          </span>
        </div>
      </div>

      <p className="mt-1.5 truncate text-center text-xs font-bold text-slate-700 dark:text-slate-200">
        {subtitle}
      </p>
      <p className="text-center text-[11px] font-medium leading-snug text-slate-500 dark:text-slate-400">
        {rules}
      </p>

      {showProgress && (
        <div className="mt-1.5">
          <div className="mb-0.5 flex justify-between text-[10px] font-black text-slate-500 dark:text-slate-400">
            <span>Question {round}</span>
            <span>
              {solvedCount} of {totalRounds} solved
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-lime-500 to-emerald-500"
              initial={false}
              animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </header>
  );
};
