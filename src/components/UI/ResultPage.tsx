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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        <div className="text-center">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Game Complete!</h1>
          <p className="text-gray-600 mb-6">{getScoreMessage()}</p>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Final Score:</span>
                <span className="text-2xl font-bold text-blue-600">{score}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total Time:</span>
                <span className="text-xl font-semibold text-green-600">{formatTime(totalTime)}</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Difficulty:</span>
                <span className={`text-lg font-semibold capitalize ${getDifficultyColor()}`}>
                  {difficulty}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Rounds Completed:</span>
                <span className="text-xl font-semibold text-purple-600">{totalRounds}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                resetGame();
                // Start a new game with the same difficulty immediately
                navigate('/game');
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
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
              className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-all duration-200"
            >
              Back to Menu
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}; 