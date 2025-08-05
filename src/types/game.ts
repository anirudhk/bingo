export interface Tile {
    id: number;
    value: number;
    position: { row: number; col: number };
    selected: boolean;
  }
  
  export interface SwipeState {
    isActive: boolean;
    startTile: Tile | null;
    currentPath: Tile[];
    operators: string[];
    result: number | null;
  }
  
  export interface GameCombination {
    tiles: Tile[];
    operators: string[];
    result: number;
  }
  
  export interface GameState {
    grid: Tile[];
    targetNumbers: number[];
    currentTarget: number;
    currentRound: number;
    totalRounds: number;
    score: number;
    difficulty: DifficultyLevel;
    gameStatus: 'playing' | 'completed' | 'paused';
    swipeState: SwipeState;
  }
  
  export type DifficultyLevel = 'easy' | 'medium' | 'hard';
  
  export interface DifficultyConfig {
    gridSize: number;
    tilesCount: number;
    operatorsCount: number;
    availableOperators: string[];
    targetRange: { min: number; max: number };
    totalRounds: number;
  }
  
  export interface TouchPosition {
    x: number;
    y: number;
  }
  
  export interface GameStats {
    totalGamesPlayed: number;
    totalScore: number;
    averageCompletionTime: number;
    accuracyRate: number;
    favoriteOperator: string;
  }