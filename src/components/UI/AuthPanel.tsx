import { useRef, useState } from 'react';
import { isSupabaseConfigured, useSupabase } from '../../lib/supabase/client';
import { useAuthOptional } from '../../auth/authContext';
import { logger } from '../../utils/logger';

/** Supabase built-in email sender hits hourly caps quickly while testing. */
function isAuthEmailRateLimited(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('email rate limit') ||
    /\b429\b/.test(m)
  );
}

/** OAuth provider not turned on in Supabase Dashboard (Providers tab). */
function isOAuthProviderDisabled(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('provider is not enabled') ||
    m.includes('unsupported provider') ||
    (m.includes('validation_failed') && m.includes('provider'))
  );
}

/** Some Auth errors arrive as JSON strings with a `msg` field. */
function normalizeSupabaseAuthMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return raw;
  try {
    const parsed = JSON.parse(trimmed) as { msg?: string; message?: string };
    return parsed.msg ?? parsed.message ?? raw;
  } catch {
    return raw;
  }
}

const MAGIC_LINK_COOLDOWN_MS = 60_000;

interface AuthPanelProps {
  /** Called after OAuth redirect is initiated or magic link sent (optional). */
  onBusyChange?: (busy: boolean) => void;
}

function authRedirectBase(): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${typeof window !== 'undefined' ? window.location.origin : ''}${base}`;
}

/**
 * Email magic link + Google / Apple OAuth (EPIC-27). Guest play stays default when skipped.
 */
export const AuthPanel: React.FC<AuthPanelProps> = ({ onBusyChange }) => {
  const authCtx = useAuthOptional();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastMagicLinkAttemptMs = useRef(0);
  const lastOAuthProvider = useRef<'google' | 'apple'>('google');
  // Accounts are general-audience (13+). Younger players keep playing as guests.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const sb = useSupabase();

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Account sign-in is not configured for this deployment (missing Supabase env vars).
      </p>
    );
  }

  if (!sb) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">Loading sign-in…</p>;
  }

  const redirectTo = authRedirectBase();

  const sendMagicLink = async () => {
    setError(null);
    setStatus(null);
    const now = Date.now();
    const elapsed = now - lastMagicLinkAttemptMs.current;
    if (elapsed < MAGIC_LINK_COOLDOWN_MS) {
      const waitSec = Math.ceil((MAGIC_LINK_COOLDOWN_MS - elapsed) / 1000);
      setError(`Please wait ${waitSec}s before sending another link (reduces email rate limits).`);
      return;
    }
    lastMagicLinkAttemptMs.current = now;
    onBusyChange?.(true);
    try {
      const { error: err } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });
      if (err) {
        setError(normalizeSupabaseAuthMessage(err.message));
        logger.warn('magic link failed', err.message);
      } else {
        setStatus('Check your email for the sign-in link.');
      }
    } finally {
      onBusyChange?.(false);
    }
  };

  const oauth = async (provider: 'google' | 'apple') => {
    lastOAuthProvider.current = provider;
    setError(null);
    setStatus(null);
    onBusyChange?.(true);
    try {
      const { error: err } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (err) {
        setError(normalizeSupabaseAuthMessage(err.message));
        logger.warn('oauth failed', err.message);
        onBusyChange?.(false);
      }
    } catch (e) {
      setError(normalizeSupabaseAuthMessage(String(e)));
      onBusyChange?.(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      {authCtx?.authRedirectError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <p className="font-semibold">Could not finish sign-in from your email link</p>
          <p className="mt-1">{authCtx.authRedirectError}</p>
          <button
            type="button"
            className="mt-2 font-semibold underline"
            onClick={() => authCtx.clearAuthRedirectError()}
          >
            Dismiss
          </button>
        </div>
      )}

      <label className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
        <input
          type="checkbox"
          checked={ageConfirmed}
          onChange={(e) => setAgeConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I&apos;m 13 or older and agree to the{' '}
          <a
            href={`${import.meta.env.BASE_URL}terms`}
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Terms
          </a>{' '}
          and{' '}
          <a
            href={`${import.meta.env.BASE_URL}privacy`}
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Privacy Policy
          </a>
          . Under 13? You can keep playing without an account — your progress stays on this device.
        </span>
      </label>

      <div>
        <label
          htmlFor="auth-email"
          className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          Email (magic link)
        </label>
        <div className="flex gap-2">
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            disabled={!ageConfirmed || !email.includes('@')}
            onClick={() => void sendMagicLink()}
            className="shrink-0 rounded-lg bg-lime-500 px-3 py-2 font-bold text-white shadow-sm hover:bg-lime-600 disabled:opacity-40"
          >
            Send link
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ageConfirmed}
          onClick={() => void oauth('google')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Continue with Google
        </button>
        <button
          type="button"
          disabled={!ageConfirmed}
          onClick={() => void oauth('apple')}
          className="rounded-lg border border-slate-200 bg-black px-3 py-2 font-semibold text-white shadow-sm hover:bg-slate-900 disabled:opacity-40 dark:border-slate-600"
        >
          Continue with Apple
        </button>
      </div>

      {status && <p className="text-xs text-lime-700 dark:text-lime-300">{status}</p>}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 space-y-2" role="alert">
          <p>{error}</p>
          {isOAuthProviderDisabled(error) && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-snug text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
              <p className="font-semibold text-sky-900 dark:text-sky-50">
                Enable the provider in Supabase
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>
                  Open <strong className="font-semibold">Supabase Dashboard</strong> → your project
                  → <strong className="font-semibold">Authentication</strong> →{' '}
                  <strong className="font-semibold">Providers</strong>.
                </li>
                <li>
                  Turn on{' '}
                  <strong className="font-semibold">
                    {lastOAuthProvider.current === 'google' ? 'Google' : 'Apple'}
                  </strong>
                  , paste the <strong className="font-semibold">Client ID</strong> and{' '}
                  <strong className="font-semibold">Client Secret</strong> from your developer
                  console (Google Cloud / Apple Developer).
                </li>
                <li>
                  In Google Cloud / Apple, set the authorized redirect URI to your Supabase callback
                  (shown on that provider page — usually{' '}
                  <code className="rounded bg-white/80 px-1 dark:bg-sky-900">
                    …supabase.co/auth/v1/callback
                  </code>
                  ).
                </li>
                <li>
                  <a
                    href={
                      lastOAuthProvider.current === 'google'
                        ? 'https://supabase.com/docs/guides/auth/social-login/auth-google'
                        : 'https://supabase.com/docs/guides/auth/social-login/auth-apple'
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium"
                  >
                    Supabase setup guide for{' '}
                    {lastOAuthProvider.current === 'google' ? 'Google' : 'Apple'}
                  </a>
                </li>
              </ul>
            </div>
          )}
          {isAuthEmailRateLimited(error) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold text-amber-900 dark:text-amber-50">What you can do</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>
                  Wait up to an hour — Supabase&apos;s built-in email has a low hourly cap (
                  <a
                    href="https://supabase.com/docs/guides/auth/rate-limits"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-medium"
                  >
                    rate limits
                  </a>
                  ).
                </li>
                <li>Use Continue with Google or Apple to sign in without another magic email.</li>
                <li>
                  For production: configure <strong className="font-semibold">custom SMTP</strong>{' '}
                  in Supabase (Project Settings → Authentication → SMTP) so limits match your
                  provider.
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Signing in saves your progress (levels, XP, daily results) to your account so it follows you
        to other devices.
      </p>

      {/* Setup hint for whoever runs the project — never shown to players. */}
      {import.meta.env.DEV && (
        <div className="space-y-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          <p>
            Dev: in Supabase → Authentication → URL configuration, add this exact URL under{' '}
            <strong className="text-slate-600 dark:text-slate-300">Redirect URLs</strong>:
          </p>
          <code className="block break-all rounded-md bg-slate-100 px-2 py-1.5 text-[10px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {redirectTo}
          </code>
        </div>
      )}
    </div>
  );
};
