import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => ({ auth: { signInWithOtp, signInWithOAuth } }),
}));
vi.mock('../../auth/authContext', () => ({ useAuthOptional: () => null }));

import { AuthPanel } from './AuthPanel';

describe('<AuthPanel /> age confirmation', () => {
  it('keeps every sign-in option disabled until the player confirms they are 13+', async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);
    await user.type(screen.getByLabelText(/email/i), 'kid@example.com');

    const send = screen.getByRole('button', { name: /send link/i });
    const google = screen.getByRole('button', { name: /google/i });
    const apple = screen.getByRole('button', { name: /apple/i });
    expect(send).toBeDisabled();
    expect(google).toBeDisabled();
    expect(apple).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /13 or older/i }));
    expect(send).toBeEnabled();
    expect(google).toBeEnabled();
    expect(apple).toBeEnabled();
  });

  it('tells under-13s they can keep playing without an account', () => {
    render(<AuthPanel />);
    expect(
      screen.getByText(/under 13\? you can keep playing without an account/i)
    ).toBeInTheDocument();
  });
});
