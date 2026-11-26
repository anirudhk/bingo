import { create } from 'zustand';
import type {
  GapOperators,
  GameState,
  DifficultyLevel,
  GameMode,
  Tile,
  DifficultyConfig,
  Puzzle,
} from '../types/game';
import { DIFFICULTY_CONFIGS, SUCCESS_DELAY_MS, getPlayConfig } from '../constants/game';
import { getLevel } from '../constants/levels';
import {
  generateValidBoardFromConfig,
  generateValidGridFromConfig,
  getAllCombinationsFromConfig,
  generateTargetsFromConfig,
  generateValidGridFromConfigSeeded,
} from '../utils/gridGenerator';
import { calculatePathResult } from '../utils/calculator';
import { logger } from '../utils/logger';
import { newGameSeed } from '../utils/challenge';

interface GameStore extends GameState {
  /**
   * Start a Play-mode game. Classic and Quick Game boards come from a seed
   * (random unless given), so a "beat my time" link can replay them exactly.
   */
  initializeGame: (difficulty: DifficultyLevel, gameMode?: GameMode, seed?: string) => void;
  /** Initialise a Learn-path level by id. Sets gameMode='learning' and currentLevelId. */
  initializeLevel: (levelId: string) => void;
  /** Initialise a static puzzle. Sets gameMode='dailyPuzzle' and currentPuzzleId.
   *  Unlike initializeGame/Level this skips grid generation — the puzzle's
   *  `tiles` and `target` go straight into state, so the same puzzle plays
   *  identically on every device. */
  initializePuzzle: (puzzle: Puzzle) => void;
  /** One synced round for multiplayer (`totalRounds` = 1). Same seed ⇒ identical grid on both clients. */
  initializeMultiplayerRound: (difficulty: DifficultyLevel, seed: string) => void;
  submitSolution: (tiles: Tile[], operators: string[]) => boolean;
  nextRound: () => void;
  /** Player tapped Continue on the "Correct!" bar. No-op unless the round is solved. */
  continueAfterSolve: () => void;
  resetGame: () => void;
  /** Tear down all timers/timeouts. Call from component unmount and on reset. */
  cleanup: () => void;
  /** Subtract from score (e.g. hint penalty), floored at zero. */
  deductScore: (amount: number) => void;
  /** A hint was revealed: apply the score penalty and count it (hints cost stars). */
  recordHint: (penalty: number) => void;
  /** Tab hidden/shown: pause the round clock and hold auto-advance while hidden. */
  setPageHidden: (hidden: boolean) => void;
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

const TIME_ATTACK_DURATION_MS = 60_000;
const TIME_ATTACK_TICK_MS = 100;
const MAX_INIT_RETRIES = 5;

const cloneGridTiles = (tiles: Tile[]): Tile[] =>
  tiles.map((t) => ({
    id: t.id,
    value: t.value,
    position: { row: t.position.row, col: t.position.col },
  }));

// Side-effect handles live outside the observable store: mutating them must
// never trigger a React re-render. Centralised so cleanup() can clear them all.
let timeAttackInterval: ReturnType<typeof setInterval> | null = null;
let autoAdvanceTimeout: ReturnType<typeof setTimeout> | null = null;
// Page visibility: while hidden, the round clock is paused and a due
// auto-advance waits until the player is back.
let pageHiddenAt: number | null = null;
// When the current round was solved (freezes the clock until Continue).
let roundSolvedAt: number | null = null;
let advanceWhenVisible = false;

const clearTimeAttackInterval = () => {
  if (timeAttackInterval !== null) {
    clearInterval(timeAttackInterval);
    timeAttackInterval = null;
  }
};

const clearAutoAdvance = () => {
  if (autoAdvanceTimeout !== null) {
    clearTimeout(autoAdvanceTimeout);
    autoAdvanceTimeout = null;
  }
};

const createInitialState = (): GameState => ({
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
  roundsTimeMs: 0,
  timeAttackTimeLeft: undefined,
  timeAttackRoundsCompleted: undefined,
  initError: null,
  currentLevelId: null,
  wrongAttempts: 0,
  hintsUsed: 0,
  comboStreak: 0,
  gameSeed: null,
  gapOperators: null,
  roundSolved: false,
  currentPuzzleId: null,
});

// Pick the closest legacy DifficultyLevel for a level config so the existing
// score multiplier (which is keyed on DifficultyLevel) still works for Learn.
const inferDifficultyFromConfig = (cfg: DifficultyConfig): DifficultyLevel => {
  if (cfg.gridSize <= 3 && cfg.tilesCount === 2) return 'easy';
  if (cfg.gridSize >= 5 || (cfg.tilesCount === 3 && cfg.availableOperators.includes('*')))
    return 'hard';
  return 'medium';
};

/** Rounds cleared per step up the Time Attack difficulty ramp. */
const TIME_ATTACK_ROUNDS_PER_TIER = 2;

/**
 * A fresh grid + target for the next Time Attack round. Targets come back
 * ordered easiest → hardest (most → fewest solutions); the further the player
 * has got, the harder the target picked.
 */
const buildTimeAttackRound = (
  difficulty: DifficultyLevel,
  roundsCompleted: number
): Pick<GameState, 'grid' | 'gapOperators' | 'targetNumbers' | 'currentTarget'> | null => {
  const config = DIFFICULTY_CONFIGS[difficulty];
  for (let attempt = 0; attempt < MAX_INIT_RETRIES; attempt++) {
    const { grid, gaps } = generateValidBoardFromConfig(config);
    const targets = generateTargetsFromConfig(
      getAllCombinationsFromConfig(grid, config, gaps),
      config
    );
    if (targets.length === 0) continue;
    const tier = Math.min(
      targets.length - 1,
      Math.floor(roundsCompleted / TIME_ATTACK_ROUNDS_PER_TIER)
    );
    return {
      grid: cloneGridTiles(grid),
      gapOperators: gaps,
      targetNumbers: targets,
      currentTarget: targets[tier],
    };
  }
  logger.error(`buildTimeAttackRound: no solvable grid for "${difficulty}"`);
  return null;
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  initializeGame: (difficulty: DifficultyLevel, gameMode: GameMode = 'classic', seed?: string) => {
    // Always tear down prior timers before starting a fresh session.
    clearTimeAttackInterval();
    clearAutoAdvance();
    roundSolvedAt = null;

    // Quick Game keeps its own fixed shape (QUICK_GAME_CONFIG) and scores as
    // easy; the other modes use the difficulty ladder (see ADR-002).
    const effectiveDifficulty = gameMode === 'quickGame' ? 'easy' : difficulty;
    const effectiveConfig = getPlayConfig(gameMode, difficulty);

    let targetNumbers: number[] = [];
    let grid: Tile[] = [];
    let gaps: GapOperators | null = null;
    // Classic and Quick Game: one seeded board + targets, so the game can be
    // shared and replayed identically. Time Attack draws fresh random boards.
    const gameSeed =
      gameMode === 'classic' || gameMode === 'quickGame' ? (seed ?? newGameSeed()) : null;
    if (gameSeed) {
      const built = generateValidGridFromConfigSeeded(effectiveConfig, gameSeed);
      if (built) {
        grid = built.grid;
        gaps = built.gaps;
        targetNumbers = built.targetNumbers;
      }
    } else {
      let attempt = 0;
      while (attempt < MAX_INIT_RETRIES && targetNumbers.length === 0) {
        attempt += 1;
        const board = generateValidBoardFromConfig(effectiveConfig);
        grid = board.grid;
        gaps = board.gaps;
        const combinations = getAllCombinationsFromConfig(grid, effectiveConfig, gaps);
        targetNumbers = generateTargetsFromConfig(combinations, effectiveConfig);
      }
    }

    if (targetNumbers.length === 0) {
      logger.error(
        `Could not generate valid targets after ${MAX_INIT_RETRIES} attempts for difficulty="${effectiveDifficulty}".`
      );
      set({
        ...createInitialState(),
        difficulty: effectiveDifficulty,
        gameMode,
        initError: `Could not generate a solvable grid for "${effectiveDifficulty}". Please try a different difficulty.`,
      });
      return;
    }

    const totalRounds =
      gameMode === 'timeAttack' ? 999 : gameMode === 'quickGame' ? 5 : effectiveConfig.totalRounds;

    set({
      grid: cloneGridTiles(grid),
      gapOperators: gaps,
      gameSeed,
      targetNumbers,
      currentTarget: targetNumbers[0],
      currentRound: 1,
      totalRounds,
      score: 0,
      difficulty: effectiveDifficulty,
      gameMode,
      gameStatus: 'playing',
      roundTime: 0,
      totalTime: 0,
      roundStartTime: Date.now(),
      roundsTimeMs: 0,
      timeAttackTimeLeft: gameMode === 'timeAttack' ? TIME_ATTACK_DURATION_MS : undefined,
      timeAttackRoundsCompleted: gameMode === 'timeAttack' ? 0 : undefined,
      initError: null,
      currentLevelId: null,
      wrongAttempts: 0,
      hintsUsed: 0,
      comboStreak: 0,
      roundSolved: false,
      currentPuzzleId: null,
    });

    if (gameMode === 'timeAttack') {
      get().startTimeAttack();
    }
  },

  initializeLevel: (levelId: string) => {
    clearTimeAttackInterval();
    clearAutoAdvance();
    roundSolvedAt = null;

    const level = getLevel(levelId);
    if (!level) {
      logger.error(`initializeLevel: unknown level id "${levelId}"`);
      set({
        ...createInitialState(),
        gameMode: 'learning',
        initError: `Unknown level "${levelId}".`,
      });
      return;
    }

    let targetNumbers: number[] = [];
    let grid: Tile[] = [];
    let attempt = 0;
    while (attempt < MAX_INIT_RETRIES && targetNumbers.length === 0) {
      attempt += 1;
      grid = generateValidGridFromConfig(level);
      const combinations = getAllCombinationsFromConfig(grid, level);
      targetNumbers = generateTargetsFromConfig(combinations, level);
    }

    if (targetNumbers.length === 0) {
      logger.error(
        `Could not generate valid targets after ${MAX_INIT_RETRIES} attempts for level "${levelId}".`
      );
      set({
        ...createInitialState(),
        gameMode: 'learning',
        currentLevelId: levelId,
        initError: `Could not generate a solvable grid for "${level.title}". Please try another level.`,
      });
      return;
    }

    set({
      grid: cloneGridTiles(grid),
      targetNumbers,
      currentTarget: targetNumbers[0],
      currentRound: 1,
      totalRounds: level.totalRounds,
      score: 0,
      difficulty: inferDifficultyFromConfig(level),
      gameMode: 'learning',
      gameStatus: 'playing',
      roundTime: 0,
      totalTime: 0,
      roundStartTime: Date.now(),
      roundsTimeMs: 0,
      timeAttackTimeLeft: undefined,
      timeAttackRoundsCompleted: undefined,
      initError: null,
      currentLevelId: levelId,
      wrongAttempts: 0,
      hintsUsed: 0,
      comboStreak: 0,
      gameSeed: null,
      gapOperators: null,
      roundSolved: false,
      currentPuzzleId: null,
    });
  },

  initializePuzzle: (puzzle: Puzzle) => {
    clearTimeAttackInterval();
    clearAutoAdvance();
    roundSolvedAt = null;

    set({
      grid: cloneGridTiles(puzzle.tiles),
      targetNumbers: [puzzle.target],
      currentTarget: puzzle.target,
      currentRound: 1,
      // Daily / static puzzles are single-round by definition.
      totalRounds: 1,
      score: 0,
      difficulty: puzzle.difficulty,
      gameMode: 'dailyPuzzle',
      gameStatus: 'playing',
      roundTime: 0,
      totalTime: 0,
      roundStartTime: Date.now(),
      roundsTimeMs: 0,
      timeAttackTimeLeft: undefined,
      timeAttackRoundsCompleted: undefined,
      initError: null,
      currentLevelId: null,
      wrongAttempts: 0,
      hintsUsed: 0,
      comboStreak: 0,
      gameSeed: null,
      gapOperators: null,
      roundSolved: false,
      currentPuzzleId: puzzle.id,
    });
  },

  initializeMultiplayerRound: (difficulty: DifficultyLevel, seed: string) => {
    clearTimeAttackInterval();
    clearAutoAdvance();
    roundSolvedAt = null;

    const cfg = { ...DIFFICULTY_CONFIGS[difficulty], totalRounds: 1 };
    const built = generateValidGridFromConfigSeeded(cfg, seed);

    if (!built) {
      logger.error(`initializeMultiplayerRound: failed seed="${seed}"`);
      set({
        ...createInitialState(),
        difficulty,
        gameMode: 'multiplayer',
        initError: 'Could not build this round. Ask the host to rematch.',
      });
      return;
    }

    const { grid, gaps, targetNumbers } = built;

    set({
      grid: cloneGridTiles(grid),
      targetNumbers,
      currentTarget: targetNumbers[0],
      currentRound: 1,
      totalRounds: 1,
      score: 0,
      difficulty,
      gameMode: 'multiplayer',
      gameStatus: 'playing',
      roundTime: 0,
      totalTime: 0,
      roundStartTime: Date.now(),
      roundsTimeMs: 0,
      timeAttackTimeLeft: undefined,
      timeAttackRoundsCompleted: undefined,
      initError: null,
      currentLevelId: null,
      wrongAttempts: 0,
      hintsUsed: 0,
      comboStreak: 0,
      gameSeed: null,
      gapOperators: gaps,
      roundSolved: false,
      currentPuzzleId: null,
    });
  },

  submitSolution: (tiles: Tile[], operators: string[]): boolean => {
    const {
      currentTarget,
      difficulty,
      gameMode,
      roundStartTime,
      roundsTimeMs,
      gameStatus,
      roundSolved,
    } = get();
    // Ignore submissions once the round is solved (waiting on auto-advance) or
    // the game isn't live — otherwise the same round can be scored twice.
    if (gameStatus !== 'playing' || roundSolved) {
      return false;
    }
    const result = calculatePathResult(tiles, operators);

    if (result !== currentTarget) {
      // A slip ends the combo.
      set({ comboStreak: 0 });
      // Track wrong attempts for accuracy-based stars on the Learn path *and*
      // for the daily-puzzle result screen (so we can show "first try!" etc.).
      if (gameMode === 'learning' || gameMode === 'dailyPuzzle' || gameMode === 'multiplayer') {
        set((state) => ({ wrongAttempts: state.wrongAttempts + 1 }));
      }
      return false;
    }

    const baseScore = 10;
    const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1.5 : 2;
    const timeAttackMultiplier = gameMode === 'timeAttack' ? 2 : 1;
    const roundScore = Math.floor(baseScore * difficultyMultiplier * timeAttackMultiplier);

    set((state) => ({
      score: state.score + roundScore,
      roundSolved: true,
      comboStreak: state.comboStreak + 1,
    }));

    if (gameMode === 'timeAttack') {
      get().updateTimeAttack();
    }

    if (gameMode === 'multiplayer') {
      const now = Date.now();
      const thisRoundMs = roundStartTime ? now - roundStartTime : 0;
      const accumulatedMs = roundsTimeMs + thisRoundMs;
      clearAutoAdvance();
      set({
        gameStatus: 'paused',
        roundStartTime: null,
        roundsTimeMs: accumulatedMs,
        totalTime: accumulatedMs,
        roundTime: thisRoundMs,
      });
      return true;
    }

    // Freeze the round clock at the moment of the solve: time spent reading
    // the feedback bar doesn't count.
    roundSolvedAt = Date.now();

    // Most modes wait for the player to tap Continue (continueAfterSolve).
    // Time Attack is a speed run, so it moves on by itself after a beat.
    if (gameMode !== 'timeAttack') return true;

    // Tracked so resetGame / cleanup / mode change can cancel it.
    clearAutoAdvance();
    autoAdvanceTimeout = setTimeout(() => {
      autoAdvanceTimeout = null;
      if (pageHiddenAt !== null) {
        advanceWhenVisible = true;
        return;
      }
      get().nextRound();
    }, SUCCESS_DELAY_MS);

    return true;
  },

  continueAfterSolve: () => {
    if (!get().roundSolved || get().gameMode === 'multiplayer') return;
    clearAutoAdvance();
    get().nextRound();
  },

  nextRound: () => {
    const {
      targetNumbers,
      currentRound,
      totalRounds,
      roundStartTime,
      roundsTimeMs,
      gameMode,
      difficulty,
    } = get();

    if (gameMode === 'multiplayer') {
      return;
    }

    // Time Attack ends on the clock, not on rounds. Every round gets a fresh
    // grid (a fixed grid has only ~11 reachable targets on easy, so players
    // memorise it) and difficulty ramps with the number of rounds cleared.
    if (gameMode === 'timeAttack') {
      const round = buildTimeAttackRound(difficulty, get().timeAttackRoundsCompleted ?? 0);
      set(round ? { ...round, roundSolved: false } : { roundSolved: false });
      return;
    }

    const now = Date.now();
    const roundEnd = roundSolvedAt ?? now;
    roundSolvedAt = null;
    const thisRoundMs = roundStartTime ? Math.max(0, roundEnd - roundStartTime) : 0;
    const accumulatedMs = roundsTimeMs + thisRoundMs;

    if (currentRound >= totalRounds) {
      clearAutoAdvance();
      clearTimeAttackInterval();
      set({
        gameStatus: 'completed',
        roundStartTime: null,
        roundsTimeMs: accumulatedMs,
        totalTime: accumulatedMs,
        roundTime: thisRoundMs,
      });
      return;
    }

    const next = currentRound + 1;
    set({
      currentRound: next,
      currentTarget: targetNumbers[next - 1],
      grid: cloneGridTiles(get().grid),
      roundSolved: false,
      roundsTimeMs: accumulatedMs,
      roundStartTime: now,
      roundTime: 0,
      totalTime: accumulatedMs,
    });
  },

  resetGame: () => {
    const { difficulty, gameMode } = get();
    get().cleanup();
    // Learn and Daily Puzzle sessions are URL/content driven. Re-initialising
    // them here would create an unrelated random board before the route has a
    // chance to initialise the requested level/puzzle.
    if (gameMode === 'learning' || gameMode === 'dailyPuzzle' || gameMode === 'multiplayer') {
      set({
        ...createInitialState(),
        difficulty,
        gameMode,
      });
      return;
    }
    get().initializeGame(difficulty, gameMode);
  },

  cleanup: () => {
    clearTimeAttackInterval();
    clearAutoAdvance();
    roundSolvedAt = null;
    advanceWhenVisible = false;
    roundSolvedAt = null;
  },

  deductScore: (amount: number) => {
    if (amount <= 0) return;
    set((state) => ({ score: Math.max(0, state.score - amount) }));
  },

  recordHint: (penalty: number) => {
    set((state) => ({
      score: Math.max(0, state.score - Math.max(0, penalty)),
      hintsUsed: state.hintsUsed + 1,
      // A hinted answer doesn't extend the combo.
      comboStreak: 0,
      gameSeed: null,
    }));
  },

  setPageHidden: (hidden: boolean) => {
    const { gameMode, gameStatus, roundStartTime } = get();
    // Time Attack is a real-time challenge and multiplayer is timed by the
    // server, so neither pauses.
    const pausable = gameMode !== 'timeAttack' && gameMode !== 'multiplayer';
    if (hidden) {
      if (pageHiddenAt === null) pageHiddenAt = Date.now();
      return;
    }
    if (pageHiddenAt === null) return;
    const hiddenFor = Date.now() - pageHiddenAt;
    pageHiddenAt = null;
    if (pausable && gameStatus === 'playing' && roundStartTime !== null) {
      set({ roundStartTime: roundStartTime + hiddenFor });
    }
    if (advanceWhenVisible) {
      advanceWhenVisible = false;
      get().nextRound();
    }
  },

  setDifficulty: (difficulty: DifficultyLevel) => {
    set({ difficulty });
  },

  setGameMode: (gameMode: GameMode) => {
    set({ gameMode });
  },

  pauseGame: () => {
    clearTimeAttackInterval();
    set({ gameStatus: 'paused' });
  },

  resumeGame: () => {
    set({ gameStatus: 'playing' });
    if (get().gameMode === 'timeAttack') {
      get().startTimeAttack();
    }
  },

  startRoundTimer: () => {
    set({ roundStartTime: Date.now() });
  },

  updateTimer: () => {
    const { roundStartTime, roundsTimeMs, roundSolved } = get();
    if (roundStartTime && !roundSolved) {
      const thisRoundMs = Date.now() - roundStartTime;
      set({ roundTime: thisRoundMs, totalTime: roundsTimeMs + thisRoundMs });
    }
  },

  stopRoundTimer: () => {
    const { roundStartTime, roundsTimeMs } = get();
    if (roundStartTime) {
      const thisRoundMs = Date.now() - roundStartTime;
      set({
        roundTime: thisRoundMs,
        roundsTimeMs: roundsTimeMs + thisRoundMs,
        totalTime: roundsTimeMs + thisRoundMs,
        roundStartTime: null,
      });
    }
  },

  startTimeAttack: () => {
    // Defensive: never run two intervals concurrently.
    clearTimeAttackInterval();
    const startLeft = get().timeAttackTimeLeft;
    if (!startLeft) return;
    // Count down against a wall-clock deadline rather than subtracting a fixed
    // amount per tick: browsers throttle intervals (background tabs, busy
    // phones), which made the 60 s clock run slow. Pause/resume recomputes the
    // deadline from the remaining time.
    const deadline = Date.now() + startLeft;
    timeAttackInterval = setInterval(() => {
      const { timeAttackTimeLeft, gameStatus } = get();

      if (gameStatus !== 'playing' || !timeAttackTimeLeft) {
        clearTimeAttackInterval();
        return;
      }

      const newTimeLeft = deadline - Date.now();

      if (newTimeLeft <= 0) {
        clearTimeAttackInterval();
        clearAutoAdvance();
        set({ timeAttackTimeLeft: 0, gameStatus: 'completed' });
      } else {
        set({ timeAttackTimeLeft: newTimeLeft });
      }
    }, TIME_ATTACK_TICK_MS);
  },

  updateTimeAttack: () => {
    const { timeAttackRoundsCompleted } = get();
    set({ timeAttackRoundsCompleted: (timeAttackRoundsCompleted || 0) + 1 });
  },
}));

// Test-only escape hatch. Tests use this to assert no timers leak.
export const __getActiveTimerHandlesForTests = () => ({
  timeAttackInterval,
  autoAdvanceTimeout,
});
