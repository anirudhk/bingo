import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Grid } from './Grid';
import { TargetDisplay } from '../UI/TargetDisplay';
import { CalculationFeedback } from '../UI/CalculationFeedback';
import { useGameStore } from '../../store/gameStore';
import { useSwipeDetection } from '../../hooks/useSwipeDetection';
import { DifficultyLevel, Tile } from '../../types/game';
import { formatCalculation } from '../../utils/calculator';

interface GameBoardProps {
  difficulty: DifficultyLevel;
}

export const GameBoard: React.FC<GameBoardProps> = ({ difficulty }) => {
  const navigate = useNavigate();
  const {
    grid,
    currentTarget,
    currentRound,
    totalRounds,
    score,
    gameStatus,
    swipeState,
    initializeGame,
    submitSolution,
    updateSwipeState
  } = useGameStore();

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    calculation: '',
    result: null as number | null,
    isCorrect: undefined as boolean | undefined
  });

  // Initialize game when component mounts
  useEffect(() => {
    initializeGame(difficulty);
  }, [difficulty, initializeGame]);

  // Handle swipe updates
  const handleSwipeUpdate = (tiles: Tile[], operators: string[], result: number | null) => {
    updateSwipeState({
      isActive: true,
      startTile: tiles[0] || null,
      currentPath: tiles,
      operators,
      result
    });

    // Show real-time feedback
    if (tiles.length > 0) {
      const calculation = formatCalculation(tiles, operators);
      setFeedbackData({
        calculation,
        result,
        isCorrect: undefined
      });
      setShowFeedback(true);
    }
  };

  // Handle swipe completion
  const handleSwipeComplete = (tiles: Tile[], operators: string[]) => {
    const isCorrect = submitSolution(tiles, operators);
    
    // Show feedback
    const calculation = formatCalculation(tiles, operators);
    const result = swipeState.result;
    
    setFeedbackData({
      calculation,
      result,
      isCorrect
    });
    setShowFeedback(true);

    // Hide feedback after delay
    setTimeout(() => {
      setShowFeedback(false);
    }, 2000);
  };

  // Handle swipe cancellation
  const handleSwipeCancel = () => {
    updateSwipeState({
      isActive: false,
      startTile: null,
      currentPath: [],
      operators: [],
      result: null
    });
    setShowFeedback(false);
  };

  // Swipe detection hook
  const { handlers, isActive } = useSwipeDetection({
    grid,
    difficulty,
    onSwipeUpdate: handleSwipeUpdate,
    onSwipeComplete: handleSwipeComplete,
    onSwipeCancel: handleSwipeCancel
  });

  // Add global mouse event listeners for better swipe detection
  useEffect(() => {
    if (isActive) {
      const handleGlobalMouseMove = handlers.onMouseMove;
      const handleGlobalMouseUp = handlers.onMouseUp;

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isActive, handlers.onMouseMove, handlers.onMouseUp]);

  // Handle game completion
  useEffect(() => {
    if (gameStatus === 'completed') {
      setTimeout(() => {
        navigate('/');
      }, 3000);
    }
  }, [gameStatus, navigate]);

  // Handle back to menu
  const handleBackToMenu = () => {
    navigate('/');
  };

  if (gameStatus === 'completed') {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-600 mb-4">🎉 Game Complete!</h1>
          <p className="text-xl text-gray-700 mb-6">Final Score: {score}</p>
          <motion.button
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={handleBackToMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Back to Menu
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <motion.button
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          onClick={handleBackToMenu}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Back
        </motion.button>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">Score: {score}</div>
          <div className="text-sm text-gray-600">Difficulty: {difficulty}</div>
        </div>
        
        <div className="w-20"></div> {/* Spacer for centering */}
      </div>

      {/* Target Display */}
      <TargetDisplay
        currentTarget={currentTarget}
        round={currentRound}
        totalRounds={totalRounds}
      />

      {/* Game Grid */}
      <div className="flex justify-center mb-8">
        <Grid
          tiles={grid}
          difficulty={difficulty}
          selectedPath={swipeState.currentPath}
          selectedOperators={swipeState.operators}
          onTouchStart={handlers.onTouchStart}
          onTouchMove={handlers.onTouchMove}
          onTouchEnd={handlers.onTouchEnd}
          onTouchCancel={handlers.onTouchCancel}
          onMouseDown={handlers.onMouseDown}
          onMouseMove={handlers.onMouseMove}
          onMouseUp={handlers.onMouseUp}
        />
      </div>

      {/* Instructions */}
      <motion.div
        className="text-center text-gray-600 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm">
          Swipe through {difficulty === 'easy' ? '2 numbers and 1 operator' : '3 numbers and 2 operators'} to reach the target!
        </p>
        <p className="text-xs text-gray-500 mt-2">
          💡 Click and drag from a tile, then drag over operators to select them
        </p>
      </motion.div>

      {/* Calculation Feedback */}
      <CalculationFeedback
        calculation={feedbackData.calculation}
        result={feedbackData.result}
        isCorrect={feedbackData.isCorrect}
        isVisible={showFeedback}
      />
    </div>
  );
}; 