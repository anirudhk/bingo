/**
 * Tiny logger that no-ops in production builds.
 *
 * Use this instead of `console.*` directly. The ESLint `no-console` rule
 * forbids raw console use everywhere except this file (and tests).
 *
 * In production:
 *   - `debug` / `info` / `log` are stripped to no-ops (tree-shakeable).
 *   - `warn` / `error` still go to the console so genuine problems surface.
 */

/* eslint-disable no-console */

// `import.meta.env` is provided by Vite at build time. When this module is
// imported by Node directly (e.g. the puzzle generator script in `scripts/`),
// `import.meta.env` is undefined; treat that as a non-prod environment so
// scripts can still log. The `unknown` cast keeps TS strict happy.
const isDev: boolean =
  ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ?? true) === true;

type LogArgs = readonly unknown[];

export const logger = {
  debug: (...args: LogArgs): void => {
    if (isDev) console.debug(...args);
  },
  info: (...args: LogArgs): void => {
    if (isDev) console.info(...args);
  },
  log: (...args: LogArgs): void => {
    if (isDev) console.log(...args);
  },
  warn: (...args: LogArgs): void => {
    console.warn(...args);
  },
  error: (...args: LogArgs): void => {
    console.error(...args);
  },
};

export type Logger = typeof logger;
