import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsDrawer } from './SettingsDrawer';
import { usePrefsStore } from '../../store/prefsStore';
import { useProgressStore } from '../../store/progressStore';

const reset = () => {
  usePrefsStore.getState().resetPrefs();
  useProgressStore.getState().resetProgress();
  localStorage.clear();
};

beforeEach(reset);
afterEach(reset);

const wrap = (ui: JSX.Element) => <MemoryRouter>{ui}</MemoryRouter>;

describe('<SettingsDrawer />', () => {
  it('does not render when closed', () => {
    render(wrap(<SettingsDrawer open={false} onClose={() => {}} />));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open and exposes a settings dialog with sections', () => {
    render(wrap(<SettingsDrawer open onClose={() => {}} />));
    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/^theme$/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^motion$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset all progress/i })).toBeInTheDocument();
  });

  it('changing theme writes through to prefsStore', async () => {
    const user = userEvent.setup();
    render(wrap(<SettingsDrawer open onClose={() => {}} />));
    await user.click(screen.getByRole('radio', { name: /dark/i }));
    expect(usePrefsStore.getState().theme).toBe('dark');
  });

  it('Esc fires onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(wrap(<SettingsDrawer open onClose={onClose} />));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('reset progress is gated by window.confirm', async () => {
    const user = userEvent.setup();
    useProgressStore.setState({ xp: 50 });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(wrap(<SettingsDrawer open onClose={() => {}} />));
    await user.click(screen.getByRole('button', { name: /reset all progress/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(useProgressStore.getState().xp).toBe(50);

    confirmSpy.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /reset all progress/i }));
    expect(useProgressStore.getState().xp).toBe(0);
    confirmSpy.mockRestore();
  });
});

describe('<SettingsDrawer /> sound & board themes', () => {
  it('toggles sound effects through prefsStore', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsDrawer open onClose={() => {}} />
      </MemoryRouter>
    );
    const toggle = screen.getByRole('switch', { name: /sound effects/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await user.click(toggle);
    expect(usePrefsStore.getState().soundEnabled).toBe(false);
  });

  it('locks board themes the player has not earned yet', () => {
    render(
      <MemoryRouter>
        <SettingsDrawer open onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /classic board theme/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /galaxy, unlocks at 450 xp/i })).toBeDisabled();
  });
});
