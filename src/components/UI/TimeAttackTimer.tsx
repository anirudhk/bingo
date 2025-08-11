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
      <div className={`text-2xl font-bold ${isLowTime ? 'text-red-500' : 'text-blue-600'}`}>
        {seconds}s
      </div>
      <div className="text-sm text-gray-600">
        Rounds: {timeAttackRoundsCompleted || 0}
      </div>
    </motion.div>
  );
};
