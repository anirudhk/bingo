import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ResultPage } from './ResultPage';
import { useGameStore } from '../../store/gameStore';
import { useProgressStore } from '../../store/progressStore';
import { usePrefsStore } from '../../store/prefsStore';

const reset = () => {
  useGameStore.setState(useGameStore.getInitialState(), true);
  useGameStore.getState().cleanup();
  useProgressStore.getState().resetProgress();
  usePrefsStore.getState().resetPrefs();
  localStorage.clear();
  sessionStorage.clear();
};

beforeEach(reset);
afterEach(reset);

const renderResult = () =>
  render(
    <MemoryRouter>
      <ResultPage />
    </MemoryRouter>
  );

describe('<ResultPage /> Learn-mode stars', () => {
  it('renders 3 stars and credits XP when wrongAttempts is 0', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l1',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
        totalTime: 12345,
      });
    });
    renderResult();
    expect(screen.getByLabelText('3 of 3 stars')).toBeInTheDocument();
    expect(screen.getByText('+30 XP')).toBeInTheDocument();
    const progress = useProgressStore.getState().levels['u1-l1'];
    expect(progress.bestStars).toBe(3);
    expect(progress.bestScore).toBe(50);
    expect(useProgressStore.getState().xp).toBe(30);
  });

  it('renders 2 stars when wrongAttempts is 1', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l2',
        wrongAttempts: 1,
        score: 30,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
        totalTime: 0,
      });
    });
    renderResult();
    expect(screen.getByLabelText('2 of 3 stars')).toBeInTheDocument();
    expect(screen.getByText('+20 XP')).toBeInTheDocument();
  });

  it('renders 1 star when wrongAttempts >= 2', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l3',
        wrongAttempts: 4,
        score: 10,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
        totalTime: 0,
      });
    });
    renderResult();
    expect(screen.getByLabelText('1 of 3 stars')).toBeInTheDocument();
    expect(screen.getByText('+10 XP')).toBeInTheDocument();
  });

  it('shows the "Next level" CTA when there is a next level', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l1',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
        totalTime: 0,
      });
    });
    renderResult();
    expect(screen.getByRole('button', { name: /next level/i })).toBeInTheDocument();
  });

  it('resets the completed session before navigating to the next level', async () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l1',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
        totalTime: 0,
      });
    });

    const user = userEvent.setup();
    renderResult();
    await user.click(screen.getByRole('button', { name: /next level/i }));

    expect(useGameStore.getState().gameStatus).toBe('paused');
    expect(useGameStore.getState().currentLevelId).toBeNull();
  });

  it('shows the path-finished message instead of CTA on the final level', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u5-l5',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'hard',
        totalTime: 0,
      });
    });
    renderResult();
    expect(screen.queryByRole('button', { name: /next level/i })).not.toBeInTheDocument();
    expect(screen.getByText(/finished the path/i)).toBeInTheDocument();
  });
});

describe('<ResultPage /> Play-mode (legacy)', () => {
  it('renders Play Again + Back to Menu', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'classic',
        currentLevelId: null,
        wrongAttempts: 0,
        score: 35,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'medium',
        totalTime: 12000,
      });
    });
    renderResult();
    expect(screen.getByText(/Game Complete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to menu/i })).toBeInTheDocument();
  });
});

describe('<ResultPage /> rewards & sharing', () => {
  it('announces a board theme unlocked by this level’s XP', () => {
    // 3 stars = +30 XP, which crosses the Ocean threshold (30).
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l1',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
      });
    });
    renderResult();
    expect(screen.getByText(/new board theme unlocked/i)).toBeInTheDocument();
    expect(screen.getByText('Ocean')).toBeInTheDocument();
  });

  it('replaying with no star improvement says so instead of claiming XP', () => {
    useProgressStore.getState().completeLevel('u1-l1', 3, 50);
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l1',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
      });
    });
    renderResult();
    expect(screen.getByText('Best stars already earned')).toBeInTheDocument();
  });

  it('copies a spoiler-free daily result when the share sheet is unavailable', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    act(() => {
      useGameStore.setState({
        gameMode: 'dailyPuzzle',
        currentPuzzleId: 'p-test',
        wrongAttempts: 1,
        gameStatus: 'completed',
        difficulty: 'hard',
        totalTime: 42_000,
      });
    });
    renderResult();
    await user.click(screen.getByRole('button', { name: /share result/i }));
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toMatch(/^Grid Genius #\d+ · Hard/);
    expect(text).toContain('🟥🟩 2 tries · 0:42');
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument();
  });
});

describe('<ResultPage /> star guidance', () => {
  it('explains how to earn 3 stars when the player got fewer', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l2',
        wrongAttempts: 2,
        score: 30,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
      });
    });
    renderResult();
    expect(screen.getByText('Level complete!')).toBeInTheDocument();
    expect(screen.getByText(/no wrong answers and no hints for 3 stars/i)).toBeInTheDocument();
  });

  it('celebrates a perfect run without the tip', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l2',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
      });
    });
    renderResult();
    expect(screen.getByText('Perfect!')).toBeInTheDocument();
    expect(screen.queryByText(/for 3 stars/i)).not.toBeInTheDocument();
  });
});

describe('<ResultPage /> Number Buddies', () => {
  it('announces buddies earned by this level', () => {
    act(() => {
      useGameStore.setState({
        gameMode: 'learning',
        currentLevelId: 'u1-l1',
        wrongAttempts: 0,
        score: 50,
        gameStatus: 'completed',
        totalRounds: 5,
        difficulty: 'easy',
      });
    });
    renderResult();
    expect(screen.getAllByText(/new buddy unlocked/i)).toHaveLength(2);
    expect(screen.getByText('Sprout')).toBeInTheDocument();
    expect(screen.getByText('Star Kit')).toBeInTheDocument();
  });
});
