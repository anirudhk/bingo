import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { GameMode, GameModeConfig } from '../../types/game';

interface GameModeSelectorProps {
  onSelect: (mode: GameMode) => void;
  selectedMode?: GameMode;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({ onSelect, selectedMode }) => {
  const navigate = useNavigate();

  const handleModeSelect = (mode: GameMode) => {
    onSelect(mode);
    // Quick Game uses a preset difficulty in App.tsx and skips the picker.
    setTimeout(() => {
      if (mode === 'quickGame') {
        navigate('/game');
      } else if (mode === 'multiplayer') {
        navigate('/play/multiplayer');
      } else {
        navigate('/play/difficulty');
      }
    }, 100);
  };

  const gameModes: GameModeConfig[] = [
    {
      id: 'quickGame',
      title: 'Quick Game',
      description: 'Jump straight in — small grid, two numbers, one operator',
      icon: '⚡',
      color: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-200',
      available: true,
    },
    {
      id: 'multiplayer',
      title: 'Multiplayer',
      description: 'Head-to-head rounds with a friend or quick match',
      icon: '👥',
      color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
      available: true,
    },
    {
      id: 'timeAttack',
      title: 'Time Attack',
      description: 'Solve as many as possible in 60 seconds',
      icon: '🔥',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
      available: true,
    },
    {
      id: 'classic',
      title: 'Classic',
      description: 'Complete 5 rounds at your own pace',
      icon: '🎯',
      color: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200',
      available: true,
    },
    {
      id: 'endless',
      title: 'Endless',
      description: 'Continuous play until you fail',
      icon: '♾️',
      color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200',
      available: false,
    },
    {
      id: 'puzzle',
      title: 'Puzzle',
      description: 'Hand-crafted challenging scenarios',
      icon: '🧩',
      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
      available: false,
    },
  ];

  return (
    <div className="mx-auto h-full max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
      <motion.section
        className="relative mb-5 overflow-hidden rounded-2xl bg-green-700 p-4 text-white shadow-xl shadow-lime-200/70 dark:shadow-lime-950/30"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-white/75">
              Play zone
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Choose a challenge</h1>
            <p className="mt-1 max-w-xl text-sm font-bold text-white/85">
              Pick a short game, race the clock, or practice at your own pace.
            </p>
          </div>
          <div className="rounded-full bg-white/20 px-4 py-2 text-xs font-black text-white backdrop-blur">
            Make the target number
          </div>
        </div>
      </motion.section>

      <section aria-label="Game modes" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {gameModes.map((mode, index) => (
          <motion.button
            key={mode.id}
            className={`min-h-44 w-full rounded-[1.5rem] border p-4 text-left shadow-lg transition-all ${
              mode.available
                ? 'border-white/80 bg-white/90 hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/90'
                : 'cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-70 dark:border-slate-800 dark:bg-slate-900/60'
            } ${selectedMode === mode.id ? 'ring-4 ring-lime-300/60' : ''}`}
            onClick={() => mode.available && handleModeSelect(mode.id)}
            disabled={!mode.available}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            whileTap={mode.available ? { scale: 0.98 } : {}}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${mode.color}`}
                >
                  {mode.icon}
                </div>
                {mode.available && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lg font-black text-lime-700 dark:bg-lime-950 dark:text-lime-200">
                    →
                  </div>
                )}
              </div>
              <div className="mt-5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
                  {mode.title}
                  {!mode.available && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Coming soon
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-300">
                  {mode.description}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      <section
        aria-label="Classroom"
        className="mt-6 flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-center dark:bg-slate-900 dark:ring-slate-800"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-slate-900 dark:text-white">Class race</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            A live race for the whole class — students join with a code, no accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/join')}
            className="min-h-[44px] rounded-xl bg-green-700 px-4 text-sm font-black text-white hover:bg-green-800"
          >
            Join a class
          </button>
          <button
            type="button"
            onClick={() => navigate('/class')}
            className="min-h-[44px] rounded-xl px-4 text-sm font-black text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-800"
          >
            I&apos;m a teacher
          </button>
        </div>
      </section>
    </div>
  );
};
