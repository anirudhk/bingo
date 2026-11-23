import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { HomeShell } from './HomeShell';

const LearnPanel: React.FC = () => <div data-testid="learn-panel">LEARN</div>;
const PlayPanel: React.FC = () => <div data-testid="play-panel">PLAY</div>;

const renderApp = (initialEntries: string[] = ['/']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<HomeShell />}>
          <Route path="/" element={<Outlet />} />
          <Route path="/learn" element={<LearnPanel />} />
          <Route path="/play" element={<PlayPanel />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

const reset = () => {
  localStorage.clear();
};

beforeEach(reset);
afterEach(reset);

describe('HomeShell', () => {
  it('renders both tabs and the XP/streak header', () => {
    renderApp(['/learn']);
    expect(screen.getByRole('tab', { name: /learn/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/experience points/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/day streak/i)).toBeInTheDocument();
  });

  it('clicking the Play tab switches the panel', async () => {
    const user = userEvent.setup();
    renderApp(['/learn']);
    expect(screen.getByTestId('learn-panel')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /play/i }));
    expect(screen.getByTestId('play-panel')).toBeInTheDocument();
  });

  it('persists the active tab to localStorage', async () => {
    const user = userEvent.setup();
    renderApp(['/learn']);
    await user.click(screen.getByRole('tab', { name: /play/i }));
    expect(localStorage.getItem('gridgenius:lastHomeTab:v1')).toBe('play');
  });

  it('"/" redirects to last-used tab', () => {
    localStorage.setItem('gridgenius:lastHomeTab:v1', 'play');
    renderApp(['/']);
    expect(screen.getByTestId('play-panel')).toBeInTheDocument();
  });

  it('"/" defaults to Learn when no tab has been chosen', () => {
    renderApp(['/']);
    expect(screen.getByTestId('learn-panel')).toBeInTheDocument();
  });
});
