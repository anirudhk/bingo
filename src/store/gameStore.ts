import { create } from 'zustand';
import { GameState, DifficultyLevel, GameMode, Tile, SwipeState } from '../types/game';
import { DIFFICULTY_CONFIGS } from '../constants/game';
import { generateValidGrid, getAllCombinations, generateTargets } from '../utils/gridGenerator';
import { calculatePathResult } from '../utils/calculator';

interface GameStore extends GameState {
  // Actions
  initializeGame: (difficulty: DifficultyLevel, gameMode?: GameMode) => void;
  submitSolution: (tiles: Tile[], operators: string[]) => boolean;
  nextRound: () => void;
  resetGame: () => void;
  updateSwipeState: (swipeState: Partial<SwipeState>) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  setGameMode: (gameMode: GameMode) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  startRoundTimer: () => void;
  updateTimer: () => void;
  stopRoundTimer: () => void;
  startTimeAttack: () => void;
  updateTimeAttack: () => void;
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
  gameMode: 'classic',
  gameStatus: 'paused',
  roundTime: 0,
  totalTime: 0,
  roundStartTime: null,
  timeAttackTimeLeft: undefined,
  timeAttackRoundsCompleted: undefined,
  swipeState: { ...initialSwipeState }
});

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  initializeGame: (difficulty: DifficultyLevel, gameMode: GameMode = 'classic') => {
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
      get().initializeGame(difficulty, gameMode);
      return;
    }

    const initialState = {
      grid: grid.map(tile => ({ ...tile, selected: false })),
      targetNumbers,
      currentTarget: targetNumbers[0],
      currentRound: 1,
      totalRounds: gameMode === 'timeAttack' ? 999 : config.totalRounds, // Unlimited rounds for time attack
      score: 0,
      difficulty,
      gameMode,
      gameStatus: 'playing' as const,
      roundTime: 0,
      totalTime: 0,
      roundStartTime: Date.now(),
      swipeState: { ...initialSwipeState },
      timeAttackTimeLeft: gameMode === 'timeAttack' ? 60000 : undefined, // 60 seconds in milliseconds
      timeAttackRoundsCompleted: gameMode === 'timeAttack' ? 0 : undefined
    };

    set(initialState);
    
    // Start time attack timer if in time attack mode
    if (gameMode === 'timeAttack') {
      get().startTimeAttack();
    }
  },

  submitSolution: (tiles: Tile[], operators: string[]): boolean => {
    const { currentTarget, difficulty, gameMode } = get();
    
    const result = calculatePathResult(tiles, operators);
    
    if (result === currentTarget) {
      // Correct solution
      const baseScore = 10;
      const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
      const timeAttackMultiplier = gameMode === 'timeAttack' ? 2 : 1; // Double points in time attack
      const roundScore = Math.floor(baseScore * difficultyMultiplier * timeAttackMultiplier);
      
      set(state => ({
        score: state.score + roundScore,
        swipeState: { ...initialSwipeState }
      }));
      
      // Update time attack counter if in time attack mode
      if (gameMode === 'timeAttack') {
        get().updateTimeAttack();
      }
      
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
    const { targetNumbers, currentRound, totalRounds, roundStartTime, gameMode, difficulty } = get();
    
    // For time attack mode, don't end the game based on rounds - only on time
    if (gameMode === 'timeAttack') {
      // Generate a new target and continue
      const { grid } = get();
      const combinations = getAllCombinations(grid, difficulty);
      const newTargets = generateTargets(combinations, difficulty);
      
      if (newTargets.length > 0) {
        const randomTarget = newTargets[Math.floor(Math.random() * newTargets.length)];
        set({
          currentTarget: randomTarget,
          grid: get().grid.map(tile => ({ ...tile, selected: false })),
          swipeState: { ...initialSwipeState }
        });
      }
      return;
    }
    
    // Classic mode logic
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
    const { difficulty, gameMode } = get();
    get().initializeGame(difficulty, gameMode);
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

  setGameMode: (gameMode: GameMode) => {
    set({ gameMode });
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
    const { roundStartTime } = get();
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
  },

  startTimeAttack: () => {
    const interval = setInterval(() => {
      const { timeAttackTimeLeft, gameStatus } = get();
      
      if (gameStatus !== 'playing' || !timeAttackTimeLeft) {
        clearInterval(interval);
        return;
      }
      
      const newTimeLeft = timeAttackTimeLeft - 100; // Decrease by 100ms
      
      if (newTimeLeft <= 0) {
        clearInterval(interval);
        set({
          timeAttackTimeLeft: 0,
          gameStatus: 'completed'
        });
      } else {
        set({ timeAttackTimeLeft: newTimeLeft });
      }
    }, 100); // Update every 100ms for smooth countdown
  },

  updateTimeAttack: () => {
    // This will be called when player completes a round in time attack mode
    const { timeAttackRoundsCompleted } = get();
    set({
      timeAttackRoundsCompleted: (timeAttackRoundsCompleted || 0) + 1
    });
  }
}));