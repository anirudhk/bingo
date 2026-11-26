import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GameHeader } from './GameHeader';
import { rhythmInstruction } from '../../utils/rhythmInstruction';
import { MixedUnitIntroModal } from '../UI/MixedUnitIntroModal';
import { CalculationFeedback } from '../UI/CalculationFeedback';
import { Timer } from '../UI/Timer';
import { TimeAttackTimer } from '../UI/TimeAttackTimer';
import { CelebrationParticles } from '../UI/CelebrationParticles';
import { useGameStore } from '../../store/gameStore';
import { usePrefsStore } from '../../store/prefsStore';
import { useProgressStore } from '../../store/progressStore';
import type { DifficultyConfig, DifficultyLevel, GameMode, Puzzle, Tile } from '../../types/game';
import { formatCalculationGrouped, calculatePathResult } from '../../utils/calculator';
import { FEEDBACK_CLEAR_DELAY_MS, HINT_SCORE_PENALTY, getPlayConfig } from '../../constants/game';
import {
  gapBetween,
  gapKey,
  getAllCombinationsFromConfig,
  signsForGap,
} from '../../utils/gridGenerator';
import { LEVELS, UNITS, getLevel } from '../../constants/levels';
import { utcDateKey } from '../../utils/puzzleStore';
import { logger } from '../../utils/logger';
import { feedback } from '../../utils/feedback';
import { NumberTile, numberTileBoxStyle } from './NumberTile';
import { OperatorIcon } from './OperatorIcon';

interface ButtonGameBoardProps {
  difficulty: DifficultyLevel;
  gameMode: GameMode;
  /** When set, board runs in Learn mode using the named level's config. */
  levelId?: string;
  /** When set, board runs in static-puzzle mode using this prebuilt puzzle. */
  puzzle?: Puzzle;
  /** Multiplayer: deterministic seed from the server for this round. */
  multiplayerSeed?: string;
  /** When set, used with `multiplayerSeed` to re-init when the server advances `current_round` even if the seed format repeats. */
  multiplayerRoundKey?: string;
  /** Block taps while submitting a synced round to the server. */
  lockInteraction?: boolean;
  /** Called after every completed path (right or wrong) — lets the daily and
   *  multiplayer screens send the move to the server for verification. */
  onAttempt?: (attempt: { tileIds: number[]; operators: string[]; correct: boolean }) => void;
  /** Replaces the header subtitle (e.g. "Class race · Room ABC123"). */
  labelOverride?: string;
  /** Replaces the header clock (e.g. a classroom countdown). */
  timerOverride?: React.ReactNode;
  /** Where Back goes (defaults to the mode's lobby). */
  onBack?: () => void;
  /** Replay a shared game exactly ("beat my time" link). */
  challengeSeed?: string;
}

