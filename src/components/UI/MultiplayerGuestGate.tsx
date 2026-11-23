import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthOptional } from '../../auth/authContext';

/**
 * Shown on multiplayer screens when nobody is signed in: start a guest
 * session (Supabase anonymous sign-in, no email) or go sign in properly.
 */
export const MultiplayerGuestGate: React.FC<{ backTo?: string; reason?: string }> = ({
  backTo = '/play',
  reason = 'Play a friend or a random opponent.',
}) => {
  const auth = useAuthOptional();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playAsGuest = async () => {
    if (!auth) return;
    setBusy(true);
    setError(null);
    const err = await auth.signInAsGuest();
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8 text-sm">
      <Link to={backTo} className="font-bold text-lime-700 dark:text-lime-400">
        ← Back
      </Link>
      <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Multiplayer</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{reason}</p>

      <button
        type="button"
        onClick={() => void playAsGuest()}
        disabled={busy || !auth || auth.loading}
        className="mt-5 w-full rounded-xl bg-lime-500 px-4 py-3 text-base font-black text-white shadow-sm hover:bg-lime-600 disabled:opacity-60"
      >
        {busy ? 'Starting…' : 'Play as guest'}
      </button>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        No email needed. Guest games don&apos;t count toward ratings, and an idle guest is removed
        after 30 days.
      </p>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error.toLowerCase().includes('anonymous')
            ? 'Guest play is switched off on this server.'
            : error}
        </p>
      )}

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Want rated games? Sign in (13+) from the{' '}
        <Link to="/learn" className="underline">
          home screen
        </Link>
        .
      </p>
    </div>
  );
};
