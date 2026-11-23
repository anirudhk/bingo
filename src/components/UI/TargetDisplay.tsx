import React from 'react';
import { motion } from 'framer-motion';
import { rhythmInstruction } from '../../utils/rhythmInstruction';

interface TargetDisplayProps {
  currentTarget: number;
  round: number;
  totalRounds: number;
  /** Numbers in the path (e.g. 2 or 3). Drives the hint line under the target. */
  pathTiles?: number;
  /** Operators between numbers (e.g. 1 or 2). */
  pathOperators?: number;
  /** The current round has been answered correctly (counts toward progress). */
  roundSolved?: boolean;
  /** Signs on this board; the left-to-right rule only shows when × is one. */
  operators?: readonly string[];
  /** Tighter card for large grids (4×4 / 5×5) so the board fits. */
  compact?: boolean;
}

export const TargetDisplay: React.FC<TargetDisplayProps> = ({
  currentTarget,
  round,
  totalRounds,
  pathTiles = 2,
  operators = [],
  roundSolved = false,
  compact = false,
}) => {
  // Progress counts questions answered correctly — it only moves on a solve.
  const solvedCount = Math.max(0, round - 1) + (roundSolved ? 1 : 0);
  const progressPercentage = totalRounds > 0 ? (solvedCount / totalRounds) * 100 : 0;
  const hint = rhythmInstruction(pathTiles, operators);

  return (
    <div className={`flex flex-col items-center ${compact ? 'mb-1 sm:mb-2' : 'mb-2 sm:mb-3'}`}>
      <div
        className={`w-full max-w-sm rounded-[1.75rem] border border-white/70 bg-white/95 text-center shadow-xl shadow-slate-200/70 dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/20 ${
          compact ? 'p-2' : 'p-2.5'
        }`}
      >
        <div
          className={`font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          Make this number
        </div>
        <motion.div
          key={currentTarget}
          role="status"
          aria-live="polite"
          aria-label={`Target number ${currentTarget}${totalRounds > 1 ? `, round ${round} of ${totalRounds}` : ''}`}
          className={`mx-auto inline-flex min-w-28 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg ${
            compact ? 'mt-1 px-5 py-2' : 'mt-1.5 px-7 py-2.5'
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          <div className={`font-black ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
            {currentTarget}
          </div>
        </motion.div>
        <p
          className={`mt-1 px-0.5 font-semibold leading-tight text-slate-500 dark:text-slate-400 ${
            compact ? 'text-[9px]' : 'text-[10px]'
          }`}
        >
          {hint}
        </p>

        {/* Time Attack has no fixed number of rounds, so no bar there. */}
        {totalRounds > 1 && totalRounds < 100 && (
          <div className={compact ? 'mt-1.5' : 'mt-2'}>
            <div className="mb-1 flex justify-between text-[11px] font-black text-slate-500 dark:text-slate-400">
              <span>Question {round}</span>
              <span>
                {solvedCount} of {totalRounds} solved
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 shadow-inner dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
