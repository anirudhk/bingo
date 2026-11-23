import React from 'react';
import { motion } from 'framer-motion';

interface MixedUnitIntroModalProps {
  open: boolean;
  onDismiss: () => void;
}

/**
 * Shown once when the player enters Unit 3 (Mixed +/-) after Subtraction —
 * explains the 4×4 grid and three-number / two-operator chains.
 */
export const MixedUnitIntroModal: React.FC<MixedUnitIntroModalProps> = ({ open, onDismiss }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mixed-unit-intro-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[min(90vh,28rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="text-center text-4xl" aria-hidden>
          📐
        </div>
        <h2
          id="mixed-unit-intro-title"
          className="mt-2 text-center text-xl font-black text-slate-900 dark:text-white"
        >
          Welcome to Mixed +/−
        </h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          You&apos;re leaving pure subtraction behind. On <strong>Bigger board</strong> the grid is{' '}
          <strong>4×4</strong>, and each puzzle uses{' '}
          <strong>three numbers in one straight row or column</strong> with{' '}
          <strong>two operators</strong> between them:
        </p>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-center font-mono text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          tile → operator → tile → operator → tile
        </p>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          Same rules as before: only a straight line (no corners), and we calculate{' '}
          <strong>left to right</strong> with the grouping you see on the target card — not BODMAS.
        </p>
        <button
          type="button"
          autoFocus
          onClick={onDismiss}
          className="mt-5 w-full rounded-2xl bg-[#58cc02] px-4 py-3 text-sm font-black text-white shadow-lg shadow-lime-200/60 dark:shadow-lime-950/40"
        >
          Let&apos;s go
        </button>
      </motion.div>
    </div>
  );
};
