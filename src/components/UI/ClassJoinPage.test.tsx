import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const joinRoom = vi.fn().mockResolvedValue({ roomId: 'room-1' });
const signInAsGuest = vi.fn().mockResolvedValue(null);
vi.mock('../../lib/supabase/client', () => ({ useSupabase: () => ({}) }));
vi.mock('../../auth/authContext', () => ({
  useAuthOptional: () => ({ user: null, signInAsGuest }),
}));
vi.mock('../../services/classroom', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  joinRoom: (...args: unknown[]) => joinRoom(...args),
}));

import { ClassJoinPage } from './ClassroomPages';

describe('<ClassJoinPage />', () => {
  it('cleans the code, needs a nickname, and joins as a guest', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ClassJoinPage />
      </MemoryRouter>
    );
    const join = screen.getByRole('button', { name: /^join$/i });
    await user.type(screen.getByLabelText(/room code/i), 'ab-c 12 3x');
    expect(screen.getByLabelText(/room code/i)).toHaveValue('ABC123');
    expect(join).toBeDisabled();
    await user.type(screen.getByLabelText(/nickname/i), 'Maya');
    expect(join).toBeEnabled();
    await user.click(join);
    expect(signInAsGuest).toHaveBeenCalledTimes(1);
    expect(joinRoom).toHaveBeenCalledWith(expect.anything(), 'ABC123', 'Maya');
  });
});
