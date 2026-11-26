import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

export const TimeAttackTimer: React.FC = () => {
  const { timeAttackTimeLeft, timeAttackRoundsCompleted } = useGameStore();

  if (timeAttackTimeLeft === undefined) return null;

  const seconds = Math.ceil(timeAttackTimeLeft / 1000);
  const isLowTime = seconds <= 10;

  return (
    <motion.div
      className={`text-center ${isLowTime ? 'animate-pulse' : ''}`}
      animate={{ scale: isLowTime ? [1, 1.1, 1] : 1 }}
      transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
    >
      <div
        className={`text-lg font-black leading-none tabular-nums ${isLowTime ? 'text-red-600' : 'text-blue-700 dark:text-blue-300'}`}
      >
        {seconds}s
      </div>
      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
        {timeAttackRoundsCompleted || 0} solved
      </div>
    </motion.div>
  );
};
