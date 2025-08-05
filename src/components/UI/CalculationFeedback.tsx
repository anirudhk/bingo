import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalculationFeedbackProps {
  calculation: string;
  result: number | null;
  isCorrect?: boolean;
  isVisible: boolean;
}

export const CalculationFeedback: React.FC<CalculationFeedbackProps> = ({
  calculation,
  result,
  isCorrect,
  isVisible
}) => {
  const getResultColor = () => {
    if (isCorrect === true) return 'text-green-600';
    if (isCorrect === false) return 'text-red-600';
    return 'text-blue-600';
  };

  const getBackgroundColor = () => {
    if (isCorrect === true) return 'bg-green-50 border-green-200';
    if (isCorrect === false) return 'bg-red-50 border-red-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`
            fixed bottom-20 left-1/2 transform -translate-x-1/2
            px-6 py-3 rounded-lg border-2 shadow-lg
            ${getBackgroundColor()}
            z-50
          `}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
        >
          <div className="text-center">
            {/* Calculation Display */}
            <div className="text-lg font-mono text-gray-800 mb-1">
              {calculation}
            </div>
            
            {/* Result Display */}
            {result !== null && (
              <div className={`text-2xl font-bold ${getResultColor()}`}>
                = {result}
              </div>
            )}
            
            {/* Success/Failure Indicator */}
            {isCorrect !== undefined && (
              <motion.div
                className="mt-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {isCorrect ? (
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Correct!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2 text-red-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Try Again</span>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};