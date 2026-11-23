import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefsStore, type ThemeChoice } from '../../store/prefsStore';
import { feedback, supportsHaptics } from '../../utils/feedback';
import { BOARD_THEMES, isBoardThemeUnlocked } from '../../constants/boardThemes';
import { useProgressStore } from '../../store/progressStore';
import { useAuthOptional } from '../../auth/authContext';
import { useSupabase, isSupabaseConfigured } from '../../lib/supabase/client';
import { logger } from '../../utils/logger';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Opens the global sign-in modal (wired from HomeShell). */
  onOpenAuth?: () => void;
}

/**
 * Right-side slide-in drawer with global preferences. Trapping focus would be
 * nice but is over-engineering for this scope; we just give the close button
 * autofocus and respond to Escape. Click on the backdrop or the close button
 * dismisses the drawer.
 */
export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose, onOpenAuth }) => {
  const theme = usePrefsStore((s) => s.theme);
  const setTheme = usePrefsStore((s) => s.setTheme);
  const analyticsOptIn = usePrefsStore((s) => s.analyticsOptIn);
  const setAnalyticsOptIn = usePrefsStore((s) => s.setAnalyticsOptIn);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const xp = useProgressStore((s) => s.xp);
  const soundEnabled = usePrefsStore((s) => s.soundEnabled);
  const setSoundEnabled = usePrefsStore((s) => s.setSoundEnabled);
  const hapticsEnabled = usePrefsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = usePrefsStore((s) => s.setHapticsEnabled);
  const boardTheme = usePrefsStore((s) => s.boardTheme);
  const setBoardTheme = usePrefsStore((s) => s.setBoardTheme);
  const auth = useAuthOptional();
  const sb = useSupabase();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [accountMsg, setAccountMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onResetProgress = () => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm(
      'Reset all progress? This clears completed levels, XP, and streak. The decision can not be undone.'
    );
    if (ok) resetProgress();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[90vw] bg-white dark:bg-gray-900 dark:text-gray-100 shadow-2xl flex flex-col safe-pad"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 id="settings-title" className="text-base font-bold">
                Settings
              </h2>
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close settings"
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 text-xl leading-none"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 overflow-auto px-4 py-4 space-y-6 text-sm">
              <Section label="Theme">
                <SegmentedControl<ThemeChoice>
                  value={theme}
                  onChange={setTheme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' },
                  ]}
                />
              </Section>

              <Section label="Sound & haptics">
                <div className="space-y-1">
                  <ToggleRow
                    label="Sound effects"
                    checked={soundEnabled}
                    onChange={(v) => {
                      setSoundEnabled(v);
                      if (v) feedback('correct');
                    }}
                  />
                  {supportsHaptics() && (
                    <ToggleRow
                      label="Vibration"
                      checked={hapticsEnabled}
                      onChange={(v) => {
                        setHapticsEnabled(v);
                        if (v) feedback('tap');
                      }}
                    />
                  )}
                </div>
              </Section>

              <Section label="Board theme">
                <div className="grid grid-cols-3 gap-2">
                  {BOARD_THEMES.map((t) => {
                    const unlocked = isBoardThemeUnlocked(t.id, xp);
                    const active = unlocked && boardTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          setBoardTheme(t.id);
                          feedback('tap');
                        }}
                        aria-pressed={active}
                        aria-label={
                          unlocked ? `${t.name} board theme` : `${t.name}, unlocks at ${t.xp} XP`
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl p-2 text-xs ring-1 transition ${
                          active
                            ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-800'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <span
                          className={`h-9 w-9 rounded-lg ring-1 ring-black/5 ${unlocked ? '' : 'grayscale'}`}
                          style={{ background: t.swatch }}
                          aria-hidden
                        />
                        <span className="font-semibold">{t.name}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {unlocked ? (active ? 'In use' : 'Unlocked') : `🔒 ${t.xp} XP`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  You have {xp} XP. Earn stars on the Learn path to unlock more themes.
                </p>
              </Section>

              <Section label="Motion">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Animations follow your operating system's "reduce motion" setting. Change it there
                  to apply everywhere.
                </p>
              </Section>

              <Section label="Account & privacy">
                {!isSupabaseConfigured() || !sb ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Cloud accounts are not configured (set Supabase env vars to enable).
                  </p>
                ) : !auth?.user || auth.isGuest ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {auth?.isGuest
                        ? 'Playing multiplayer as a guest (unrated). Sign in to keep ratings and join leaderboards.'
                        : 'Play as a guest, or sign in to sync progress and join leaderboards.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenAuth?.()}
                      className="w-full rounded-lg bg-lime-500 px-3 py-2 text-sm font-bold text-white hover:bg-lime-600"
                    >
                      Save my progress
                    </button>
                    {auth?.isGuest && (
                      <button
                        type="button"
                        onClick={() => void auth.signOut()}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Stop playing as guest
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <p className="text-gray-600 dark:text-gray-300">
                      Signed in as{' '}
                      <span className="font-mono">
                        {auth.user.email ?? auth.user.id.slice(0, 8)}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/me"
                        className="rounded-lg border border-gray-200 px-2 py-1 font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                        onClick={onClose}
                      >
                        My profile
                      </Link>
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 px-2 py-1 font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                        onClick={() => void auth.signOut()}
                      >
                        Sign out
                      </button>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                      onClick={async () => {
                        setAccountMsg(null);
                        const { data, error } = await sb.rpc('export_my_data');
                        if (error) {
                          setAccountMsg(error.message);
                          logger.warn('export failed', error.message);
                          return;
                        }
                        const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: 'application/json',
                        });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'grid-genius-export.json';
                        a.click();
                        URL.revokeObjectURL(a.href);
                        setAccountMsg('Download started.');
                      }}
                    >
                      Download my data (JSON)
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left font-medium text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Request account deletion? Your profile will be hidden immediately.'
                          )
                        )
                          return;
                        setAccountMsg(null);
                        const { error } = await sb.rpc('request_account_deletion');
                        if (error) {
                          setAccountMsg(error.message);
                          return;
                        }
                        await auth.signOut();
                        setAccountMsg('Deletion scheduled. Signed out.');
                      }}
                    >
                      Delete account (30-day window)
                    </button>
                    {accountMsg && (
                      <p className="text-[11px] text-lime-700 dark:text-lime-300">{accountMsg}</p>
                    )}
                  </div>
                )}
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Legal
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Link
                      to="/privacy"
                      className="text-blue-600 underline dark:text-blue-400"
                      onClick={onClose}
                    >
                      Privacy
                    </Link>
                    <Link
                      to="/terms"
                      className="text-blue-600 underline dark:text-blue-400"
                      onClick={onClose}
                    >
                      Terms
                    </Link>
                    <Link
                      to="/leaderboard/daily"
                      className="text-blue-600 underline dark:text-blue-400"
                      onClick={onClose}
                    >
                      Daily leaderboard
                    </Link>
                  </div>
                </div>
              </Section>

              <Section label="Analytics">
                <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={analyticsOptIn}
                    onChange={(e) => setAnalyticsOptIn(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Help improve Grid Genius with privacy-friendly analytics (Plausible). Only loads
                    when <code className="text-[10px]">VITE_PLAUSIBLE_DOMAIN</code> is set.
                  </span>
                </label>
              </Section>

              <Section label="Progress">
                <button
                  onClick={onResetProgress}
                  className="w-full px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 dark:bg-red-950 dark:text-red-200 dark:border-red-900"
                >
                  Reset all progress
                </button>
              </Section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <section>
    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
      {label}
    </h3>
    {children}
  </section>
);

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex w-full rounded-lg bg-gray-100 dark:bg-gray-800 p-1"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selected
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between rounded-lg py-1.5">
    <span className="text-sm text-gray-800 dark:text-gray-100">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </button>
  </label>
);
