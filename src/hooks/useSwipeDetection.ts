import { useCallback, useRef, useState } from 'react';
import { Tile, TouchPosition, DifficultyLevel } from '../types/game';
import { DIFFICULTY_CONFIGS, TOUCH_THRESHOLD } from '../constants/game';
import { isValidPath, calculatePathResult } from '../utils/calculator';

interface UseSwipeDetectionProps {
  grid: Tile[];
  difficulty: DifficultyLevel;
  onSwipeUpdate: (tiles: Tile[], operators: string[], result: number | null) => void;
  onSwipeComplete: (tiles: Tile[], operators: string[]) => void;
  onSwipeCancel: () => void;
}

export const useSwipeDetection = ({
  grid,
  difficulty,
  onSwipeUpdate,
  onSwipeComplete,
  onSwipeCancel
}: UseSwipeDetectionProps) => {
  const [isActive, setIsActive] = useState(false);
  const [currentPath, setCurrentPath] = useState<Tile[]>([]);
  const [currentOperators, setCurrentOperators] = useState<string[]>([]);
  
  const startPosition = useRef<TouchPosition | null>(null);
  const lastTile = useRef<Tile | null>(null);
  const touchStartTime = useRef<number>(0);

  const config = DIFFICULTY_CONFIGS[difficulty];

  const getTileFromPosition = useCallback((x: number, y: number): Tile | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    // Look for tile element or its children
    const tileElement = element.closest('[data-tile-id]') || element.querySelector('[data-tile-id]');
    if (!tileElement) return null;

    const tileId = parseInt(tileElement.getAttribute('data-tile-id') || '-1');
    if (isNaN(tileId)) return null;
    
    const tile = grid.find(tile => tile.id === tileId);
    
    // If we have a last tile, only allow detection of tiles in the drag direction
    if (tile && lastTile.current && isActive) {
      const gridSize = Math.sqrt(grid.length);
      const lastTileRow = Math.floor(lastTile.current.id / gridSize);
      const lastTileCol = lastTile.current.id % gridSize;
      const currentTileRow = Math.floor(tile.id / gridSize);
      const currentTileCol = tile.id % gridSize;
      
      // Calculate the direction from start position to current mouse position
      const startX = startPosition.current?.x || 0;
      const startY = startPosition.current?.y || 0;
      const mouseX = x;
      const mouseY = y;
      
      const dragDirectionX = mouseX - startX;
      const dragDirectionY = mouseY - startY;
      
      // Determine the primary drag direction
      const isHorizontalDrag = Math.abs(dragDirectionX) > Math.abs(dragDirectionY);
      const isRightDrag = dragDirectionX > 0;
      const isDownDrag = dragDirectionY > 0;
      
      // Only allow tiles that are in the drag direction
      if (isHorizontalDrag) {
        // Horizontal drag - only allow tiles in the same row
        if (currentTileRow !== lastTileRow) {
          return null; // Different row, not allowed
        }
        if (isRightDrag && currentTileCol <= lastTileCol) {
          return null; // Moving right but tile is to the left
        }
        if (!isRightDrag && currentTileCol >= lastTileCol) {
          return null; // Moving left but tile is to the right
        }
      } else {
        // Vertical drag - only allow tiles in the same column
        if (currentTileCol !== lastTileCol) {
          return null; // Different column, not allowed
        }
        if (isDownDrag && currentTileRow <= lastTileRow) {
          return null; // Moving down but tile is above
        }
        if (!isDownDrag && currentTileRow >= lastTileRow) {
          return null; // Moving up but tile is below
        }
      }
    }
    
    return tile || null;
  }, [grid, lastTile, isActive, startPosition]);

  const getOperatorFromPosition = useCallback((x: number, y: number): {operator: string, position: {row: number, col: number, pos: 'horizontal' | 'vertical'}} | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    // Look for operator element or its children
    let operatorElement = element.closest('[data-operator]') || element.querySelector('[data-operator]');
    
    // If not found, try looking in parent elements or nearby elements
    if (!operatorElement) {
      // Look in parent containers
      const parent = element.parentElement;
      if (parent) {
        operatorElement = parent.querySelector('[data-operator]');
      }
      
      // If still not found, try looking in the game grid area
      if (!operatorElement) {
        const gameGrid = document.getElementById('game-grid');
        if (gameGrid) {
          // Find the closest operator element to the mouse position
          const allOperators = gameGrid.querySelectorAll('[data-operator]');
          

          
          let closestOperator = null;
          let closestDistance = Infinity;
          
          allOperators.forEach((op) => {
            const rect = op.getBoundingClientRect();
            const operator = op.getAttribute('data-operator');
            const key = op.getAttribute('data-operator-key');
            
            // Check if mouse is within the operator's bounding rectangle
            const isWithinBounds = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
            
            if (isWithinBounds) {
              // If mouse is within bounds, this is the most precise match
              closestDistance = 0;
              closestOperator = op;
              return; // Exit early for exact match
            }
            
            // Otherwise, find the closest operator
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            
            if (distance < closestDistance && distance < 80) { // Increased to 80px for easier detection
              closestDistance = distance;
              closestOperator = op;
            }
          });
          
          operatorElement = closestOperator;
        }
      }
    }
    
    if (!operatorElement) {
      return null;
    }

    const operator = operatorElement.getAttribute('data-operator');
    if (!operator) {
      return null;
    }
    


    // Extract position information from the operator element
    const key = operatorElement.getAttribute('data-operator-key');
    
          if (key) {
        const parts = key.split('-');
      
      if (parts.length >= 4) {
        const pos = parts[0];
        const row = parts[1];
        const col = parts[2];
        const keyOperator = parts[3];
        
        // Convert MINUS back to - if needed
        const parsedOperator = keyOperator === 'MINUS' ? '-' : keyOperator;
        
        // Use the data-operator attribute directly instead of parsing the key
        // This is more reliable since the key parsing can be complex with '-' operators
        const result = {
          operator,
          position: {
            row: parseInt(row),
            col: parseInt(col),
            pos: pos as 'horizontal' | 'vertical'
          }
        };

        
        return result;
      } else {
        // Invalid key format
      }
    }

    return { operator, position: { row: -1, col: -1, pos: 'horizontal' as const } };
  }, []);



  const calculateOperatorsFromPath = useCallback((tiles: Tile[]): string[] => {
    if (tiles.length < 2) return [];
    
    const operators: string[] = [];
    
    // For now, we'll use a simple heuristic to determine operators
    // In a real implementation, this would be based on which operator icons were swiped through
    for (let i = 0; i < tiles.length - 1; i++) {
      // Default to addition - this should be replaced with actual operator detection
      operators.push('+');
    }
    
    return operators;
  }, []);

  // Track the last detected operator for better operator detection
  const lastDetectedOperator = useRef<string | null>(null);
  const lastDetectedOperatorPosition = useRef<{row: number, col: number, pos: 'horizontal' | 'vertical'} | null>(null);

  const checkIfOperatorBetweenTiles = useCallback((operatorData: {operator: string, position: {row: number, col: number, pos: 'horizontal' | 'vertical'}}, path: Tile[]) => {
    if (path.length < 2) return false;
    
    // Get the last two tiles in the path
    const tile1 = path[path.length - 2];
    const tile2 = path[path.length - 1];
    
    // Calculate the grid positions of the tiles
    const gridSize = Math.sqrt(grid.length);
    const tile1Row = Math.floor(tile1.id / gridSize);
    const tile1Col = tile1.id % gridSize;
    const tile2Row = Math.floor(tile2.id / gridSize);
    const tile2Col = tile2.id % gridSize;
    

    
    // Check if operator is between these two tiles
    if (operatorData.position.pos === 'horizontal') {
      // Horizontal operator should be between tiles in the same row
      const isSameRow = tile1Row === tile2Row;
      const isOperatorInRow = operatorData.position.row === tile1Row;
      // For horizontal movement, just check if operator is in the same row and roughly in the right area
      const minCol = Math.min(tile1Col, tile2Col);
      const maxCol = Math.max(tile1Col, tile2Col);
      const isBetweenCols = operatorData.position.col >= minCol && operatorData.position.col <= maxCol;
      
      const isBetweenHorizontally = isSameRow && isOperatorInRow && isBetweenCols;
      

      return isBetweenHorizontally;
    } else {
      // Vertical operator should be between tiles in the same column
      const isSameCol = tile1Col === tile2Col;
      const isOperatorInCol = operatorData.position.col === tile1Col;
      // For vertical movement, just check if operator is in the same column and roughly in the right area
      const minRow = Math.min(tile1Row, tile2Row);
      const maxRow = Math.max(tile1Row, tile2Row);
      const isBetweenRows = operatorData.position.row >= minRow && operatorData.position.row <= maxRow;
      
      const isBetweenVertically = isSameCol && isOperatorInCol && isBetweenRows;
      

      return isBetweenVertically;
    }
  }, [grid]);

  const updateOperatorsWithDetection = useCallback((detectedOperator: string | null, pathLength?: number) => {
    const actualPathLength = pathLength || currentPath.length;
    console.log('updateOperatorsWithDetection called with:', detectedOperator, 'path length:', actualPathLength);
    
    if (detectedOperator && actualPathLength > 0) {
      lastDetectedOperator.current = detectedOperator;
      
      // Update operators array with the detected operator for the last position
      const newOperators: string[] = [];
      for (let i = 0; i < actualPathLength - 1; i++) {
        if (i === actualPathLength - 2) {
          // Use the detected operator for the last position
          newOperators.push(detectedOperator);
        } else {
          // Keep existing operators for previous positions
          newOperators.push(currentOperators[i] || '+');
        }
      }
      
      console.log('Updated operators:', newOperators, 'for path length:', actualPathLength);
      console.log('🔧 Setting operators:', newOperators);
      setCurrentOperators(newOperators);
      return newOperators;
    }
    return currentOperators;
  }, [currentPath, currentOperators]);

  const updatePath = useCallback((newTile: Tile) => {
    setCurrentPath(prevPath => {
      const newPath = [...prevPath];
      
      // If this tile is already in the path, truncate to that point
      const existingIndex = newPath.findIndex(tile => tile.id === newTile.id);
      if (existingIndex !== -1) {
        return newPath.slice(0, existingIndex + 1);
      }
      
      // Check if we've reached the maximum tiles for this difficulty
      if (newPath.length >= config.tilesCount) {
        return newPath;
      }
      
      // Add the new tile if it creates a valid path
      const testPath = [...newPath, newTile];
      if (isValidPath(testPath)) {
        return testPath;
      }
      
      return newPath;
    });
  }, [config.tilesCount]);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const touch = event.touches[0];
    if (!touch) return;

    const tile = getTileFromPosition(touch.clientX, touch.clientY);
    if (!tile) return;

    console.log('Touch start on tile:', tile.id, tile.value);
    
    setIsActive(true);
    setCurrentPath([tile]);
    setCurrentOperators([]);
    
    startPosition.current = { x: touch.clientX, y: touch.clientY };
    lastTile.current = tile;
    touchStartTime.current = Date.now();
    
    onSwipeUpdate([tile], [], null);
  }, [getTileFromPosition, onSwipeUpdate]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!isActive || !startPosition.current) return;
    
    const touch = event.touches[0];
    if (!touch) return;

    // Check if we've moved enough to register as a swipe
    const deltaX = Math.abs(touch.clientX - startPosition.current.x);
    const deltaY = Math.abs(touch.clientY - startPosition.current.y);
    
    if (deltaX < TOUCH_THRESHOLD && deltaY < TOUCH_THRESHOLD) return;

    const currentTile = getTileFromPosition(touch.clientX, touch.clientY);
    const currentOperatorData = getOperatorFromPosition(touch.clientX, touch.clientY);
    
    // If we found a new tile, update the path
    if (currentTile && currentTile.id !== lastTile.current?.id) {
      console.log('Touch move to tile:', currentTile.id, currentTile.value);
      
      updatePath(currentTile);
      lastTile.current = currentTile;
      
      // Update operators based on current path
      const newOperators = calculateOperatorsFromPath(currentPath);
      setCurrentOperators(newOperators);
      
      // Calculate result for real-time feedback
      const result = calculatePathResult(currentPath, newOperators);
      onSwipeUpdate(currentPath, newOperators, result);
    }
    
    // If we found an operator, update the operators array
    if (currentOperatorData && currentPath.length > 0) {
      console.log('Touch move to operator:', currentOperatorData.operator, 'at position:', currentOperatorData.position);
      
      // Update operators with the detected operator
      const newOperators = updateOperatorsWithDetection(currentOperatorData.operator);
      
      // Calculate result with the updated operators
      const result = calculatePathResult(currentPath, newOperators);
      console.log('Calculation result:', result, 'for path:', currentPath.map(t => t.value), 'operators:', newOperators);
      onSwipeUpdate(currentPath, newOperators, result);
    } else if (currentOperatorData) {
      // Store the operator for when we have enough tiles
      console.log('Operator detected but path too short:', currentOperatorData.operator);
      lastDetectedOperator.current = currentOperatorData.operator;
    }
  }, [isActive, currentPath, getTileFromPosition, getOperatorFromPosition, updatePath, calculateOperatorsFromPath, onSwipeUpdate]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    if (!isActive) return;
    

    
    // Validate the final path
    if (currentPath.length === config.tilesCount && isValidPath(currentPath)) {
      onSwipeComplete(currentPath, currentOperators);
    } else {
      onSwipeCancel();
    }
    
    // Reset state
    setIsActive(false);
    setCurrentPath([]);
    setCurrentOperators([]);
    startPosition.current = null;
    lastTile.current = null;
  }, [isActive, currentPath, currentOperators, config.tilesCount, onSwipeComplete, onSwipeCancel]);

  const handleTouchCancel = useCallback((event: TouchEvent) => {
    event.preventDefault();
    onSwipeCancel();
    
    setIsActive(false);
    setCurrentPath([]);
    setCurrentOperators([]);
    startPosition.current = null;
    lastTile.current = null;
  }, [onSwipeCancel]);

  // Mouse event handlers for desktop testing
  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const tile = getTileFromPosition(event.clientX, event.clientY);
    
    if (!tile) {
      return;
    }

    console.log('🎯 CLICKED:', tile.value, 'at position', Math.floor(tile.id / Math.sqrt(grid.length)), tile.id % Math.sqrt(grid.length));
    
    setIsActive(true);
    setCurrentPath([tile]);
    setCurrentOperators([]);
    
    startPosition.current = { x: event.clientX, y: event.clientY };
    lastTile.current = tile;
    touchStartTime.current = Date.now();
    
    onSwipeUpdate([tile], [], null);
  }, [getTileFromPosition, onSwipeUpdate, grid]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isActive || !startPosition.current) {
      return;
    }
    
    const currentTile = getTileFromPosition(event.clientX, event.clientY);
    const currentOperatorData = getOperatorFromPosition(event.clientX, event.clientY);
    
    // If we found a new tile, update the path
    if (currentTile && currentTile.id !== lastTile.current?.id) {
      // Only add new tiles if we're actually dragging with intent (not just hovering)
      const distance = Math.sqrt(
        Math.pow(event.clientX - (startPosition.current?.x || 0), 2) + 
        Math.pow(event.clientY - (startPosition.current?.y || 0), 2)
      );
      
      // Only add tile if we've moved at least 30px from the start position
      if (distance > 30) {
        // Check if this tile is in a reasonable direction from the last tile
        const gridSize = Math.sqrt(grid.length);
        const lastTileRow = Math.floor((lastTile.current?.id || 0) / gridSize);
        const lastTileCol = (lastTile.current?.id || 0) % gridSize;
        const currentTileRow = Math.floor(currentTile.id / gridSize);
        const currentTileCol = currentTile.id % gridSize;
        
        // Calculate the direction vector
        const rowDiff = currentTileRow - lastTileRow;
        const colDiff = currentTileCol - lastTileCol;
        
        // Only allow movement in straight lines (horizontal, vertical, or diagonal)
        const isStraightLine = (Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1) && 
                              (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff));
        
        if (isStraightLine) {
          console.log('🎯 DESTINATION:', currentTile.value, 'at position', Math.floor(currentTile.id / gridSize), currentTile.id % gridSize);
          
          // Create the new path with the current tile
          const newPath = [...currentPath, currentTile];
          console.log('🔄 New path created:', newPath.map(t => t.value));
          
          updatePath(currentTile);
          lastTile.current = currentTile;
          
          // Check for operators between the last two tiles using the new path
          if (newPath.length >= 2) {
            // Only look for operators in the direction of movement
            const lastTile = newPath[newPath.length - 2];
            const currentTile = newPath[newPath.length - 1];
            const gridSize = Math.sqrt(grid.length);
            const lastTileRow = Math.floor(lastTile.id / gridSize);
            const lastTileCol = lastTile.id % gridSize;
            const currentTileRow = Math.floor(currentTile.id / gridSize);
            const currentTileCol = currentTile.id % gridSize;
            
            // Determine the direction of movement
            const isHorizontal = lastTileRow === currentTileRow;
            const isVertical = lastTileCol === currentTileCol;
            
            console.log('🎯 Movement direction:', { isHorizontal, isVertical, from: `${lastTile.value}(${lastTileRow},${lastTileCol})`, to: `${currentTile.value}(${currentTileRow},${currentTileCol})` });
            
            // Only look for operators in the correct direction
            let operatorData = null;
            if (isHorizontal) {
              // For horizontal movement, look for horizontal operators
              operatorData = getOperatorFromPosition(event.clientX, event.clientY);
              console.log('🔍 Horizontal operator detection:', operatorData);
              if (operatorData && operatorData.position.pos !== 'horizontal') {
                console.log('❌ Ignoring vertical operator for horizontal movement');
                operatorData = null; // Ignore vertical operators for horizontal movement
              }
            } else if (isVertical) {
              // For vertical movement, look for vertical operators
              operatorData = getOperatorFromPosition(event.clientX, event.clientY);
              console.log('🔍 Vertical operator detection:', operatorData);
              if (operatorData && operatorData.position.pos !== 'vertical') {
                console.log('❌ Ignoring horizontal operator for vertical movement');
                operatorData = null; // Ignore horizontal operators for vertical movement
              }
            }
            
            console.log('🎯 After initial detection:', operatorData);
            
            // If no operator detected at current position, try to find operator between the tiles
            if (!operatorData) {
              // Calculate the position between the two tiles
              const betweenRow = isHorizontal ? lastTileRow : Math.floor((lastTileRow + currentTileRow) / 2);
              const betweenCol = isVertical ? lastTileCol : Math.floor((lastTileCol + currentTileCol) / 2);
              
              // Try to find operator at the position between tiles
              const gameGrid = document.getElementById('game-grid');
              if (gameGrid) {
                const allOperators = gameGrid.querySelectorAll('[data-operator]');
                let closestOperator = null;
                let closestDistance = Infinity;
                
                allOperators.forEach((op) => {
                  const rect = op.getBoundingClientRect();
                  const operator = op.getAttribute('data-operator');
                  const key = op.getAttribute('data-operator-key');
                  
                  if (key) {
                    const parts = key.split('-');
                    if (parts.length >= 4) {
                      const pos = parts[0];
                      const row = parseInt(parts[1]);
                      const col = parseInt(parts[2]);
                      const keyOperator = parts[3];
                      const parsedOperator = keyOperator === 'MINUS' ? '-' : keyOperator;
                      
                      // Check if this operator is in the correct position and direction
                      const isCorrectPosition = row === betweenRow && col === betweenCol;
                      const isCorrectDirection = (isHorizontal && pos === 'horizontal') || (isVertical && pos === 'vertical');
                      
                      if (isCorrectPosition && isCorrectDirection) {
                        operatorData = {
                          operator,
                          position: {
                            row,
                            col,
                            pos: pos as 'horizontal' | 'vertical'
                          }
                        };
                        console.log('🔍 Found operator between tiles:', operatorData);
                      }
                    }
                  }
                });
              }
            }
            
            if (operatorData) {
              const isOperatorBetweenTiles = checkIfOperatorBetweenTiles(operatorData, newPath);
              if (isOperatorBetweenTiles) {
                const newOperators = updateOperatorsWithDetection(operatorData.operator, newPath.length);
                console.log('🔧 Before calculation - Path:', newPath.map(t => t.value), 'Operators:', newOperators);
                const result = calculatePathResult(newPath, newOperators);
                console.log('✅ OPERATOR ACTIVATED:', operatorData.operator, 'for path:', newPath.map(t => t.value).join(' → '), '=', result);
                console.log('📊 Current path:', newPath.map(t => t.value), 'Operators:', newOperators);
                onSwipeUpdate(newPath, newOperators, result);
              } else {
                console.log('❌ Operator not between tiles:', operatorData.operator);
              }
            } else {
              // Try using the stored operator if no operator detected at current position
              if (lastDetectedOperator.current) {
                console.log('🔄 Using stored operator:', lastDetectedOperator.current);
                const newOperators = updateOperatorsWithDetection(lastDetectedOperator.current, newPath.length);
                console.log('🔧 Before calculation - Path:', newPath.map(t => t.value), 'Operators:', newOperators);
                const result = calculatePathResult(newPath, newOperators);
                console.log('✅ OPERATOR ACTIVATED (stored):', lastDetectedOperator.current, 'for path:', newPath.map(t => t.value).join(' → '), '=', result);
                console.log('📊 Current path:', newPath.map(t => t.value), 'Operators:', newOperators);
                onSwipeUpdate(newPath, newOperators, result);
              } else {
                console.log('❌ No operator detected at position or wrong operator type');
              }
            }
          } else {
            console.log('⚠️ Path length too short for operator detection:', newPath.length);
          }
        }
      }
    }
    
    // If we found an operator, store it for later use
    if (currentOperatorData && currentPath.length > 0) {
      // Store the operator for potential use later
      lastDetectedOperator.current = currentOperatorData.operator;
      lastDetectedOperatorPosition.current = currentOperatorData.position;
    }
  }, [isActive, currentPath, getTileFromPosition, getOperatorFromPosition, updatePath, calculateOperatorsFromPath, onSwipeUpdate]);

  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!isActive) return;
    
    // Validate the final path
    if (currentPath.length === config.tilesCount && isValidPath(currentPath)) {
      onSwipeComplete(currentPath, currentOperators);
    } else {
      onSwipeCancel();
    }
    
    // Reset state
    setIsActive(false);
    setCurrentPath([]);
    setCurrentOperators([]);
    startPosition.current = null;
    lastTile.current = null;
  }, [isActive, currentPath, currentOperators, config.tilesCount, onSwipeComplete, onSwipeCancel]);

  return {
    isActive,
    currentPath,
    currentOperators,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp
    }
  };
};