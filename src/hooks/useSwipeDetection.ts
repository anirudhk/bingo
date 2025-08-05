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

    const tileElement = element.closest('[data-tile-id]');
    if (!tileElement) return null;

    const tileId = parseInt(tileElement.getAttribute('data-tile-id') || '-1');
    return grid.find(tile => tile.id === tileId) || null;
  }, [grid]);

  const getOperatorFromPosition = useCallback((x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    if (!element) return null;

    const operatorElement = element.closest('[data-operator]');
    if (!operatorElement) return null;

    return operatorElement.getAttribute('data-operator');
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
    
    const touch = event.touches[0];
    if (!touch) return;

    const tile = getTileFromPosition(touch.clientX, touch.clientY);
    if (!tile) return;

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
    
    if (!isActive || !startPosition.current) return;
    
    const touch = event.touches[0];
    if (!touch) return;

    // Check if we've moved enough to register as a swipe
    const deltaX = Math.abs(touch.clientX - startPosition.current.x);
    const deltaY = Math.abs(touch.clientY - startPosition.current.y);
    
    if (deltaX < TOUCH_THRESHOLD && deltaY < TOUCH_THRESHOLD) return;

    const currentTile = getTileFromPosition(touch.clientX, touch.clientY);
    
    if (currentTile && currentTile.id !== lastTile.current?.id) {
      updatePath(currentTile);
      lastTile.current = currentTile;
      
      // Update operators based on current path
      const newOperators = calculateOperatorsFromPath(currentPath);
      setCurrentOperators(newOperators);
      
      // Calculate result for real-time feedback
      const result = calculatePathResult(currentPath, newOperators);
      onSwipeUpdate(currentPath, newOperators, result);
    }
  }, [isActive, currentPath, getTileFromPosition, updatePath, calculateOperatorsFromPath, onSwipeUpdate]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    event.preventDefault();
    
    if (!isActive) return;
    
    const touchDuration = Date.now() - touchStartTime.current;
    
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

  return {
    isActive,
    currentPath,
    currentOperators,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel
    }
  };
};