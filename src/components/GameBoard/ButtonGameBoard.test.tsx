import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ButtonGameBoard } from './ButtonGameBoard';
import { useGameStore } from '../../store/gameStore';

const renderBoard = (props?: Partial<React.ComponentProps<typeof ButtonGameBoard>>) =>
  render(
    <MemoryRouter>
      <ButtonGameBoard difficulty="easy" gameMode="classic" {...props} />
    </MemoryRouter>
  );

describe('<ButtonGameBoard /> smoke', () => {
  it('renders the header chrome and a target number', () => {
    renderBoard();
    expect(screen.getByText('Classic · Easy')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Target number/i })).toBeInTheDocument();
    expect(useGameStore.getState().gameStatus).toBe('playing');
  });

  it('shows the difficulty label in the header', () => {
    renderBoard();
    expect(screen.getByText(/· Easy$/)).toBeInTheDocument();
  });

  it('shows Learn level context when launched from the curriculum', () => {
    renderBoard({ gameMode: 'learning', levelId: 'u1-l1' });
    expect(screen.getByText(/Addition/i)).toBeInTheDocument();
    expect(screen.getByText(/First sum/i)).toBeInTheDocument();
    expect(screen.getByText(/Level 1 of 25/i)).toBeInTheDocument();
  });

  it('renders the init-error fallback when the store is in an error state', () => {
    // Stub initializeGame so it doesn't immediately clear the error state we set.
    const noop = vi.fn();
    useGameStore.setState({
      initializeGame: noop,
      startRoundTimer: noop,
      initError: 'Test failure message',
    });
    renderBoard();
    expect(screen.getByText(/Test failure message/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to menu/i })).toBeInTheDocument();
  });

  it('cleanup runs on unmount (no leaked timers)', () => {
    const cleanupSpy = vi.spyOn(useGameStore.getState(), 'cleanup');
    const { unmount } = renderBoard();
    unmount();
    expect(cleanupSpy).toHaveBeenCalled();
  });
});
