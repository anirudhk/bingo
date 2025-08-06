import { Tile } from '../types/game';

export const calculateResult = (num1: number, op1: string, num2: number, op2: string, num3: number): number => {
  // Calculate left to right (no operator precedence for simplicity)
  let result = num1;
  
  // Apply first operation
  switch (op1) {
    case '+':
      result += num2;
      break;
    case '-':
      result -= num2;
      break;
    case '*':
      result *= num2;
      break;
    default:
      throw new Error(`Invalid operator: ${op1}`);
  }
  
  // Apply second operation
  switch (op2) {
    case '+':
      result += num3;
      break;
    case '-':
      result -= num3;
      break;
    case '*':
      result *= num3;
      break;
    default:
      throw new Error(`Invalid operator: ${op2}`);
  }
  
  return result;
};

export const calculatePathResult = (tiles: Tile[], operators: string[]): number | null => {
  if (tiles.length !== operators.length + 1) {
    return null;
  }

  if (tiles.length === 2 && operators.length === 1) {
    // Easy mode: 2 tiles, 1 operator
    const [tile1, tile2] = tiles;
    const [op1] = operators;
    

    
    switch (op1) {
      case '+':
        return tile1.value + tile2.value;
      case '-':
        return tile1.value - tile2.value;
      case '*':
        return tile1.value * tile2.value;
      default:
        console.log('Invalid operator:', op1);
        return null;
    }
  }

  if (tiles.length === 3 && operators.length === 2) {
    // Medium/Hard mode: 3 tiles, 2 operators
    const [tile1, tile2, tile3] = tiles;
    const [op1, op2] = operators;
    
    console.log('Medium/Hard mode calculation:', tile1.value, op1, tile2.value, op2, tile3.value);
    
    return calculateResult(tile1.value, op1, tile2.value, op2, tile3.value);
  }

  console.log('No matching calculation pattern');
  return null;
};

export const isValidPath = (tiles: Tile[]): boolean => {
  if (tiles.length < 2) return false;

  // Check if all tiles are adjacent and form a straight line
  for (let i = 0; i < tiles.length - 1; i++) {
    const current = tiles[i];
    const next = tiles[i + 1];

    // Check if tiles are adjacent (horizontally or vertically)
    const rowDiff = Math.abs(current.position.row - next.position.row);
    const colDiff = Math.abs(current.position.col - next.position.col);

    // Must be adjacent (either horizontal or vertical, not diagonal)
    if (!((rowDiff === 0 && colDiff === 1) || (rowDiff === 1 && colDiff === 0))) {
      return false;
    }
  }

  // Check if path is straight (all horizontal or all vertical)
  if (tiles.length > 2) {
    const isHorizontal = tiles.every(tile => tile.position.row === tiles[0].position.row);
    const isVertical = tiles.every(tile => tile.position.col === tiles[0].position.col);

    if (!isHorizontal && !isVertical) {
      return false;
    }

    // Check if tiles are in sequence (no gaps)
    if (isHorizontal) {
      const sortedTiles = [...tiles].sort((a, b) => a.position.col - b.position.col);
      for (let i = 0; i < sortedTiles.length - 1; i++) {
        if (sortedTiles[i + 1].position.col - sortedTiles[i].position.col !== 1) {
          return false;
        }
      }
    } else if (isVertical) {
      const sortedTiles = [...tiles].sort((a, b) => a.position.row - b.position.row);
      for (let i = 0; i < sortedTiles.length - 1; i++) {
        if (sortedTiles[i + 1].position.row - sortedTiles[i].position.row !== 1) {
          return false;
        }
      }
    }
  }

  return true;
};

export const getTilesBetween = (startTile: Tile, endTile: Tile, grid: Tile[]): Tile[] => {
  const path: Tile[] = [startTile];
  
  const rowDiff = endTile.position.row - startTile.position.row;
  const colDiff = endTile.position.col - startTile.position.col;
  
  // Only handle straight lines
  if (rowDiff !== 0 && colDiff !== 0) {
    return []; // Not a straight line
  }
  
  if (rowDiff === 0) {
    // Horizontal movement
    const step = colDiff > 0 ? 1 : -1;
    for (let col = startTile.position.col + step; col !== endTile.position.col; col += step) {
      const tile = grid.find(t => t.position.row === startTile.position.row && t.position.col === col);
      if (tile) path.push(tile);
    }
  } else if (colDiff === 0) {
    // Vertical movement
    const step = rowDiff > 0 ? 1 : -1;
    for (let row = startTile.position.row + step; row !== endTile.position.row; row += step) {
      const tile = grid.find(t => t.position.row === row && t.position.col === startTile.position.col);
      if (tile) path.push(tile);
    }
  }
  
  path.push(endTile);
  return path;
};

export const getOperatorsBetweenTiles = (tiles: Tile[]): string[] => {
  // This would be determined by the actual swipe path through operator icons
  // For now, return placeholder - will be updated with actual swipe detection
  const operators: string[] = [];
  
  for (let i = 0; i < tiles.length - 1; i++) {
    // Default to addition for now - actual implementation will detect which operator was swiped through
    operators.push('+');
  }
  
  return operators;
};

export const formatCalculation = (tiles: Tile[], operators: string[]): string => {
  let calculation = '';
  
  for (let i = 0; i < tiles.length; i++) {
    calculation += tiles[i].value.toString();
    if (i < operators.length) {
      calculation += ` ${operators[i]} `;
    }
  }
  
  return calculation;
};