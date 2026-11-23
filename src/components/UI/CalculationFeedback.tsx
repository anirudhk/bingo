import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalculationFeedbackProps {
  calculation: string;
  result: number | null;
  target: number;
  isCorrect: boolean;
  isVisible: boolean;
}

export const CalculationFeedback: React.FC<CalculationFeedbackProps> = ({
  calculation,
  result,
  target,
  isCorrect,
  isVisible,
}) => {
  const getResultColor = () => {
    return isCorrect ? 'text-green-600' : 'text-red-600';
  };

  // Pastel surfaces — keep text dark in both themes. Using `dark:text-gray-100`
  // here made the expression vanish on `bg-green-50` / `bg-red-50` when
  // `html.dark` is set (light-on-light).
  const getSurfaceClasses = () => {
    return isCorrect
      ? 'bg-green-50 border-green-200 dark:bg-green-50 dark:border-green-200'
      : 'bg-red-50 border-red-200 dark:bg-red-50 dark:border-red-200';
  };

  const wrongDelta = !isCorrect && result !== null ? result - target : null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`
            fixed bottom-20 left-1/2 transform -translate-x-1/2
            px-4 py-2 sm:px-5 sm:py-2 rounded-xl border-2 shadow-lg
            ${getSurfaceClasses()}
            z-50 w-fit max-w-[min(calc(100vw-2rem),18rem)] sm:max-w-[min(calc(100vw-2rem),22rem)]
          `}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}
        >
          <div
            className={
              isCorrect
                ? 'flex flex-col items-center gap-1.5 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3 sm:gap-y-1'
                : 'flex flex-col items-center gap-2 text-center'
            }
          >
            <div
              className={`flex flex-wrap items-baseline justify-center gap-x-2 ${isCorrect ? 'sm:justify-start' : ''}`}
            >
              <span
                dir="ltr"
                className="max-w-full overflow-x-auto text-base font-semibold font-sans tabular-nums text-slate-900"
                style={{ unicodeBidi: 'isolate' }}
              >
                {calculation}
              </span>
              {result !== null && (
                <span className={`text-xl font-bold tabular-nums sm:text-2xl ${getResultColor()}`}>
                  = {result}
                </span>
              )}
            </div>

            {!isCorrect && result !== null && (
              <p className="max-w-full text-sm font-semibold text-red-700 dark:text-red-300">
                Target is {target}.
                {wrongDelta !== null && (
                  <>
                    {' '}
                    Off by {wrongDelta > 0 ? '+' : ''}
                    {wrongDelta}.
                  </>
                )}
              </p>
            )}

            <motion.div
              className={`flex shrink-0 justify-center ${isCorrect ? 'sm:justify-start' : ''}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {isCorrect ? (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <svg
                    className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold sm:text-base">Correct!</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <svg
                    className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-semibold sm:text-base">Try Again</span>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
