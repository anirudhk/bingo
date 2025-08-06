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
  // Ensure operator is valid
  if (!operator || !['+', '-', '*'].includes(operator)) {
    console.error('Invalid operator:', operator, 'type:', typeof operator, 'length:', operator?.length);
    return null;
  }
  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    medium: 'w-8 h-8 text-sm',
    large: 'w-10 h-10 text-base'
  };

  const positionClasses = {
    horizontal: 'mx-1',
    vertical: 'my-1'
  };

  const baseClasses = `
    ${sizeClasses[size]}
    ${positionClasses[position]}
    flex items-center justify-center
    rounded-full font-bold
    select-none touch-manipulation
    transition-all duration-200
    cursor-pointer
  `;

  const getStateClasses = () => {
    if (isSelected) {
      return 'bg-orange-500 text-white shadow-lg scale-110 ring-2 ring-orange-300';
    }
    if (isAvailable) {
      // Add subtle colors based on operator type
      switch (operator) {
        case '+':
          return 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300 hover:scale-105';
        case '-':
          return 'bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300 hover:scale-105';
        case '*':
          return 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-2 border-purple-300 hover:scale-105';
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
        return '−'; // Using minus sign instead of hyphen
      case '*':
        return '×'; // Using multiplication sign instead of asterisk
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