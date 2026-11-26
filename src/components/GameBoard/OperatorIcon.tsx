import React from 'react';
import { motion } from 'framer-motion';
import { logger } from '../../utils/logger';

interface OperatorIconProps {
  operator: '+' | '-' | '*';
  position: 'horizontal' | 'vertical';
  isSelected: boolean;
  isAvailable: boolean;
  isInHint?: boolean;
  /** Next valid tap in the tile → operator → tile rhythm */
  isLegalNext?: boolean;
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
  isInHint = false,
  isLegalNext = false,
  size = 'medium',
  row,
  col,
  onClick,
}) => {
  if (!operator || !['+', '-', '*'].includes(operator)) {
    logger.error(
      'Invalid operator:',
      operator,
      'type:',
      typeof operator,
      'length:',
      operator?.length
    );
    return null;
  }

  const getSizeClasses = () => {
    if (position === 'horizontal') {
      switch (size) {
        case 'small':
          return 'w-8 h-4 text-xs sm:w-12 sm:h-5';
        case 'medium':
          return 'w-11 h-4 text-xs sm:w-16 sm:h-6 sm:text-xs';
        case 'large':
          return 'w-12 h-5 text-xs sm:w-18 sm:h-7 sm:text-sm';
        default:
          return 'w-11 h-4 text-xs sm:w-16 sm:h-6';
      }
    } else {
      switch (size) {
        case 'small':
          return 'w-4 h-8 text-xs sm:w-5 sm:h-14';
        case 'medium':
          return 'w-4 h-12 text-xs sm:w-6 sm:h-16 sm:text-xs';
        case 'large':
          return 'w-6 h-12 text-xs sm:w-7 sm:h-18 sm:text-sm';
        default:
          return 'w-4 h-12 text-xs sm:w-6 sm:h-16';
      }
    }
  };

  const positionClasses = {
    horizontal: 'mx-0.5 sm:mx-0.5',
    vertical: 'my-0.5 sm:my-0.5',
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
    if (isInHint) {
      return 'bg-yellow-400 text-yellow-900 shadow-lg scale-105 ring-2 ring-yellow-300 animate-pulse';
    }
    if (isAvailable) {
      const legalRing =
        ' ring-2 ring-amber-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900';
      let cls: string;
      switch (operator) {
        case '+':
          cls =
            'bg-green-200 text-green-800 hover:bg-green-300 border border-green-400 hover:scale-105';
          break;
        case '-':
          cls = 'bg-red-200 text-red-800 hover:bg-red-300 border border-red-400 hover:scale-105';
          break;
        case '*':
          cls =
            'bg-purple-200 text-purple-800 hover:bg-purple-300 border border-purple-400 hover:scale-105';
          break;
        default:
          cls = 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105';
      }
      return cls + (isLegalNext ? legalRing : '');
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

  const operatorKey =
    row !== undefined && col !== undefined && operator && operator.length > 0
      ? `${position}-${row}-${col}-${operator.replace('-', 'MINUS')}`
      : undefined;

  const operatorName: Record<string, string> = {
    '+': 'plus',
    '-': 'minus',
    '*': 'times',
  };

  // The tappable box fills this operator's whole share of the gap between
  // tiles (the visible pill stays the same size), so taps don't have to
  // land on the small pill itself.
  const hitBoxClasses =
    position === 'horizontal'
      ? 'flex w-full min-h-0 flex-1 items-center justify-center'
      : 'flex h-full min-w-0 flex-1 items-center justify-center';

  return (
    <div
      data-operator={operator}
      data-operator-key={operatorKey}
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-label={`${operatorName[operator] ?? operator} between ${position === 'horizontal' ? 'these columns' : 'these rows'}`}
      aria-pressed={isSelected}
      aria-disabled={!isAvailable}
      onKeyDown={(e) => {
        if (!isAvailable || !onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onClick={isAvailable ? onClick : undefined}
      className={`${hitBoxClasses} touch-manipulation rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isAvailable ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <motion.span
        aria-hidden
        className={`${baseClasses} ${getStateClasses()} pointer-events-none`}
        initial={{ scale: 1, opacity: 0.7 }}
        animate={{
          scale: isSelected ? 1.1 : isInHint ? 1.05 : 1,
          opacity: isAvailable ? 1 : 0.3,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
      >
        {getOperatorSymbol()}
      </motion.span>
    </div>
  );
};
