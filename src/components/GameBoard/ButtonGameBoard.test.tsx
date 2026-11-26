import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('Easy: a one-sign gap still needs the sign tapped before the next number', () => {
    renderBoard();
    const tileAt = (r: number, c: number) =>
      screen.getByLabelText(new RegExp(`^Tile value \\d+, row ${r}, column ${c}`));
    const pressed = () => document.querySelectorAll('[aria-pressed="true"]').length;
    fireEvent.click(tileAt(1, 1));
    expect(pressed()).toBe(1);
    // The neighbouring number is refused: no sign was tapped yet.
    fireEvent.click(tileAt(1, 2));
    expect(pressed()).toBe(1);

    const sign = screen.getAllByRole('button', { name: /between these columns/ })[0];
    fireEvent.click(sign);
    expect(sign).toHaveAttribute('aria-pressed', 'true');
    expect(pressed()).toBe(2);
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
