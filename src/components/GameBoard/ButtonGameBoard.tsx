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
      setSelectedTiles([]);
      setSelectedOperators([]);
      setSelectedOperatorPositions([]);
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

  const isTileInPath = (tile: Tile) => {
    return selectedTiles.find(t => t.id === tile.id) !== undefined;
  };

  const getPathIndex = (tile: Tile) => {
    const index = selectedTiles.findIndex(t => t.id === tile.id);
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
            onClick={() => handleOperatorClick(operator, row, col, 'horizontal')}
          />
        ))}
      </div>
    );
  };

  const renderVerticalOperators = (row: number, col: number) => {
    if (row >= config.gridSize - 1) return null;

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
            onClick={() => handleOperatorClick(operator, row, col, 'vertical')}
          />
        ))}
      </div>
    );
  };

  const gridContainerClasses = `
    inline-grid gap-2 p-4 bg-gray-50 rounded-xl shadow-inner
    ${config.gridSize === 3 ? 'grid-cols-5' : config.gridSize === 4 ? 'grid-cols-7' : 'grid-cols-9'}
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleBackToMenu}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back to Menu
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Grid Genius</h1>
            <p className="text-gray-600">Difficulty: {difficulty}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Score: {score}</p>
            <p className="text-sm text-gray-600">Round: {currentRound}/{totalRounds}</p>
            <Timer />
          </div>
        </div>

        {/* Target Display */}
        <TargetDisplay currentTarget={currentTarget} round={currentRound} totalRounds={totalRounds} />

        {/* Game Grid */}
        <div className="flex justify-center mb-6">
          <motion.div
            className={gridContainerClasses}
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
                      <div key={`empty-${row}-${col}`} className="w-16 h-16"></div>
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