export const ButtonGameBoard: React.FC<ButtonGameBoardProps> = ({
  difficulty,
  gameMode,
  levelId,
  puzzle,
  multiplayerSeed,
  multiplayerRoundKey,
  lockInteraction = false,
  onAttempt,
  labelOverride,
  timerOverride,
  onBack,
  challengeSeed,
}) => {
  const navigate = useNavigate();
  const grid = useGameStore((s) => s.grid);
  const gapOperators = useGameStore((s) => s.gapOperators);
  const comboStreak = useGameStore((s) => s.comboStreak);
  const currentTarget = useGameStore((s) => s.currentTarget);
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const score = useGameStore((s) => s.score);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const initError = useGameStore((s) => s.initError);
  const roundSolved = useGameStore((s) => s.roundSolved);
  const initializeGame = useGameStore((s) => s.initializeGame);
  const initializeLevel = useGameStore((s) => s.initializeLevel);
  const initializePuzzle = useGameStore((s) => s.initializePuzzle);
  const initializeMultiplayerRound = useGameStore((s) => s.initializeMultiplayerRound);
  const submitSolution = useGameStore((s) => s.submitSolution);
  const recordHint = useGameStore((s) => s.recordHint);
  const continueAfterSolve = useGameStore((s) => s.continueAfterSolve);
  const setPageHidden = useGameStore((s) => s.setPageHidden);
  const startRoundTimer = useGameStore((s) => s.startRoundTimer);
  const cleanup = useGameStore((s) => s.cleanup);
  // Freeze the board once the round is solved so it can't be re-submitted
  // during the success delay before auto-advance.
  const inputLocked = lockInteraction || roundSolved;
  const learnMixedUnitIntroSeen = usePrefsStore((s) => s.learnMixedUnitIntroSeen);
  const markLearnMixedUnitIntroSeen = usePrefsStore((s) => s.markLearnMixedUnitIntroSeen);

  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [selectedOperatorPositions, setSelectedOperatorPositions] = useState<
    Array<{ row: number; col: number; position: 'horizontal' | 'vertical'; operator: string }>
  >([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    calculation: '',
    result: null as number | null,
    isCorrect: false,
    target: 0,
    negativeStep: false,
  });
  // After a wrong answer the path stays on screen; the next tap starts over.
  const clearOnNextTapRef = useRef(false);
  const barAutoDismisses = gameMode === 'timeAttack' || gameMode === 'multiplayer';

  const handleContinue = () => {
    setShowFeedback(false);
    clearSelection();
    continueAfterSolve();
  };

  const handleTryAgain = () => {
    setShowFeedback(false);
    clearSelection();
  };
  const [hintUsedThisRound, setHintUsedThisRound] = useState(false);
  const [hintTiles, setHintTiles] = useState<Tile[]>([]);
  const [hintOperatorPositions, setHintOperatorPositions] = useState<
    Array<{ row: number; col: number; position: 'horizontal' | 'vertical'; operator: string }>
  >([]);
  const [showHint, setShowHint] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  // Roving focus index (row * gridSize + col). Reset when the grid changes.
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const tilesContainerRef = useRef<HTMLDivElement>(null);
  const gridBoardRef = useRef<HTMLDivElement>(null);
  const tileElRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const feedbackClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pathSegments, setPathSegments] = useState<
    Array<{ x1: number; y1: number; x2: number; y2: number }>
  >([]);

  // Pick the geometry/operator set:
  //   1. Static puzzle: derive a one-shot DifficultyConfig from the puzzle so
  //      the renderer (which expects gridSize / availableOperators) just works.
  //   2. Learn level: pull the LevelConfig from the curriculum.
  //   3. Otherwise: fall back to the legacy DIFFICULTY_CONFIGS for the prop
  //      `difficulty` (Quick Game / Classic / Time Attack — unchanged).
  const level = levelId ? getLevel(levelId) : undefined;
  const config: DifficultyConfig = puzzle
    ? {
        gridSize: puzzle.gridSize,
        tilesCount: puzzle.optimalSolution.tileIds.length,
        operatorsCount: puzzle.optimalSolution.operators.length,
        availableOperators: puzzle.availableOperators,
        targetRange: { min: puzzle.target, max: puzzle.target },
        totalRounds: 1,
      }
    : (level ?? getPlayConfig(gameMode, difficulty));
  const levelIndex = level ? LEVELS.findIndex((l) => l.id === level.id) : -1;
  const unit = level ? UNITS.find((u) => u.id === level.unitId) : undefined;
  const modeLabel =
    gameMode === 'learning'
      ? unit
        ? unit.title
        : 'Learn'
      : gameMode === 'dailyPuzzle'
        ? 'Daily Puzzle'
        : gameMode === 'timeAttack'
          ? 'Time Attack'
          : gameMode === 'quickGame'
            ? 'Quick Game'
            : gameMode === 'multiplayer'
              ? 'Vs player'
              : gameMode === 'classic'
                ? 'Classic'
                : 'Play';
  const contextTitle =
    gameMode === 'learning' && level
      ? level.title
      : gameMode === 'dailyPuzzle'
        ? utcDateKey()
        : `${difficulty} mode`;
  const contextMeta =
    gameMode === 'learning' && levelIndex >= 0
      ? `Level ${levelIndex + 1} of ${LEVELS.length}`
      : gameMode === 'dailyPuzzle'
        ? 'One puzzle today'
        : `Difficulty: ${difficulty}`;
  const headerSubtitle =
    gameMode === 'learning'
      ? `${modeLabel} · ${contextTitle} · ${contextMeta}`
      : gameMode === 'dailyPuzzle'
        ? `Daily puzzle · ${contextTitle}`
        : `${modeLabel} · ${difficulty.charAt(0).toUpperCase()}${difficulty.slice(1)}`;

  const showMixedUnitIntro =
    gameMode === 'learning' && levelId === 'u3-l1' && !learnMixedUnitIntroSeen && !initError;

  // Initialise game when this (levelId|difficulty|gameMode) tuple changes;
  // tear down timers on unmount. The ref guard avoids React 18 StrictMode's
  // double-invoke regenerating the grid twice on first mount — visible to the
  // user as a brief flicker of two different boards.
  const lastInitKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const initKey =
      puzzle?.id ??
      levelId ??
      (gameMode === 'multiplayer' && multiplayerSeed
        ? `mp::${multiplayerRoundKey ?? multiplayerSeed}`
        : challengeSeed
          ? `challenge::${challengeSeed}`
          : `${difficulty}::${gameMode}`);
    if (lastInitKeyRef.current === initKey) {
      return;
    }
    lastInitKeyRef.current = initKey;

    if (puzzle) {
      logger.debug('Initialising static puzzle:', puzzle.id);
      initializePuzzle(puzzle);
    } else if (levelId) {
      logger.debug('Initializing learning level:', levelId);
      initializeLevel(levelId);
    } else if (gameMode === 'multiplayer' && multiplayerSeed) {
      logger.debug('Initializing multiplayer round seed:', multiplayerSeed);
      initializeMultiplayerRound(difficulty, multiplayerSeed);
    } else {
      logger.debug('Initializing game with difficulty:', difficulty, 'mode:', gameMode);
      initializeGame(difficulty, gameMode, challengeSeed);
    }
    startRoundTimer();
    return () => {
      lastInitKeyRef.current = null;
      cleanup();
    };
  }, [
    difficulty,
    gameMode,
    levelId,
    puzzle,
    multiplayerSeed,
    multiplayerRoundKey,
    challengeSeed,
    initializeGame,
    initializeLevel,
    initializePuzzle,
    initializeMultiplayerRound,
    startRoundTimer,
    cleanup,
  ]);

  useEffect(() => {
    logger.debug('Game state:', {
      currentTarget,
      currentRound,
      totalRounds,
      gridLength: grid.length,
      gameStatus,
    });
  }, [currentTarget, currentRound, totalRounds, grid.length, gameStatus]);

  // Reset roving focus to the top-left whenever the grid is regenerated.
  useEffect(() => {
    setFocusedIdx(0);
  }, [grid]);

  // New round (the store hands over a fresh grid object every round): start
  // with a clean selection and hint. Time Attack swaps in a whole new grid, so
  // leftover tile ids from the previous board must not stay highlighted.
  useEffect(() => {
    setHintUsedThisRound(false);
    clearOnNextTapRef.current = false;
    setShowFeedback(false);
    setSelectedTiles([]);
    setSelectedOperators([]);
    setSelectedOperatorPositions([]);
    setHintTiles([]);
    setHintOperatorPositions([]);
    setShowHint(false);
  }, [currentRound, currentTarget, grid]);

  useLayoutEffect(() => {
    const root = gridBoardRef.current;
    if (!root || selectedTiles.length < 2) {
      setPathSegments([]);
      return;
    }
    const rc = root.getBoundingClientRect();
    const pts: { x: number; y: number }[] = [];
    for (const t of selectedTiles) {
      const el = tileElRefs.current[t.id];
      if (!el) {
        setPathSegments([]);
        return;
      }
      const r = el.getBoundingClientRect();
      pts.push({ x: r.left + r.width / 2 - rc.left, y: r.top + r.height / 2 - rc.top });
    }
    const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      segs.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y });
    }
    setPathSegments(segs);
  }, [selectedTiles, grid]);

  // Pause the round clock / hold auto-advance while the tab is hidden.
  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      setPageHidden(false);
    };
  }, [setPageHidden]);

  useEffect(() => {
    return () => {
      if (feedbackClearTimeoutRef.current !== null) {
        clearTimeout(feedbackClearTimeoutRef.current);
        feedbackClearTimeoutRef.current = null;
      }
      if (hintHideTimeoutRef.current !== null) {
        clearTimeout(hintHideTimeoutRef.current);
        hintHideTimeoutRef.current = null;
      }
    };
  }, []);

  // Move actual DOM focus to whichever tile is the current roving target —
  // *only* if the user is already navigating the grid by keyboard. Otherwise
  // we'd steal focus from buttons elsewhere on the page on every render.
  useEffect(() => {
    if (!tilesContainerRef.current) return;
    const active = document.activeElement as HTMLElement | null;
    const isInsideGrid = active && tilesContainerRef.current.contains(active);
    if (!isInsideGrid) return;
    const next = tilesContainerRef.current.querySelector<HTMLElement>(
      `[data-roving-idx="${focusedIdx}"]`
    );
    next?.focus();
  }, [focusedIdx]);

  // Global keys that don't require tile focus: `?` toggles help, `Esc` clears
  // selection. Arrow keys are scoped to the grid container itself (handled in
  // the tile onKeyDown) so they don't fight with form fields elsewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowHelp((v) => !v);
      } else if (e.key === 'Escape') {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        if (showMixedUnitIntro) {
          return;
        }
        if (selectedTiles.length > 0 || selectedOperators.length > 0 || showHint) {
          clearSelection();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // clearSelection is stable enough; deps include selection sizes so the
    // closure sees current values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTiles.length, selectedOperators.length, showHint, showHelp, showMixedUnitIntro]);

  const handleTileClick = (tile: Tile) => {
    if (inputLocked) return;
    if (clearOnNextTapRef.current) {
      // Start a fresh path from this tile (a single tile is always a legal start).
      clearSelection();
      setShowFeedback(false);
      setSelectedTiles([tile]);
      feedback('tap');
      return;
    }
    // Tapping a selected tile undoes the path back to just before it: keep the
    // tiles before it and the operators between them. This preserves the
    // number → operator → number alternation (dropping only the operators but
    // keeping 2+ tiles used to leave the selection stuck).
    const selectedIdx = selectedTiles.findIndex((t) => t.id === tile.id);
    if (selectedIdx !== -1) {
      const keepOps = Math.max(0, selectedIdx - 1);
      setSelectedTiles(selectedTiles.slice(0, selectedIdx));
      setSelectedOperators(selectedOperators.slice(0, keepOps));
      setSelectedOperatorPositions(selectedOperatorPositions.slice(0, keepOps));
      return;
    }

    // Check if we can select a number (should alternate: number -> operator -> number)
    const totalSelections = selectedTiles.length + selectedOperators.length;
    const isNumberTurn = totalSelections % 2 === 0; // 0, 2, 4, etc. are number turns

    if (!isNumberTurn) {
      // A gap with a single sign needs no choice: tapping the neighbouring
      // tile picks that sign automatically (Easy: just tap two numbers).
      const last = selectedTiles[selectedTiles.length - 1];
      const gap = last ? gapBetween(last.position, tile.position) : null;
      const signs = gap ? signsForGap(gapOperators, config, gap.key) : [];
      if (gap && signs.length === 1 && isOperatorAvailable(gap.row, gap.col, gap.position)) {
        const operator = signs[0];
        const newOperators = [...selectedOperators, operator];
        const newPositions = [
          ...selectedOperatorPositions,
          { row: gap.row, col: gap.col, position: gap.position, operator },
        ];
        const newTiles = [...selectedTiles, tile];
        setSelectedOperators(newOperators);
        setSelectedOperatorPositions(newPositions);
        setSelectedTiles(newTiles);
        const completes =
          newTiles.length === config.tilesCount && newOperators.length === config.operatorsCount;
        if (completes) checkAnswer(newTiles, newOperators);
        else feedback('tap');
        return;
      }
      // It's not a number's turn, vibrate and don't select
      feedback('invalid');
      return;
    }

    // Check if the tile is valid for the next selection
    if (!isTileValidForNextSelection(tile)) {
      // Tile is not valid for selection, vibrate and don't select
      feedback('invalid');
      return;
    }

    // Add tile to selection
    const newTiles = [...selectedTiles, tile];
    setSelectedTiles(newTiles);

    const completesPath =
      newTiles.length === config.tilesCount && selectedOperators.length === config.operatorsCount;
    // The answer sound replaces the tap sound on the final tile.
    if (!completesPath) feedback('tap');

    // If we have enough tiles and operators, check the answer
    if (
      newTiles.length === config.tilesCount &&
      selectedOperators.length === config.operatorsCount
    ) {
      checkAnswer(newTiles, selectedOperators);
    }
  };

  const handleOperatorClick = (
    operator: string,
    row: number,
    col: number,
    position: 'horizontal' | 'vertical'
  ) => {
    if (inputLocked) return;
    if (clearOnNextTapRef.current) {
      clearSelection();
      setShowFeedback(false);
      return;
    }
    // If we don't have enough tiles yet, ignore
    if (selectedTiles.length < 1) {
      feedback('invalid');
      return;
    }

    // Check if this exact operator position is already selected
    const isAlreadySelected = selectedOperatorPositions.find(
      (pos) =>
        pos.row === row && pos.col === col && pos.position === position && pos.operator === operator
    );

    if (isAlreadySelected) {
      // Remove operator from selection (toggle selection)
      const newOperators = selectedOperators.filter((_, index) => {
        const pos = selectedOperatorPositions[index];
        return !(
          pos.row === row &&
          pos.col === col &&
          pos.position === position &&
          pos.operator === operator
        );
      });
      const newOperatorPositions = selectedOperatorPositions.filter(
        (pos) =>
          !(
            pos.row === row &&
            pos.col === col &&
            pos.position === position &&
            pos.operator === operator
          )
      );
      setSelectedOperators(newOperators);
      setSelectedOperatorPositions(newOperatorPositions);
      return;
    }

    // Check if we can select an operator (should alternate: number -> operator -> number)
    const totalSelections = selectedTiles.length + selectedOperators.length;
    const isOperatorTurn = totalSelections % 2 === 1; // 1, 3, 5, etc. are operator turns

    if (!isOperatorTurn) {
      // It's not an operator's turn, vibrate and don't select
      feedback('invalid');
      return;
    }

    // Check if the operator is valid for selection
    if (!isOperatorValidForSelection(row, col, position)) {
      // Operator is not valid for selection, vibrate and don't select
      feedback('invalid');
      return;
    }

    // Add operator to selection
    const newOperators = [...selectedOperators, operator];
    const newOperatorPositions = [...selectedOperatorPositions, { row, col, position, operator }];
    setSelectedOperators(newOperators);
    const completesPath =
      selectedTiles.length === config.tilesCount && newOperators.length === config.operatorsCount;
    if (!completesPath) feedback('operator');
    setSelectedOperatorPositions(newOperatorPositions);

    // If we have enough tiles and operators, check the answer
    if (
      selectedTiles.length === config.tilesCount &&
      newOperators.length === config.operatorsCount
    ) {
      checkAnswer(selectedTiles, newOperators);
    }
  };

  const clearSelection = () => {
    clearOnNextTapRef.current = false;
    setSelectedTiles([]);
    setSelectedOperators([]);
    setSelectedOperatorPositions([]);
    clearHint();
  };

  const clearHint = () => {
    setHintTiles([]);
    setHintOperatorPositions([]);
    setShowHint(false);
  };

  const findHint = () => {
    if (inputLocked) return;
    if (hintUsedThisRound) {
      feedback('invalid');
      return;
    }

    clearSelection();

    const solutions = findValidSolutions();
    if (solutions.length > 0) {
      recordHint(HINT_SCORE_PENALTY);
      feedback('hint');
      setHintUsedThisRound(true);
      const hint = solutions[0];
      setHintTiles(hint.tiles);
      setHintOperatorPositions(hint.operatorPositions);
      setShowHint(true);

      if (hintHideTimeoutRef.current !== null) clearTimeout(hintHideTimeoutRef.current);
      hintHideTimeoutRef.current = setTimeout(() => {
        hintHideTimeoutRef.current = null;
        clearHint();
      }, 5000);
    }
  };

  // Every solution to the current target, respecting each gap's signs and
  // both tap directions (same search the generator uses).
  const findValidSolutions = () =>
    getAllCombinationsFromConfig(grid, config, gapOperators)
      .filter((c) => c.result === currentTarget)
      .map((c) => ({
        tiles: c.tiles,
        operatorPositions: c.operators.map((operator, i) => {
          const g = gapBetween(c.tiles[i].position, c.tiles[i + 1].position)!;
          return { row: g.row, col: g.col, position: g.position, operator };
        }),
      }));

  const checkAnswer = (tiles: Tile[], operators: string[]) => {
    if (inputLocked) return;
    const target = currentTarget;
    const isCorrect = submitSolution(tiles, operators);
    onAttempt?.({ tileIds: tiles.map((t) => t.id), operators: [...operators], correct: isCorrect });

    const calculation = formatCalculationGrouped(tiles, operators, { asciiOperators: true });
    const result = calculatePathResult(tiles, operators);

    // Left-to-right maths can dip below zero mid-way, e.g. (3 − 7) × 2.
    const negativeStep =
      tiles.length === 3 &&
      operators.length === 2 &&
      (calculatePathResult(tiles.slice(0, 2), operators.slice(0, 1)) ?? 0) < 0;

    setFeedbackData({
      calculation,
      result,
      isCorrect,
      target,
      negativeStep,
    });
    setShowFeedback(true);

    const combo = useGameStore.getState().comboStreak;
    feedback(isCorrect ? (combo >= 3 ? 'combo' : 'correct') : 'wrong');
    if (isCorrect) useProgressStore.getState().recordCombo(combo);
    if (isCorrect) {
      setShowCelebration(true);
    }

    if (feedbackClearTimeoutRef.current !== null) {
      clearTimeout(feedbackClearTimeoutRef.current);
    }
    if (!isCorrect) clearOnNextTapRef.current = true;
    // The feedback bar normally stays until the player taps Continue / Try
    // again. Time Attack (speed) and multiplayer (waiting on the opponent)
    // dismiss it by themselves.
    if (barAutoDismisses) {
      feedbackClearTimeoutRef.current = setTimeout(() => {
        feedbackClearTimeoutRef.current = null;
        if (isCorrect) clearSelection();
        setShowFeedback(false);
      }, FEEDBACK_CLEAR_DELAY_MS);
    }
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
  };

  const handleBackToLobby = () => {
    // Route back to the launching surface for the current mode.
    if (gameMode === 'learning') {
      navigate('/learn');
      return;
    }
    if (gameMode === 'dailyPuzzle') {
      navigate('/');
      return;
    }
    if (gameMode === 'multiplayer') {
      navigate('/play/multiplayer');
      return;
    }
    navigate(gameMode === 'quickGame' ? '/' : '/play/difficulty');
  };

  const getTileSize = (): 'compact' | 'small' | 'medium' | 'large' => {
    switch (config.gridSize) {
      case 3:
        return 'large';
      case 4:
        return 'compact';
      case 5:
        return 'small';
      default:
        return 'medium';
    }
  };

  const getOperatorSize = (): 'small' | 'medium' | 'large' => {
    switch (config.gridSize) {
      case 3:
        return 'large';
      case 4:
        return 'medium';
      case 5:
        return 'small';
      default:
        return 'medium';
    }
  };

  const isTileSelected = (tile: Tile) => {
    return selectedTiles.find((t) => t.id === tile.id) !== undefined;
  };

  const isTileInHint = (tile: Tile) => {
    return showHint && hintTiles.find((t) => t.id === tile.id) !== undefined;
  };

  const isTileInPath = (tile: Tile) => {
    return selectedTiles.find((t) => t.id === tile.id) !== undefined;
  };

  const getPathIndex = (tile: Tile) => {
    const index = selectedTiles.findIndex((t) => t.id === tile.id);
    return index !== -1 ? index : undefined;
  };

  const getHintPathIndex = (tile: Tile) => {
    if (!showHint) return undefined;
    const index = hintTiles.findIndex((t) => t.id === tile.id);
    return index !== -1 ? index : undefined;
  };

  const isOperatorSelected = (
    row: number,
    col: number,
    position: 'horizontal' | 'vertical',
    operator: string
  ): boolean => {
    // Check if this specific operator instance is selected
    return selectedOperatorPositions.some(
      (pos) =>
        pos.row === row && pos.col === col && pos.position === position && pos.operator === operator
    );
  };

  const isOperatorInHint = (
    row: number,
    col: number,
    position: 'horizontal' | 'vertical',
    operator: string
  ): boolean => {
    if (!showHint) return false;
    // Check if this specific operator instance is part of the hint
    return hintOperatorPositions.some(
      (pos) =>
        pos.row === row && pos.col === col && pos.position === position && pos.operator === operator
    );
  };

  const isOperatorAvailable = (
    _row: number,
    _col: number,
    _position: 'horizontal' | 'vertical'
  ): boolean => {
    return config.availableOperators.length > 0;
  };

  const isLegalNextTile = (tile: Tile): boolean => {
    const totalSelections = selectedTiles.length + selectedOperators.length;
    const isNumberTurn = totalSelections % 2 === 0;
    if (!isNumberTurn || selectedTiles.length >= config.tilesCount) return false;
    if (isTileSelected(tile)) return false;
    return isTileValidForNextSelection(tile);
  };

  const isLegalNextOperatorSlot = (
    row: number,
    col: number,
    position: 'horizontal' | 'vertical'
  ): boolean => {
    const totalSelections = selectedTiles.length + selectedOperators.length;
    const isOperatorTurn = totalSelections % 2 === 1;
    if (!isOperatorTurn || selectedOperators.length >= config.operatorsCount) return false;
    return isOperatorValidForSelection(row, col, position);
  };

  const pathAxis = (): 'horizontal' | 'vertical' | null => {
    if (selectedTiles.length < 2) return null;
    const a = selectedTiles[0];
    const b = selectedTiles[1];
    if (a.position.row === b.position.row) return 'horizontal';
    if (a.position.col === b.position.col) return 'vertical';
    return null;
  };

  // Helper function to check if two tiles are adjacent
  const areTilesAdjacent = (tile1: Tile, tile2: Tile): boolean => {
    const rowDiff = Math.abs(tile1.position.row - tile2.position.row);
    const colDiff = Math.abs(tile1.position.col - tile2.position.col);

    // Adjacent means they share an edge (not diagonal)
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  };

  // Helper function to check if a tile is valid for the next selection
  const isTileValidForNextSelection = (tile: Tile): boolean => {
    if (selectedTiles.length === 0) {
      return true; // First tile can be selected from anywhere
    }

    // If we have operators selected, the next tile must be connected by the last operator
    if (selectedOperators.length > 0) {
      const lastOperator = selectedOperatorPositions[selectedOperatorPositions.length - 1];
      const lastTile = selectedTiles[selectedTiles.length - 1];

      // Check if this tile is connected by the last operator
      if (lastOperator.position === 'horizontal') {
        // For horizontal operator, check if this tile is the one connected by the operator
        if (lastOperator.col === lastTile.position.col) {
          // Operator is to the right of last tile, so next tile must be to the right
          return (
            tile.position.row === lastTile.position.row &&
            tile.position.col === lastTile.position.col + 1
          );
        } else {
          // Operator is to the left of last tile, so next tile must be to the left
          return (
            tile.position.row === lastTile.position.row &&
            tile.position.col === lastTile.position.col - 1
          );
        }
      } else {
        // For vertical operator, check if this tile is the one connected by the operator
        if (lastOperator.row === lastTile.position.row) {
          // Operator is below last tile, so next tile must be below
          return (
            tile.position.col === lastTile.position.col &&
            tile.position.row === lastTile.position.row + 1
          );
        } else {
          // Operator is above last tile, so next tile must be above
          return (
            tile.position.col === lastTile.position.col &&
            tile.position.row === lastTile.position.row - 1
          );
        }
      }
    }

    // If no operators selected yet, just check adjacency
    const lastSelectedTile = selectedTiles[selectedTiles.length - 1];
    return areTilesAdjacent(lastSelectedTile, tile);
  };

  // Helper function to check if an operator is valid for selection
  const isOperatorValidForSelection = (
    row: number,
    col: number,
    position: 'horizontal' | 'vertical'
  ): boolean => {
    if (selectedTiles.length === 0) {
      return false; // Need at least one tile to select an operator
    }

    const lastTile = selectedTiles[selectedTiles.length - 1];

    const axis = pathAxis();
    if (axis !== null && position !== axis) {
      return false;
    }

    // Check if this operator is adjacent to the last selected tile
    if (position === 'horizontal') {
      // Horizontal operator should be adjacent horizontally
      return (
        lastTile.position.row === row &&
        (lastTile.position.col === col || lastTile.position.col === col + 1)
      );
    } else {
      // Vertical operator should be adjacent vertically
      return (
        lastTile.position.col === col &&
        (lastTile.position.row === row || lastTile.position.row === row + 1)
      );
    }
  };

  const renderHorizontalOperators = (row: number, col: number) => {
    if (col >= config.gridSize - 1) return null;

    return (
      <div className="relative z-[1] flex h-full w-full flex-col items-stretch justify-center">
        {signsForGap(gapOperators, config, gapKey('h', row, col)).map((operator) => (
          <OperatorIcon
            key={`h-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="horizontal"
            isSelected={isOperatorSelected(row, col, 'horizontal', operator)}
            isInHint={isOperatorInHint(row, col, 'horizontal', operator)}
            isLegalNext={isLegalNextOperatorSlot(row, col, 'horizontal')}
            isAvailable={isOperatorAvailable(row, col, 'horizontal')}
            size={getOperatorSize()}
            fill={Boolean(fit)}
            fontPx={fit?.signPx}
            row={row}
            col={col}
            onClick={() => handleOperatorClick(operator, row, col, 'horizontal')}
          />
        ))}
      </div>
    );
  };

  const renderVerticalOperators = (row: number, col: number) => {
    if (row >= config.gridSize - 1) return null;

    return (
      <div className="relative z-[1] flex h-full w-full items-stretch justify-center">
        {signsForGap(gapOperators, config, gapKey('v', row, col)).map((operator) => (
          <OperatorIcon
            key={`v-${row}-${col}-${operator}`}
            operator={operator as '+' | '-' | '*'}
            position="vertical"
            isSelected={isOperatorSelected(row, col, 'vertical', operator)}
            isInHint={isOperatorInHint(row, col, 'vertical', operator)}
            isLegalNext={isLegalNextOperatorSlot(row, col, 'vertical')}
            isAvailable={isOperatorAvailable(row, col, 'vertical')}
            size={getOperatorSize()}
            fill={Boolean(fit)}
            fontPx={fit?.signPx}
            row={row}
            col={col}
            onClick={() => handleOperatorClick(operator, row, col, 'vertical')}
          />
        ))}
      </div>
    );
  };

  // ─── Fit-to-screen board ───────────────────────────────────────────────
  // Measure the free space and size tiles + sign lanes so the whole board
  // fits without scrolling. Sign lanes get wider when a gap shows more signs.
  const [boardBox, setBoardBox] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = tilesContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setBoardBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const signsShown = gapOperators
    ? Math.max(1, ...Object.values(gapOperators).map((signs) => signs.length))
    : config.availableOperators.length;
  const GRID_GAP = 4;
  const GRID_PAD = 6;
  const fit = (() => {
    if (!boardBox) return null;
    const n = config.gridSize;
    const laneRatio = signsShown <= 1 ? 0.6 : signsShown === 2 ? 0.64 : 0.74;
    const units = n + (n - 1) * laneRatio;
    const fixed = 2 * GRID_PAD + (2 * n - 2) * GRID_GAP;
    const maxTile = n <= 3 ? 84 : n === 4 ? 72 : 60;
    const tile = Math.floor(
      Math.min((boardBox.w - fixed) / units, (boardBox.h - fixed) / units, maxTile)
    );
    if (!Number.isFinite(tile) || tile < 24) return null;
    const lane = Math.round(tile * laneRatio);
    const track = Array.from({ length: 2 * n - 1 }, (_, i) =>
      i % 2 === 0 ? `${tile}px` : `${lane}px`
    ).join(' ');
    const signPx = Math.max(11, Math.min(24, Math.round(Math.min(lane, tile / signsShown) * 0.5)));
    return { tile, lane, track, signPx };
  })();

  const gridContainerClasses =
    config.gridSize === 4
      ? `inline-grid max-w-full gap-1 p-1.5 shadow-inner sm:gap-1.5 sm:p-2 bg-gray-50 rounded-xl grid-cols-7`
      : config.gridSize >= 5
        ? `inline-grid gap-0 p-0.5 sm:gap-0 sm:p-0.5 bg-gray-50 rounded-xl shadow-inner grid-cols-9`
        : `
    inline-grid gap-0.5 sm:gap-0.5 p-1 sm:p-1 bg-gray-50 rounded-xl shadow-inner
    grid-cols-5
  `;

  if (initError) {
    return (
      <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm text-center">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Couldn&apos;t start the game</h2>
          <p className="text-sm text-gray-600 mb-4">{initError}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4 overflow-hidden relative">
      {/* Floating action buttons. Anchored to bottom-right so the position is
          independent of header height — works on portrait, landscape, and
          short-viewport iOS Safari with the URL bar visible. */}
      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kb-help-title"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl p-6 max-w-sm w-full"
          >
            <h2 id="kb-help-title" className="text-lg font-bold mb-3">
              Keyboard shortcuts
            </h2>
            <p className="mb-3 text-xs font-medium text-gray-600 dark:text-gray-400">
              Tiles must form one straight row or column; alternate tile → operator → tile. Math
              groups left to right (see the target card).
            </p>
            <ul className="text-sm space-y-2">
              <li>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">↑ ↓ ← →</kbd> Move
                focus on the board
              </li>
              <li>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> /{' '}
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Space</kbd> Pick
                or unpick a tile
              </li>
              <li>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Tab</kbd> Move
                between tiles, operators, controls
              </li>
              <li>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> Clear
                current selection (or close this)
              </li>
              <li>
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> Show /
                hide this dialog
              </li>
            </ul>
            <button
              autoFocus
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <MixedUnitIntroModal
        open={showMixedUnitIntro}
        onDismiss={() => markLearnMixedUnitIntroSeen()}
      />

      <div className="max-w-4xl mx-auto flex h-full min-h-0 flex-col gap-2 sm:gap-3">
        <GameHeader
          onBack={onBack ?? handleBackToLobby}
          currentTarget={currentTarget}
          subtitle={labelOverride ?? headerSubtitle}
          rules={rhythmInstruction(
            config.tilesCount,
            config.availableOperators,
            gapOperators ? config.signsPerGap : undefined
          )}
          score={score}
          timer={
            timerOverride ??
            (gameMode === 'learning' ? undefined : gameMode === 'timeAttack' ? (
              <TimeAttackTimer />
            ) : (
              <Timer />
            ))
          }
          round={currentRound}
          totalRounds={totalRounds}
          roundSolved={roundSolved}
          combo={comboStreak}
        />

        {/* Game grid + actions directly beneath (actions stay visible; grid scrolls when tall). */}
        <div className="mb-2 flex min-h-0 flex-1 flex-col px-0 sm:mb-4">
          <div
            ref={tilesContainerRef}
            className={`flex min-h-0 flex-1 justify-center overflow-x-hidden ${fit ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
            aria-label="Game board"
            role="grid"
          >
            <motion.div
              ref={gridBoardRef}
              className={
                fit
                  ? 'relative my-auto rounded-xl bg-gray-50 shadow-inner dark:bg-slate-800/60'
                  : `${gridContainerClasses} relative my-auto max-h-full max-w-full`
              }
              style={
                fit
                  ? {
                      display: 'grid',
                      gridTemplateColumns: fit.track,
                      gridTemplateRows: fit.track,
                      gap: GRID_GAP,
                      padding: GRID_PAD,
                    }
                  : undefined
              }
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {pathSegments.length > 0 && (
                <svg
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
                  aria-hidden
                >
                  {pathSegments.map((seg, i) => (
                    <line
                      key={`path-${i}`}
                      x1={seg.x1}
                      y1={seg.y1}
                      x2={seg.x2}
                      y2={seg.y2}
                      stroke="rgb(59 130 246)"
                      strokeWidth={4}
                      strokeLinecap="round"
                      opacity={0.85}
                    />
                  ))}
                </svg>
              )}
              {Array.from({ length: config.gridSize }, (_, row) => (
                <React.Fragment key={`row-${row}`}>
                  {Array.from({ length: config.gridSize }, (_, col) => {
                    const tileIndex = row * config.gridSize + col;
                    const tile = grid[tileIndex];

                    if (!tile) {
                      return (
                        <div
                          key={`empty-${row}-${col}`}
                          style={
                            fit
                              ? { width: fit.tile, height: fit.tile }
                              : numberTileBoxStyle(getTileSize())
                          }
                          aria-hidden
                        />
                      );
                    }

                    return (
                      <React.Fragment key={`cell-${row}-${col}`}>
                        {/* Render tile */}
                        <div className="relative z-[1] flex items-center justify-center">
                          <motion.div
                            ref={(el) => {
                              tileElRefs.current[tile.id] = el;
                            }}
                            role="button"
                            tabIndex={tileIndex === focusedIdx ? 0 : -1}
                            data-roving-idx={tileIndex}
                            aria-label={`Tile value ${tile.value}, row ${row + 1}, column ${col + 1}${isTileSelected(tile) ? ', selected' : ''}`}
                            aria-pressed={isTileSelected(tile)}
                            onFocus={() => setFocusedIdx(tileIndex)}
                            onClick={() => handleTileClick(tile)}
                            onKeyDown={(e) => {
                              const size = config.gridSize;
                              switch (e.key) {
                                case 'Enter':
                                case ' ':
                                  e.preventDefault();
                                  handleTileClick(tile);
                                  return;
                                case 'ArrowRight':
                                  e.preventDefault();
                                  setFocusedIdx(row * size + Math.min(size - 1, col + 1));
                                  return;
                                case 'ArrowLeft':
                                  e.preventDefault();
                                  setFocusedIdx(row * size + Math.max(0, col - 1));
                                  return;
                                case 'ArrowDown':
                                  e.preventDefault();
                                  setFocusedIdx(Math.min(size - 1, row + 1) * size + col);
                                  return;
                                case 'ArrowUp':
                                  e.preventDefault();
                                  setFocusedIdx(Math.max(0, row - 1) * size + col);
                                  return;
                                case 'Home':
                                  e.preventDefault();
                                  setFocusedIdx(row * size);
                                  return;
                                case 'End':
                                  e.preventDefault();
                                  setFocusedIdx(row * size + size - 1);
                                  return;
                                default:
                                  return;
                              }
                            }}
                            className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <NumberTile
                              tile={tile}
                              isSelected={isTileSelected(tile)}
                              isInPath={isTileInPath(tile)}
                              pathIndex={getPathIndex(tile)}
                              isInHint={isTileInHint(tile)}
                              hintPathIndex={getHintPathIndex(tile)}
                              isLegalNext={isLegalNextTile(tile)}
                              isSuccess={roundSolved && isTileInPath(tile)}
                              isError={
                                showFeedback && !feedbackData.isCorrect && isTileInPath(tile)
                              }
                              size={getTileSize()}
                              boxPx={fit?.tile}
                            />
                          </motion.div>
                        </div>

                        {/* Render horizontal operators (except for last column) */}
                        {col < config.gridSize - 1 && (
                          <div className="flex items-center justify-center">
                            {renderHorizontalOperators(row, col)}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Render vertical operators row (except for last row) */}
                  {row < config.gridSize - 1 && (
                    <>
                      {Array.from({ length: config.gridSize }, (_, col) => (
                        <React.Fragment key={`v-operators-${row}-${col}`}>
                          <div className="flex items-center justify-center">
                            {renderVerticalOperators(row, col)}
                          </div>
                          {/* Empty space between vertical operators */}
                          {col < config.gridSize - 1 && <div></div>}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
            </motion.div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 pt-3 pb-1">
            <motion.button
              type="button"
              onClick={findHint}
              disabled={showHint || hintUsedThisRound}
              aria-label={
                hintUsedThisRound
                  ? 'Hint unavailable, one hint per round'
                  : showHint
                    ? 'Hint is showing'
                    : `Hint, costs ${HINT_SCORE_PENALTY} points`
              }
              title={
                hintUsedThisRound
                  ? 'One hint per round'
                  : showHint
                    ? 'Hint active'
                    : `Costs ${HINT_SCORE_PENALTY} score`
              }
              className={`min-h-[44px] min-w-[5.5rem] rounded-2xl px-4 py-2 text-sm font-black shadow-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 disabled:cursor-not-allowed ${
                showHint || hintUsedThisRound
                  ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'
              }`}
              whileHover={!(showHint || hintUsedThisRound) ? { scale: 1.02 } : {}}
              whileTap={!(showHint || hintUsedThisRound) ? { scale: 0.98 } : {}}
            >
              Hint
            </motion.button>
            <motion.button
              type="button"
              onClick={clearSelection}
              disabled={selectedTiles.length === 0 && selectedOperators.length === 0 && !showHint}
              aria-label="Clear selection"
              title="Clear your current path"
              className={`min-h-[44px] min-w-[5.5rem] rounded-2xl px-4 py-2 text-sm font-black shadow-md transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 disabled:cursor-not-allowed ${
                selectedTiles.length === 0 && selectedOperators.length === 0 && !showHint
                  ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700'
              }`}
              whileHover={
                selectedTiles.length > 0 || selectedOperators.length > 0 || showHint
                  ? { scale: 1.02 }
                  : {}
              }
              whileTap={
                selectedTiles.length > 0 || selectedOperators.length > 0 || showHint
                  ? { scale: 0.98 }
                  : {}
              }
            >
              Clear
            </motion.button>
          </div>
        </div>

        {/* Feedback */}
        <CalculationFeedback
          calculation={feedbackData.calculation}
          result={feedbackData.result}
          target={feedbackData.target}
          isCorrect={feedbackData.isCorrect}
          negativeStep={feedbackData.negativeStep}
          isVisible={showFeedback}
          combo={comboStreak}
          onContinue={barAutoDismisses ? undefined : handleContinue}
          onTryAgain={barAutoDismisses ? undefined : handleTryAgain}
        />
      </div>

      {/* Celebration Particles */}
      <CelebrationParticles
        show={showCelebration}
        onComplete={handleCelebrationComplete}
        intensity={gameMode === 'timeAttack' ? 'high' : 'medium'}
      />
    </div>
  );
};
