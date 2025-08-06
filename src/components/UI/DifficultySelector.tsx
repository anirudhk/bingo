import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DifficultyLevel } from '../../types/game';
import { useGameStore } from '../../store/gameStore';

interface DifficultySelectorProps {
  onSelect: (difficulty: DifficultyLevel) => void;
  selectedDifficulty?: DifficultyLevel;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  onSelect,
  selectedDifficulty
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
      color: 'from-green-400 to-green-600',
      icon: '🌟'
    },
    {
      level: 'medium' as DifficultyLevel,
      title: 'Medium',
      subtitle: 'Ages 8-10',
      description: '3 numbers, 2 operators',
      color: 'from-yellow-400 to-orange-500',
      icon: '🚀'
    },
    {
      level: 'hard' as DifficultyLevel,
      title: 'Hard',
      subtitle: 'Ages 11+',
      description: '3 numbers, 2 operators',
      color: 'from-red-400 to-purple-600',
      icon: '🔥'
    }
  ];

  return (
    <div className="max-w-md mx-auto p-6">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Grid Genius
        </h1>
        <p className="text-gray-600">
          Choose your difficulty level to start playing
        </p>
      </motion.div>

      <div className="space-y-4">
        {difficulties.map((difficulty, index) => (
          <motion.button
            key={difficulty.level}
            className={`
              w-full p-6 rounded-xl shadow-lg
              bg-gradient-to-r ${difficulty.color}
              text-white font-semibold
              transform transition-all duration-200
              hover:scale-105 hover:shadow-xl
              ${selectedDifficulty === difficulty.level 
                ? 'ring-4 ring-white ring-opacity-50' 
                : ''
              }
            `}
            onClick={() => handleDifficultySelect(difficulty.level)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.1 
            }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center space-x-4">
              <div className="text-3xl">
                {difficulty.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="text-xl font-bold">
                  {difficulty.title}
                </div>
                <div className="text-sm opacity-90">
                  {difficulty.subtitle}
                </div>
                <div className="text-sm opacity-80 mt-1">
                  {difficulty.description}
                </div>
              </div>
              <div className="text-2xl opacity-70">
                →
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.div
        className="text-center mt-8 text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Click through numbers and operators to reach the target!
      </motion.div>
    </div>
  );
};