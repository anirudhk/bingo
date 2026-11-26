import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BuddiesPage } from './BuddiesPage';
import { useProgressStore } from '../../store/progressStore';
import { BUDDIES } from '../../constants/buddies';

afterEach(() => useProgressStore.getState().resetProgress());

describe('<BuddiesPage />', () => {
  it('shows earned buddies, goals for locked ones, and hides the secret', () => {
    useProgressStore.getState().completeLevel('u1-l1', 1, 10);
    render(
      <MemoryRouter>
        <BuddiesPage />
      </MemoryRouter>
    );
    expect(
      screen.getByText(`1 of ${BUDDIES.length} collected`, { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Sprout, unlocked')).toBeInTheDocument();
    expect(screen.getByText('Complete Unit 1: Addition')).toBeInTheDocument();
    expect(screen.getByText('???')).toBeInTheDocument();
    expect(screen.queryByText('Golden 7')).not.toBeInTheDocument();
  });
});
