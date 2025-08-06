import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { score, totalTime, difficulty, totalRounds, resetGame } = useGameStore();

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreMessage = () => {
    const maxScore = totalRounds * 10 * (difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2);
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 90) return "🎉 Outstanding! You're a math genius!";
    if (percentage >= 75) return "🌟 Excellent work! You've got great skills!";
    if (percentage >= 60) return "👍 Good job! You're getting better!";
    if (percentage >= 40) return "💪 Not bad! Keep practicing!";
    return "📚 Keep learning! You'll get there!";
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-2 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-3 max-w-xs w-full max-h-[85vh]"
      >
        <div className="text-center">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="text-3xl mb-1"
          >
            🏆
          </motion.div>
          
          <h1 className="text-lg font-bold text-gray-800 mb-1">Game Complete!</h1>
          <p className="text-xs text-gray-600 mb-2">{getScoreMessage()}</p>

          <div className="space-y-1">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium text-xs">Final Score:</span>
                <span className="text-base font-bold text-blue-600">{score}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium text-xs">Total Time:</span>
                <span className="text-sm font-semibold text-green-600">{formatTime(totalTime)}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium text-xs">Difficulty:</span>
                <span className={`text-sm font-semibold capitalize ${getDifficultyColor()}`}>
                  {difficulty}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium text-xs">Rounds Completed:</span>
                <span className="text-sm font-semibold text-purple-600">{totalRounds}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetGame();
                // Start a new game with the same difficulty immediately
                navigate('/game');
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-1.5 px-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-xs"
            >
              Play Again
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetGame();
                navigate('/');
              }}
              className="w-full bg-gray-200 text-gray-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-gray-300 transition-all duration-200 text-xs"
            >
              Back to Menu
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}; 