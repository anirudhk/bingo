import React from 'react';
import { motion } from 'framer-motion';
import { Tile, DifficultyLevel } from '../../types/game';
import { DIFFICULTY_CONFIGS } from '../../constants/game';
import { NumberTile } from './NumberTile';
import { OperatorIcon } from './OperatorIcon';

interface GridProps {
  tiles: Tile[];
  difficulty: DifficultyLevel;
  selectedPath: Tile[];
  selectedOperators: string[];
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: (event: TouchEvent) => void;
  onTouchCancel: (event: TouchEvent) => void;
}

export const Grid: React.FC<GridProps> = ({
  tiles,
  difficulty,
  selectedPath,
  selectedOperators,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel
}) => {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const gridSize = config.gridSize;
  
  React.useEffect(() => {
    const gridElement = document.getElementById('game-grid');
    if (!gridElement) return;

    // Add touch event listeners
    gridElement.addEventListener('touchstart', onTouchStart, { passive: false });
    gridElement.addEventListener('touchmove', onTouchMove, { passive: false });
    gridElement.addEventListener('touchend', onTouchEnd, { passive: false });
    gridElement.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      gridElement.removeEventListener('touchstart', onTouchStart);
      gridElement.removeEventListener('touchmove', onTouchMove);
      gridElement.removeEventListener('touchend', onTouchEnd);
      gridElement.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, onTouchCancel]);

  const getTileSize = () => {
    switch (gridSize) {
      case 3:
        return 'large';
      case 4:
        return 'medium';
      case 5:
        return 'small';
      default:
        return 'medium';
    }
  };

  const getOperatorSize = () => {
    switch (gridSize) {
      case 3:
        return 'large';
      case 4:
        return 'medium';
      case 5:
        return 'small';
      default:
        return 'medium';
    }
  };

  const isOperatorSelected = (row: number, col: number, position: 'horizontal' | 'vertical', operator: string): boolean => {
    // Check if this operator is part of the selected path
    // This is a simplified version - in a real implementation, you'd track which specific operators were selected
    return selectedPath.length > 1 && selectedOperators.includes(operator);
  };

  const isOperatorAvailable = (row: number, col: number, position: 'horizontal' | 'vertical'): boolean => {
    return config.availableOperators.length > 0;
  };

  const renderHorizontalOperators = (row: number, col: number) => {
    if (col >= gridSize - 1) return null;

    return (
      <div className="flex items-center justify-center space-x-1">
        {config.availableOperators.map((operator) => (
          <OperatorIcon
            key={`h-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="horizontal"
            isSelected={isOperatorSelected(row, col, 'horizontal', operator)}
            isAvailable={isOperatorAvailable(row, col, 'horizontal')}
            size={getOperatorSize()}
          />
        ))}
      </div>
    );
  };

  const renderVerticalOperators = (row: number, col: number) => {
    if (row >= gridSize - 1) return null;

    return (
      <div className="flex flex-col items-center justify-center space-y-1">
        {config.availableOperators.map((operator) => (
          <OperatorIcon
            key={`v-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="vertical"
            isSelected={isOperatorSelected(row, col, 'vertical', operator)}
            isAvailable={isOperatorAvailable(row, col, 'vertical')}
            size={getOperatorSize()}
          />
        ))}
      </div>
    );
  };

  const gridContainerClasses = `
    inline-grid gap-2 p-4 bg-gray-50 rounded-xl shadow-inner
    ${gridSize === 3 ? 'grid-cols-5' : gridSize === 4 ? 'grid-cols-7' : 'grid-cols-9'}
  `;

  return (
    <motion.div
      id="game-grid"
      className={gridContainerClasses}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: gridSize }, (_, row) => (
        <React.Fragment key={`row-${row}`}>
          {Array.from({ length: gridSize }, (_, col) => {
            const tileIndex = row * gridSize + col;
            const tile = tiles[tileIndex];
            const pathIndex = selectedPath.findIndex(t => t.id === tile.id);
            
            return (
              <React.Fragment key={`cell-${row}-${col}`}>
                {/* Render tile */}
                <div className="flex items-center justify-center">
                  <NumberTile
                    tile={tile}
                    isSelected={tile.selected}
                    isInPath={pathIndex !== -1}
                    pathIndex={pathIndex !== -1 ? pathIndex : undefined}
                    size={getTileSize()}
                  />
                </div>
                
                {/* Render horizontal operators (except for last column) */}
                {col < gridSize - 1 && (
                  <div className="flex items-center justify-center">
                    {renderHorizontalOperators(row, col)}
                  </div>
                )}
              </React.Fragment>
            );
          })}
          
          {/* Render vertical operators row (except for last row) */}
          {row < gridSize - 1 && (
            <>
              {Array.from({ length: gridSize }, (_, col) => (
                <React.Fragment key={`v-operators-${row}-${col}`}>
                  <div className="flex items-center justify-center">
                    {renderVerticalOperators(row, col)}
                  </div>
                  {/* Empty space between vertical operators */}
                  {col < gridSize - 1 && <div></div>}
                </React.Fragment>
              ))}
            </>
          )}
        </React.Fragment>
      ))}
    </motion.div>
  );
};