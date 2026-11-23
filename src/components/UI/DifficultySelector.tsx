import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { DifficultyLevel, GameMode } from '../../types/game';
import { useGameStore } from '../../store/gameStore';

interface DifficultySelectorProps {
  onSelect: (difficulty: DifficultyLevel) => void;
  selectedDifficulty?: DifficultyLevel;
  gameMode: GameMode;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  onSelect,
  selectedDifficulty,
  gameMode,
}) => {
  const navigate = useNavigate();
  const { setDifficulty } = useGameStore();

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setDifficulty(difficulty);
    onSelect(difficulty);
    // Navigate to game after a short delay to allow state to update
    setTimeout(() => {
      navigate('/game');
    }, 100);
  };
  const difficulties = [
    {
      level: 'easy' as DifficultyLevel,
      title: 'Easy',
      subtitle: 'Ages 5-7',
      description: '2 numbers, 1 operator',
      color: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-200',
      icon: '🌟',
    },
    {
      level: 'medium' as DifficultyLevel,
      title: 'Medium',
      subtitle: 'Ages 8-10',
      description: '3 numbers, 2 operators',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
      icon: '🚀',
    },
    {
      level: 'hard' as DifficultyLevel,
      title: 'Hard',
      subtitle: 'Ages 11+',
      description: '3 numbers, 2 operators · one hidden path',
      color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
      icon: '🔥',
    },
  ];

  return (
    <div className="mx-auto h-full max-w-5xl px-4 py-6 lg:px-8 lg:py-10">
      <motion.section
        className="relative mb-5 overflow-hidden rounded-2xl bg-[#58cc02] p-4 text-white shadow-xl shadow-lime-200/70 dark:shadow-lime-950/30"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15"
          aria-hidden
        />
        <div className="relative">
          <button
            onClick={() => navigate('/play')}
            className="mb-3 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/90 transition-colors hover:bg-white/30"
          >
            ← Modes
          </button>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/75">
            Difficulty
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            {gameMode === 'timeAttack'
              ? 'Time Attack'
              : gameMode === 'classic'
                ? 'Classic Mode'
                : gameMode === 'endless'
                  ? 'Endless Mode'
                  : gameMode === 'puzzle'
                    ? 'Puzzle Mode'
                    : 'Choose Difficulty'}
          </h1>
          <p className="mt-1 max-w-xl text-sm font-bold text-white/85">
            Choose the grid size and path length that feels right.
          </p>
        </div>
      </motion.section>

      <section aria-label="Difficulty levels" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {difficulties.map((difficulty, index) => (
          <motion.button
            key={difficulty.level}
            className={`min-h-44 w-full rounded-[1.5rem] border border-white/80 bg-white/90 p-4 text-left shadow-lg transition-all hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/90 ${
              selectedDifficulty === difficulty.level ? 'ring-4 ring-lime-300/60' : ''
            }`}
            onClick={() => handleDifficultySelect(difficulty.level)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${difficulty.color}`}
                >
                  {difficulty.icon}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lg font-black text-lime-700 dark:bg-lime-950 dark:text-lime-200">
                  →
                </div>
              </div>
              <div className="mt-5 min-w-0 flex-1">
                <div className="text-lg font-black text-slate-900 dark:text-white">
                  {difficulty.title}
                </div>
                <div className="mt-0.5 text-sm font-black text-slate-400 dark:text-slate-500">
                  {difficulty.subtitle}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  {difficulty.description}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </section>
    </div>
  );
};
