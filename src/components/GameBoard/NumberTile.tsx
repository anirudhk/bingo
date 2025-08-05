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
    small: 'w-12 h-12 text-lg',
    medium: 'w-16 h-16 text-xl',
    large: 'w-20 h-20 text-2xl'
  };

  const baseClasses = `
    ${sizeClasses[size]}
    flex items-center justify-center
    rounded-lg border-2 font-bold
    select-none touch-manipulation
    transition-all duration-200
    cursor-pointer
  `;

  const getStateClasses = () => {
    if (isInPath) {
      return 'bg-blue-500 text-white border-blue-600 shadow-lg scale-105';
    }
    if (isSelected) {
      return 'bg-green-500 text-white border-green-600 shadow-md';
    }
    return 'bg-white text-gray-800 border-gray-300 hover:border-gray-400 hover:shadow-sm';
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