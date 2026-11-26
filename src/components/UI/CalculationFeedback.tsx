import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { describeMiss } from '../../utils/describeMiss';
import { Mascot } from './Mascot';

/** Praise grows with the combo: plain at first, fire from 3 in a row. */
const correctTitle = (combo: number): string =>
  combo >= 3 ? `🔥 ${combo} in a row!` : combo === 2 ? 'Nice — 2 in a row!' : 'Correct!';

interface CalculationFeedbackProps {
  calculation: string;
  result: number | null;
  target: number;
  isCorrect: boolean;
  isVisible: boolean;
  /** The first step went below zero — explain that this is allowed. */
  negativeStep?: boolean;
  /**
   * Correct answer: shows a Continue button that moves to the next round.
   * Omit it (Time Attack, multiplayer) and the bar just shows the result.
   */
  onContinue?: () => void;
  /** Wrong answer: "Try again" closes the bar and clears the path. */
  onTryAgain?: () => void;
  /** Correct answers in a row (including this one) — drives praise + Gridy's mood. */
  combo?: number;
}

/**
 * Duolingo-style feedback: a full-width bar fixed to the bottom of the
 * screen. It stays until the player acts (Continue / Try again), so the
 * result can't be missed. Full width also means the slide-in animation can
 * never knock it off-centre.
 */
export const CalculationFeedback: React.FC<CalculationFeedbackProps> = ({
  calculation,
  result,
  target,
  isCorrect,
  isVisible,
  negativeStep = false,
  onContinue,
  onTryAgain,
  combo = 0,
}) => {
  const actionRef = useRef<HTMLButtonElement>(null);
  const hasAction = isCorrect ? Boolean(onContinue) : Boolean(onTryAgain);

  // Put keyboard focus on the action so Enter / Space continues.
  useEffect(() => {
    if (isVisible && hasAction) actionRef.current?.focus();
  }, [isVisible, hasAction, isCorrect]);

  const tone = isCorrect
    ? {
        bar: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
        title: 'text-emerald-700 dark:text-emerald-300',
        text: 'text-emerald-900 dark:text-emerald-100',
        button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300',
      }
    : {
        bar: 'bg-rose-50 border-rose-200 dark:bg-rose-950 dark:border-rose-800',
        title: 'text-rose-700 dark:text-rose-300',
        text: 'text-rose-900 dark:text-rose-100',
        button: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300',
      };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed inset-x-0 bottom-0 z-50 border-t-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] ${tone.bar}`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        >
          <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Mascot
                mood={isCorrect ? (combo >= 3 ? 'cheer' : 'happy') : 'encourage'}
                size={52}
                className="-my-1 shrink-0"
              />
              <div className="min-w-0">
                <p className={`text-lg font-black ${tone.title}`}>
                  {isCorrect ? correctTitle(combo) : 'Not quite — try again!'}
                </p>
                <p className={`text-base font-semibold tabular-nums ${tone.text}`}>
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                    {calculation}
                  </span>
                  {result !== null && <> = {result}</>}
                </p>
                {!isCorrect && result !== null && (
                  <p className={`text-sm font-medium ${tone.text}`}>
                    {describeMiss(result, target)}
                  </p>
                )}
                {negativeStep && (
                  <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    Going below zero on the way is fine — keep working left to right.
                  </p>
                )}
              </div>
            </div>

            {hasAction && (
              <button
                ref={actionRef}
                type="button"
                onClick={isCorrect ? onContinue : onTryAgain}
                className={`min-h-[48px] w-full shrink-0 rounded-2xl px-6 text-base font-black uppercase tracking-wide text-white shadow-sm focus:outline-none focus-visible:ring-4 sm:w-auto ${tone.button}`}
              >
                {isCorrect ? 'Continue' : 'Try again'}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
