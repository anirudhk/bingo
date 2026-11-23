import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { LevelConfig } from '../../types/game';
import type { Stars } from '../../store/progressStore';
import { UNIT_TONE_CLASSES, type UnitTone } from '../../constants/unitTones';

interface LevelNodeProps {
  level: LevelConfig;
  /** 1-based position within its unit, shown inside the node. */
  indexInUnit: number;
  unlocked: boolean;
  completed: boolean;
  stars: Stars;
  isCurrent: boolean;
  tone: UnitTone;
  /** Last row in the unit — no rail segment below it. */
  isLast: boolean;
}

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
    <path
      d="M5 10.5l3.2 3.2L15 7"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
    <rect x="4.5" y="9" width="11" height="8" rx="2" fill="currentColor" />
    <path d="M7 9V7a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden>
    <path d="M6 4.5v11l9-5.5-9-5.5z" fill="currentColor" />
  </svg>
);

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    viewBox="0 0 20 20"
    className={`h-3.5 w-3.5 ${filled ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
    aria-hidden
  >
    <path
      d="M10 2.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L10 14.3l-4.6 2.4.9-5.1L2.5 8l5.2-.8L10 2.5z"
      fill="currentColor"
    />
  </svg>
);

/**
 * One row on the Learn timeline: a small status node on the rail, then the
 * level's title/description. The whole row is the tap target.
 */
export const LevelNode: React.FC<LevelNodeProps> = ({
  level,
  indexInUnit,
  unlocked,
  completed,
  stars,
  isCurrent,
  tone,
  isLast,
}) => {
  const navigate = useNavigate();
  const t = UNIT_TONE_CLASSES[tone];

  const nodeClass = !unlocked
    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
    : completed
      ? `${t.solid} text-white shadow-sm`
      : isCurrent
        ? `bg-white ${t.text} ring-2 ${t.ring} dark:bg-slate-900`
        : `bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700`;

  const rowClass = isCurrent
    ? `${t.soft} ring-1 ${t.softRing}`
    : unlocked
      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      : 'cursor-not-allowed';

  const aria = !unlocked
    ? `Level ${indexInUnit}: ${level.title}, locked`
    : completed
      ? `Level ${indexInUnit}: ${level.title}, completed, ${stars} of 3 stars`
      : `Level ${indexInUnit}: ${level.title}, ready to play`;

  return (
    <li className="relative">
      {!isLast && (
        <span
          className={`absolute left-[27px] top-[46px] -bottom-2 w-0.5 rounded-full ${
            completed ? t.rail : 'bg-slate-200 dark:bg-slate-700'
          }`}
          aria-hidden
        />
      )}
      <motion.button
        type="button"
        onClick={() => unlocked && navigate(`/game?level=${level.id}`)}
        disabled={!unlocked}
        whileTap={unlocked ? { scale: 0.98 } : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${rowClass}`}
        aria-label={aria}
        data-level-id={level.id}
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          {isCurrent && (
            <span
              className={`absolute inset-0 animate-ping rounded-full opacity-20 motion-reduce:hidden ${t.solid}`}
              aria-hidden
            />
          )}
          <span
            className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${nodeClass}`}
          >
            {!unlocked ? <LockIcon /> : completed ? <CheckIcon /> : indexInUnit}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[15px] font-semibold leading-snug ${
              unlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {level.title}
          </span>
          {level.shortDesc && (
            <span
              className={`block truncate text-xs ${
                unlocked
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-slate-400/80 dark:text-slate-600'
              }`}
            >
              {level.shortDesc}
            </span>
          )}
        </span>

        {completed && (
          <span className="flex shrink-0 gap-0.5" aria-hidden>
            <StarIcon filled={stars >= 1} />
            <StarIcon filled={stars >= 2} />
            <StarIcon filled={stars >= 3} />
          </span>
        )}
        {isCurrent && !completed && (
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm ${t.solid}`}
            aria-hidden
          >
            <PlayIcon />
            Start
          </span>
        )}
      </motion.button>
    </li>
  );
};
