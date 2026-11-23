/**
 * Minimal, privacy-safe client error reporting.
 *
 * - Captures uncaught errors + unhandled promise rejections, plus anything the
 *   React ErrorBoundary hands us via `reportError`.
 * - Sends a small JSON payload (message, truncated stack, route path, app
 *   version, user agent) to `VITE_ERROR_REPORT_URL` with `sendBeacon`, so it
 *   survives page unloads and never blocks the UI.
 * - No user ids, emails, query strings or game state are included — safe for a
 *   kids' audience.
 * - No-op when the env var is unset (local dev, forks).
 *
 * Any endpoint that accepts a JSON POST works (a serverless function, a
 * Supabase Edge Function, a logging service's HTTP intake).
 */
import { logger } from './logger';

const ENDPOINT: string | undefined = import.meta.env.VITE_ERROR_REPORT_URL || undefined;

const MAX_REPORTS_PER_SESSION = 10;
const MAX_STACK_CHARS = 4000;

let sent = 0;
const seen = new Set<string>();

export interface ErrorReport {
  message: string;
  stack?: string;
  source: 'window' | 'promise' | 'react' | 'manual';
  path: string;
  version: string;
  userAgent: string;
  at: string;
  componentStack?: string;
}

const toError = (value: unknown): { message: string; stack?: string } => {
  if (value instanceof Error) return { message: value.message, stack: value.stack };
  if (typeof value === 'string') return { message: value };
  try {
    return { message: JSON.stringify(value) };
  } catch {
    return { message: String(value) };
  }
};

export const buildReport = (
  value: unknown,
  source: ErrorReport['source'],
  extra: { componentStack?: string } = {}
): ErrorReport => {
  const { message, stack } = toError(value);
  return {
    message: message.slice(0, 500),
    stack: stack?.slice(0, MAX_STACK_CHARS),
    source,
    // Path only — never the query string (it can carry auth tokens / seeds).
    path: typeof location !== 'undefined' ? location.pathname : '',
    version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    at: new Date().toISOString(),
    componentStack: extra.componentStack?.slice(0, MAX_STACK_CHARS),
  };
};

export const reportError = (
  value: unknown,
  source: ErrorReport['source'] = 'manual',
  extra: { componentStack?: string } = {}
): void => {
  if (!ENDPOINT) return;
  const report = buildReport(value, source, extra);
  const key = `${report.message}|${report.stack?.split('\n')[1] ?? ''}`;
  if (seen.has(key) || sent >= MAX_REPORTS_PER_SESSION) return;
  seen.add(key);
  sent += 1;
  try {
    const body = JSON.stringify(report);
    const ok =
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    if (!ok) {
      void fetch(ENDPOINT, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch (err) {
    logger.warn('error report failed', err);
  }
};

let installed = false;

/** Attach global listeners once. Call from the app entry point. */
export const installGlobalErrorReporting = (): void => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
};
