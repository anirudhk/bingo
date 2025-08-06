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
  onMouseDown: (event: MouseEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onMouseUp: (event: MouseEvent) => void;
}

export const Grid: React.FC<GridProps> = ({
  tiles,
  difficulty,
  selectedPath,
  selectedOperators,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  onMouseDown,
  onMouseMove,
  onMouseUp
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

    // Add mouse event listeners for desktop testing
    gridElement.addEventListener('mousedown', onMouseDown, { passive: false });
    gridElement.addEventListener('mousemove', onMouseMove, { passive: false });
    gridElement.addEventListener('mouseup', onMouseUp, { passive: false });

    return () => {
      gridElement.removeEventListener('touchstart', onTouchStart);
      gridElement.removeEventListener('touchmove', onTouchMove);
      gridElement.removeEventListener('touchend', onTouchEnd);
      gridElement.removeEventListener('touchcancel', onTouchCancel);
      gridElement.removeEventListener('mousedown', onMouseDown);
      gridElement.removeEventListener('mousemove', onMouseMove);
      gridElement.removeEventListener('mouseup', onMouseUp);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onMouseDown, onMouseMove, onMouseUp]);

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

  const isOperatorSelected = (_row: number, _col: number, _position: 'horizontal' | 'vertical', operator: string): boolean => {
    // Check if this specific operator instance is part of the selected path
    
    // Only highlight operators when we have a valid path and this specific operator is selected
    const isSelected = selectedPath.length > 1 && selectedOperators.includes(operator);
    
    return isSelected;
  };

  const isOperatorAvailable = (_row: number, _col: number, _position: 'horizontal' | 'vertical'): boolean => {
    return config.availableOperators.length > 0;
  };

  const renderHorizontalOperators = (row: number, col: number) => {
    if (col >= gridSize - 1) return null;

    return (
      <div className="flex flex-col items-center justify-center space-y-2">
        {config.availableOperators.map((operator) => (
          <OperatorIcon
            key={`h-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="vertical"
            isSelected={isOperatorSelected(row, col, 'horizontal', operator)}
            isAvailable={isOperatorAvailable(row, col, 'horizontal')}
            size={getOperatorSize()}
            row={row}
            col={col}
          />
        ))}
      </div>
    );
  };

  const renderVerticalOperators = (row: number, col: number) => {
    if (row >= gridSize - 1) return null;

    return (
      <div className="flex items-center justify-center space-x-2">
        {config.availableOperators.map((operator) => (
          <OperatorIcon
            key={`v-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="horizontal"
            isSelected={isOperatorSelected(row, col, 'vertical', operator)}
            isAvailable={isOperatorAvailable(row, col, 'vertical')}
            size={getOperatorSize()}
            row={row}
            col={col}
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
            
            // Add null check to prevent undefined tile error
            if (!tile) {
              return (
                <div key={`empty-${row}-${col}`} className="w-16 h-16"></div>
              );
            }
            
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