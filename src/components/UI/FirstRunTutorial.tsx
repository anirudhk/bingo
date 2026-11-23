import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefsStore } from '../../store/prefsStore';

const STEPS = [
  {
    title: 'How you move',
    body: 'Pick numbers in one straight row or column — no diagonals or zig-zags. Tap a tile, then tap an operator between tiles, then the next number.',
    emoji: '📏',
  },
  {
    title: 'How math works here',
    body: 'We evaluate left to right in the order you tap. Longer paths are grouped like ((a + b) × c), not like school BODMAS — what you see is what we calculate.',
    emoji: '🔢',
  },
  {
    title: 'You’re set',
    body: 'Wrong answers show how far off you are. Use ? anytime for keyboard shortcuts. Have fun!',
    emoji: '✨',
  },
] as const;

export const FirstRunTutorial: React.FC = () => {
  const onboardingDone = usePrefsStore((s) => s.onboardingDone);
  const markOnboardingDone = usePrefsStore((s) => s.markOnboardingDone);
  const [step, setStep] = useState(0);

  if (onboardingDone) return null;

  const finish = () => {
    markOnboardingDone();
  };

  const atLast = step >= STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/80 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4 text-center text-5xl" aria-hidden>
              {STEPS[step].emoji}
            </div>
            <h2
              id="tutorial-title"
              className="text-center text-xl font-black text-slate-900 dark:text-white"
            >
              {STEPS[step].title}
            </h2>
            <p className="mt-3 text-center text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              {STEPS[step].body}
            </p>
            <div className="mt-4 flex justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ${i === step ? 'bg-[#58cc02]' : 'bg-slate-200 dark:bg-slate-600'}`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse sm:justify-between">
          <button
            type="button"
            onClick={() => {
              if (atLast) finish();
              else setStep((s) => s + 1);
            }}
            className="w-full rounded-2xl bg-[#58cc02] px-4 py-3 text-sm font-black text-white shadow-lg shadow-lime-200/60 sm:w-auto sm:min-w-[8rem] dark:shadow-none"
          >
            {atLast ? 'Let’s play' : 'Next'}
          </button>
          <button
            type="button"
            onClick={finish}
            className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
          >
            Skip
          </button>
        </div>
      </motion.div>
    </div>
  );
};
