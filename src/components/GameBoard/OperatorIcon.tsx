import React from 'react';
import { motion } from 'framer-motion';

interface OperatorIconProps {
  operator: '+' | '-' | '*';
  position: 'horizontal' | 'vertical';
  isSelected: boolean;
  isAvailable: boolean;
  size?: 'small' | 'medium' | 'large';
  row?: number;
  col?: number;
  onClick?: () => void;
}

export const OperatorIcon: React.FC<OperatorIconProps> = ({
  operator,
  position,
  isSelected,
  isAvailable,
  size = 'medium',
  row,
  col,
  onClick
}) => {
  if (!operator || !['+', '-', '*'].includes(operator)) {
    console.error('Invalid operator:', operator, 'type:', typeof operator, 'length:', operator?.length);
    return null;
  }

  const getSizeClasses = () => {
    if (position === 'horizontal') {
      // For row operators (stacked vertically): wide and short rectangles
      switch (size) {
        case 'small': return 'w-4 h-8 text-xs sm:w-14 sm:h-5';
        case 'medium': return 'w-4 h-12 text-xs sm:w-16 sm:h-6 sm:text-xs';
        case 'large': return 'w-6 h-12 text-xs sm:w-18 sm:h-7 sm:text-sm';
        default: return 'w-4 h-12 text-xs sm:w-16 sm:h-6';
      }
    } else {
      // For column operators (side by side): tall and narrow rectangles
      switch (size) {
        case 'small': return 'w-8 h-4 text-xs sm:w-5 sm:h-14';
        case 'medium': return 'w-12 h-4 text-xs sm:w-6 sm:h-16 sm:text-xs';
        case 'large': return 'w-12 h-6 text-xs sm:w-7 sm:h-18 sm:text-sm';
        default: return 'w-12 h-4 text-xs sm:w-6 sm:h-16';
      }
    }
  };

  const positionClasses = {
    horizontal: 'mx-0.5 sm:mx-0.5',
    vertical: 'my-0.5 sm:my-0.5'
  };

  const baseClasses = `
    ${getSizeClasses()}
    ${positionClasses[position]}
    flex items-center justify-center
    rounded-md font-bold
    select-none touch-manipulation
    transition-all duration-200
    cursor-pointer
  `;

  const getStateClasses = () => {
    if (isSelected) {
      return 'bg-orange-500 text-white shadow-lg scale-110 ring-2 ring-orange-300';
    }
    if (isAvailable) {
      switch (operator) {
        case '+':
          return 'bg-green-200 text-green-800 hover:bg-green-300 border border-green-400 hover:scale-105';
        case '-':
          return 'bg-red-200 text-red-800 hover:bg-red-300 border border-red-400 hover:scale-105';
        case '*':
          return 'bg-purple-200 text-purple-800 hover:bg-purple-300 border border-purple-400 hover:scale-105';
        default:
          return 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105';
      }
    }
    return 'bg-gray-100 text-gray-400 opacity-50';
  };

  const getOperatorSymbol = () => {
    switch (operator) {
      case '+':
        return '+';
      case '-':
        return '−';
      case '*':
        return '×';
      default:
        return operator;
    }
  };

  const operatorKey = row !== undefined && col !== undefined && operator && operator.length > 0
    ? `${position}-${row}-${col}-${operator.replace('-', 'MINUS')}`
    : undefined;

  return (
    <motion.div
      data-operator={operator}
      data-operator-key={operatorKey}
      className={`${baseClasses} ${getStateClasses()}`}
      initial={{ scale: 1, opacity: 0.7 }}
      animate={{
        scale: isSelected ? 1.1 : 1,
        opacity: isAvailable ? 1 : 0.3
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
    >
      {getOperatorSymbol()}
    </motion.div>
  );
};
