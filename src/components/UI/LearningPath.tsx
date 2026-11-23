import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LEVELS, UNITS, getLevelsForUnit } from '../../constants/levels';
import { getLevelProgress, isLevelUnlocked, useProgressStore } from '../../store/progressStore';
import { LevelNode } from './LevelNode';
import { UnitHeader, type UnitTone } from './UnitHeader';
import { DailyPuzzleBanner } from './DailyPuzzleBanner';

const UNIT_TONES: UnitTone[] = ['emerald', 'sky', 'violet', 'amber', 'rose'];

const getCurrentLevel = (levels: ReturnType<typeof useProgressStore.getState>['levels']) =>
  LEVELS.find(
    (level) => isLevelUnlocked(level.id, levels) && !getLevelProgress(level.id, levels).completed
  ) ?? LEVELS[LEVELS.length - 1];

/** Small circular progress indicator for the hero card. */
const ProgressRing: React.FC<{ value: number; total: number }> = ({ value, total }) => {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? value / total : 0;
  return (
    <div className="relative h-14 w-14 shrink-0" aria-hidden>
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
        {value}/{total}
      </span>
    </div>
  );
};

const PlayIcon = () => (
  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
    <path d="M6 4.5v11l9-5.5-9-5.5z" fill="currentColor" />
  </svg>
);

/**
 * The Learn-tab home: a hero card for the next step, then each unit as a
 * compact vertical timeline of levels. Locked levels stay visible so the
 * player can see what's coming.
 */
export const LearningPath: React.FC = () => {
  const navigate = useNavigate();
  const levels = useProgressStore((s) => s.levels);
  const currentLevel = getCurrentLevel(levels);
  const currentUnitIdx = Math.max(
    0,
    UNITS.findIndex((unit) => unit.id === currentLevel.unitId)
  );
  const currentUnit = UNITS[currentUnitIdx];
  const currentUnitLevels = getLevelsForUnit(currentUnit.id);
  const currentUnitCompleted = currentUnitLevels.filter(
    (l) => getLevelProgress(l.id, levels).completed
  ).length;
  const allComplete = LEVELS.every((l) => getLevelProgress(l.id, levels).completed);
  const totalCompleted = LEVELS.filter((l) => getLevelProgress(l.id, levels).completed).length;
  const goNext = () => navigate(allComplete ? '/play' : `/game?level=${currentLevel.id}`);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8 lg:px-8">
      <div className="mx-auto w-full max-w-xl space-y-5">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 to-green-700 p-5 text-white shadow-lg shadow-emerald-700/20 dark:from-emerald-800 dark:to-green-800 dark:shadow-none"
        >
          <div
            className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10"
            aria-hidden
          />
          <div className="relative flex items-center gap-4">
            <ProgressRing value={currentUnitCompleted} total={currentUnitLevels.length} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium uppercase tracking-wider text-white/75">
                Unit {currentUnitIdx + 1} of {UNITS.length}
              </div>
              <h1 className="truncate text-xl font-bold tracking-tight">
                {allComplete ? 'Path complete!' : currentUnit.title}
              </h1>
              <p className="truncate text-sm text-white/85">
                {allComplete
                  ? 'You cleared every level. Free play is waiting in the Play tab.'
                  : `${currentLevel.title} · ${currentUnitCompleted} of ${currentUnitLevels.length} complete`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:absolute sm:right-5 sm:top-1/2 sm:mt-0 sm:w-auto sm:-translate-y-1/2"
          >
            <PlayIcon />
            {allComplete ? 'Play' : 'Start'}
          </button>
        </motion.section>

        <div className="lg:hidden">
          <DailyPuzzleBanner />
        </div>

        {UNITS.map((unit, unitIdx) => {
          const unitLevels = getLevelsForUnit(unit.id);
          const tone = UNIT_TONES[unitIdx] ?? 'emerald';
          const completedCount = unitLevels.filter(
            (l) => getLevelProgress(l.id, levels).completed
          ).length;

          return (
            <section
              key={unit.id}
              aria-label={`Unit: ${unit.title}`}
              className="rounded-3xl bg-white p-3 pt-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800"
            >
              <UnitHeader
                unit={unit}
                unitNumber={unitIdx + 1}
                completedCount={completedCount}
                totalCount={unitLevels.length}
                tone={tone}
              />
              <ol className="mt-3">
                {unitLevels.map((level, idx) => {
                  const progress = getLevelProgress(level.id, levels);
                  return (
                    <LevelNode
                      key={level.id}
                      level={level}
                      indexInUnit={idx + 1}
                      unlocked={isLevelUnlocked(level.id, levels)}
                      completed={progress.completed}
                      stars={progress.bestStars}
                      isCurrent={currentLevel.id === level.id && !progress.completed}
                      tone={tone}
                      isLast={idx === unitLevels.length - 1}
                    />
                  );
                })}
              </ol>
            </section>
          );
        })}

        {allComplete && (
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            All levels cleared — try Play mode for free play.
          </div>
        )}
      </div>

      <aside className="hidden space-y-4 lg:block">
        <DailyPuzzleBanner />
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Your path</div>
          <div className="mt-3 flex items-baseline justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Levels cleared</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {totalCompleted}/{LEVELS.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(totalCompleted / LEVELS.length) * 100}%` }}
              aria-hidden
            />
          </div>
          <button
            type="button"
            onClick={goNext}
            className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
          >
            {allComplete ? 'Go to Play' : 'Continue'}
          </button>
        </section>
      </aside>
    </div>
  );
};
