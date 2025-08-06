import React from 'react';
import { motion } from 'framer-motion';
import { Tile } from '../../types/game';

interface NumberTileProps {
  tile: Tile;
  isSelected: boolean;
  isInPath: boolean;
  pathIndex?: number;
  size?: 'small' | 'medium' | 'large';
}

export const NumberTile: React.FC<NumberTileProps> = ({
  tile,
  isSelected,
  isInPath,
  pathIndex,
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'w-12 h-12 text-sm sm:w-14 sm:h-14 sm:text-base',
    medium: 'w-14 h-14 text-base sm:w-16 sm:h-16 sm:text-lg',
    large: 'w-16 h-16 text-lg sm:w-18 sm:h-18 sm:text-xl'
  };

  const baseClasses = `
    ${sizeClasses[size]}
    flex items-center justify-center
    rounded-lg border-2 font-bold shadow-md
    select-none touch-manipulation
    transition-all duration-200
    cursor-pointer
    hover:shadow-lg
    aspect-square
  `;

  const getStateClasses = () => {
    if (isInPath) {
      return 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 shadow-xl scale-105 ring-2 ring-blue-300';
    }
    if (isSelected) {
      return 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600 shadow-lg ring-2 ring-green-300';
    }
    return 'bg-gradient-to-br from-white to-gray-50 text-gray-800 border-gray-300 hover:border-blue-400 hover:shadow-lg hover:scale-105';
  };

  return (
    <motion.div
      data-tile-id={tile.id}
      className={`${baseClasses} ${getStateClasses()}`}
      initial={{ scale: 1 }}
      animate={{
        scale: isInPath ? 1.05 : isSelected ? 1.02 : 1,
        zIndex: isInPath ? 10 : isSelected ? 5 : 1
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      whileTap={{ scale: 0.95 }}
    >
      {tile.value}
      {isInPath && typeof pathIndex === 'number' && (
        <motion.div
          className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 text-xs font-bold rounded-full flex items-center justify-center text-black"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {pathIndex + 1}
        </motion.div>
      )}
    </motion.div>
  );
};