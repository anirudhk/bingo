import { create } from 'zustand';
import { GameState, DifficultyLevel, Tile, SwipeState } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../constants/game';
import { generateValidGrid, getAllCombinations, generateTargets } from '../utils/gridGenerator';
import { calculatePathResult } from '../utils/calculator';

interface GameStore extends GameState {
  // Actions
  initializeGame: (difficulty: DifficultyLevel) => void;
  submitSolution: (tiles: Tile[], operators: string[]) => boolean;
  nextRound: () => void;
  resetGame: () => void;
  updateSwipeState: (swipeState: Partial<SwipeState>) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  startRoundTimer: () => void;
  updateTimer: () => void;
  stopRoundTimer: () => void;
}

const initialSwipeState: SwipeState = {
  isActive: false,
  startTile: null,
  currentPath: [],
  operators: [],
  result: null
};

const createInitialState = (): Omit<GameState, 'swipeState'> & { swipeState: SwipeState } => ({
  grid: [],
  targetNumbers: [],
  currentTarget: 0,
  currentRound: 0,
  totalRounds: 0,
  score: 0,
  difficulty: 'medium',
  gameStatus: 'paused',
  roundTime: 0,
  totalTime: 0,
  roundStartTime: null,
  swipeState: { ...initialSwipeState }
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  initializeGame: (difficulty: DifficultyLevel) => {
    const config = DIFFICULTY_CONFIGS[difficulty];
    
    // Generate a valid grid
    const grid = generateValidGrid(difficulty);
    
    // Get all possible combinations
    const combinations = getAllCombinations(grid, difficulty);
    
    // Generate target numbers
    const targetNumbers = generateTargets(combinations, difficulty);
    
    if (targetNumbers.length === 0) {
      console.error('Could not generate valid targets, retrying...');
      // Retry with a new grid
      get().initializeGame(difficulty);
      return;
    }

    set({
      grid: grid.map(tile => ({ ...tile, selected: false })),
      targetNumbers,
      currentTarget: targetNumbers[0],
      currentRound: 1,
      totalRounds: config.totalRounds,
      score: 0,
      difficulty,
      gameStatus: 'playing',
      roundTime: 0,
      totalTime: 0,
      roundStartTime: Date.now(),
      swipeState: { ...initialSwipeState }
    });
  },

  submitSolution: (tiles: Tile[], operators: string[]): boolean => {
    const { currentTarget, difficulty } = get();
    
    const result = calculatePathResult(tiles, operators);
    
    if (result === currentTarget) {
      // Correct solution

      const baseScore = 10;
      const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
      const roundScore = Math.floor(baseScore * difficultyMultiplier);
      
      set(state => ({
        score: state.score + roundScore,
        swipeState: { ...initialSwipeState }
      }));
      
      // Auto-advance to next round after a short delay
      setTimeout(() => {
        get().nextRound();
      }, 1500);
      
      return true;
    } else {
      // Incorrect solution
      set({
        swipeState: { ...initialSwipeState }
      });
      return false;
    }
  },

  nextRound: () => {
    const { targetNumbers, currentRound, totalRounds, roundStartTime } = get();
    
    if (currentRound >= totalRounds) {
      // Game completed - capture final time
      const currentTime = Date.now();
      const finalTime = roundStartTime ? currentTime - roundStartTime : 0;
      
      set({
        gameStatus: 'completed',
        roundStartTime: null,
        totalTime: finalTime,
        swipeState: { ...initialSwipeState }
      });
      return;
    }
    
    const nextRound = currentRound + 1;
    const nextTarget = targetNumbers[nextRound - 1];
    
    set({
      currentRound: nextRound,
      currentTarget: nextTarget,
      grid: get().grid.map(tile => ({ ...tile, selected: false })),
      swipeState: { ...initialSwipeState }
    });
  },

  resetGame: () => {
    const { difficulty } = get();
    get().initializeGame(difficulty);
  },

  updateSwipeState: (newSwipeState: Partial<SwipeState>) => {
    set(state => ({
      swipeState: {
        ...state.swipeState,
        ...newSwipeState
      }
    }));
  },

  setDifficulty: (difficulty: DifficultyLevel) => {
    set({ difficulty });
  },

  pauseGame: () => {
    set({
      gameStatus: 'paused',
      swipeState: { ...initialSwipeState }
    });
  },

  resumeGame: () => {
    set({ gameStatus: 'playing' });
  },

  startRoundTimer: () => {
    set({ roundStartTime: Date.now() });
  },

  updateTimer: () => {
    const { roundStartTime, totalTime } = get();
    if (roundStartTime) {
      const currentTime = Date.now();
      const totalElapsed = currentTime - roundStartTime;
      set({ 
        roundTime: totalElapsed,
        totalTime: totalElapsed
      });
    }
  },

  stopRoundTimer: () => {
    const { roundStartTime, totalTime } = get();
    if (roundStartTime) {
      const currentTime = Date.now();
      const roundElapsed = currentTime - roundStartTime;
      set({ 
        roundTime: roundElapsed,
        totalTime: totalTime + roundElapsed,
        roundStartTime: null
      });
    }
  }
}));