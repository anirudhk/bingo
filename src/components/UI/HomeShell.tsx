import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProgressStore } from '../../store/progressStore';
import { SettingsDrawer } from './SettingsDrawer';
import { FirstRunTutorial } from './FirstRunTutorial';
import { AuthModal } from './AuthModal';
import { useAuthOptional } from '../../auth/authContext';
import { isSupabaseConfigured } from '../../lib/supabase/client';

const LAST_TAB_KEY = 'gridgenius:lastHomeTab:v1';

type Tab = 'learn' | 'play';

const isTab = (v: string | null): v is Tab => v === 'learn' || v === 'play';

const readLastTab = (): Tab => {
  try {
    const v = localStorage.getItem(LAST_TAB_KEY);
    if (isTab(v)) return v;
  } catch {
    // localStorage may be unavailable (private mode, SSR) — fall through.
  }
  return 'learn';
};

const writeLastTab = (tab: Tab): void => {
  try {
    localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // Best-effort.
  }
};

/**
 * Two-tab home shell. `Learn` is the default tab; `Play` is the legacy lobby.
 * The active tab is derived from the URL (`/learn` vs `/play*`); the *last*
 * tab the user touched is persisted so a fresh visit to `/` lands them where
 * they left off.
 */
export const HomeShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthOptional();
  const xp = useProgressStore((s) => s.xp);
  const streakCount = useProgressStore((s) => s.streak.count);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [signedInNotice, setSignedInNotice] = useState(false);
  // Guests (anonymous multiplayer sessions) still see Sign in.
  const showCloudAuth = isSupabaseConfigured() && (!auth?.user || auth.isGuest);

  // /  → resolve to last-used tab (default Learn).
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      navigate(`/${readLastTab()}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  // Persist whichever tab the user is currently on.
  useEffect(() => {
    if (location.pathname.startsWith('/learn')) writeLastTab('learn');
    else if (location.pathname.startsWith('/play')) writeLastTab('play');
  }, [location.pathname]);

  // Magic-link / OAuth failures land with error in URL — show sign-in modal with the message.
  useEffect(() => {
    if (auth?.authRedirectError) setAuthOpen(true);
  }, [auth?.authRedirectError]);

  // OAuth / magic link completes in a full-page redirect — no in-modal “success”. Show a short banner once.
  useEffect(() => {
    if (!auth?.user) {
      setSignedInNotice(false);
      return;
    }
    setAuthOpen(false);
    try {
      if (sessionStorage.getItem('gg:authWelcome') !== '1') return;
      sessionStorage.removeItem('gg:authWelcome');
      setSignedInNotice(true);
      const t = window.setTimeout(() => setSignedInNotice(false), 6000);
      return () => window.clearTimeout(t);
    } catch {
      return undefined;
    }
  }, [auth?.user]);

  return (
    <div className="h-full bg-gradient-to-br from-lime-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 lg:flex">
      <FirstRunTutorial />
      <aside className="hidden w-56 shrink-0 border-r border-white/70 bg-white/75 px-4 py-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 lg:block">
        <div className="mb-8 text-2xl font-black tracking-tight text-green-700">grid genius</div>
        <nav className="space-y-2" aria-label="Main navigation">
          <SideTabLink to="/learn" label="Learn" icon="🏠" />
          <SideTabLink to="/play" label="Play" icon="🎮" />
          <SideTabLink to="/leaderboard/daily" label="Daily ranks" icon="📊" />
          {showCloudAuth && (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-lime-200 bg-lime-50 px-3 py-3 text-left text-sm font-black uppercase tracking-wide text-lime-800 transition-colors hover:bg-lime-100 dark:border-lime-800 dark:bg-lime-950 dark:text-lime-200 dark:hover:bg-lime-900"
            >
              <span aria-hidden>☁</span>
              Sign in
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black uppercase tracking-wide text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <span aria-hidden>⚙</span>
            Settings
          </button>
        </nav>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        {signedInNotice && (
          <div
            role="status"
            aria-live="polite"
            className="border-b border-lime-200 bg-lime-100 px-4 py-2 text-center text-xs font-bold text-lime-900 dark:border-lime-800 dark:bg-lime-950 dark:text-lime-100"
          >
            You&apos;re signed in — progress will sync to your account. Open Settings for your
            profile or sign out.
          </div>
        )}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/70 bg-white/80 backdrop-blur-xl shadow-sm dark:border-slate-800 dark:bg-slate-950/80 lg:justify-end">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white lg:hidden">
              Grid Genius
            </h1>
            <p className="hidden text-xs font-semibold text-slate-500 dark:text-slate-400 sm:block lg:hidden">
              Make numbers. Build confidence.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            {showCloudAuth && (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="whitespace-nowrap rounded-full bg-green-700 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm hover:bg-green-800"
              >
                Sign in
              </button>
            )}
            <motion.span
              key={xp}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className="whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 font-black text-amber-700 shadow-sm dark:bg-amber-950 dark:text-amber-200"
              aria-label={`${xp} experience points`}
            >
              <span aria-hidden>★</span> {xp} XP
            </motion.span>
            <span
              className="whitespace-nowrap rounded-full bg-lime-100 px-2.5 py-1 font-black text-lime-700 shadow-sm dark:bg-lime-950 dark:text-lime-300"
              aria-label={`${streakCount} day streak`}
            >
              <span aria-hidden>🔥</span> {streakCount}
            </span>
            <button
              type="button"
              aria-label="Open settings"
              onClick={() => setSettingsOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm transition-colors hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white text-lg leading-none lg:hidden"
            >
              ⚙
            </button>
          </div>
        </header>

        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onOpenAuth={() => {
            setSettingsOpen(false);
            setAuthOpen(true);
          }}
        />

        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

        <nav
          className="flex border-b border-white/70 bg-white/60 px-4 py-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/60 lg:hidden"
          role="tablist"
          aria-label="Home sections"
        >
          <TabLink to="/learn" label="Learn" />
          <TabLink to="/play" label="Play" />
        </nav>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const TabLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <NavLink to={to} role="tab" className="flex-1 px-1">
    {({ isActive }) => (
      <span
        aria-selected={isActive}
        className={`block rounded-2xl py-2.5 text-center text-sm font-black transition-all ${
          isActive
            ? 'bg-green-700 text-white shadow-md shadow-lime-200 dark:bg-green-700 dark:shadow-none'
            : 'text-slate-500 hover:bg-white/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`}
      >
        {label}
      </span>
    )}
  </NavLink>
);

const SideTabLink: React.FC<{ to: string; label: string; icon: string }> = ({
  to,
  label,
  icon,
}) => (
  <NavLink to={to} className="block">
    {({ isActive }) => (
      <span
        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-black uppercase tracking-wide transition-all ${
          isActive
            ? 'border-lime-300 bg-lime-50 text-lime-700 shadow-sm dark:border-lime-800 dark:bg-lime-950 dark:text-lime-300'
            : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
        }`}
      >
        <span aria-hidden>{icon}</span>
        {label}
      </span>
    )}
  </NavLink>
);
