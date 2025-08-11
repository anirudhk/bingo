import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GameMode, GameModeConfig } from '../../types/game';

interface GameModeSelectorProps {
  onSelect: (mode: GameMode) => void;
  selectedMode?: GameMode;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  onSelect,
  selectedMode
}) => {
  const navigate = useNavigate();

  const handleModeSelect = (mode: GameMode) => {
    onSelect(mode);
    // Navigate to difficulty selection after a short delay
    setTimeout(() => {
      navigate('/difficulty');
    }, 100);
  };

  const gameModes: GameModeConfig[] = [
    {
      id: 'timeAttack',
      title: 'Time Attack',
      description: 'Solve as many as possible in 60 seconds',
      icon: '⚡',
      color: 'from-yellow-400 to-orange-500',
      available: true
    },
    {
      id: 'classic',
      title: 'Classic',
      description: 'Complete 5 rounds at your own pace',
      icon: '🎯',
      color: 'from-blue-400 to-blue-600',
      available: true
    },
    {
      id: 'endless',
      title: 'Endless',
      description: 'Continuous play until you fail',
      icon: '♾️',
      color: 'from-purple-400 to-purple-600',
      available: false
    },
    {
      id: 'puzzle',
      title: 'Puzzle',
      description: 'Hand-crafted challenging scenarios',
      icon: '🧩',
      color: 'from-green-400 to-green-600',
      available: false
    }
  ];

  return (
    <div className="max-w-md mx-auto p-4 h-full flex flex-col justify-center">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Grid Genius
        </h1>
        <p className="text-sm text-gray-600">
          Choose your game mode to get started
        </p>
      </motion.div>

      <div className="space-y-3">
        {gameModes.map((mode, index) => (
          <motion.button
            key={mode.id}
            className={`
              w-full p-6 rounded-xl shadow-lg
              bg-gradient-to-r ${mode.color}
              text-white font-semibold
              transform transition-all duration-200
              ${mode.available 
                ? 'hover:scale-105 hover:shadow-xl cursor-pointer' 
                : 'opacity-60 cursor-not-allowed'
              }
              ${selectedMode === mode.id 
                ? 'ring-4 ring-white ring-opacity-50' 
                : ''
              }
            `}
            onClick={() => mode.available && handleModeSelect(mode.id)}
            disabled={!mode.available}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.5, 
              delay: index * 0.1 
            }}
            whileTap={mode.available ? { scale: 0.98 } : {}}
          >
            <div className="flex items-center space-x-4">
              <div className="text-3xl">
                {mode.icon}
              </div>
              <div className="flex-1 text-left">
                <div className="text-xl font-bold flex items-center">
                  {mode.title}
                  {!mode.available && (
                    <span className="ml-2 text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <div className="text-sm opacity-90 mt-1">
                  {mode.description}
                </div>
              </div>
              {mode.available && (
                <div className="text-2xl opacity-70">
                  →
                </div>
              )}
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
