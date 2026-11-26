import React from 'react';
import { motion } from 'framer-motion';
import type { Tile } from '../../types/game';
import { useBoardTheme } from '../../hooks/useBoardTheme';

export type NumberTileSize = 'compact' | 'small' | 'medium' | 'large';

/** Pixel/viewport box for empty grid placeholders — keep in sync with `sizeStyles` below. */
// eslint-disable-next-line react-refresh/only-export-components -- shared sizing helper co-located with tile variants
export const numberTileBoxStyle = (size: NumberTileSize): React.CSSProperties => {
  const sizeStyles: Record<NumberTileSize, React.CSSProperties> = {
    compact: { width: 'min(11vw, 58px)', height: 'min(11vw, 58px)' },
    small: { width: 'min(11vw, 56px)', height: 'min(11vw, 56px)' },
    medium: { width: 'min(13vw, 64px)', height: 'min(13vw, 64px)' },
    large: { width: 'min(16vw, 72px)', height: 'min(16vw, 72px)' },
  };
  return sizeStyles[size];
};

interface NumberTileProps {
  tile: Tile;
  isSelected: boolean;
  isInPath: boolean;
  pathIndex?: number;
  isInHint?: boolean;
  hintPathIndex?: number;
  /** Highlights tiles you can tap next (straight-line rule). */
  isLegalNext?: boolean;
  size?: NumberTileSize;
  /** Exact tile size in px from the board's fit-to-screen layout (overrides `size`). */
  boxPx?: number;
  /** Part of the correct answer: pops green. */
  isSuccess?: boolean;
  /** Part of a wrong answer: shakes red. */
  isError?: boolean;
}

export const NumberTile: React.FC<NumberTileProps> = ({
  tile,
  isSelected,
  isInPath,
  pathIndex,
  isInHint = false,
  hintPathIndex,
  isLegalNext = false,
  size = 'medium',
  boxPx,
  isSuccess = false,
  isError = false,
}) => {
  const theme = useBoardTheme();
  // Width/height use min(viewport-based, fixed-cap) so dense boards fit on
  // narrow phones without horizontal scroll; caps prevent oversized tiles on desktop.
  const sizeStyles: Record<NumberTileSize, React.CSSProperties> = {
    compact: { width: 'min(11vw, 58px)', height: 'min(11vw, 58px)' },
    small: { width: 'min(11vw, 56px)', height: 'min(11vw, 56px)' },
    medium: { width: 'min(13vw, 64px)', height: 'min(13vw, 64px)' },
    large: { width: 'min(16vw, 72px)', height: 'min(16vw, 72px)' },
  };
  const textClasses = {
    compact: 'text-xs sm:text-sm',
    small: 'text-xs sm:text-sm',
    medium: 'text-sm sm:text-base',
    large: 'text-base sm:text-lg',
  } as const;

  const baseClasses = `
    ${textClasses[size]}
    flex items-center justify-center
    rounded-lg border-2 font-bold shadow-md
    select-none touch-manipulation
    transition-all duration-200
    cursor-pointer
    hover:shadow-lg
    aspect-square relative
  `;

  const getStateClasses = () => {
    if (isSuccess) {
      return 'bg-gradient-to-br from-emerald-500 to-green-600 text-white border-emerald-600 shadow-xl ring-2 ring-emerald-300';
    }
    if (isError) {
      return 'bg-gradient-to-br from-rose-500 to-red-500 text-white border-rose-600 shadow-lg ring-2 ring-rose-300';
    }
    if (isInPath) {
      return `${theme.path} shadow-xl scale-105 ring-2`;
    }
    if (isLegalNext) {
      // Keep the board theme's colours; the amber ring marks a legal next tap.
      return `${theme.idle} shadow-md ring-2 ring-amber-400 ring-offset-1`;
    }
    if (isSelected) {
      return 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600 shadow-lg ring-2 ring-green-300';
    }
    if (isInHint) {
      return 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900 border-yellow-500 shadow-lg ring-2 ring-yellow-300 animate-pulse';
    }
    return `${theme.idle} hover:shadow-lg hover:scale-105`;
  };

  return (
    <motion.div
      data-tile-id={tile.id}
      className={`${baseClasses} ${getStateClasses()}`}
      style={
        boxPx
          ? { width: boxPx, height: boxPx, fontSize: Math.round(boxPx * 0.42) }
          : sizeStyles[size]
      }
      initial={{ scale: 1 }}
      animate={
        isSuccess
          ? { scale: [1, 1.18, 1.05], zIndex: 10 }
          : isError
            ? { x: [0, -6, 6, -4, 4, 0], scale: 1.05, zIndex: 10 }
            : {
                x: 0,
                scale: isInPath ? 1.05 : isSelected ? 1.02 : isInHint ? 1.03 : 1,
                zIndex: isInPath ? 10 : isSelected ? 5 : isInHint ? 3 : 1,
              }
      }
      transition={
        isSuccess || isError
          ? { duration: 0.45, ease: 'easeOut' }
          : { type: 'spring', stiffness: 300, damping: 30 }
      }
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
      {isInHint && typeof hintPathIndex === 'number' && (
        <motion.div
          className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-xs font-bold rounded-full flex items-center justify-center text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {hintPathIndex + 1}
        </motion.div>
      )}
    </motion.div>
  );
};
