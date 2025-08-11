import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TargetDisplay } from '../UI/TargetDisplay';
import { CalculationFeedback } from '../UI/CalculationFeedback';
import { Timer } from '../UI/Timer';
import { useGameStore } from '../../store/gameStore';
import { DifficultyLevel, Tile } from '../../types/game';
import { formatCalculation, calculatePathResult } from '../../utils/calculator';
import { DIFFICULTY_CONFIGS } from '../../constants/game';
import { NumberTile } from './NumberTile';
import { OperatorIcon } from './OperatorIcon';

interface ButtonGameBoardProps {
  difficulty: DifficultyLevel;
}

export const ButtonGameBoard: React.FC<ButtonGameBoardProps> = ({ difficulty }) => {
  const navigate = useNavigate();
  const {
    grid,
    currentTarget,
    currentRound,
    totalRounds,
    score,
    gameStatus,
    initializeGame,
    submitSolution,
    startRoundTimer
  } = useGameStore();

  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [selectedOperatorPositions, setSelectedOperatorPositions] = useState<Array<{row: number, col: number, position: 'horizontal' | 'vertical', operator: string}>>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    calculation: '',
    result: null as number | null,
    isCorrect: undefined as boolean | undefined
  });
  const [hintTiles, setHintTiles] = useState<Tile[]>([]);
  const [hintOperatorPositions, setHintOperatorPositions] = useState<Array<{row: number, col: number, position: 'horizontal' | 'vertical', operator: string}>>([]);
  const [showHint, setShowHint] = useState(false);

  const config = DIFFICULTY_CONFIGS[difficulty];

  // Initialize game when component mounts
  useEffect(() => {
    console.log('Initializing game with difficulty:', difficulty);
    initializeGame(difficulty);
    startRoundTimer();
  }, [difficulty, initializeGame, startRoundTimer]);

  // Debug logging
  useEffect(() => {
    console.log('Game state:', {
      currentTarget,
      currentRound,
      totalRounds,
      gridLength: grid.length,
      gameStatus
    });
  }, [currentTarget, currentRound, totalRounds, grid.length, gameStatus]);



  const handleTileClick = (tile: Tile) => {
    // If tile is already selected, remove it (toggle selection)
    if (selectedTiles.find(t => t.id === tile.id)) {
      const newTiles = selectedTiles.filter(t => t.id !== tile.id);
      setSelectedTiles(newTiles);
      // Also clear operators when deselecting a tile
      setSelectedOperators([]);
      setSelectedOperatorPositions([]);
      return;
    }

    // Check if we can select a number (should alternate: number -> operator -> number)
    const totalSelections = selectedTiles.length + selectedOperators.length;
    const isNumberTurn = totalSelections % 2 === 0; // 0, 2, 4, etc. are number turns

    if (!isNumberTurn) {
      // It's not a number's turn, vibrate and don't select
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      return;
    }

    // Check if the tile is valid for the next selection
    if (!isTileValidForNextSelection(tile)) {
      // Tile is not valid for selection, vibrate and don't select
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      return;
    }

    // Add tile to selection
    const newTiles = [...selectedTiles, tile];
    setSelectedTiles(newTiles);

    // If we have enough tiles and operators, check the answer
    if (newTiles.length === config.tilesCount && selectedOperators.length === config.operatorsCount) {
      checkAnswer(newTiles, selectedOperators);
    }
  };

  const handleOperatorClick = (operator: string, row: number, col: number, position: 'horizontal' | 'vertical') => {
    // If we don't have enough tiles yet, ignore
    if (selectedTiles.length < 1) {
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      return;
    }

    // Check if this exact operator position is already selected
    const isAlreadySelected = selectedOperatorPositions.find(
      pos => pos.row === row && pos.col === col && pos.position === position && pos.operator === operator
    );

    if (isAlreadySelected) {
      // Remove operator from selection (toggle selection)
      const newOperators = selectedOperators.filter((_, index) => {
        const pos = selectedOperatorPositions[index];
        return !(pos.row === row && pos.col === col && pos.position === position && pos.operator === operator);
      });
      const newOperatorPositions = selectedOperatorPositions.filter(
        pos => !(pos.row === row && pos.col === col && pos.position === position && pos.operator === operator)
      );
      setSelectedOperators(newOperators);
      setSelectedOperatorPositions(newOperatorPositions);
      return;
    }

    // Check if we can select an operator (should alternate: number -> operator -> number)
    const totalSelections = selectedTiles.length + selectedOperators.length;
    const isOperatorTurn = totalSelections % 2 === 1; // 1, 3, 5, etc. are operator turns

    if (!isOperatorTurn) {
      // It's not an operator's turn, vibrate and don't select
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      return;
    }

    // Check if the operator is valid for selection
    if (!isOperatorValidForSelection(row, col, position)) {
      // Operator is not valid for selection, vibrate and don't select
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      return;
    }

    // Add operator to selection
    const newOperators = [...selectedOperators, operator];
    const newOperatorPositions = [...selectedOperatorPositions, {row, col, position, operator}];
    setSelectedOperators(newOperators);
    setSelectedOperatorPositions(newOperatorPositions);

    // If we have enough tiles and operators, check the answer
    if (selectedTiles.length === config.tilesCount && newOperators.length === config.operatorsCount) {
      checkAnswer(selectedTiles, newOperators);
    }
  };

  const clearSelection = () => {
    setSelectedTiles([]);
    setSelectedOperators([]);
    setSelectedOperatorPositions([]);
    clearHint();
  };

  const clearHint = () => {
    setHintTiles([]);
    setHintOperatorPositions([]);
    setShowHint(false);
  };

  const findHint = () => {
    // Clear any existing selections first
    clearSelection();
    
    // Find a valid solution for the current target
    const solutions = findValidSolutions();
    if (solutions.length > 0) {
      const hint = solutions[0]; // Take the first valid solution
      setHintTiles(hint.tiles);
      setHintOperatorPositions(hint.operatorPositions);
      setShowHint(true);
      
      // Auto-hide hint after 5 seconds
      setTimeout(() => {
        clearHint();
      }, 5000);
    }
  };

  const findValidSolutions = () => {
    const solutions: Array<{tiles: Tile[], operatorPositions: Array<{row: number, col: number, position: 'horizontal' | 'vertical', operator: string}>}> = [];
    
    // Try all possible combinations based on difficulty
    if (config.tilesCount === 2) {
      // Easy mode: try all adjacent pairs
      for (let i = 0; i < grid.length; i++) {
        const tile1 = grid[i];
        // Check horizontal adjacency
        if (tile1.position.col < config.gridSize - 1) {
          const tile2 = grid.find(t => t.position.row === tile1.position.row && t.position.col === tile1.position.col + 1);
          if (tile2) {
            for (const operator of config.availableOperators) {
              const result = calculatePathResult([tile1, tile2], [operator]);
              if (result === currentTarget) {
                solutions.push({
                  tiles: [tile1, tile2],
                  operatorPositions: [{
                    row: tile1.position.row,
                    col: tile1.position.col,
                    position: 'horizontal',
                    operator
                  }]
                });
              }
            }
          }
        }
        
        // Check vertical adjacency
        if (tile1.position.row < config.gridSize - 1) {
          const tile2 = grid.find(t => t.position.row === tile1.position.row + 1 && t.position.col === tile1.position.col);
          if (tile2) {
            for (const operator of config.availableOperators) {
              const result = calculatePathResult([tile1, tile2], [operator]);
              if (result === currentTarget) {
                solutions.push({
                  tiles: [tile1, tile2],
                  operatorPositions: [{
                    row: tile1.position.row,
                    col: tile1.position.col,
                    position: 'vertical',
                    operator
                  }]
                });
              }
            }
          }
        }
      }
    } else if (config.tilesCount === 3) {
      // Medium/Hard mode: try all valid 3-tile combinations
      for (let i = 0; i < grid.length; i++) {
        const tile1 = grid[i];
        
        // Try horizontal sequences
        if (tile1.position.col <= config.gridSize - 3) {
          const tile2 = grid.find(t => t.position.row === tile1.position.row && t.position.col === tile1.position.col + 1);
          const tile3 = grid.find(t => t.position.row === tile1.position.row && t.position.col === tile1.position.col + 2);
          
          if (tile2 && tile3) {
            for (const op1 of config.availableOperators) {
              for (const op2 of config.availableOperators) {
                const result = calculatePathResult([tile1, tile2, tile3], [op1, op2]);
                if (result === currentTarget) {
                  solutions.push({
                    tiles: [tile1, tile2, tile3],
                    operatorPositions: [
                      { row: tile1.position.row, col: tile1.position.col, position: 'horizontal', operator: op1 },
                      { row: tile2.position.row, col: tile2.position.col, position: 'horizontal', operator: op2 }
                    ]
                  });
                }
              }
            }
          }
        }
        
        // Try vertical sequences
        if (tile1.position.row <= config.gridSize - 3) {
          const tile2 = grid.find(t => t.position.row === tile1.position.row + 1 && t.position.col === tile1.position.col);
          const tile3 = grid.find(t => t.position.row === tile1.position.row + 2 && t.position.col === tile1.position.col);
          
          if (tile2 && tile3) {
            for (const op1 of config.availableOperators) {
              for (const op2 of config.availableOperators) {
                const result = calculatePathResult([tile1, tile2, tile3], [op1, op2]);
                if (result === currentTarget) {
                  solutions.push({
                    tiles: [tile1, tile2, tile3],
                    operatorPositions: [
                      { row: tile1.position.row, col: tile1.position.col, position: 'vertical', operator: op1 },
                      { row: tile2.position.row, col: tile2.position.col, position: 'vertical', operator: op2 }
                    ]
                  });
                }
              }
            }
          }
        }
      }
    }
    
    return solutions;
  };

  const checkAnswer = (tiles: Tile[], operators: string[]) => {
    const isCorrect = submitSolution(tiles, operators);
    
    // Show feedback
    const calculation = formatCalculation(tiles, operators);
    const result = calculatePathResult(tiles, operators);
    
    setFeedbackData({
      calculation,
      result,
      isCorrect
    });
    setShowFeedback(true);

    // Reset selection after a delay
    setTimeout(() => {
      clearSelection();
      setShowFeedback(false);
    }, 2000);
  };

  const handleBackToMenu = () => {
    navigate('/');
  };

  const getTileSize = () => {
    switch (config.gridSize) {
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
    switch (config.gridSize) {
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

  const isTileSelected = (tile: Tile) => {
    return selectedTiles.find(t => t.id === tile.id) !== undefined;
  };

  const isTileInHint = (tile: Tile) => {
    return showHint && hintTiles.find(t => t.id === tile.id) !== undefined;
  };

  const isTileInPath = (tile: Tile) => {
    return selectedTiles.find(t => t.id === tile.id) !== undefined;
  };

  const getPathIndex = (tile: Tile) => {
    const index = selectedTiles.findIndex(t => t.id === tile.id);
    return index !== -1 ? index : undefined;
  };

  const getHintPathIndex = (tile: Tile) => {
    if (!showHint) return undefined;
    const index = hintTiles.findIndex(t => t.id === tile.id);
    return index !== -1 ? index : undefined;
  };

  const isOperatorSelected = (row: number, col: number, position: 'horizontal' | 'vertical', operator: string): boolean => {
    // Check if this specific operator instance is selected
    return selectedOperatorPositions.some(pos => 
      pos.row === row && 
      pos.col === col && 
      pos.position === position && 
      pos.operator === operator
    );
  };

  const isOperatorInHint = (row: number, col: number, position: 'horizontal' | 'vertical', operator: string): boolean => {
    if (!showHint) return false;
    // Check if this specific operator instance is part of the hint
    return hintOperatorPositions.some(pos => 
      pos.row === row && 
      pos.col === col && 
      pos.position === position && 
      pos.operator === operator
    );
  };

  const isOperatorAvailable = (_row: number, _col: number, _position: 'horizontal' | 'vertical'): boolean => {
    return config.availableOperators.length > 0;
  };

  // Helper function to check if two tiles are adjacent
  const areTilesAdjacent = (tile1: Tile, tile2: Tile): boolean => {
    const rowDiff = Math.abs(tile1.position.row - tile2.position.row);
    const colDiff = Math.abs(tile1.position.col - tile2.position.col);
    
    // Adjacent means they share an edge (not diagonal)
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  // Helper function to check if a tile is valid for the next selection
  const isTileValidForNextSelection = (tile: Tile): boolean => {
    if (selectedTiles.length === 0) {
      return true; // First tile can be selected from anywhere
    }
    
    // If we have operators selected, the next tile must be connected by the last operator
    if (selectedOperators.length > 0) {
      const lastOperator = selectedOperatorPositions[selectedOperatorPositions.length - 1];
      const lastTile = selectedTiles[selectedTiles.length - 1];
      
      // Check if this tile is connected by the last operator
      if (lastOperator.position === 'horizontal') {
        // For horizontal operator, check if this tile is the one connected by the operator
        if (lastOperator.col === lastTile.position.col) {
          // Operator is to the right of last tile, so next tile must be to the right
          return tile.position.row === lastTile.position.row && 
                 tile.position.col === lastTile.position.col + 1;
        } else {
          // Operator is to the left of last tile, so next tile must be to the left
          return tile.position.row === lastTile.position.row && 
                 tile.position.col === lastTile.position.col - 1;
        }
      } else {
        // For vertical operator, check if this tile is the one connected by the operator
        if (lastOperator.row === lastTile.position.row) {
          // Operator is below last tile, so next tile must be below
          return tile.position.col === lastTile.position.col && 
                 tile.position.row === lastTile.position.row + 1;
        } else {
          // Operator is above last tile, so next tile must be above
          return tile.position.col === lastTile.position.col && 
                 tile.position.row === lastTile.position.row - 1;
        }
      }
    }
    
    // If no operators selected yet, just check adjacency
    const lastSelectedTile = selectedTiles[selectedTiles.length - 1];
    return areTilesAdjacent(lastSelectedTile, tile);
  };

  // Helper function to check if an operator is valid for selection
  const isOperatorValidForSelection = (row: number, col: number, position: 'horizontal' | 'vertical'): boolean => {
    if (selectedTiles.length === 0) {
      return false; // Need at least one tile to select an operator
    }
    
    const lastTile = selectedTiles[selectedTiles.length - 1];
    
    // Check if this operator is adjacent to the last selected tile
    if (position === 'horizontal') {
      // Horizontal operator should be adjacent horizontally
      return lastTile.position.row === row && 
             (lastTile.position.col === col || lastTile.position.col === col + 1);
    } else {
      // Vertical operator should be adjacent vertically
      return lastTile.position.col === col && 
             (lastTile.position.row === row || lastTile.position.row === row + 1);
    }
  };

  const renderHorizontalOperators = (row: number, col: number) => {
    if (col >= config.gridSize - 1) return null;

    return (
      <div className="flex flex-col items-center justify-center space-y-1">
        {config.availableOperators.map((operator) => (
          <OperatorIcon
            key={`h-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="vertical"
            isSelected={isOperatorSelected(row, col, 'horizontal', operator)}
            isInHint={isOperatorInHint(row, col, 'horizontal', operator)}
            isAvailable={isOperatorAvailable(row, col, 'horizontal')}
            size={getOperatorSize()}
            row={row}
            col={col}
            onClick={() => handleOperatorClick(operator, row, col, 'horizontal')}
          />
        ))}
      </div>
    );
  };

  const renderVerticalOperators = (row: number, col: number) => {
    if (row >= config.gridSize - 1) return null;

    return (
      <div className="flex items-center justify-center space-x-1">
        {config.availableOperators.map((operator) => (
          <OperatorIcon
            key={`v-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="horizontal"
            isSelected={isOperatorSelected(row, col, 'vertical', operator)}
            isInHint={isOperatorInHint(row, col, 'vertical', operator)}
            isAvailable={isOperatorAvailable(row, col, 'vertical')}
            size={getOperatorSize()}
            row={row}
            col={col}
            onClick={() => handleOperatorClick(operator, row, col, 'vertical')}
          />
        ))}
      </div>
    );
  };

  const gridContainerClasses = `
    inline-grid gap-0.5 sm:gap-0.5 p-1 sm:p-1 bg-gray-50 rounded-xl shadow-inner
    ${config.gridSize === 3 ? 'grid-cols-5' : config.gridSize === 4 ? 'grid-cols-7' : 'grid-cols-9'}
  `;

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4 overflow-hidden relative">
      {/* Fixed Action Buttons - Right Side */}
      <div className="fixed right-4 top-40 flex flex-col space-y-2 z-10">
        {/* Hint Button */}
        <motion.button
          onClick={findHint}
          disabled={showHint}
          className={`w-10 h-10 rounded-full shadow-lg transition-all duration-200 ${
            showHint
              ? 'bg-yellow-300 text-yellow-700 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-110'
          }`}
          whileHover={!showHint ? { scale: 1.1 } : {}}
          whileTap={!showHint ? { scale: 0.9 } : {}}
          title={showHint ? "Hint Active" : "Show Hint"}
        >
          💡
        </motion.button>
        
        {/* Clear Button */}
        <motion.button
          onClick={clearSelection}
          disabled={selectedTiles.length === 0 && selectedOperators.length === 0 && !showHint}
          className={`w-10 h-10 rounded-full shadow-lg transition-all duration-200 ${
            selectedTiles.length === 0 && selectedOperators.length === 0 && !showHint
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-red-500 text-white hover:bg-red-600 hover:scale-110'
          }`}
          whileHover={selectedTiles.length > 0 || selectedOperators.length > 0 || showHint ? { scale: 1.1 } : {}}
          whileTap={selectedTiles.length > 0 || selectedOperators.length > 0 || showHint ? { scale: 0.9 } : {}}
          title="Clear Selection"
        >
          ✕
        </motion.button>
      </div>
      
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="mb-2 sm:mb-4">
          {/* Top Row: Back Button and Title */}
          <div className="flex justify-between items-center mb-1">
            <button
              onClick={handleBackToMenu}
              className="px-2 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs sm:text-sm"
            >
              ← Back to Menu
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Grid Genius</h1>
            <Timer />
          </div>
          
          {/* Bottom Row: Game Info */}
          <div className="flex justify-between items-center">
            <div className="text-left">
              <p className="text-xs text-gray-600">Score: {score}</p>
              <p className="text-xs text-gray-600">Round: {currentRound}/{totalRounds}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Difficulty: {difficulty}</p>
            </div>
          </div>
        </div>

        {/* Target Display */}
        <TargetDisplay currentTarget={currentTarget} round={currentRound} totalRounds={totalRounds} />

        {/* Selection Status Display (only when there are selections) - COMMENTED OUT */}
        {false && (selectedTiles.length > 0 || selectedOperators.length > 0) && (
          <motion.div 
            className="flex justify-center mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white/80 px-3 py-1 rounded-lg shadow-sm border">
              <p className="text-sm text-gray-700 font-medium">
                Current: {formatCalculation(selectedTiles, selectedOperators)}
                {selectedTiles.length === config.tilesCount && selectedOperators.length === config.operatorsCount && (
                  <span className="ml-2 text-blue-600">
                    = {calculatePathResult(selectedTiles, selectedOperators)}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Game Grid */}
        <div className="flex justify-center mb-2 sm:mb-4 px-0 flex-1 overflow-hidden">
          <motion.div
            className={`${gridContainerClasses} max-h-full max-w-full`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Array.from({ length: config.gridSize }, (_, row) => (
              <React.Fragment key={`row-${row}`}>
                {Array.from({ length: config.gridSize }, (_, col) => {
                  const tileIndex = row * config.gridSize + col;
                  const tile = grid[tileIndex];
                  
                  if (!tile) {
                    return (
                      <div key={`empty-${row}-${col}`} className="w-14 h-14 sm:w-16 sm:h-16"></div>
                    );
                  }
                  
                  return (
                    <React.Fragment key={`cell-${row}-${col}`}>
                      {/* Render tile */}
                      <div className="flex items-center justify-center">
                        <motion.div
                          onClick={() => handleTileClick(tile)}
                          className="cursor-pointer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <NumberTile
                            tile={tile}
                            isSelected={isTileSelected(tile)}
                            isInPath={isTileInPath(tile)}
                            pathIndex={getPathIndex(tile)}
                            isInHint={isTileInHint(tile)}
                            hintPathIndex={getHintPathIndex(tile)}
                            size={getTileSize()}
                          />
                        </motion.div>
                      </div>
                      
                      {/* Render horizontal operators (except for last column) */}
                      {col < config.gridSize - 1 && (
                        <div className="flex items-center justify-center">
                          {renderHorizontalOperators(row, col)}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                
                {/* Render vertical operators row (except for last row) */}
                {row < config.gridSize - 1 && (
                  <>
                    {Array.from({ length: config.gridSize }, (_, col) => (
                      <React.Fragment key={`v-operators-${row}-${col}`}>
                        <div className="flex items-center justify-center">
                          {renderVerticalOperators(row, col)}
                        </div>
                        {/* Empty space between vertical operators */}
                        {col < config.gridSize - 1 && <div></div>}
                      </React.Fragment>
                    ))}
                  </>
                )}
              </React.Fragment>
            ))}
          </motion.div>
        </div>

        {/* Feedback */}
        <CalculationFeedback
          calculation={feedbackData.calculation}
          result={feedbackData.result}
          isCorrect={feedbackData.isCorrect}
          isVisible={showFeedback}
        />
      </div>
    </div>
  );
}; 