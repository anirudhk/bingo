import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LearningPath } from './LearningPath';
import { useProgressStore } from '../../store/progressStore';
import { LEVELS } from '../../constants/levels';

const reset = () => {
  useProgressStore.getState().resetProgress();
  localStorage.clear();
};

beforeEach(reset);
afterEach(reset);

const renderPath = () =>
  render(
    <MemoryRouter>
      <LearningPath />
    </MemoryRouter>
  );

describe('LearningPath', () => {
  it('renders all 25 levels', () => {
    renderPath();
    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
    LEVELS.forEach((l) => {
      // Query by stable data attribute — level titles can contain regex
      // metacharacters (e.g. "+ or − ?") that break getByRole name matching.
      const node = document.querySelector(`[data-level-id="${l.id}"]`);
      expect(node).not.toBeNull();
    });
  });

  it('only the first level is enabled with no progress', () => {
    renderPath();
    // Restrict to *level* buttons (not the daily-puzzle banner button etc.)
    // by filtering on the stable `data-level-id` attribute the LevelNode sets.
    const enabled = screen
      .getAllByRole('button')
      .filter(
        (b) => !(b as HTMLButtonElement).disabled && b.getAttribute('data-level-id') !== null
      );
    expect(enabled).toHaveLength(1);
    expect(enabled[0].getAttribute('data-level-id')).toBe('u1-l1');
  });

  it('completing the first level unlocks the second', () => {
    useProgressStore.getState().completeLevel('u1-l1', 2, 50);
    renderPath();
    const enabled = screen
      .getAllByRole('button')
      .filter(
        (b) => !(b as HTMLButtonElement).disabled && b.getAttribute('data-level-id') !== null
      );
    const ids = enabled.map((b) => b.getAttribute('data-level-id'));
    expect(ids).toContain('u1-l1');
    expect(ids).toContain('u1-l2');
    expect(ids).not.toContain('u1-l3');
  });

  it('shows X/5 complete in unit header', () => {
    useProgressStore.getState().completeLevel('u1-l1', 1, 10);
    useProgressStore.getState().completeLevel('u1-l2', 1, 10);
    renderPath();
    expect(screen.getByText('Sums in any direction · 2 of 5 complete')).toBeInTheDocument();
  });
});
