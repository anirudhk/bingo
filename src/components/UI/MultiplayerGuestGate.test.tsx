import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../../auth/authContext';
import { MultiplayerGuestGate } from './MultiplayerGuestGate';

const renderGate = (signInAsGuest: AuthContextValue['signInAsGuest']) => {
  const value: AuthContextValue = {
    user: null,
    session: null,
    loading: false,
    isGuest: false,
    signInAsGuest,
    signOut: async () => {},
    authRedirectError: null,
    clearAuthRedirectError: () => {},
  };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={value}>
        <MultiplayerGuestGate />
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('<MultiplayerGuestGate />', () => {
  it('starts a guest session without asking for an email', async () => {
    const user = userEvent.setup();
    const signInAsGuest = vi.fn().mockResolvedValue(null);
    renderGate(signInAsGuest);
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /play as guest/i }));
    expect(signInAsGuest).toHaveBeenCalledTimes(1);
  });

  it('explains when guest play is switched off on the server', async () => {
    const user = userEvent.setup();
    renderGate(vi.fn().mockResolvedValue('Anonymous sign-ins are disabled'));
    await user.click(screen.getByRole('button', { name: /play as guest/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/guest play is switched off/i);
  });

  it('tells guests their games are unrated', () => {
    renderGate(vi.fn());
    expect(screen.getByText(/don.t count toward ratings/i)).toBeInTheDocument();
  });
});
