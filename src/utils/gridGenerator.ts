import { Tile, GameCombination, DifficultyLevel } from '../types/game';
import { DIFFICULTY_CONFIGS, MIN_NUMBER, MAX_NUMBER } from '../constants/game';
import { calculateResult } from './calculator';

export const generateGrid = (difficulty: DifficultyLevel): Tile[] => {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const gridSize = config.gridSize;
  const tiles: Tile[] = [];

  for (let i = 0; i < gridSize * gridSize; i++) {
    tiles.push({
      id: i,
      value: Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER,
      position: {
        row: Math.floor(i / gridSize),
        col: i % gridSize
      },
      selected: false
    });
  }

  return tiles;
};

export const getAllCombinations = (grid: Tile[], difficulty: DifficultyLevel): GameCombination[] => {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const combinations: GameCombination[] = [];
  const gridSize = config.gridSize;
  const tilesCount = config.tilesCount;
  const operatorsCount = config.operatorsCount;
  const availableOperators = config.availableOperators;

  // For easy mode (2 tiles, 1 operator)
  if (tilesCount === 2 && operatorsCount === 1) {
    // Horizontal combinations
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize - 1; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[row * gridSize + col + 1];
        
        availableOperators.forEach(operator => {
          const result = calculateTwoNumbers(tile1.value, operator, tile2.value);
          if (result >= config.targetRange.min && result <= config.targetRange.max) {
            combinations.push({
              tiles: [tile1, tile2],
              operators: [operator],
              result
            });
          }
        });
      }
    }

    // Vertical combinations
    for (let row = 0; row < gridSize - 1; row++) {
      for (let col = 0; col < gridSize; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[(row + 1) * gridSize + col];
        
        availableOperators.forEach(operator => {
          const result = calculateTwoNumbers(tile1.value, operator, tile2.value);
          if (result >= config.targetRange.min && result <= config.targetRange.max) {
            combinations.push({
              tiles: [tile1, tile2],
              operators: [operator],
              result
            });
          }
        });
      }
    }
  }

  // For medium/hard mode (3 tiles, 2 operators)
  if (tilesCount === 3 && operatorsCount === 2) {
    // Horizontal combinations
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize - 2; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[row * gridSize + col + 1];
        const tile3 = grid[row * gridSize + col + 2];
        
        availableOperators.forEach(op1 => {
          availableOperators.forEach(op2 => {
            const result = calculateResult(tile1.value, op1, tile2.value, op2, tile3.value);
            if (result >= config.targetRange.min && result <= config.targetRange.max && result >= 0) {
              combinations.push({
                tiles: [tile1, tile2, tile3],
                operators: [op1, op2],
                result
              });
            }
          });
        });
      }
    }

    // Vertical combinations
    for (let row = 0; row < gridSize - 2; row++) {
      for (let col = 0; col < gridSize; col++) {
        const tile1 = grid[row * gridSize + col];
        const tile2 = grid[(row + 1) * gridSize + col];
        const tile3 = grid[(row + 2) * gridSize + col];
        
        availableOperators.forEach(op1 => {
          availableOperators.forEach(op2 => {
            const result = calculateResult(tile1.value, op1, tile2.value, op2, tile3.value);
            if (result >= config.targetRange.min && result <= config.targetRange.max && result >= 0) {
              combinations.push({
                tiles: [tile1, tile2, tile3],
                operators: [op1, op2],
                result
              });
            }
          });
        });
      }
    }
  }

  return combinations;
};

export const generateTargets = (combinations: GameCombination[], difficulty: DifficultyLevel): number[] => {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const totalRounds = config.totalRounds;
  
  if (combinations.length === 0) {
    console.warn('No valid combinations found, generating new grid');
    return [];
  }

  // Prioritize combinations with mixed operators
  const mixedOperatorCombinations = combinations.filter(combo => {
    if (combo.operators.length === 1) return true;
    return combo.operators[0] !== combo.operators[1];
  });

  const sameOperatorCombinations = combinations.filter(combo => {
    if (combo.operators.length === 1) return false;
    return combo.operators[0] === combo.operators[1];
  });

  // Select targets from preferred combinations first
  const selectedCombinations: GameCombination[] = [];
  
  // Add mixed operator combinations first
  const shuffledMixed = [...mixedOperatorCombinations].sort(() => Math.random() - 0.5);
  selectedCombinations.push(...shuffledMixed.slice(0, Math.min(totalRounds, shuffledMixed.length)));

  // Fill remaining slots with same operator combinations if needed
  if (selectedCombinations.length < totalRounds) {
    const remaining = totalRounds - selectedCombinations.length;
    const shuffledSame = [...sameOperatorCombinations].sort(() => Math.random() - 0.5);
    selectedCombinations.push(...shuffledSame.slice(0, remaining));
  }

  // If still not enough, add any remaining combinations
  if (selectedCombinations.length < totalRounds) {
    const allRemaining = combinations.filter(combo => 
      !selectedCombinations.some(selected => 
        selected.result === combo.result && 
        selected.tiles.every((tile, i) => tile.id === combo.tiles[i].id)
      )
    );
    const shuffledRemaining = [...allRemaining].sort(() => Math.random() - 0.5);
    selectedCombinations.push(...shuffledRemaining.slice(0, totalRounds - selectedCombinations.length));
  }

  // Extract results and shuffle
  const targets = selectedCombinations.map(combo => combo.result);
  return targets.sort(() => Math.random() - 0.5);
};

const calculateTwoNumbers = (num1: number, operator: string, num2: number): number => {
  switch (operator) {
    case '+':
      return num1 + num2;
    case '-':
      return num1 - num2;
    case '*':
      return num1 * num2;
    default:
      return 0;
  }
};

export const validateGridHasSolutions = (grid: Tile[], difficulty: DifficultyLevel): boolean => {
  const combinations = getAllCombinations(grid, difficulty);
  const config = DIFFICULTY_CONFIGS[difficulty];
  return combinations.length >= config.totalRounds;
};

export const generateValidGrid = (difficulty: DifficultyLevel, maxAttempts: number = 10): Tile[] => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = generateGrid(difficulty);
    if (validateGridHasSolutions(grid, difficulty)) {
      return grid;
    }
  }
  
  // Fallback: return any grid (shouldn't happen with proper number ranges)
  console.warn('Could not generate valid grid after max attempts, returning fallback');
  return generateGrid(difficulty);
};