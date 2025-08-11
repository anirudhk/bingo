import React from 'react';
import { motion } from 'framer-motion';
import { GameMode } from '../../types/game';

interface TargetDisplayProps {
  currentTarget: number;
  round: number;
  totalRounds: number;
  gameMode?: GameMode;
}

export const TargetDisplay: React.FC<TargetDisplayProps> = ({
  currentTarget,
  round,
  totalRounds,
  gameMode = 'classic'
}) => {

  const progressPercentage = totalRounds > 0 ? (round / totalRounds) * 100 : 0;

  return (
    <div className="flex flex-col items-center space-y-2 mb-3">
      {/* Progress Bar - Only show for classic mode */}
      {gameMode === 'classic' && (
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Round {round}</span>
            <span>{totalRounds} Total</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Target Number */}
              <div className="text-center">
          <h2 className="text-base font-semibold text-gray-700 mb-1">
            Find the Target Number
          </h2>
        <motion.div
          key={currentTarget} // Key change triggers animation
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl px-4 py-2 shadow-lg"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        >
          <div className="text-xl sm:text-2xl font-bold">
            {currentTarget}
          </div>
        </motion.div>
      </div>


    </div>
  );
};