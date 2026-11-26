import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChallengePage } from './ChallengePage';
import { encodeChallenge } from '../../utils/challenge';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/challenge/:payload" element={<ChallengePage />} />
      </Routes>
    </MemoryRouter>
  );

describe('<ChallengePage />', () => {
  it("shows the friend's time before starting", () => {
    at(
      `/challenge/${encodeChallenge({ v: 1, mode: 'quickGame', difficulty: 'easy', seed: 'abcd1234', timeMs: 75_000 })}`
    );
    expect(screen.getByText('A friend did this in 1:15')).toBeInTheDocument();
    expect(screen.getByText(/Challenge · Quick Game/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument();
  });

  it('explains a broken link', () => {
    at('/challenge/garbage');
    expect(screen.getByText(/link looks broken/i)).toBeInTheDocument();
  });
});
