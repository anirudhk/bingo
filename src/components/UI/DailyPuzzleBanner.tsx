import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useProgressStore } from '../../store/progressStore';
import { dailyDifficultyFor, utcDateKey } from '../../utils/puzzleStore';

/**
 * Compact card that lives at the top of the Learn path. Shows whether
 * today's daily puzzle is solved and links to `/daily`. Intentionally
 * lightweight — no puzzle preview, no metadata fetch — so the home tab
 * stays cheap to render.
 */
export const DailyPuzzleBanner: React.FC = () => {
  const navigate = useNavigate();
  const today = useMemo(() => utcDateKey(), []);
  const todayResult = useProgressStore((s) => s.daily[today]);
  const dailyStreak = useProgressStore((s) => s.dailyStreak.count);
  const solved = Boolean(todayResult);
  const todayDifficulty = useMemo(() => dailyDifficultyFor(new Date()), []);
  const difficultyLabel = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[todayDifficulty];

  return (
    <motion.button
      type="button"
      onClick={() => navigate('/daily')}
      whileTap={{ scale: 0.98 }}
      className={`group relative flex w-full items-center gap-3 rounded-3xl p-4 text-left shadow-sm ring-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
        solved
          ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900'
          : 'bg-white ring-slate-200/70 hover:ring-sky-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-sky-800'
      }`}
      aria-label={solved ? "Today's daily puzzle, already solved" : "Play today's daily puzzle"}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          solved
            ? 'bg-emerald-500 text-white'
            : 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400'
        }`}
        aria-hidden
      >
        {solved ? (
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <path
              d="M5 10.5l3.2 3.2L15 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
            <rect
              x="3"
              y="4"
              width="14"
              height="13"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.7"
            />
            <path
              d="M3 8h14M7 2.5v3M13 2.5v3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Daily puzzle · {today}
        </span>
        <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white">
          {solved ? 'Daily challenge solved' : 'Play today’s puzzle'}
        </span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          {solved && todayResult.wrongAttempts === 0
            ? 'First try. Nice!'
            : solved
              ? 'Come back tomorrow for a new one.'
              : todayDifficulty === 'hard'
                ? `${difficultyLabel} today · one path to find`
                : `${difficultyLabel} today · a quick brain boost`}
        </span>
      </span>
      {dailyStreak > 0 && (
        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          🔥 {dailyStreak}
        </span>
      )}
      {!solved && (
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600"
          aria-hidden
        >
          <path
            d="M8 5l5 5-5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </motion.button>
  );
};
