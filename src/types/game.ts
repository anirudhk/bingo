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
  gameMode: GameMode;
  gameStatus: 'playing' | 'completed' | 'paused';
  swipeState: SwipeState;
  roundTime: number;
  totalTime: number;
  roundStartTime: number | null;
  timeAttackTimeLeft?: number; // For time attack mode
  timeAttackRoundsCompleted?: number; // For time attack mode
}
  
  export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type GameMode = 'classic' | 'timeAttack' | 'endless' | 'puzzle';

export interface GameModeConfig {
  id: GameMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  available: boolean;
}
  
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